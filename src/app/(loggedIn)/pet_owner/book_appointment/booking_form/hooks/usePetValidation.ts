import { useMemo, useState } from 'react';
import { PetFormData, ServiceOption, ServiceWeightOption } from '../types';
import { validatePet, hasErrors } from '../validation';

interface Args {
  petForms: PetFormData[];
  serviceWeightOptions: ServiceWeightOption[];
  availableServices: ServiceOption[];
  /** Called when every pet form is valid (e.g. open the summary modal). */
  onValid: () => void;
}

export function usePetValidation({
  petForms,
  serviceWeightOptions,
  availableServices,
  onValid,
}: Args) {
  // Errors are only shown after the first failed "Proceed to Summary" attempt
  const [showValidation, setShowValidation] = useState(false);

  // Live validation result per pet form (recomputed whenever a form or the provider's options change)
  const petErrors = useMemo(
    () =>
      Object.fromEntries(
        petForms.map((pet) => [pet.id, validatePet(pet, serviceWeightOptions, availableServices)]),
      ),
    [petForms, serviceWeightOptions, availableServices],
  );

  const handleProceedToSummary = () => {
    const firstInvalid = petForms.find((pet) => hasErrors(petErrors[pet.id]));
    if (firstInvalid) {
      setShowValidation(true);
      document
        .getElementById(`pet-card-${firstInvalid.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setShowValidation(false);
    onValid();
  };

  return { petErrors, showValidation, handleProceedToSummary };
}