"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { UserProfile, BookingRow } from "../_types";

export const useBookingHistoryPage = (userId: string | null) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUser();
      fetchBookings();
    } else {
      setError("No User ID found in URL.");
      setLoading(false);
      setBookingsLoading(false);
    }
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, username, mobile_number, date_of_birth, role, created_at")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (err: any) {
      console.error("Error fetching user:", err);
      setError(err.message || "Failed to load user.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setBookingsLoading(true);
      const { data, error } = await supabase
        .from("booking_info")
        .select(`
          id, booking_date, booking_timeslot, booking_status, booking_total_amount,
          booking_rejection_reason, booking_comment, booking_overall_rating, booking_staff_rating, created_at,
          sp_general_info ( business_name ),
          booking_pet_info (
            id, booking_pet_name, booking_pet_type, booking_breed, booking_gender,
            booking_weight, booking_calculated_size, booking_behavior, booking_grooming_notes,
            booking_service_info ( id, booking_service_name, booking_service_type, booking_price )
          )
        `)
        .eq("profiles_id", userId)
        .order("booking_date", { ascending: false });

      if (error) throw error;
      setBookings((data as unknown as BookingRow[]) || []);
    } catch (err: any) {
      console.error("Error fetching booking history:", err);
    } finally {
      setBookingsLoading(false);
    }
  };

  return { user, loading, bookings, bookingsLoading, error };
};