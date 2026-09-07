export type BookingStatus = 
  | 'pending_sp_response' 
  | 'approved' 
  | 'rejected' 
  | 'paid' 
  | 'cancelled' 
  | 'to_rate' 
  | 'rated';

export interface BookingServiceInfo {
  id: string;
  booking_pet_info_id: string;
  booking_services_id: string;
  booking_service_name: string;
  booking_service_type: string;
  booking_price: number;
}

export interface BookingPetInfo {
  id: string;
  booking_info_id: string;
  registered_pet_id: string;
  booking_pet_name: string;
  booking_pet_type: string;
  booking_breed: string;
  booking_gender: string;
  booking_date_of_birth: string;
  booking_weight: number;
  booking_behavior: string[];
  booking_vaccine_url: string;
  booking_illness_proof_url?: string | null;
  booking_grooming_notes?: string | null;
  booking_ai_haircut_url?: string | null;
  booking_emergency_consent?: boolean | null;
  booking_calculated_size: string;
  booking_service_info?: BookingServiceInfo[];
}

export interface Booking {
  id: string;
  profiles_id: string;
  sp_id: string;
  booking_date: string;
  booking_timeslot: string;
  booking_status: BookingStatus;
  booking_rejection_reason?: string | null;
  booking_total_amount: number;
  paymongo_session_id?: string | null;
  created_at: string;
  updated_at: string;
  booking_overall_rating?: number | null;
  booking_staff_rating?: number | null;
  booking_comment?: string | null;
  
  // Embedded relation
  booking_pet_info?: BookingPetInfo[];
}