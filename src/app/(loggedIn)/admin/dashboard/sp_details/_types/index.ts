// Interfaces

export const REJECTION_REASONS = [
  "Incomplete information",
  "Information cannot be verified",
  "Uploaded files are invalid or inappropriate",
  "Others",
];

export interface AdminResponder {
  id: string;
  first_name: string;
  last_name: string;
}

export interface OperatingHour {
  id: string;
  day_of_week: string;
  opening_time: string;
  closing_time: string;
  slot_capacity: number;
}

export interface Employee {
  id: string;
  employee_first_name: string;
  employee_last_name: string;
  employee_position: string;
}

export interface ServiceOption {
  id: string;
  pet_type: string;
  pet_size: string;
  pet_min_weight_range: number;
  pet_max_weight_range: number;
  service_price: number;
}

export interface Service {
  id: string;
  service_name: string;
  service_type: string;
  service_description: string;
  service_notes: string | null;
  sp_service_options: ServiceOption[];
}

export interface ProviderDetails {
  id: string;
  business_name: string;
  business_email: string;
  business_contact: string;
  business_street: string;
  business_barangay: string;
  business_city: string;
  business_province: string;
  business_postal_code: string;
  business_service_type: string;
  business_bio: string;
  business_permit_url: string | null;
  business_waiver_url: string | null;
  registration_status: string;
  registration_rejection_reason: string | null;
  registration_approved_at: string | null;
  updated_at: string;
  responder: AdminResponder | null;
  sp_operating_hours: OperatingHour[];
  sp_employees_info: Employee[];
  sp_services: Service[];
  sp_img_facilities: any[];
}
