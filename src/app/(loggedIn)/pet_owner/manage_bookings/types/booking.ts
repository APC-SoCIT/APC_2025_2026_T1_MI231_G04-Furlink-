export type BookingTab =
  | 'awaiting_approval'
  | 'to_pay'
  | 'upcoming'
  | 'cancelled'
  | 'refund'
  | 'completed';

export interface BookingServiceInfo {
  id: string;
  booking_service_name: string;
  booking_price: number;
}

export interface BookingPetInfo {
  id: string;
  booking_pet_name: string;
  booking_pet_type?: string;
  booking_breed?: string;
  booking_gender?: string;
  booking_date_of_birth?: string;
  booking_weight?: number;
  booking_calculated_size?: string;
  booking_behavior?: string[]; // Change this from string to string[]
  booking_emergency_consent?: boolean;
  booking_grooming_notes?: string;
  booking_ai_haircut_url?: string;
  booking_service_info?: BookingServiceInfo[];
}

export interface BookingRecord {
  id: string;
  booking_date: string;
  booking_timeslot: string;
  booking_status: string;
  booking_rejection_reason?: string;
  booking_review?: string; // Add this line here
  booking_comment?: string;
  booking_overall_rating?: number;
  booking_staff_rating?: number;
  booking_total_amount: number;
  booking_pet_info?: BookingPetInfo[];
}