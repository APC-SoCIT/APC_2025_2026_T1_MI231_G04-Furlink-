'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Footer from '@/components/Footer';

import {
  RegisteredPet,
  ServiceOption,
  ServiceWeightOption,
  SelectedServiceItem,
  PetFormData,
  REVERSE_BEHAVIOR_MAP,
  BEHAVIOR_MAP,
  DAYS_OF_WEEK,
} from './types';

import { HeaderBar } from './components/HeaderBar';
import { InfoSummaryCard } from './components/InfoSummaryCard';
import { PetFormCard } from './components/PetFormCard';
import { SummaryModal } from './components/SummaryModal';
import { SuccessModal } from './components/SuccessModal';
import { FailedModal } from './components/FailedModal';
import { PayLaterSuccessModal } from './components/PayLaterSuccessModal';
import { CapacityModal } from './components/CapacityModal';

import './booking_form.css';

const POLLINATIONS_EDIT_ENDPOINT = '/api/generate-haircut-preview';
const AI_PREVIEW_DIMENSION = 768;

function BookingFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const spId = searchParams.get('sp_id') || '';
  const dateStr = searchParams.get('date') || '2026-08-20';
  const timeSlot = searchParams.get('time') || '9:00 AM';
  const queryPetsCount = parseInt(searchParams.get('pets') || '1', 10);
  const statusParam = searchParams.get('status');

  const [slotCapacity, setSlotCapacity] = useState<number>(queryPetsCount || 1);
  const [showCapacityModal, setShowCapacityModal] = useState<boolean>(false);
  const [userRegisteredPets, setUserRegisteredPets] = useState<RegisteredPet[]>([]);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showFailedModal, setShowFailedModal] = useState<boolean>(false);
  const [showPayLaterSuccessModal, setShowPayLaterSuccessModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingPayLater, setIsSavingPayLater] = useState<boolean>(false);

  const [paymentAttempts, setPaymentAttempts] = useState<number>(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const [availableServices, setAvailableServices] = useState<ServiceOption[]>([]);
  const [serviceWeightOptions, setServiceWeightOptions] = useState<ServiceWeightOption[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);

  const [dogBreeds, setDogBreeds] = useState<string[]>([]);
  const [catBreeds, setCatBreeds] = useState<string[]>([]);
  const [loadingBreeds, setLoadingBreeds] = useState<boolean>(false);

  // Cooldown interval timer
  useEffect(() => {
    if (!cooldownUntil) return;
    const interval = setInterval(() => {
      const diff = cooldownUntil - Date.now();
      if (diff <= 0) {
        setCooldownUntil(null);
        setPaymentAttempts(0);
        setTimeRemaining('');
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownUntil]);

  // Payment status redirect handlers
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      if (statusParam === 'success') {
        if (activeBookingId) {
          await supabase
            .from('booking_info')
            .update({ booking_status: 'pending_sp_response' })
            .eq('id', activeBookingId);
        }
        setShowSuccessModal(true);
        setShowFailedModal(false);
        setShowSummaryModal(false);
      } else if (statusParam === 'failed' || statusParam === 'cancelled') {
        setShowFailedModal(true);
        setShowSuccessModal(false);
        setShowSummaryModal(false);
      } else {
        setShowFailedModal(false);
      }
    };
    handlePaymentSuccess();
  }, [statusParam, activeBookingId, supabase]);

  const formattedDateDisplay = useMemo(() => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }, [dateStr]);

  const formatDateForSummary = (dateVal: string) => {
    if (!dateVal) return 'N/A';
    try {
      return new Date(dateVal).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateVal;
    }
  };

  // Fetch Operating Capacity
  useEffect(() => {
    if (!spId || !dateStr) return;
    const fetchCapacity = async () => {
      const selectedDay = DAYS_OF_WEEK[new Date(dateStr).getDay()];
      const { data, error } = await supabase
        .from('sp_operating_hours')
        .select('slot_capacity')
        .eq('sp_id', spId)
        .eq('day_of_week', selectedDay)
        .single();

      if (!error && data?.slot_capacity) {
        setSlotCapacity(data.slot_capacity);
      }
    };
    fetchCapacity();
  }, [spId, dateStr, supabase]);

  // Fetch Available Services & Options
  useEffect(() => {
    if (!spId) return;
    const fetchServicesAndOptions = async () => {
      setLoadingServices(true);
      const { data: svcData, error: svcErr } = await supabase
        .from('sp_services')
        .select('id, sp_id, service_name, service_type, service_status')
        .eq('sp_id', spId)
        .eq('service_status', 'active');

      if (!svcErr && svcData) {
        setAvailableServices(svcData as ServiceOption[]);
        const serviceIds = svcData.map((s) => s.id);
        if (serviceIds.length > 0) {
          const { data: optData } = await supabase
            .from('sp_service_options')
            .select('*')
            .in('sp_services_id', serviceIds)
            .eq('option_status', 'active');

          if (optData) {
            setServiceWeightOptions(optData as ServiceWeightOption[]);
          }
        }
      }
      setLoadingServices(false);
    };
    fetchServicesAndOptions();
  }, [spId, supabase]);

  // Fetch Registered Pets
  useEffect(() => {
    const fetchRegisteredPets = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('po_registered_pet')
        .select('*')
        .eq('profiles_id', user.id);

      if (!error && data) {
        setUserRegisteredPets(data as RegisteredPet[]);
      }
    };
    fetchRegisteredPets();
  }, [supabase]);

  // Fetch External Breeds
  useEffect(() => {
    const fetchBreeds = async () => {
      setLoadingBreeds(true);
      try {
        const dogRes = await fetch('https://dog.ceo/api/breeds/list/all');
        const dogData = await dogRes.json();
        if (dogData.status === 'success') {
          const breedList: string[] = ['Aspin'];
          Object.keys(dogData.message).forEach((mainBreed) => {
            const subBreeds: string[] = dogData.message[mainBreed];
            if (subBreeds.length > 0) {
              subBreeds.forEach((sub) => {
                const formatted = `${sub} ${mainBreed}`
                  .split(' ')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                breedList.push(formatted);
              });
            } else {
              breedList.push(mainBreed.charAt(0).toUpperCase() + mainBreed.slice(1));
            }
          });
          setDogBreeds(breedList.sort());
        }

        const catRes = await fetch('https://api.thecatapi.com/v1/breeds');
        const catData = await catRes.json();
        if (Array.isArray(catData)) {
          setCatBreeds(['Puspin', ...catData.map((b: { name: string }) => b.name)].sort());
        }
      } catch (err) {
        console.error('Failed to fetch breeds', err);
      } finally {
        setLoadingBreeds(false);
      }
    };
    fetchBreeds();
  }, []);

  const createDefaultPet = (index: number): PetFormData => ({
    id: `pet-${Date.now()}-${index}-${Math.random()}`,
    selectedRegisteredPetId: '',
    selectedServices: [{ serviceId: '', matchedOptionId: null, price: 0 }],
    serviceError: null,
    petType: 'Dog',
    petName: '',
    breed: '',
    gender: 'Male',
    dob: '',
    weight: '',
    calculatedSize: 'AUTO-CALC',
    behaviors: [],
    vaccineFile: null,
    vaccineUrl: null,
    illnessFile: null,
    illnessUrl: null,
    groomingSpecs: '',
    desiredStyle: 'Lion Cut',
    emergencyConsent: false,
    aiSourcePhotoFile: null,
    aiSourcePhotoPreview: null,
    aiUploadedSourceUrl: null,
    customStyleDetail: '',
    aiLastSeed: null,
    aiPreviewBlob: null,
    aiPreviewImageUrl: null,
    aiPreviewStatus: 'idle',
    aiPreviewError: null,
    aiHaircutUrl: null,
  });

  const [petForms, setPetForms] = useState<PetFormData[]>(() => {
    const initialCount = Math.max(1, queryPetsCount);
    return Array.from({ length: initialCount }, (_, i) => createDefaultPet(i + 1));
  });

  const calculateSizeAndPrice = (
    weightStr: string,
    pType: 'Dog' | 'Cat',
    selectedSvcs: SelectedServiceItem[]
  ) => {
    const w = parseFloat(weightStr);
    const targetPetType = pType.toLowerCase();

    if (isNaN(w) || w < 0) {
      return {
        sizeLabel: 'AUTO-CALC',
        updatedServices: selectedSvcs.map((s) => ({ ...s, price: 0, matchedOptionId: null })),
      };
    }

    let detectedSize = 'AUTO-CALC';
    const updatedServices = selectedSvcs.map((item) => {
      if (!item.serviceId) return { ...item, price: 0, matchedOptionId: null };

      const matched = serviceWeightOptions.find((opt) => {
        if (opt.sp_services_id !== item.serviceId) return false;
        const isTypeMatch = opt.pet_type === 'both_dog_cat' || opt.pet_type === targetPetType;
        const isWeightMatch = w >= Number(opt.pet_min_weight_range) && w <= Number(opt.pet_max_weight_range);
        return isTypeMatch && isWeightMatch;
      });

      if (matched) {
        detectedSize = matched.pet_size;
        return { ...item, matchedOptionId: matched.id, price: Number(matched.service_price) };
      }
      return { ...item, matchedOptionId: null, price: 0 };
    });

    return { sizeLabel: detectedSize, updatedServices };
  };

  const handleAddPet = () => {
    if (petForms.length >= slotCapacity) {
      setShowCapacityModal(true);
      return;
    }
    setPetForms((prev) => [...prev, createDefaultPet(prev.length + 1)]);
  };

  const handleDeletePet = (id: string) => {
    if (petForms.length <= 1) return;
    setPetForms((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePetField = (id: string, field: keyof PetFormData, value: any) => {
    setPetForms((prev) =>
      prev.map((pet) => {
        if (pet.id !== id) return pet;
        const updatedPet = { ...pet, [field]: value };

        if (field === 'weight' || field === 'petType') {
          const { sizeLabel, updatedServices } = calculateSizeAndPrice(
            field === 'weight' ? value : pet.weight,
            field === 'petType' ? value : pet.petType,
            pet.selectedServices
          );
          updatedPet.calculatedSize = sizeLabel;
          updatedPet.selectedServices = updatedServices;
        }

        return updatedPet;
      })
    );
  };

  const handleServiceChange = (petId: string, index: number, serviceId: string) => {
    setPetForms((prev) =>
      prev.map((pet) => {
        if (pet.id !== petId) return pet;
        const currentServices = [...pet.selectedServices];
        currentServices[index] = { serviceId, matchedOptionId: null, price: 0 };

        const { sizeLabel, updatedServices } = calculateSizeAndPrice(
          pet.weight,
          pet.petType,
          currentServices
        );

        return {
          ...pet,
          selectedServices: updatedServices,
          calculatedSize: sizeLabel,
          serviceError: serviceId ? null : pet.serviceError,
        };
      })
    );
  };

  const handleAddServiceField = (petId: string) => {
    setPetForms((prev) =>
      prev.map((pet) => {
        if (pet.id !== petId) return pet;
        const lastService = pet.selectedServices[pet.selectedServices.length - 1];
        if (!lastService?.serviceId) {
          return { ...pet, serviceError: 'Please select a service before adding another field.' };
        }
        return {
          ...pet,
          selectedServices: [...pet.selectedServices, { serviceId: '', matchedOptionId: null, price: 0 }],
          serviceError: null,
        };
      })
    );
  };

  const handleRemoveServiceField = (petId: string, index: number) => {
    setPetForms((prev) =>
      prev.map((pet) => {
        if (pet.id !== petId || pet.selectedServices.length <= 1) return pet;
        const updatedServices = pet.selectedServices.filter((_, i) => i !== index);
        const { sizeLabel, updatedServices: recalculated } = calculateSizeAndPrice(
          pet.weight,
          pet.petType,
          updatedServices
        );

        return {
          ...pet,
          selectedServices: recalculated,
          calculatedSize: sizeLabel,
          serviceError: null,
        };
      })
    );
  };

  const handleAutofillPet = (formId: string, registeredPetId: string) => {
    const selectedPet = userRegisteredPets.find((p) => p.id === registeredPetId);
    if (!selectedPet) {
      updatePetField(formId, 'selectedRegisteredPetId', '');
      return;
    }

    const mappedBehaviors = (selectedPet.pet_behaviors || [])
      .map((b) => BEHAVIOR_MAP[b.toLowerCase()])
      .filter(Boolean);

    setPetForms((prev) =>
      prev.map((pet) => {
        if (pet.id !== formId) return pet;
        const pType = selectedPet.pet_type.toLowerCase() === 'cat' ? 'Cat' : 'Dog';
        const weightVal = selectedPet.pet_weight.toString();
        const { sizeLabel, updatedServices } = calculateSizeAndPrice(weightVal, pType, pet.selectedServices);

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
      })
    );
  };

  const toggleBehavior = (id: string, behavior: string) => {
    setPetForms((prev) =>
      prev.map((pet) => {
        if (pet.id !== id) return pet;
        const exists = pet.behaviors.includes(behavior);
        const updated = exists ? pet.behaviors.filter((b) => b !== behavior) : [...pet.behaviors, behavior];
        return { ...pet, behaviors: updated };
      })
    );
  };

  const grandTotal = useMemo(() => {
    return petForms.reduce((acc, pet) => {
      const petTotal = pet.selectedServices.reduce((sAcc, sItem) => sAcc + sItem.price, 0);
      return acc + petTotal;
    }, 0);
  }, [petForms]);

  const uploadFileToBucket = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage.from('ai-haircut-previews').upload(path, file);
    if (error) {
      console.error('File upload error:', error.message, error);
      throw new Error(`Upload failed: ${error.message}`);
    }
    const { data: publicData } = supabase.storage.from('ai-haircut-previews').getPublicUrl(data.path);
    return publicData.publicUrl;
  };

  const buildHaircutPrompt = (petType: string, style: string, customDetail: string) => {
    const styleDescription =
      style === 'Custom / Describe Below' && customDetail.trim() ? customDetail.trim() : style;
    return (
      `Professional pet grooming after-photo. Keep the exact same ${petType.toLowerCase()} ` +
      `(same face, same fur color and markings, same pose and background), but re-style its coat ` +
      `into a "${styleDescription}" haircut. Realistic, well-lit pet salon photo, no text, no watermark.`
    );
  };

  const patchPetForm = (petId: string, patch: Partial<PetFormData>) => {
    setPetForms((prev) => prev.map((p) => (p.id === petId ? { ...p, ...patch } : p)));
  };

  const handleUploadPetPhoto = (petId: string, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    patchPetForm(petId, {
      aiSourcePhotoFile: file,
      aiSourcePhotoPreview: previewUrl,
      aiUploadedSourceUrl: null,
      aiPreviewBlob: null,
      aiPreviewImageUrl: null,
      aiPreviewStatus: 'idle',
      aiPreviewError: null,
      aiHaircutUrl: null,
    });
  };

  const handleRemovePetPhoto = (petId: string) => {
    patchPetForm(petId, {
      aiSourcePhotoFile: null,
      aiSourcePhotoPreview: null,
      aiUploadedSourceUrl: null,
      aiPreviewBlob: null,
      aiPreviewImageUrl: null,
      aiPreviewStatus: 'idle',
      aiPreviewError: null,
      aiHaircutUrl: null,
    });
  };

  const handleEditConfirmedAiPreview = (petId: string) => {
    patchPetForm(petId, { aiHaircutUrl: null });
  };

  const runAiHaircutGeneration = async (petId: string, forceNewSeed: boolean) => {
    const pet = petForms.find((p) => p.id === petId);
    if (!pet) return;

    if (!pet.aiSourcePhotoFile && !pet.aiUploadedSourceUrl) {
      alert('Please upload a photo of your pet first.');
      return;
    }
    if (!pet.desiredStyle) {
      alert('Please select a desired haircut style.');
      return;
    }
    if (pet.desiredStyle === 'Custom / Describe Below' && !pet.customStyleDetail.trim()) {
      alert('Please describe the look you want for the custom style.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to use the AI haircut preview.');

      let sourceUrl = pet.aiUploadedSourceUrl;

      if (!sourceUrl) {
        patchPetForm(petId, { aiPreviewStatus: 'uploading', aiPreviewError: null });
        const filePath = `${user.id}/${Date.now()}_ai_source_${petId}_${pet.aiSourcePhotoFile!.name}`;
        sourceUrl = await uploadFileToBucket(pet.aiSourcePhotoFile!, filePath);
        patchPetForm(petId, { aiUploadedSourceUrl: sourceUrl });
      }

      patchPetForm(petId, { aiPreviewStatus: 'generating', aiPreviewError: null });

      const prompt = buildHaircutPrompt(pet.petType, pet.desiredStyle, pet.customStyleDetail);
      const seed = forceNewSeed || pet.aiLastSeed === null
        ? Math.floor(Math.random() * 1_000_000)
        : pet.aiLastSeed;

      const formData = new FormData();
      const sourceBlob = pet.aiSourcePhotoFile ?? (await (await fetch(sourceUrl)).blob());
      formData.append('image', sourceBlob, 'source.jpg');
      formData.append('prompt', prompt);
      formData.append('model', 'kontext');
      formData.append('size', `${AI_PREVIEW_DIMENSION}x${AI_PREVIEW_DIMENSION}`);
      formData.append('seed', String(seed)); // add this line

      const response = await fetch(POLLINATIONS_EDIT_ENDPOINT, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        console.error('AI preview error:', response.status, response.statusText, bodyText);
        throw new Error(bodyText || `AI service error (${response.status})`);
      }

      const blob = await response.blob();
      const previewObjectUrl = URL.createObjectURL(blob);

      patchPetForm(petId, {
        aiPreviewBlob: blob,
        aiPreviewImageUrl: previewObjectUrl,
        aiLastSeed: seed,
        aiPreviewStatus: 'idle',
        aiPreviewError: null,
        aiHaircutUrl: null,
      });
    } catch (err: any) {
      console.error('AI haircut generation error:', err);
      patchPetForm(petId, {
        aiPreviewStatus: 'error',
        aiPreviewError: err.message || 'Something went wrong while generating the preview.',
      });
    }
  };

  const handleGenerateAiPreview = (petId: string) => {
    runAiHaircutGeneration(petId, false);
  };

  const handleRegenerateAiPreview = (petId: string) => {
    runAiHaircutGeneration(petId, true);
  };

  const handleConfirmAiPreview = async (petId: string) => {
    const pet = petForms.find((p) => p.id === petId);
    if (!pet || !pet.aiPreviewBlob) return;

    patchPetForm(petId, { aiPreviewStatus: 'uploading', aiPreviewError: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to confirm this preview.');

      const fileName = `${Date.now()}_ai_haircut_${petId}.jpg`;
      const filePath = `${user.id}/${fileName}`;
      const fileToUpload = new File([pet.aiPreviewBlob], fileName, {
        type: pet.aiPreviewBlob.type || 'image/jpeg',
      });

      const uploadedUrl = await uploadFileToBucket(fileToUpload, filePath);

      patchPetForm(petId, {
        aiHaircutUrl: uploadedUrl,
        aiPreviewStatus: 'idle',
        aiPreviewError: null,
      });
    } catch (err: any) {
      console.error('AI haircut confirm error:', err);
      patchPetForm(petId, {
        aiPreviewStatus: 'error',
        aiPreviewError: err.message || 'Failed to confirm the preview. Please try again.',
      });
    }
  };

  const createBookingInDatabase = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User authentication failed. Please log in again.');

    let currentBookingId = activeBookingId;

    if (!currentBookingId) {
      const { data: bookingData, error: bookingErr } = await supabase
        .from('booking_info')
        .insert({
          profiles_id: user.id,
          sp_id: spId,
          booking_date: dateStr,
          booking_timeslot: timeSlot,
          booking_status: 'pending_sp_response',
          booking_total_amount: grandTotal,
        })
        .select()
        .single();

      if (bookingErr || !bookingData) throw new Error(bookingErr?.message || 'Failed to create booking.');
      currentBookingId = bookingData.id;
      setActiveBookingId(currentBookingId);
    }

    for (const pet of petForms) {
      let finalVaccineUrl = pet.vaccineUrl || '';
      let finalIllnessUrl = pet.illnessUrl || null;
      let regPetId = pet.selectedRegisteredPetId;

      if (pet.vaccineFile) {
        const filePath = `${user.id}/${Date.now()}_vaccine_${pet.vaccineFile.name}`;
        const uploadedUrl = await uploadFileToBucket(pet.vaccineFile, filePath);
        if (uploadedUrl) finalVaccineUrl = uploadedUrl;
      }

      if (pet.illnessFile) {
        const filePath = `${user.id}/${Date.now()}_illness_${pet.illnessFile.name}`;
        const uploadedUrl = await uploadFileToBucket(pet.illnessFile, filePath);
        if (uploadedUrl) finalIllnessUrl = uploadedUrl;
      }

      if (!regPetId) {
        const { data: newRegPet, error: regErr } = await supabase
          .from('po_registered_pet')
          .insert({
            profiles_id: user.id,
            pet_name: pet.petName,
            pet_type: pet.petType.toLowerCase(),
            pet_breed: pet.breed,
            pet_gender: pet.gender.toLowerCase(),
            pet_date_of_birth: pet.dob,
            pet_weight: parseFloat(pet.weight),
            pet_behaviors: pet.behaviors.map((b) => REVERSE_BEHAVIOR_MAP[b] || b.toLowerCase()),
            pet_vaccine_url: finalVaccineUrl,
            pet_illness_proof_url: finalIllnessUrl,
            pet_grooming_notes: pet.groomingSpecs || null,
            pet_emergency_consent: pet.emergencyConsent,
          })
          .select()
          .single();

        if (regErr || !newRegPet) throw new Error(regErr?.message || 'Failed to register pet context.');
        regPetId = newRegPet.id;
      }

      let normalizedSize = pet.calculatedSize.toLowerCase().replace(/\s+/g, '_');
      const allowedSizes = ['all', 'extra_small', 'small', 'medium', 'large', 'extra_large', 'cat'];
      if (!allowedSizes.includes(normalizedSize)) {
        normalizedSize = pet.petType.toLowerCase() === 'cat' ? 'cat' : 'medium';
      }

      const { data: petInfoData, error: petInfoErr } = await supabase
        .from('booking_pet_info')
        .insert({
          booking_info_id: currentBookingId,
          registered_pet_id: regPetId,
          booking_pet_name: pet.petName,
          booking_pet_type: pet.petType.toLowerCase(),
          booking_breed: pet.breed,
          booking_gender: pet.gender.toLowerCase(),
          booking_date_of_birth: pet.dob,
          booking_weight: parseFloat(pet.weight),
          booking_behavior: pet.behaviors.map((b) => REVERSE_BEHAVIOR_MAP[b] || b.toLowerCase()),
          booking_vaccine_url: finalVaccineUrl,
          booking_illness_proof_url: finalIllnessUrl,
          booking_grooming_notes: pet.groomingSpecs || null,
          booking_ai_haircut_url: pet.aiHaircutUrl || null,
          booking_emergency_consent: pet.emergencyConsent,
          booking_calculated_size: normalizedSize,
        })
        .select()
        .single();

      if (petInfoErr || !petInfoData) throw new Error(petInfoErr?.message || 'Failed to save pet booking info.');

      const servicesToInsert = pet.selectedServices
        .filter((svcItem) => svcItem.matchedOptionId)
        .map((svcItem) => {
          const matchedSvcObj = availableServices.find((s) => s.id === svcItem.serviceId);
          return {
            booking_pet_info_id: petInfoData.id,
            booking_services_id: svcItem.matchedOptionId,
            booking_service_name: matchedSvcObj ? matchedSvcObj.service_name : 'Service',
            booking_service_type: matchedSvcObj?.service_type || 'individual_service',
            booking_price: svcItem.price,
          };
        });

      if (servicesToInsert.length > 0) {
        const { error: svcInsertErr } = await supabase
          .from('booking_service_info')
          .insert(servicesToInsert);

        if (svcInsertErr) throw new Error(svcInsertErr.message);
      }
    }

    return { bookingInfoId: currentBookingId, userId: user.id };
  };

  const handleConfirmBooking = async () => {
    if (grandTotal <= 0) {
      alert('Invalid Booking: Total amount cannot be ₱0.00.');
      return;
    }
    if (cooldownUntil && Date.now() < cooldownUntil) {
      alert(`Payment attempts exceeded. Please try again in ${timeRemaining}.`);
      return;
    }

    setIsSubmitting(true);
    setShowFailedModal(false);

    try {
      const { bookingInfoId } = await createBookingInDatabase();
      const response = await fetch('/api/paymongo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: grandTotal,
          description: `Pet Grooming Session on ${formattedDateDisplay}`,
          bookingId: bookingInfoId,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.checkoutUrl) throw new Error(result.error || 'Failed to initialize payment.');

      const nextAttempts = paymentAttempts + 1;
      setPaymentAttempts(nextAttempts);
      if (nextAttempts >= 3) setCooldownUntil(Date.now() + 60 * 60 * 1000);

      window.open(result.checkoutUrl, '_blank');
      setShowSummaryModal(false);
      setIsSubmitting(false);
    } catch (err: any) {
      console.error('Booking processing error:', err);
      alert(`Booking Error: ${err.message || 'An error occurred while initiating payment.'}`);
      setIsSubmitting(false);
    }
  };

  const handlePayLater = async () => {
    if (grandTotal <= 0) {
      alert('Invalid Booking: Total amount cannot be ₱0.00.');
      return;
    }

    setIsSavingPayLater(true);
    try {
      const { bookingInfoId } = await createBookingInDatabase();
      const { error: updateErr } = await supabase
        .from('booking_info')
        .update({ booking_status: 'to pay' })
        .eq('id', bookingInfoId);

      if (updateErr) throw new Error(updateErr.message);

      setShowFailedModal(false);
      setShowPayLaterSuccessModal(true);
    } catch (err: any) {
      console.error('Pay Later Save Error:', err);
      alert(`Error saving booking for later: ${err.message}`);
    } finally {
      setIsSavingPayLater(false);
    }
  };

  return (
    <div className="booking-form-page">
      <main className="booking-form-main">
        <HeaderBar onBack={() => router.back()} />

        <InfoSummaryCard
          dateDisplay={formattedDateDisplay}
          timeSlot={timeSlot}
          grandTotal={grandTotal}
          onProceed={() => setShowSummaryModal(true)}
        />

        {petForms.map((pet, index) => (
          <PetFormCard
            key={pet.id}
            pet={pet}
            index={index}
            isLast={index === petForms.length - 1}
            totalPets={petForms.length}
            userRegisteredPets={userRegisteredPets}
            availableServices={availableServices}
            loadingServices={loadingServices}
            dogBreeds={dogBreeds}
            catBreeds={catBreeds}
            loadingBreeds={loadingBreeds}
            onAddPet={handleAddPet}
            onDeletePet={handleDeletePet}
            onUpdateField={updatePetField}
            onServiceChange={handleServiceChange}
            onAddServiceField={handleAddServiceField}
            onRemoveServiceField={handleRemoveServiceField}
            onAutofillPet={handleAutofillPet}
            onToggleBehavior={toggleBehavior}
            onUploadPetPhoto={handleUploadPetPhoto}
            onRemovePetPhoto={handleRemovePetPhoto}
            onGenerateAiPreview={handleGenerateAiPreview}
            onRegenerateAiPreview={handleRegenerateAiPreview}
            onConfirmAiPreview={handleConfirmAiPreview}
            onEditConfirmedAiPreview={handleEditConfirmedAiPreview}
          />
        ))}
      </main>

      {/* Summary Modal */}
      {showSummaryModal && (
        <SummaryModal
          petForms={petForms}
          availableServices={availableServices}
          grandTotal={grandTotal}
          isSubmitting={isSubmitting}
          cooldownUntil={cooldownUntil}
          formatDateForSummary={formatDateForSummary}
          onClose={() => setShowSummaryModal(false)}
          onConfirm={handleConfirmBooking}
        />
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <SuccessModal onRedirect={() => router.push('/pet_owner/manage_bookings')} />
      )}

      {/* Failed Modal */}
      {showFailedModal && !showSuccessModal && (
        <FailedModal
          cooldownUntil={cooldownUntil}
          timeRemaining={timeRemaining}
          paymentAttempts={paymentAttempts}
          isSavingPayLater={isSavingPayLater}
          onRetry={() => {
            setShowFailedModal(false);
            setShowSummaryModal(true);
          }}
          onPayLater={handlePayLater}
        />
      )}

      {/* Pay Later Modal */}
      {showPayLaterSuccessModal && (
        <PayLaterSuccessModal
          onRedirect={() => {
            setShowPayLaterSuccessModal(false);
            router.push('/pet_owner/manage_bookings');
          }}
        />
      )}

      {/* Capacity Modal */}
      {showCapacityModal && (
        <CapacityModal
          slotCapacity={slotCapacity}
          timeSlot={timeSlot}
          onClose={() => setShowCapacityModal(false)}
        />
      )}

      <Footer />
    </div>
  );
}

export default function BookingFormPage() {
  return (
    <Suspense fallback={<div className="loading-fallback">Loading booking form...</div>}>
      <BookingFormContent />
    </Suspense>
  );
}