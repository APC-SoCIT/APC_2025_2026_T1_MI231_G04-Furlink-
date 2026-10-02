"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { SpBookingRow, PetOwnerInfo } from "../_types";

/**
 * Loads bookings RECEIVED by a service provider (booking_info.sp_id = their sp_general_info.id).
 * `enabled` should be true only for roles "service_provider" / "both".
 */
export const useSpBookings = (userId: string | null, enabled: boolean) => {
  const [spBookings, setSpBookings] = useState<SpBookingRow[]>([]);
  const [spBookingsLoading, setSpBookingsLoading] = useState(false);

  useEffect(() => {
    if (!userId || !enabled) {
      setSpBookings([]);
      setSpBookingsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setSpBookingsLoading(true);

        // 1. profile id -> service provider id
        const { data: sp, error: spError } = await supabase
          .from("sp_general_info")
          .select("id, business_name")
          .eq("profiles_id", userId)
          .maybeSingle();

        if (spError) throw spError;
        if (!sp) {
          if (!cancelled) setSpBookings([]);
          return;
        }

        // 2. bookings for that provider
        // The employee is assigned per pet (booking_pet_info.assigned_employee_id -> sp_employees_info.id)
        const { data, error } = await supabase
          .from("booking_info")
          .select(`
            id, profiles_id, booking_date, booking_timeslot, booking_status, booking_total_amount,
            booking_rejection_reason, booking_comment, booking_review,
            booking_overall_rating, booking_staff_rating, cancelled_by,
            refund_amount, refund_reason, created_at,
            booking_pet_info (
              id, booking_pet_name, booking_pet_type, booking_breed, booking_gender,
              booking_weight, booking_calculated_size, booking_behavior, booking_grooming_notes,
              assigned_employee_id,
              assigned_employee:sp_employees_info ( * ),
              booking_service_info ( id, booking_service_name, booking_service_type, booking_price )
            )
          `)
          .eq("sp_id", sp.id)
          .order("booking_date", { ascending: false });

        if (error) throw error;
        const rows = (data as any[]) || [];

        // 3. pet owner profiles (separate query: profiles lives in another schema,
        //    so we avoid a cross-schema embed)
        const ownerIds = Array.from(new Set(rows.map((r) => r.profiles_id).filter(Boolean)));
        const owners: Record<string, PetOwnerInfo> = {};

        if (ownerIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, mobile_number")
            .in("id", ownerIds);
          if (profilesError) throw profilesError;
          (profiles || []).forEach((p: any) => { owners[p.id] = p; });
        }

        const merged: SpBookingRow[] = rows.map((r) => ({
          ...r,
          pet_owner: owners[r.profiles_id] || null,
        }));

        if (!cancelled) setSpBookings(merged);
      } catch (err: any) {
        console.error("Error fetching service provider bookings:", err);
      } finally {
        if (!cancelled) setSpBookingsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userId, enabled]);

  return { spBookings, spBookingsLoading };
};