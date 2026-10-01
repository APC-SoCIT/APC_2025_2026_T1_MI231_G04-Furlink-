export const ROLE_PET_OWNER = "pet_owner";
export const ROLE_SERVICE_PROVIDER = "service_provider";
export const ROLE_BOTH = "both_sp_po";

export interface BookingServiceInfo {
  id: string;
  booking_service_name: string;
  booking_service_type: string;
  booking_price: number;
}

export interface EmployeeInfo {
  id: string;
  [key: string]: any;
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
  assigned_employee_id?: string | null;
  assigned_employee?: EmployeeInfo | null;
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
  booking_review: string | null;
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

export interface PetOwnerInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  mobile_number: string | null;
}

export interface SpBookingRow extends Omit<BookingRow, "sp_general_info"> {
    profiles_id: string;
  cancelled_by: string | null;
  refund_amount: number | null;
  refund_reason: string | null;
  pet_owner: PetOwnerInfo | null;
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

export type HistoryEntryType = "warning" | "suspension";

export interface HistoryEntry {
  id: string;
  type: HistoryEntryType;
  date: string;
  issued_by_admin?: AdminInfo;
  status: string;
  severity?: string;
  original: WarningRow | SuspensionRow;
}

export interface SeverityLevel {
  value: string;
  label: string;
  description: string;
}

// Roles that have a service provider side show booked services
export const SP_ROLES = [ROLE_SERVICE_PROVIDER, ROLE_BOTH];

// Roles that have a pet owner side show booking history
export const PO_ROLES = [ROLE_PET_OWNER, ROLE_BOTH];

// Roles that should have an email shown 
export const ROLES_WITH_EMAIL = SP_ROLES;

// Labels for booking_status
export const STATUS_LABELS: Record<string, string> = {
  pending_sp_response: "Pending",
  "to pay": "To Pay",
  approved: "Approved",
  rejected: "Declined",
  paid: "Paid",
  cancelled: "Cancelled",
  cancelled_by_po: "Cancelled by Pet Owner",
  processing: "Processing",
  to_refund: "To Refund",
  refunded: "Refunded",
  to_rate: "To Rate",
  rated: "Rated",
  completed: "Completed",
};

export const SUSPENSION_DAYS = 7;
export const WARNING_THRESHOLD = 3;

// Severity levels
export const SEVERITY_LEVELS: SeverityLevel[] = [
  { value: "minor", 
    label: "Minor", 
    description: "For Pet Owners: Excessive cancellations, profanity in feedback, and inaccurate pet info. For Service Providers: Response delays"
  },
  { value: "normal", 
    label: "Normal", 
    description: "For Pet Owners: No-show and repeated minor warnings within 30 days. For Service Providers: High cancellation, minor service complaints"
  },
  { value: "severe", 
    label: "Severe",
    description: "For Pet Owners: Abusing multi-booking to lock SP calendars, and posting explicit harrasment, hate speech  or sever verbal attacks. For Service Providers: Unable to fulfill paid bookings"
  },
  { value: "critical", 
    label: "Critical", 
    description: "For Pet Owners: Direct fraud, severe threats of violence against staff or animals, and 3 Accumulated suspensions. For Service Providers: 3 Accumulated suspensions"
  },
];