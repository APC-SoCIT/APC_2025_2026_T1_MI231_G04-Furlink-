"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { UserProfile, WarningRow, SuspensionRow, AdminInfo } from "../_types";

export const useHistoryPage = (userId: string | null) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [warnings, setWarnings] = useState<WarningRow[]>([]);
  const [suspensions, setSuspensions] = useState<SuspensionRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUser();
      fetchHistory();
    } else {
      setError("No User ID found in URL.");
      setLoading(false);
      setHistoryLoading(false);
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

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);

      const [{ data: warningData, error: warningError }, { data: suspensionData, error: suspensionError }] =
        await Promise.all([
          supabase
            .from("user_warnings")
            .select("id, warning_message, created_at, severity, status, expires_at, issued_by")
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
          supabase
            .from("user_suspensions")
            .select("id, reason, triggered_by_warning_ids, suspended_at, suspended_until, lifted_at, lifted_by, suspended_by, status")
            .eq("user_id", userId)
            .order("suspended_at", { ascending: false }),
        ]);

      if (warningError) throw warningError;
      if (suspensionError) throw suspensionError;

      const warningRows = warningData || [];
      const suspensionRows = suspensionData || [];

      const adminMap = await fetchAdminInfo([
        ...warningRows.map((w) => w.issued_by),
        ...suspensionRows.flatMap((s) => [s.suspended_by, s.lifted_by]),
      ]);

      setWarnings(
        warningRows.map((w) => ({
          ...w,
          issued_by_admin: w.issued_by ? adminMap[w.issued_by] : undefined,
        }))
      );

      setSuspensions(
        suspensionRows.map((s) => ({
          ...s,
          suspended_by_admin: s.suspended_by ? adminMap[s.suspended_by] : undefined,
          lifted_by_admin: s.lifted_by ? adminMap[s.lifted_by] : undefined,
        }))
      );
    } catch (err: any) {
      console.error("Error fetching warning/suspension history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  return { user, loading, warnings, suspensions, historyLoading, error };
};