// Contains interfaces

export type FilterType = "pending" | "active" | "rejected" | "users" | null;
export type UserRoleFilter = "all" | "pet_owner" | "service_provider" | "both";

export interface DateRange {
  start: string;
  end: string;
}

export interface SavedFilters {
  currentFilter: FilterType;
  userRoleFilter: UserRoleFilter;
  dateRange: DateRange;
}

export interface ProviderRow {
  id: string;
  business_name: string;
  business_city: string | null;
  business_province: string | null;
  registration_status: string;
  created_at: string | null;
  updated_at: string | null;
  registration_approved_at?: string | null;
}

export interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  mobile_number: string | null;
  role: string | null;
  created_at: string | null;
}

export interface DashboardCounts {
  pendingCount: number;
  activeCount: number;
  rejectedCount: number;
  totalUsers: number;
  avgApprovalTime: string;
}