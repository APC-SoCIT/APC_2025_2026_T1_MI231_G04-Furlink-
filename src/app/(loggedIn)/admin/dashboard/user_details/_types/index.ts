export interface BookingServiceInfo {
  id: string;
  booking_service_name: string;
  booking_service_type: string;
  booking_price: number;
}

export interface BookingPetInfo {
  id: string;
  booking_pet_name: string;
  booking_pet_type: string;
  booking_breed: string;
  booking_gender: string;
  booking_weight: number;
  booking_calculated_size: string;
  booking_behavior: string[];
  booking_grooming_notes: string | null;
  booking_service_info: BookingServiceInfo[];
}

export interface BookingRow {
  id: string;
  booking_date: string;
  booking_timeslot: string;
  booking_status: string;
  booking_total_amount: number;
  booking_rejection_reason: string | null;
  booking_comment: string | null;
  booking_overall_rating: number | null;
  booking_staff_rating: number | null;
  created_at: string | null;
  sp_general_info: { business_name: string } | null;
  booking_pet_info: BookingPetInfo[];
}

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  mobile_number: string | null;
  date_of_birth: string | null;
  role: string | null;
  created_at: string | null;
}

export interface WarningRow {
  id: string;
  warning_message: string;
  created_at: string | null;
  severity: string;
  status: string; 
  expires_at: string | null;
  issued_by: string | null;
  issued_by_admin?: AdminInfo;
}

export interface SuspensionRow {
  id: string;
  reason: string;
  triggered_by_warning_ids: string[];
  suspended_at: string;
  suspended_until: string;
  lifted_at: string | null;
  lifted_by: string | null;
  suspended_by: string | null;
  status: string;
  suspended_by_admin?: AdminInfo;
  lifted_by_admin?: AdminInfo;
}

export interface AdminInfo {
  first_name: string | null;
  last_name: string | null;
}

// Roles that should have an email shown 
export const ROLES_WITH_EMAIL = ["service_provider", "both"];

// Labels for booking_status
export const STATUS_LABELS: Record<string, string> = {
  pending_sp_response: "Pending",
  approved: "Approved",
  rejected: "Declined",
  paid: "Paid",
  cancelled: "Cancelled",
  to_rate: "To Rate",
  rated: "Rated",
};

export const SUSPENSION_DAYS = 7;
export const WARNING_THRESHOLD = 3;