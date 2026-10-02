import { useCallback, useMemo, useState } from 'react';
import {
  PetFormData,
  RegisteredPet,
  SelectedServiceItem,
  ServiceWeightOption,
  BEHAVIOR_MAP,
} from '../types';
import { calculateSizeAndPrice } from '../utils/pricing';
import { createDefaultPet } from '../utils/petFormFactory';

interface Args {
  initialCount: number;
  slotCapacity: number;
  serviceWeightOptions: ServiceWeightOption[];
  userRegisteredPets: RegisteredPet[];
  onCapacityReached: () => void;
}

const emptyService = (): SelectedServiceItem => ({
  serviceId: '',
  matchedOptionId: null,
  price: 0,
});

export function usePetForms({
  initialCount,
  slotCapacity,
  serviceWeightOptions,
  userRegisteredPets,
  onCapacityReached,
}: Args) {
  const [petForms, setPetForms] = useState<PetFormData[]>(() =>
    Array.from({ length: Math.max(1, initialCount) }, (_, i) => createDefaultPet(i + 1)),
  );

  const recalc = (weight: string, petType: 'Dog' | 'Cat', services: SelectedServiceItem[]) =>
    calculateSizeAndPrice(weight, petType, services, serviceWeightOptions);

  /** Update one pet by id with a partial patch. */
  const patchPetForm = useCallback((petId: string, patch: Partial<PetFormData>) => {
    setPetForms((prev) => prev.map((p) => (p.id === petId ? { ...p, ...patch } : p)));
  }, []);

  /** Apply a transform to one pet by id. */
  const mapPet = (petId: string, fn: (pet: PetFormData) => PetFormData) =>
    setPetForms((prev) => prev.map((pet) => (pet.id === petId ? fn(pet) : pet)));

  const handleAddPet = () => {
    if (petForms.length >= slotCapacity) {
      onCapacityReached();
      return;
    }
    setPetForms((prev) => [...prev, createDefaultPet(prev.length + 1)]);
  };

  const handleDeletePet = (id: string) => {
    if (petForms.length <= 1) return;
    setPetForms((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePetField = (id: string, field: keyof PetFormData, value: any) => {
    mapPet(id, (pet) => {
      const updatedPet = { ...pet, [field]: value };

      if (field === 'weight' || field === 'petType') {
        const { sizeLabel, updatedServices } = recalc(
          field === 'weight' ? value : pet.weight,
          field === 'petType' ? value : pet.petType,
          pet.selectedServices,
        );
        updatedPet.calculatedSize = sizeLabel;
        updatedPet.selectedServices = updatedServices;
      }

      return updatedPet;
    });
  };

  const handleServiceChange = (petId: string, index: number, serviceId: string) => {
    mapPet(petId, (pet) => {
      const currentServices = [...pet.selectedServices];
      currentServices[index] = { serviceId, matchedOptionId: null, price: 0 };

      const { sizeLabel, updatedServices } = recalc(pet.weight, pet.petType, currentServices);

      return {
        ...pet,
        selectedServices: updatedServices,
        calculatedSize: sizeLabel,
        serviceError: serviceId ? null : pet.serviceError,
      };
    });
  };

  const handleAddServiceField = (petId: string) => {
    mapPet(petId, (pet) => {
      const lastService = pet.selectedServices[pet.selectedServices.length - 1];
      if (!lastService?.serviceId) {
        return { ...pet, serviceError: 'Please select a service before adding another field.' };
      }
      return {
        ...pet,
        selectedServices: [...pet.selectedServices, emptyService()],
        serviceError: null,
      };
    });
  };

  const handleRemoveServiceField = (petId: string, index: number) => {
    mapPet(petId, (pet) => {
      if (pet.selectedServices.length <= 1) return pet;

      const remaining = pet.selectedServices.filter((_, i) => i !== index);
      const { sizeLabel, updatedServices } = recalc(pet.weight, pet.petType, remaining);

      return {
        ...pet,
        selectedServices: updatedServices,
        calculatedSize: sizeLabel,
        serviceError: null,
      };
    });
  };

  /** Registered pets already picked in the other pet forms (a pet can only be used once per booking). */
  const getTakenRegisteredPetIds = (formId: string) =>
    petForms
      .filter((p) => p.id !== formId && p.selectedRegisteredPetId)
      .map((p) => p.selectedRegisteredPetId);

  const handleAutofillPet = (formId: string, registeredPetId: string) => {
    if (registeredPetId && getTakenRegisteredPetIds(formId).includes(registeredPetId)) return;

    const selectedPet = userRegisteredPets.find((p) => p.id === registeredPetId);
    if (!selectedPet) {
      updatePetField(formId, 'selectedRegisteredPetId', '');
      return;
    }

    const mappedBehaviors = (selectedPet.pet_behaviors || [])
      .map((b) => BEHAVIOR_MAP[b.toLowerCase()])
      .filter(Boolean);

    mapPet(formId, (pet) => {
      const pType = selectedPet.pet_type.toLowerCase() === 'cat' ? 'Cat' : 'Dog';
      const weightVal = selectedPet.pet_weight.toString();
      const { sizeLabel, updatedServices } = recalc(weightVal, pType, pet.selectedServices);

      return {
        ...pet,
        selectedRegisteredPetId: registeredPetId,
        petType: pType,
        petName: selectedPet.pet_name,
        breed: selectedPet.pet_breed,
        gender: selectedPet.pet_gender.toLowerCase() === 'female' ? 'Female' : 'Male',
        dob: selectedPet.pet_date_of_birth,
        weight: weightVal,
        calculatedSize: sizeLabel,
        selectedServices: updatedServices,
        behaviors: mappedBehaviors,
        vaccineFile: null,
        vaccineUrl: selectedPet.pet_vaccine_url || null,
        illnessFile: null,
        illnessUrl: selectedPet.pet_illness_proof_url || null,
        groomingSpecs: selectedPet.pet_grooming_notes || '',
        emergencyConsent: selectedPet.pet_emergency_consent || false,
      };
    });
  };

  const toggleBehavior = (id: string, behavior: string) => {
    mapPet(id, (pet) => {
      const exists = pet.behaviors.includes(behavior);
      return {
        ...pet,
        behaviors: exists
          ? pet.behaviors.filter((b) => b !== behavior)
          : [...pet.behaviors, behavior],
      };
    });
  };

  const grandTotal = useMemo(
    () =>
      petForms.reduce(
        (acc, pet) => acc + pet.selectedServices.reduce((sAcc, s) => sAcc + s.price, 0),
        0,
      ),
    [petForms],
  );

  return {
    petForms,
    grandTotal,
    patchPetForm,
    handleAddPet,
    handleDeletePet,
    updatePetField,
    handleServiceChange,
    handleAddServiceField,
    handleRemoveServiceField,
    handleAutofillPet,
    getTakenRegisteredPetIds,
    toggleBehavior,
  };
}