// supabase fetch, state variables, and filter caching

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  FilterType, 
  UserRoleFilter, 
  DateRange, 
  SavedFilters, 
  ProviderRow, 
  UserRow, 
  DashboardCounts 
} from "../_types";

const FILTERS_STORAGE_KEY = "adminDashboardFilters";

const DEFAULT_FILTERS: SavedFilters = {
  currentFilter: "pending",
  userRoleFilter: "all",
  dateRange: { start: "", end: "" },
};

export const useDashboardData = () => {
  const [adminName, setAdminName] = useState("Admin");
  
  const [counts, setCounts] = useState<DashboardCounts>({
    pendingCount: 0,
    activeCount: 0,
    rejectedCount: 0,
    totalUsers: 0,
    avgApprovalTime: "-",
  });

  const [currentFilter, setCurrentFilter] = useState<FilterType>(DEFAULT_FILTERS.currentFilter);
  const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>(DEFAULT_FILTERS.userRoleFilter);
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_FILTERS.dateRange);
  const [filtersRestored, setFiltersRestored] = useState(false);

  // Split states to fix TypeScript casting issues
  const [providerData, setProviderData] = useState<ProviderRow[]>([]);
  const [userData, setUserData] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSavedFilters = () => {
    try {
      const saved = sessionStorage.getItem(FILTERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCurrentFilter(parsed.currentFilter ?? DEFAULT_FILTERS.currentFilter);
        setUserRoleFilter(parsed.userRoleFilter ?? DEFAULT_FILTERS.userRoleFilter);
        setDateRange(parsed.dateRange ?? DEFAULT_FILTERS.dateRange);
      }
    } catch (err) {
      console.error("Error loading saved filters:", err);
    }
    setFiltersRestored(true);
  };

  const fetchAdminProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();
      if (data) setAdminName(data.first_name);
    }
  };

  const fetchDashboardCounts = async () => {
    try {
      const { count: pending } = await supabase
        .from("sp_general_info")
        .select("id, sp_services!inner(id)", { count: "exact", head: true })
        .eq("registration_status", "pending");

      const { count: approved } = await supabase
        .from("sp_general_info")
        .select("*", { count: "exact", head: true })
        .eq("registration_status", "approved");

      const { count: rejected } = await supabase
        .from("sp_general_info")
        .select("*", { count: "exact", head: true })
        .eq("registration_status", "rejected");

      const { count: users } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .neq("role", "admin");

      const { data: approvals } = await supabase
        .from("sp_general_info")
        .select("created_at, registration_approved_at")
        .eq("registration_status", "approved")
        .not("registration_approved_at", "is", null);

      let avgStr = "-";
      if (approvals && approvals.length > 0) {
        const totalMs = approvals.reduce((sum, row) => {
          const start = new Date(row.created_at).getTime();
          const end = new Date(row.registration_approved_at).getTime();
          return sum + (end - start);
        }, 0);

        const avgMs = totalMs / approvals.length;
        const totalHours = avgMs / (1000 * 60 * 60);

        if (totalHours < 1) {
          avgStr = "< 1 hr";
        } else if (totalHours < 24) {
          avgStr = `${totalHours.toFixed(1)} hrs`;
        } else {
          const days = Math.floor(totalHours / 24);
          const remainingHours = Math.round(totalHours % 24);
          avgStr = `${days}d ${remainingHours}h`;
        }
      }

      setCounts({
        pendingCount: pending || 0,
        activeCount: approved || 0,
        rejectedCount: rejected || 0,
        totalUsers: users || 0,
        avgApprovalTime: avgStr,
      });
    } catch (err) {
      console.error("Error fetching dashboard counts:", err);
    }
  };

  const fetchPendingList = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sp_general_info")
        .select("id, business_name, business_city, business_province, registration_status, created_at, updated_at, sp_services!inner(id)")
        .eq("registration_status", "pending");

      if (dateRange.start) query = query.gte("created_at", dateRange.start);
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setUTCHours(23, 59, 59, 999);
        query = query.lte("created_at", endDate.toISOString());
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (!error) setProviderData(data || []);
    } catch (err) {
      console.error("Error fetching pending list:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchActiveList = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sp_general_info")
        .select("id, business_name, business_city, business_province, registration_status, created_at, updated_at, registration_approved_at")
        .eq("registration_status", "approved");

      if (dateRange.start) query = query.gte("registration_approved_at", dateRange.start);
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setUTCHours(23, 59, 59, 999);
        query = query.lte("registration_approved_at", endDate.toISOString());
      }

      const { data, error } = await query.order("registration_approved_at", { ascending: false });
      if (!error) setProviderData(data || []);
    } catch (err) {
      console.error("Error fetching active list:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchRejectedList = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sp_general_info")
        .select("id, business_name, business_city, business_province, registration_status, created_at, updated_at")
        .eq("registration_status", "rejected");

      if (dateRange.start) query = query.gte("updated_at", dateRange.start);
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setUTCHours(23, 59, 59, 999);
        query = query.lte("updated_at", endDate.toISOString());
      }

      const { data, error } = await query.order("updated_at", { ascending: false });
      if (!error) setProviderData(data || []);
    } catch (err) {
      console.error("Error fetching rejected list:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchUsersList = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("id, first_name, last_name, username, mobile_number, role, created_at")
        .neq("role", "admin");

      if (userRoleFilter === "both") {
        query = query.eq("role", "both_sp_po");
      } else if (userRoleFilter !== "all") {
        query = query.eq("role", userRoleFilter);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (!error) setUserData(data || []);
    } catch (err) {
      console.error("Error fetching users list:", err);
    } finally {
      setLoading(false);
    }
  }, [userRoleFilter]);

  // Initial load
  useEffect(() => {
    fetchAdminProfile();
    fetchDashboardCounts();
    loadSavedFilters();
  }, []);

  // Filter persistence
  useEffect(() => {
    if (!filtersRestored) return;
    sessionStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({ currentFilter, userRoleFilter, dateRange })
    );
  }, [currentFilter, userRoleFilter, dateRange, filtersRestored]);

  // Fetching router based on filter state
  useEffect(() => {
    if (!filtersRestored) return;
    if (currentFilter === "pending") fetchPendingList();
    else if (currentFilter === "active") fetchActiveList();
    else if (currentFilter === "rejected") fetchRejectedList();
    else if (currentFilter === "users") fetchUsersList();
  }, [currentFilter, dateRange, userRoleFilter, filtersRestored, fetchPendingList, fetchActiveList, fetchRejectedList, fetchUsersList]);

  return {
    adminName,
    counts,
    currentFilter,
    setCurrentFilter,
    userRoleFilter,
    setUserRoleFilter,
    dateRange,
    setDateRange,
    providerData,
    userData,
    loading,
  };
};