import { PetFormData, PetFormErrors, ServiceOption, ServiceWeightOption } from './types';

/**
 * Highest weight (kg) the provider accepts for this pet's type.
 * Uses only the services already chosen for the pet; if none are chosen yet,
 * falls back to every service the provider offers.
 * Returns null while the provider's options are not loaded / none apply.
 */
export const getMaxAcceptedWeight = (
  pet: PetFormData,
  options: ServiceWeightOption[]
): number | null => {
  const targetType = pet.petType.toLowerCase();
  const chosenIds = pet.selectedServices.map((s) => s.serviceId).filter(Boolean);

  const relevant = options.filter(
    (opt) =>
      (opt.pet_type === 'both_dog_cat' || opt.pet_type === targetType) &&
      (chosenIds.length === 0 || chosenIds.includes(opt.sp_services_id))
  );

  return relevant.length > 0 ? Math.max(...relevant.map((o) => Number(o.pet_max_weight_range))) : null;
};

/**
 * Validates one pet form and returns a message per invalid field.
 * An empty object means the pet is ready to go to the summary.
 * `selectedServices[].matchedOptionId` is already resolved by calculateSizeAndPrice
 * (page.tsx), so a missing match means the weight/size is not offered by the provider.
 */
export const validatePet = (
  pet: PetFormData,
  options: ServiceWeightOption[],
  services: ServiceOption[]
): PetFormErrors => {
  const errors: PetFormErrors = {};

  // Every service row must be chosen (an unused extra row must be removed)
  const serviceErrors: (string | null)[] = pet.selectedServices.map((s) =>
    s.serviceId ? null : 'Please select a service (or remove this field).'
  );

  if (!pet.petType) errors.petType = 'Pet type is required.';
  if (!pet.petName.trim()) errors.petName = "Pet's name is required.";
  if (!pet.breed) errors.breed = 'Breed is required.';
  if (!pet.gender) errors.gender = 'Gender is required.';

  if (!pet.dob) {
    errors.dob = 'Date of birth is required.';
  } else if (new Date(pet.dob).getTime() > Date.now()) {
    errors.dob = 'Date of birth cannot be in the future.';
  }

  // Weight must exist, stay within the provider's max, and map to a size the
  // provider offers for every selected service.
  const weight = parseFloat(pet.weight);
  const maxWeight = getMaxAcceptedWeight(pet, options);

  if (isNaN(weight)) {
    errors.weight = 'Weight is required.';
  } else if (weight <= 0) {
    errors.weight = 'Weight must be greater than 0 kg.';
  } else if (maxWeight !== null && weight > maxWeight) {
    errors.weight = `This provider only accepts pets up to ${maxWeight} kg.`;
  } else {
    const unmatchedNames: string[] = [];
    pet.selectedServices.forEach((s, i) => {
      if (!s.serviceId || s.matchedOptionId) return;
      serviceErrors[i] = `No ${pet.petType.toLowerCase()} size offered for ${weight} kg on this service.`;
      unmatchedNames.push(services.find((svc) => svc.id === s.serviceId)?.service_name || 'service');
    });
    if (unmatchedNames.length > 0) {
      errors.weight = `${weight} kg (${pet.petType}) doesn't fall under any size this provider offers for: ${unmatchedNames.join(', ')}.`;
    }
  }

  if (serviceErrors.some(Boolean)) errors.services = serviceErrors;
  if (pet.behaviors.length === 0) errors.behaviors = 'Select at least one behavior.';
  // A new upload or an autofilled (already stored) record both count
  if (!pet.vaccineFile && !pet.vaccineUrl) errors.vaccine = 'Vaccine record is required.';

  return errors;
};

export const hasErrors = (errors: PetFormErrors): boolean => Object.keys(errors).length > 0;
