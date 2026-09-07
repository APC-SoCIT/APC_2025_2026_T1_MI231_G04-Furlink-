"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ProviderDetails } from "../_types";

export const useProviderDetails = (providerId: string | null) => {
  const [provider, setProvider] = useState<ProviderDetails | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminUser();
    if (providerId) {
      fetchProviderDetails();
    } else {
      setError("No Provider ID found in URL.");
      setLoading(false);
    }
  }, [providerId]);

  const fetchAdminUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setAdminId(user.id);
  };

  const fetchProviderDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("sp_general_info")
        .select(`
          *,
          sp_img_facilities (*),
          sp_employees_info (*),
          sp_operating_hours (*),
          sp_services (
            *,
            sp_service_options (*)
          )
        `)
        .eq("id", providerId)
        .single();

      if (error) throw error;
      setProvider(data);
    } catch (err: any) {
      console.error("Error fetching provider details:", err);
      setError(err.message || "Failed to load provider details.");
    } finally {
      setLoading(false);
    }
  };

  const confirmApprove = async () => {
    if (!providerId) return false;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("sp_general_info")
        .update({
          registration_status: "approved",
          registration_approved_at: new Date().toISOString(),
          registration_response_by: adminId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", providerId);

      if (error) throw error;
      await fetchProviderDetails();
      return true;
    } catch (err: any) {
      alert("Error approving: " + err.message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmReject = async (reasons: string) => {
    if (!providerId) return false;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("sp_general_info")
        .update({
          registration_status: "rejected",
          registration_rejection_reason: reasons,
          registration_response_by: adminId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", providerId);

      if (error) throw error;
      await fetchProviderDetails();
      return true;
    } catch (err: any) {
      alert("Error rejecting: " + err.message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return { provider, loading, error, isUpdating, confirmApprove, confirmReject };
};