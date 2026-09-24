export type BookingTab =
  | 'awaiting_approval'
  | 'to_pay'
  | 'upcoming'
  | 'decline_cancelled'
  | 'refund'
  | 'completed';

export type ServiceItem = {
  id: string;
  booking_service_name: string;
  booking_price: number;
};

export type PetInfoItem = {
  id: string;
  booking_pet_name: string;
  booking_pet_type: string;
  booking_breed: string;
  booking_gender: string;
  booking_date_of_birth: string;
  booking_weight: number;
  booking_calculated_size: string;
  booking_behavior: string[];
  booking_emergency_consent: boolean;
  booking_grooming_notes: string | null;
  booking_ai_haircut_url?: string | null;
  booking_service_info?: ServiceItem[];
};

export type BookingRecord = {
  id: string;
  booking_date: string;
  booking_timeslot: string;
  booking_status: string;
  booking_rejection_reason?: string | null;
  booking_comment?: string | null;
  booking_total_amount: number;
  booking_pet_info?: PetInfoItem[];
};