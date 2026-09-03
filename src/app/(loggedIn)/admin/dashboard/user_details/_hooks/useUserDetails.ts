"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  UserProfile, BookingRow, WarningRow, SuspensionRow, AdminInfo,
  ROLES_WITH_EMAIL, SUSPENSION_DAYS, WARNING_THRESHOLD 
} from "../_types";

export const useUserDetails = (userId: string | null) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [businessEmail, setBusinessEmail] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Warnings state
  const [warnings, setWarnings] = useState<WarningRow[]>([]);
  const [warningsLoading, setWarningsLoading] = useState(true);
  const [sendingWarning, setSendingWarning] = useState(false);

  // Suspension state
  const [currentSuspension, setCurrentSuspension] = useState<SuspensionRow | null>(null);
  const [suspensionLoading, setSuspensionLoading] = useState(true);
  const [suspending, setSuspending] = useState(false);
  const [liftingSuspension, setLiftingSuspension] = useState(false);
  const [autoSuspended, setAutoSuspended] = useState(false);
  const [suspensionHistory, setSuspensionHistory] = useState<SuspensionRow[]>([]);
  const [suspensionHistoryLoading, setSuspensionHistoryLoading] = useState(true);

  // Feedback for admin actions
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [autoSuspendNotice, setAutoSuspendNotice] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
      fetchBookingHistory();
      fetchWarnings();
      fetchCurrentSuspension();
      fetchSuspensionHistory();
    } else {
      setError("No User ID found in URL.");
      setLoading(false);
      setBookingsLoading(false);
      setWarningsLoading(false);
      setSuspensionLoading(false);
      setSuspensionHistoryLoading(false);
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, username, mobile_number, date_of_birth, role, created_at")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUser(data);

      // Only fetch business email if the role warrants it
      if (data?.role && ROLES_WITH_EMAIL.includes(data.role)) {
        fetchBusinessEmail();
      }
    } catch (err: any) {
      console.error("Error fetching user details:", err);
      setError(err.message || "Failed to load user details.");
    } finally {
      setLoading(false);
    }
  };

  // Business email from sp_general_info, linked via profiles_id
  const fetchBusinessEmail = async () => {
    try {
      const { data, error } = await supabase
        .from("sp_general_info")
        .select("business_email")
        .eq("profiles_id", userId)
        .maybeSingle();

      if (error) throw error;
      setBusinessEmail(data?.business_email || null);
    } catch (err: any) {
      console.error("Error fetching business email:", err);
    }
  };

  const fetchBookingHistory = async () => {
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

  const fetchWarnings = async () => {
    try {
      setWarningsLoading(true);
      
      const { data, error } = await supabase
        .from("user_warnings")
        .select("id, warning_message, created_at, severity, status, expires_at, issued_by")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const adminIds = data.map((w) => w.issued_by);
        const adminInfoMap = await fetchAdminInfo(adminIds);
        const warningsWithAdmins = data.map((w) => ({
          ...w,
          issued_by_admin: w.issued_by ? adminInfoMap[w.issued_by] : undefined,
        }));

        setWarnings(warningsWithAdmins);
      } else {
        setWarnings([]);
      }
      
    } catch (err: any) {
      console.error("Error fetching warnings:", err);
    } finally {
      setWarningsLoading(false);
    }
  };

  const fetchCurrentSuspension = async () => {
    try {
      setSuspensionLoading(true);
      const { data, error } = await supabase
        .from("user_suspensions")
        .select("id, reason, triggered_by_warning_ids, suspended_at, suspended_until, lifted_at, lifted_by, status, suspended_by")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("suspended_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCurrentSuspension(data || null);
    } catch (err: any) {
      console.error("Error fetching suspension:", err);
    } finally {
      setSuspensionLoading(false);
    }
  };

  const fetchAdminInfo = async (ids: (string | null | undefined)[]): Promise<Record<string, AdminInfo>> => {
    const uniqueIds = Array.from(new Set(ids.filter((id): id is string => !!id)));
    if (uniqueIds.length === 0) return {};

    const { data, error } = await supabase.rpc("get_admin_names", { admin_ids: uniqueIds });

    if (error) {
      console.error("Error fetching admin info:", error);
      return {};
    }

    return Object.fromEntries(
      (data || []).map((p: any) => [p.id, { first_name: p.first_name, last_name: p.last_name }])
    );
  };

  const fetchSuspensionHistory = async () => {
    try {
      setSuspensionHistoryLoading(true);
      const { data, error } = await supabase
        .from("user_suspensions")
        .select("id, reason, triggered_by_warning_ids, suspended_at, suspended_until, lifted_at, lifted_by, suspended_by, status")
        .eq("user_id", userId)
        .order("suspended_at", { ascending: false });

      if (error) throw error;

      const rows = data || [];
      const adminMap = await fetchAdminInfo(rows.flatMap((s) => [s.suspended_by, s.lifted_by]));
      setSuspensionHistory(
        rows.map((s) => ({
          ...s,
          suspended_by_admin: s.suspended_by ? adminMap[s.suspended_by] : undefined,
          lifted_by_admin: s.lifted_by ? adminMap[s.lifted_by] : undefined,
        }))
      );
    } catch (err: any) {
      console.error("Error fetching suspension history:", err);
    } finally {
      setSuspensionHistoryLoading(false);
    }
  };

  // Suspension
  const performSuspension = async (warningIds: string[], reason: string, suspendedBy: string | null): Promise<SuspensionRow> => {
    const suspendedUntil = new Date(Date.now() + SUSPENSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("user_suspensions")
      .insert({
        user_id: userId,
        reason,
        triggered_by_warning_ids: warningIds,
        suspended_until: suspendedUntil,
        status: "active",
        suspended_by: suspendedBy,
      })
      .select("id, reason, triggered_by_warning_ids, suspended_at, suspended_until, lifted_at, lifted_by, status, suspended_by")
      .single();

    if (error) throw error;

    const { error: profileError } = await supabase.rpc("suspend_user_profile", {
      target_user_id: userId,
      new_status: "suspended",
    });

    if (profileError) {
      console.error("Failed to update profile status:", profileError);
      throw profileError;
    }

    if (warningIds.length > 0) {
      const { error: updateError } = await supabase
        .from("user_warnings")
        .update({ status: "consumed" })
        .in("id", warningIds);

      if (updateError) throw updateError;

      setWarnings((prev) =>
        prev.map((w) => (warningIds.includes(w.id) ? { ...w, status: "consumed" } : w))
      );
    }

    const adminMap = await fetchAdminInfo([suspendedBy]);
    const enriched = { ...data, suspended_by_admin: suspendedBy ? adminMap[suspendedBy] : undefined };
    
    setCurrentSuspension(enriched);
    setSuspensionHistory((prev) => [enriched, ...prev]);
    return enriched;
  };

  // 1 -> "1st", 2 -> "2nd", etc.
  const getOrdinal = (n: number) => {
    const rem100 = n % 100;
    if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
    switch (n % 10) {
      case 1: return `${n}st`;
      case 2: return `${n}nd`;
      case 3: return `${n}rd`;
      default: return `${n}th`;
    }
  };

  // Runs insert/auto-suspend logic
  const confirmSendWarning = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || !userId) return false;

    setActionError(null);
    setActionSuccess(null);
    setAutoSuspended(false);
    setAutoSuspendNotice(null);
    setSendingWarning(true);
    
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();

      const { data: newWarning, error } = await supabase
        .from("user_warnings")
        .insert({
          user_id: userId,
          warning_message: trimmed,
          issued_by: adminUser?.id || null,
        })
        .select("id, warning_message, created_at, severity, status, expires_at, issued_by")
        .single();

      if (error) throw error;

      const updatedWarnings = [newWarning, ...warnings];
      setWarnings(updatedWarnings);

      // Only auto-suspend if the user isnt already in an active suspension
      const activeWarnings = updatedWarnings.filter((w) => w.status === "active");
      const alreadySuspended =
        !!currentSuspension &&
        currentSuspension.status === "active" &&
        new Date(currentSuspension.suspended_until) > new Date();

      if (activeWarnings.length >= WARNING_THRESHOLD && !alreadySuspended) {
        const warningIds = activeWarnings.map((w) => w.id);
        await performSuspension(
          warningIds,
          `Auto-suspended: reached ${activeWarnings.length} active warnings`,
          adminUser?.id || null
        );
        setAutoSuspended(true);
        setAutoSuspendNotice(
          `This was the ${getOrdinal(activeWarnings.length)} active warning, so the user was automatically suspended for ${SUSPENSION_DAYS} days.`
        );
      } else {
        setActionSuccess("Warning issued.");
      }
      return true;
    } catch (err: any) {
      console.error("Error sending warning:", err);
      setActionError(err?.message || err?.details || "Failed to send warning.");
      return false;
    } finally {
      setSendingWarning(false);
    }
  };

  // Runs the manual suspension logic
  const confirmSuspend = async () => {
    if (!userId) return false;

    const activeWarnings = warnings.filter((w) => w.status === "active");

    setActionError(null);
    setActionSuccess(null);
    setAutoSuspended(false);
    setSuspending(true);
    
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();

      const warningIds = activeWarnings.map((w) => w.id);
      await performSuspension(
        warningIds,
        warningIds.length > 0
          ? `Manual suspension by admin (${warningIds.length} active warning${warningIds.length === 1 ? "" : "s"})`
          : "Manual suspension by admin",
        adminUser?.id || null
      );
      setActionSuccess(`User suspended for ${SUSPENSION_DAYS} days.`);
      return true;
    } catch (err: any) {
      console.error("Error suspending user:", err);
      setActionError(err?.message || err?.details || "Failed to suspend user.");
      return false;
    } finally {
      setSuspending(false);
    }
  };

  // Runs the actual lift logic
  const confirmLiftSuspension = async () => {
    if (!userId || !currentSuspension) return false;

    setActionError(null);
    setActionSuccess(null);
    setAutoSuspended(false);
    setLiftingSuspension(true);
    
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("user_suspensions")
        .update({
          status: "lifted",
          lifted_at: new Date().toISOString(),
          lifted_by: adminUser?.id || null,
        })
        .eq("id", currentSuspension.id);

      if (error) throw error;

      const { error: profileError } = await supabase.rpc("suspend_user_profile", {
        target_user_id: userId,
        new_status: "active",
      });

      if (profileError) {
        console.error("Failed to lift profile status:", profileError);
        throw profileError;
      }

      setCurrentSuspension(null);
      setActionSuccess("Suspension lifted.");
      fetchSuspensionHistory();
      
      return true;
    } catch (err: any) {
      console.error("Error lifting suspension:", err);
      setActionError(err?.message || err?.details || "Failed to lift suspension.");
      return false;
    } finally {
      setLiftingSuspension(false);
    }
  };

  return {
    user, businessEmail, bookings, loading, bookingsLoading, error,
    warnings, warningsLoading, sendingWarning,
    currentSuspension, suspensionLoading, suspending, liftingSuspension, autoSuspended,
    suspensionHistory, suspensionHistoryLoading,
    actionError, actionSuccess, autoSuspendNotice, setAutoSuspendNotice,
    confirmSendWarning, confirmSuspend, confirmLiftSuspension
  };
};