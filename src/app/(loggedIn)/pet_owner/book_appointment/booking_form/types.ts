export type RegisteredPet = {
  id: string;
  pet_name: string;
  pet_type: 'dog' | 'cat';
  pet_breed: string;
  pet_gender: 'male' | 'female';
  pet_date_of_birth: string;
  pet_weight: number;
  pet_behaviors: string[];
  pet_vaccine_url: string;
  pet_illness_proof_url: string | null;
  pet_grooming_notes: string | null;
  pet_emergency_consent: boolean;
};

export type ServiceOption = {
  id: string;
  sp_id: string;
  service_name: string;
  service_type: string;
  service_status: string;
};

export type ServiceWeightOption = {
  id: string;
  sp_services_id: string;
  pet_type: string;
  pet_size: string;
  pet_min_weight_range: number;
  pet_max_weight_range: number;
  service_price: number;
  option_status: string;
};

export type SelectedServiceItem = {
  serviceId: string;
  matchedOptionId: string | null;
  price: number;
};

// Status of the AI haircut preview generation lifecycle for a single pet form.
export type AiPreviewStatus = 'idle' | 'uploading' | 'generating' | 'error';

export type PetFormData = {
  id: string;
  selectedRegisteredPetId: string;
  selectedServices: SelectedServiceItem[];
  serviceError: string | null;
  petType: 'Dog' | 'Cat';
  petName: string;
  breed: string;
  gender: 'Male' | 'Female';
  dob: string;
  weight: string;
  calculatedSize: string;
  behaviors: string[];
  vaccineFile: File | null;
  vaccineUrl: string | null;
  illnessFile: File | null;
  illnessUrl: string | null;
  groomingSpecs: string;
  desiredStyle: string;
  emergencyConsent: boolean;

  // Raw photo the pet owner uploaded to use as the source for the AI preview
  aiSourcePhotoFile: File | null;
  // Local preview of the uploaded source photo
  aiSourcePhotoPreview: string | null;
  // Public url of the source photo once uploaded to storage (cached so no need to re-upload when re-generate is clicked)
  aiUploadedSourceUrl: string | null;
  customStyleDetail: string;
  // Used for the most recent generation kept so "Regenerate" can pick a new one
  aiLastSeed: number | null;
  // The generated (not-yet-confirmed) preview image, held as a Blob + a local object URL for display.
  aiPreviewBlob: Blob | null;
  aiPreviewImageUrl: string | null;
  aiPreviewStatus: AiPreviewStatus;
  aiPreviewError: string | null;
  // Once the pet owner confirms a preview, it is uploaded to permanent storage and its public URL
  // lives here. This maps directly to booking_pet_info.booking_ai_haircut_url.
  aiHaircutUrl: string | null;
};

export const HAIRCUT_STYLE_OPTIONS = [
  'Teddy Bear Cut',
  'Puppy Cut',
  'Lion Cut',
  'Summer / Short All-Over Trim',
  'Breed Standard Trim',
  'Asian Fusion Style',
  'Custom / Describe Below',
];

export const REVERSE_BEHAVIOR_MAP: Record<string, string> = {
  'Friendly / Social': 'friendly',
  'Aggressive / Reactive': 'aggressive',
  'Anxious / Nervous': 'anxious',
  'High Energy': 'energetic',
  'House Trained': 'trained',
};

export const BEHAVIOR_MAP: Record<string, string> = {
  friendly: 'Friendly / Social',
  aggressive: 'Aggressive / Reactive',
  anxious: 'Anxious / Nervous',
  energetic: 'High Energy',
  trained: 'House Trained',
};

export const BEHAVIOR_OPTIONS = Object.values(BEHAVIOR_MAP);
export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];