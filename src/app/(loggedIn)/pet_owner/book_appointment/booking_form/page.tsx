'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Footer from '@/components/Footer';
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaPlus,
  FaTrashAlt,
  FaExclamationCircle,
  FaFileUpload,
  FaExclamation,
  FaMagic,
  FaTimes,
  FaFileAlt,
  FaTag,
  FaMinus,
  FaChevronDown,
  FaCheckCircle,
  FaCreditCard,
  FaTimesCircle,
  FaClock,
} from 'react-icons/fa';
import './booking_form.css';

type RegisteredPet = {
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

type ServiceOption = {
  id: string;
  sp_id: string;
  service_name: string;
  service_type: string;
  service_status: string;
};

type ServiceWeightOption = {
  id: string;
  sp_services_id: string;
  pet_type: string;
  pet_size: string;
  pet_min_weight_range: number;
  pet_max_weight_range: number;
  service_price: number;
  option_status: string;
};

type SelectedServiceItem = {
  serviceId: string;
  matchedOptionId: string | null;
  price: number;
};

type PetFormData = {
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
};

const REVERSE_BEHAVIOR_MAP: Record<string, string> = {
  'Friendly / Social': 'friendly',
  'Aggressive / Reactive': 'aggressive',
  'Anxious / Nervous': 'anxious',
  'High Energy': 'energetic',
  'House Trained': 'trained',
};

const BEHAVIOR_MAP: Record<string, string> = {
  friendly: 'Friendly / Social',
  aggressive: 'Aggressive / Reactive',
  anxious: 'Anxious / Nervous',
  energetic: 'High Energy',
  trained: 'House Trained',
};

const BEHAVIOR_OPTIONS = Object.values(BEHAVIOR_MAP);
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

  // Track created booking ID for status updates
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  // Modal controls
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showFailedModal, setShowFailedModal] = useState<boolean>(false);
  const [showPayLaterSuccessModal, setShowPayLaterSuccessModal] = useState<boolean>(false);
  const [showPaymentBreakdown, setShowPaymentBreakdown] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingPayLater, setIsSavingPayLater] = useState<boolean>(false);

  // Payment Retry & 1-Hour Cooldown Logic
  const [paymentAttempts, setPaymentAttempts] = useState<number>(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!cooldownUntil) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = cooldownUntil - now;

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

  // Services and Service Weight Options
  const [availableServices, setAvailableServices] = useState<ServiceOption[]>([]);
  const [serviceWeightOptions, setServiceWeightOptions] = useState<ServiceWeightOption[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);

  // Breed API states
  const [dogBreeds, setDogBreeds] = useState<string[]>([]);
  const [catBreeds, setCatBreeds] = useState<string[]>([]);
  const [loadingBreeds, setLoadingBreeds] = useState<boolean>(false);

  // Automatically detect redirect status from PayMongo
  useEffect(() => {
    if (statusParam === 'success') {
      setShowSuccessModal(true);
      setShowSummaryModal(false);
    } else if (statusParam === 'failed' || statusParam === 'cancelled') {
      setShowFailedModal(true);
      setShowSummaryModal(false);
    }
  }, [statusParam]);

  const formattedDateDisplay = useMemo(() => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
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
      const d = new Date(dateVal);
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateVal;
    }
  };

  // Fetch Capacity
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

  // Fetch Services & options
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

  // Fetch User Registered Pets
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

  // Fetch Breeds
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
              const formatted = mainBreed.charAt(0).toUpperCase() + mainBreed.slice(1);
              breedList.push(formatted);
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

        const isTypeMatch =
          opt.pet_type === 'both_dog_cat' || opt.pet_type === targetPetType;

        const isWeightMatch =
          w >= Number(opt.pet_min_weight_range) && w <= Number(opt.pet_max_weight_range);

        return isTypeMatch && isWeightMatch;
      });

      if (matched) {
        detectedSize = matched.pet_size;

        return {
          ...item,
          matchedOptionId: matched.id,
          price: Number(matched.service_price),
        };
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
          return {
            ...pet,
            serviceError: 'Please select a service before adding another field.',
          };
        }

        return {
          ...pet,
          selectedServices: [
            ...pet.selectedServices,
            { serviceId: '', matchedOptionId: null, price: 0 },
          ],
          serviceError: null,
        };
      })
    );
  };

  const handleRemoveServiceField = (petId: string, index: number) => {
    setPetForms((prev) =>
      prev.map((pet) => {
        if (pet.id !== petId) return pet;
        if (pet.selectedServices.length <= 1) return pet;

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

        const { sizeLabel, updatedServices } = calculateSizeAndPrice(
          weightVal,
          pType,
          pet.selectedServices
        );

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
        const updated = exists
          ? pet.behaviors.filter((b) => b !== behavior)
          : [...pet.behaviors, behavior];
        return { ...pet, behaviors: updated };
      })
    );
  };

  const isImageFile = (file: File | null, url: string | null) => {
    if (file) return file.type.startsWith('image/');
    if (url) return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
    return false;
  };

  const grandTotal = useMemo(() => {
    return petForms.reduce((acc, pet) => {
      const petTotal = pet.selectedServices.reduce((sAcc, sItem) => sAcc + sItem.price, 0);
      return acc + petTotal;
    }, 0);
  }, [petForms]);

  const uploadFileToBucket = async (file: File, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from('pet_documents').upload(path, file);
    if (error) {
      console.error('File upload error:', error);
      return null;
    }
    const { data: publicData } = supabase.storage.from('pet_documents').getPublicUrl(data.path);
    return publicData.publicUrl;
  };

  // Process Booking Database Records
  const createBookingInDatabase = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User authentication failed. Please log in again.');
    }

    if (activeBookingId) {
      return { bookingInfoId: activeBookingId, userId: user.id };
    }

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

    if (bookingErr || !bookingData) {
      throw new Error(bookingErr?.message || 'Failed to create booking.');
    }

    const bookingInfoId = bookingData.id;
    setActiveBookingId(bookingInfoId);

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

        if (regErr || !newRegPet) {
          throw new Error(regErr?.message || 'Failed to register pet context.');
        }
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
          booking_info_id: bookingInfoId,
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
          booking_emergency_consent: pet.emergencyConsent,
          booking_calculated_size: normalizedSize,
        })
        .select()
        .single();

      if (petInfoErr || !petInfoData) {
        throw new Error(petInfoErr?.message || 'Failed to save pet booking info.');
      }

      const bookingPetInfoId = petInfoData.id;

      for (const svcItem of pet.selectedServices) {
        if (!svcItem.matchedOptionId) continue;

        const matchedSvcObj = availableServices.find((s) => s.id === svcItem.serviceId);

        const { error: svcInsertErr } = await supabase
          .from('booking_service_info')
          .insert({
            booking_pet_info_id: bookingPetInfoId,
            booking_services_id: svcItem.matchedOptionId,
            booking_service_name: matchedSvcObj ? matchedSvcObj.service_name : 'Service',
            booking_service_type: matchedSvcObj?.service_type || 'individual_service',
            booking_price: svcItem.price,
          });

        if (svcInsertErr) {
          throw new Error(svcInsertErr.message);
        }
      }
    }

    return { bookingInfoId, userId: user.id };
  };

  // Launch PayMongo Session with Retry Threshold
  const handleConfirmBooking = async () => {
    if (cooldownUntil && Date.now() < cooldownUntil) {
      alert(`Payment attempts exceeded. Please try again in ${timeRemaining}.`);
      return;
    }

    setIsSubmitting(true);
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

      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error || 'Failed to initialize payment.');
      }

      const nextAttempts = paymentAttempts + 1;
      setPaymentAttempts(nextAttempts);

      if (nextAttempts >= 3) {
        setCooldownUntil(Date.now() + 60 * 60 * 1000);
      }

      window.open(result.checkoutUrl, '_blank');
      
      setShowSummaryModal(false);
      setIsSubmitting(false);
      setShowFailedModal(true);

    } catch (err: any) {
      console.error('Booking processing error:', err);
      alert(`Booking Error: ${err.message || 'An error occurred while initiating payment.'}`);
      setIsSubmitting(false);
    }
  };

  // Handle Pay Later action
  const handlePayLater = async () => {
    setIsSavingPayLater(true);
    try {
      const { bookingInfoId } = await createBookingInDatabase();

      const { error: updateErr } = await supabase
        .from('booking_info')
        .update({ booking_status: 'to pay' })
        .eq('id', bookingInfoId);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      setShowFailedModal(false);
      setShowPayLaterSuccessModal(true);
    } catch (err: any) {
      console.error('Pay Later Save Error:', err);
      alert(`Error saving booking for later: ${err.message}`);
    } finally {
      setIsSavingPayLater(false);
    }
  };

  const handleConfirmPayLaterRedirect = () => {
    setShowPayLaterSuccessModal(false);
    router.push('/pet_owner/manage_bookings');
  };

  const handleReturnHome = () => {
    router.push('/pet_owner');
  };

  return (
    <div className="booking-form-page">
      <main className="booking-form-main">
        <div className="form-header-bar">
          <button className="back-circle-btn" onClick={() => router.back()}>
            <FaArrowLeft />
          </button>
          <h1 className="form-main-title">Pet Information</h1>
        </div>

        {/* Date & Pricing Summary Bar */}
        <div className="info-summary-card">
          <div className="summary-left">
            <div className="summary-date flex-item">
              <FaCalendarAlt className="summary-icon" />
              <span>{`${formattedDateDisplay} at ${timeSlot}`}</span>
            </div>
            <div className="summary-total">
              Total Amount: ₱{grandTotal.toFixed(2)}
            </div>
          </div>

          <div className="summary-right">
            <button className="proceed-btn" onClick={() => setShowSummaryModal(true)}>
              Proceed to Summary &rarr;
            </button>
          </div>
        </div>

        {petForms.map((pet, index) => {
          const currentBreedList = pet.petType === 'Dog' ? dogBreeds : catBreeds;
          const petFormTotal = pet.selectedServices.reduce((sum, item) => sum + item.price, 0);

          return (
            <div key={pet.id} className="pet-form-card">
              <div className="pet-card-header">
                <div className="pet-badge-tag">Pet #{index + 1}</div>
                <div className="pet-header-actions">
                  <span className="pet-price">₱{petFormTotal.toFixed(2)}</span>

                  {index === petForms.length - 1 && (
                    <button
                      type="button"
                      className="icon-action-btn add-btn"
                      onClick={handleAddPet}
                      title="Add another pet slot"
                    >
                      <FaPlus />
                    </button>
                  )}

                  {petForms.length > 1 && (
                    <button
                      type="button"
                      className="icon-action-btn delete-btn"
                      onClick={() => handleDeletePet(pet.id)}
                      title="Remove pet form"
                    >
                      <FaTrashAlt />
                    </button>
                  )}
                </div>
              </div>

              {/* Autofill Registered Pet Selector */}
              {userRegisteredPets.length > 0 && (
                <div className="autofill-banner-box">
                  <div className="autofill-label">
                    <FaMagic className="magic-icon" />
                    <span>Autofill from Registered Pets</span>
                  </div>
                  <select
                    className="form-control autofill-select"
                    value={pet.selectedRegisteredPetId}
                    onChange={(e) => handleAutofillPet(pet.id, e.target.value)}
                  >
                    <option value="">-- Choose a Registered Pet --</option>
                    {userRegisteredPets.map((regPet) => (
                      <option key={regPet.id} value={regPet.id}>
                        {regPet.pet_name} ({regPet.pet_type} - {regPet.pet_breed})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Service Selection */}
              <div className="section-block">
                <h3 className="block-title">Service Selection</h3>

                {pet.selectedServices.map((svcItem, sIdx) => (
                  <div key={sIdx} className="form-group service-row-group">
                    <label className="field-label flex-label">
                      <FaTag className="tag-icon" /> Select Service {sIdx + 1} *
                    </label>
                    <div className="input-with-action">
                      <select
                        className="form-control"
                        value={svcItem.serviceId}
                        onChange={(e) => handleServiceChange(pet.id, sIdx, e.target.value)}
                        disabled={loadingServices}
                      >
                        <option value="">
                          {loadingServices ? 'Loading services...' : 'Choose a Service'}
                        </option>
                        {availableServices.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.service_name} ({service.service_type === 'individual_service' ? 'Individual' : 'Package'})
                          </option>
                        ))}
                      </select>

                      {sIdx === pet.selectedServices.length - 1 && (
                        <button
                          type="button"
                          className="add-service-btn"
                          onClick={() => handleAddServiceField(pet.id)}
                          title="Add another service"
                        >
                          <FaPlus />
                        </button>
                      )}

                      {pet.selectedServices.length > 1 && (
                        <button
                          type="button"
                          className="remove-service-btn"
                          onClick={() => handleRemoveServiceField(pet.id, sIdx)}
                          title="Remove service"
                        >
                          <FaMinus />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {pet.serviceError && (
                  <div className="service-error-alert">
                    <FaExclamationCircle className="alert-icon" />
                    <span>{pet.serviceError}</span>
                  </div>
                )}
              </div>

              {/* Pet Information */}
              <div className="section-block">
                <h3 className="block-title">Pet Information</h3>

                <div className="form-grid-two">
                  <div className="form-group">
                    <label className="field-label">Pet Type *</label>
                    <select
                      className="form-control"
                      value={pet.petType}
                      onChange={(e) => {
                        const newType = e.target.value as 'Dog' | 'Cat';
                        updatePetField(pet.id, 'petType', newType);
                        updatePetField(pet.id, 'breed', '');
                      }}
                    >
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="field-label">Pet's Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Pet Name"
                      value={pet.petName}
                      onChange={(e) => updatePetField(pet.id, 'petName', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-grid-two">
                  <div className="form-group">
                    <label className="field-label">Breed *</label>
                    <select
                      className="form-control"
                      value={pet.breed}
                      onChange={(e) => updatePetField(pet.id, 'breed', e.target.value)}
                      disabled={loadingBreeds}
                    >
                      <option value="">
                        {loadingBreeds ? 'Loading breeds...' : '-- Select Breed --'}
                      </option>
                      {currentBreedList.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="Mixed Breed / Other">Mixed Breed / Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="field-label">Gender *</label>
                    <select
                      className="form-control"
                      value={pet.gender}
                      onChange={(e) => updatePetField(pet.id, 'gender', e.target.value as 'Male' | 'Female')}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-two">
                  <div className="form-group">
                    <label className="field-label">Date of Birth *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={pet.dob}
                      onChange={(e) => updatePetField(pet.id, 'dob', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="field-label">Weight (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      placeholder="0.0"
                      value={pet.weight}
                      onChange={(e) => updatePetField(pet.id, 'weight', e.target.value)}
                    />
                  </div>
                </div>

                {/* Calculated Size Badge */}
                <div className="calc-size-box">
                  Calculated Size: <strong>{pet.calculatedSize.toUpperCase()}</strong>
                </div>

                {/* Behaviors */}
                <div className="form-group">
                  <label className="field-label">Pet Behavior *</label>
                  <div className="checkbox-row">
                    {BEHAVIOR_OPTIONS.map((opt) => (
                      <label key={opt} className="custom-checkbox">
                        <input
                          type="checkbox"
                          checked={pet.behaviors.includes(opt)}
                          onChange={() => toggleBehavior(pet.id, opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Medical Records */}
                <div className="form-group">
                  <label className="field-label">Medical Records</label>
                  <div className="medical-records-grid">
                    {pet.vaccineFile || pet.vaccineUrl ? (
                      <div className="file-preview-card">
                        <button
                          type="button"
                          className="remove-file-badge"
                          onClick={() => {
                            updatePetField(pet.id, 'vaccineFile', null);
                            updatePetField(pet.id, 'vaccineUrl', null);
                          }}
                          title="Remove file"
                        >
                          <FaTimes />
                        </button>

                        {isImageFile(pet.vaccineFile, pet.vaccineUrl) ? (
                          <img
                            src={
                              pet.vaccineFile
                                ? URL.createObjectURL(pet.vaccineFile)
                                : pet.vaccineUrl!
                            }
                            alt="Vaccine Record"
                            className="record-preview-img"
                          />
                        ) : (
                          <div className="file-doc-placeholder">
                            <FaFileAlt className="doc-icon" />
                            <span>Vaccine Record</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <label className="upload-dropzone">
                        <FaFileUpload className="upload-icon" />
                        <span>Vaccine Record *</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              updatePetField(pet.id, 'vaccineFile', file);
                              updatePetField(pet.id, 'vaccineUrl', null);
                            }
                          }}
                        />
                      </label>
                    )}

                    {pet.illnessFile || pet.illnessUrl ? (
                      <div className="file-preview-card">
                        <button
                          type="button"
                          className="remove-file-badge"
                          onClick={() => {
                            updatePetField(pet.id, 'illnessFile', null);
                            updatePetField(pet.id, 'illnessUrl', null);
                          }}
                          title="Remove file"
                        >
                          <FaTimes />
                        </button>

                        {isImageFile(pet.illnessFile, pet.illnessUrl) ? (
                          <img
                            src={
                              pet.illnessFile
                                ? URL.createObjectURL(pet.illnessFile)
                                : pet.illnessUrl!
                            }
                            alt="Illness Record"
                            className="record-preview-img"
                          />
                        ) : (
                          <div className="file-doc-placeholder">
                            <FaFileAlt className="doc-icon" />
                            <span>Illness Record</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <label className="upload-dropzone">
                        <FaFileUpload className="upload-icon" />
                        <span>Illness Record</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              updatePetField(pet.id, 'illnessFile', file);
                              updatePetField(pet.id, 'illnessUrl', null);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Grooming Specifications */}
                <div className="form-group">
                  <label className="field-label">Grooming Specifications</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="e.g., leave the tail fluffy, trim short around eyes..."
                    value={pet.groomingSpecs}
                    onChange={(e) => updatePetField(pet.id, 'groomingSpecs', e.target.value)}
                  />
                </div>

                {/* Emergency Consent Checkbox */}
                <div className="form-group consent-check">
                  <label className="custom-checkbox">
                    <input
                      type="checkbox"
                      checked={pet.emergencyConsent}
                      onChange={(e) => updatePetField(pet.id, 'emergencyConsent', e.target.checked)}
                    />
                    <span>
                      I agree that in a critical emergency, the Provider has permission to transport my pet to the nearest emergency facility.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* 1. BOOKING CONFIRMATION SUMMARY MODAL */}
      {showSummaryModal && (
        <div className="modal-backdrop">
          <div className="summary-modal-card">
            <div className="summary-modal-header">
              <div className="modal-header-title">
                <FaFileAlt className="header-doc-icon" />
                <h2>Booking Confirmation</h2>
              </div>
              <button
                className="modal-close-x"
                onClick={() => setShowSummaryModal(false)}
                disabled={isSubmitting}
              >
                <FaTimes />
              </button>
            </div>

            <div className="summary-modal-body">
              {petForms.map((pet, pIdx) => {
                const petTotal = pet.selectedServices.reduce((sum, s) => sum + s.price, 0);

                return (
                  <div key={pet.id} className="summary-pet-card">
                    <div className="summary-pet-top">
                      <h3 className="summary-pet-name">
                        Pet #{pIdx + 1}: {pet.petName || 'Unnamed Pet'}
                      </h3>
                      <div className="summary-pet-total-box">
                        <span className="summary-pet-total-label">Pet Total</span>
                        <span className="summary-pet-total-val">₱{petTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="summary-pet-info-grid">
                      <div>Type: <strong>{pet.petType}</strong></div>
                      <div>Breed: <strong>{pet.breed || 'N/A'}</strong></div>
                      <div>Gender: <strong>{pet.gender}</strong></div>
                      <div>Birth Date: <strong>{formatDateForSummary(pet.dob)}</strong></div>
                      <div>Weight: <strong>{pet.weight ? `${pet.weight} kg` : 'N/A'}</strong></div>
                      <div>Size: <strong>{pet.calculatedSize.toUpperCase()}</strong></div>
                    </div>

                    <div className="summary-services-box">
                      <div className="availed-title">AVAILED SERVICES:</div>
                      {pet.selectedServices.map((sItem, sIndex) => {
                        const matchedSvc = availableServices.find((s) => s.id === sItem.serviceId);
                        return (
                          <div key={sIndex} className="availed-service-item">
                            <span>• {matchedSvc ? matchedSvc.service_name : 'No service selected'}</span>
                            <span>₱{sItem.price.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="summary-behaviors">
                      Behaviors: {pet.behaviors.length > 0 ? pet.behaviors.join(' / ') : 'None selected'}
                    </div>

                    <div className={`summary-consent-badge ${pet.emergencyConsent ? 'approved' : 'declined'}`}>
                      <FaExclamationCircle />
                      <span>
                        Emergency Transport Consent: {pet.emergencyConsent ? 'APPROVED' : 'DECLINED'}
                      </span>
                    </div>
                  </div>
                );
              })}

              <hr className="summary-divider" />

              <div className="paymongo-supported-methods">
                <div className="payment-notice-header">
                  <FaCreditCard className="pay-icon" />
                  <span>Secure Online Payment via PayMongo</span>
                </div>
                <div className="payment-badges-list">
                  <span className="pay-badge gcash">GCash</span>
                  <span className="pay-badge maya">Maya</span>
                  <span className="pay-badge card">Cards</span>
                  <span className="pay-badge qrph">QR Ph</span>
                </div>
              </div>

              <div className="summary-financials">
                <div className="financial-row total-row">
                  <span>Total Service Amount (VAT Inclusive):</span>
                  <span className="amount-bold">₱{grandTotal.toFixed(2)}</span>
                </div>

                <div className="breakdown-toggle-box">
                  <button
                    className="toggle-breakdown-btn"
                    onClick={() => setShowPaymentBreakdown(!showPaymentBreakdown)}
                  >
                    <span>See payment breakdown</span>
                    <FaChevronDown className={`chevron-icon ${showPaymentBreakdown ? 'open' : ''}`} />
                  </button>

                  {showPaymentBreakdown && (
                    <div className="payment-breakdown-details">
                      {petForms.map((p, idx) => (
                        <div key={p.id} className="breakdown-item">
                          <span>Pet #{idx + 1} ({p.petName || 'Unnamed'}):</span>
                          <span>₱{p.selectedServices.reduce((a, b) => a + b.price, 0).toFixed(2)}</span>
                        </div>
                      ))}
                      <hr className="breakdown-dashed-hr" />
                      <div className="breakdown-item bold-item">
                        <span>Grand Total:</span>
                        <span>₱{grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="summary-modal-footer">
              <button
                className="btn-back-edit"
                onClick={() => setShowSummaryModal(false)}
                disabled={isSubmitting}
              >
                Back to Edit
              </button>
              <button
                className="btn-confirm-booking"
                onClick={handleConfirmBooking}
                disabled={isSubmitting || cooldownUntil !== null}
              >
                {isSubmitting ? 'Opening Gateway...' : cooldownUntil ? 'Payment Locked' : 'Pay with PayMongo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PAYMENT COMPLETED SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="modal-backdrop">
          <div className="success-modal-card">
            <div className="success-icon-wrapper">
              <FaCheckCircle className="success-green-check" />
            </div>
            <h2 className="success-title">Payment Completed!</h2>
            <p className="success-message">
              Your payment has been successfully processed and your booking request is submitted. Please wait for the provider to confirm your slot.
            </p>
            <button className="btn-return-home" onClick={handleReturnHome}>
              Return to Home
            </button>
          </div>
        </div>
      )}

      {/* 3. PAYMENT FAILED / INCOMPLETE MODAL WITH RETRY & COOLDOWN */}
      {showFailedModal && !showSuccessModal && (
        <div className="modal-backdrop">
          <div className="success-modal-card">
            <div className="failed-icon-wrapper">
              <FaTimesCircle className="failed-red-cross" />
            </div>
            <h2 className="failed-title">Payment Incomplete or Cancelled</h2>
            
            {cooldownUntil ? (
              <p className="success-message">
                You have reached the maximum number of payment attempts (3/3). Online payment attempts are temporarily locked. Please try again in <strong>{timeRemaining}</strong> or choose <strong>Pay Later</strong>.
              </p>
            ) : (
              <p className="success-message">
                Your payment transaction was not completed. You have <strong>{3 - paymentAttempts}</strong> attempt(s) remaining before a 1-hour cooldown.
              </p>
            )}

            <div className="failed-modal-actions">
              <button
                className="btn-try-again"
                disabled={isSavingPayLater || cooldownUntil !== null}
                onClick={() => {
                  setShowFailedModal(false);
                  setShowSummaryModal(true);
                }}
              >
                {cooldownUntil ? 'Locked' : 'Try Again'}
              </button>
              <button
                className="btn-pay-later"
                disabled={isSavingPayLater}
                onClick={handlePayLater}
              >
                <FaClock />
                {isSavingPayLater ? 'Saving...' : 'Pay Later'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. PAY LATER SUCCESS CONFIRMATION MODAL */}
      {showPayLaterSuccessModal && (
        <div className="modal-backdrop">
          <div className="success-modal-card">
            <div className="success-icon-wrapper">
              <FaCheckCircle className="success-green-check" />
            </div>
            <h2 className="success-title">Booking Saved!</h2>
            <p className="success-message">
              Your booking status has been updated to <strong>"To Pay"</strong>. You can view and manage your booking anytime from your appointments dashboard.
            </p>
            <button 
              className="btn-return-home" 
              onClick={handleConfirmPayLaterRedirect}
            >
              Go to Manage Bookings
            </button>
          </div>
        </div>
      )}

      {/* Capacity Reached Modal */}
      {showCapacityModal && (
        <div className="capacity-modal-overlay">
          <div className="capacity-modal-card">
            <div className="capacity-icon-circle">
              <FaExclamation className="capacity-exclamation-icon" />
            </div>
            <h2 className="capacity-modal-title">Capacity Reached</h2>
            <p className="capacity-modal-message">
              We apologize, but this shop only has <strong>{slotCapacity} slot(s)</strong> remaining for your selected time:
            </p>
            <p className="capacity-modal-time">
              <strong>{timeSlot}</strong>.
            </p>
            <button
              className="capacity-modal-btn"
              onClick={() => setShowCapacityModal(false)}
            >
              Got it
            </button>
          </div>
        </div>
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