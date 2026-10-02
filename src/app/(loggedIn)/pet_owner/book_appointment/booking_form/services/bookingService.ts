import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PetFormData,
  ServiceOption,
  REVERSE_BEHAVIOR_MAP,
} from '../types';
import { uploadFileToBucket } from '../utils/storage';

const ALLOWED_SIZES = ['all', 'extra_small', 'small', 'medium', 'large', 'extra_large', 'cat'];

interface SaveBookingArgs {
  supabase: SupabaseClient;
  userId: string;
  spId: string;
  dateStr: string;
  timeSlot: string;
  grandTotal: number;
  petForms: PetFormData[];
  availableServices: ServiceOption[];
  /** Called as soon as the booking row exists, before pets are saved. */
  onBookingCreated: (bookingId: string) => void;
}

const mapBehaviors = (behaviors: string[]) =>
  behaviors.map((b) => REVERSE_BEHAVIOR_MAP[b] || b.toLowerCase());

function normalizeSize(calculatedSize: string, petType: string): string {
  const normalized = calculatedSize.toLowerCase().replace(/\s+/g, '_');
  if (ALLOWED_SIZES.includes(normalized)) return normalized;
  return petType.toLowerCase() === 'cat' ? 'cat' : 'medium';
}

async function createBookingRecord(
  supabase: SupabaseClient,
  args: Pick<SaveBookingArgs, 'userId' | 'spId' | 'dateStr' | 'timeSlot' | 'grandTotal'>,
): Promise<string> {
  const { data, error } = await supabase
    .from('booking_info')
    .insert({
      profiles_id: args.userId,
      sp_id: args.spId,
      booking_date: args.dateStr,
      booking_timeslot: args.timeSlot,
      booking_status: 'pending_sp_response',
      booking_total_amount: args.grandTotal,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to create booking.');
  return data.id;
}

async function uploadPetDocuments(
  supabase: SupabaseClient,
  userId: string,
  pet: PetFormData,
) {
  let vaccineUrl = pet.vaccineUrl || '';
  let illnessUrl = pet.illnessUrl || null;

  if (pet.vaccineFile) {
    const path = `${userId}/${Date.now()}_vaccine_${pet.vaccineFile.name}`;
    const uploaded = await uploadFileToBucket(supabase, pet.vaccineFile, path);
    if (uploaded) vaccineUrl = uploaded;
  }

  if (pet.illnessFile) {
    const path = `${userId}/${Date.now()}_illness_${pet.illnessFile.name}`;
    const uploaded = await uploadFileToBucket(supabase, pet.illnessFile, path);
    if (uploaded) illnessUrl = uploaded;
  }

  return { vaccineUrl, illnessUrl };
}

async function ensureRegisteredPet(
  supabase: SupabaseClient,
  userId: string,
  pet: PetFormData,
  docs: { vaccineUrl: string; illnessUrl: string | null },
): Promise<string> {
  if (pet.selectedRegisteredPetId) return pet.selectedRegisteredPetId;

  const { data, error } = await supabase
    .from('po_registered_pet')
    .insert({
      profiles_id: userId,
      pet_name: pet.petName,
      pet_type: pet.petType.toLowerCase(),
      pet_breed: pet.breed,
      pet_gender: pet.gender.toLowerCase(),
      pet_date_of_birth: pet.dob,
      pet_weight: parseFloat(pet.weight),
      pet_behaviors: mapBehaviors(pet.behaviors),
      pet_vaccine_url: docs.vaccineUrl,
      pet_illness_proof_url: docs.illnessUrl,
      pet_grooming_notes: pet.groomingSpecs || null,
      pet_emergency_consent: pet.emergencyConsent,
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to register pet context.');
  return data.id;
}

async function insertBookingPetInfo(
  supabase: SupabaseClient,
  bookingId: string,
  registeredPetId: string,
  pet: PetFormData,
  docs: { vaccineUrl: string; illnessUrl: string | null },
): Promise<string> {
  const { data, error } = await supabase
    .from('booking_pet_info')
    .insert({
      booking_info_id: bookingId,
      registered_pet_id: registeredPetId,
      booking_pet_name: pet.petName,
      booking_pet_type: pet.petType.toLowerCase(),
      booking_breed: pet.breed,
      booking_gender: pet.gender.toLowerCase(),
      booking_date_of_birth: pet.dob,
      booking_weight: parseFloat(pet.weight),
      booking_behavior: mapBehaviors(pet.behaviors),
      booking_vaccine_url: docs.vaccineUrl,
      booking_illness_proof_url: docs.illnessUrl,
      booking_grooming_notes: pet.groomingSpecs || null,
      booking_ai_haircut_url: pet.aiHaircutUrl || null,
      booking_emergency_consent: pet.emergencyConsent,
      booking_calculated_size: normalizeSize(pet.calculatedSize, pet.petType),
    })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to save pet booking info.');
  return data.id;
}

async function insertBookingServices(
  supabase: SupabaseClient,
  bookingPetInfoId: string,
  pet: PetFormData,
  availableServices: ServiceOption[],
) {
  const rows = pet.selectedServices
    .filter((svc) => svc.matchedOptionId)
    .map((svc) => {
      const svcObj = availableServices.find((s) => s.id === svc.serviceId);
      return {
        booking_pet_info_id: bookingPetInfoId,
        booking_services_id: svc.matchedOptionId,
        booking_service_name: svcObj ? svcObj.service_name : 'Service',
        booking_service_type: svcObj?.service_type || 'individual_service',
        booking_price: svc.price,
      };
    });

  if (rows.length === 0) return;

  const { error } = await supabase.from('booking_service_info').insert(rows);
  if (error) throw new Error(error.message);
}

/** Creates the booking and everything attached to it. Returns the new booking id. */
export async function saveBooking(args: SaveBookingArgs): Promise<string> {
  const { supabase, userId, petForms, availableServices, onBookingCreated } = args;

  const bookingId = await createBookingRecord(supabase, args);
  onBookingCreated(bookingId);

  for (const pet of petForms) {
    const docs = await uploadPetDocuments(supabase, userId, pet);
    const registeredPetId = await ensureRegisteredPet(supabase, userId, pet, docs);
    const bookingPetInfoId = await insertBookingPetInfo(
      supabase,
      bookingId,
      registeredPetId,
      pet,
      docs,
    );
    await insertBookingServices(supabase, bookingPetInfoId, pet, availableServices);
  }

  return bookingId;
}