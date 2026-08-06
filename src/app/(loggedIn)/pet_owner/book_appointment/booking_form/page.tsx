'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Footer from '@/components/Footer';
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCreditCard,
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

type PetFormData = {
  id: string;
  selectedRegisteredPetId: string;
  selectedServices: string[]; // Holds selected service IDs array
  serviceError: string | null; // Holds validation message if add is clicked without selecting
  petType: 'Dog' | 'Cat';
  petName: string;
  breed: string;
  gender: 'Male' | 'Female';
  dob: string;
  weight: string;
  behaviors: string[];
  vaccineFile: File | null;
  vaccineUrl: string | null;
  illnessFile: File | null;
  illnessUrl: string | null;
  groomingSpecs: string;
  desiredStyle: string;
  emergencyConsent: boolean;
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

  const [slotCapacity, setSlotCapacity] = useState<number>(queryPetsCount || 1);
  const [showCapacityModal, setShowCapacityModal] = useState<boolean>(false);
  const [userRegisteredPets, setUserRegisteredPets] = useState<RegisteredPet[]>([]);

  // Services offered by the specific Service Provider
  const [availableServices, setAvailableServices] = useState<ServiceOption[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);

  // Breed API states
  const [dogBreeds, setDogBreeds] = useState<string[]>([]);
  const [catBreeds, setCatBreeds] = useState<string[]>([]);
  const [loadingBreeds, setLoadingBreeds] = useState<boolean>(false);

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

  // 1. Fetch Provider Slot Capacity
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

  // 2. Fetch Active Services offered by Provider
  useEffect(() => {
    if (!spId) return;

    const fetchServices = async () => {
      setLoadingServices(true);
      const { data, error } = await supabase
        .from('sp_services')
        .select('id, sp_id, service_name, service_type, service_status')
        .eq('sp_id', spId)
        .eq('service_status', 'active');

      if (!error && data) {
        setAvailableServices(data as ServiceOption[]);
      }
      setLoadingServices(false);
    };

    fetchServices();
  }, [spId, supabase]);

  // 3. Fetch User Registered Pets
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

  // 4. Fetch Breeds
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
    selectedServices: [''], // Starts with 1 empty service dropdown
    serviceError: null,
    petType: 'Dog',
    petName: '',
    breed: '',
    gender: 'Male',
    dob: '',
    weight: '',
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
      prev.map((pet) => (pet.id === id ? { ...pet, [field]: value } : pet))
    );
  };

  // Service Management per Pet
  const handleServiceChange = (petId: string, index: number, value: string) => {
    setPetForms((prev) =>
      prev.map((pet) => {
        if (pet.id !== petId) return pet;
        const updatedServices = [...pet.selectedServices];
        updatedServices[index] = value;
        return {
          ...pet,
          selectedServices: updatedServices,
          serviceError: value ? null : pet.serviceError, // clear error if user selects
        };
      })
    );
  };

  const handleAddServiceField = (petId: string) => {
    setPetForms((prev) =>
      prev.map((pet) => {
        if (pet.id !== petId) return pet;

        // Check if last service input is empty
        const lastService = pet.selectedServices[pet.selectedServices.length - 1];
        if (!lastService) {
          return {
            ...pet,
            serviceError: 'Please select a service before adding another field.',
          };
        }

        return {
          ...pet,
          selectedServices: [...pet.selectedServices, ''],
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
        return {
          ...pet,
          selectedServices: updatedServices,
          serviceError: null,
        };
      })
    );
  };

  // Handle pet selection for autofill
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
        return {
          ...pet,
          selectedRegisteredPetId: registeredPetId,
          petType: selectedPet.pet_type.toLowerCase() === 'cat' ? 'Cat' : 'Dog',
          petName: selectedPet.pet_name,
          breed: selectedPet.pet_breed,
          gender: selectedPet.pet_gender.toLowerCase() === 'female' ? 'Female' : 'Male',
          dob: selectedPet.pet_date_of_birth,
          weight: selectedPet.pet_weight.toString(),
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

  const calculateSize = (weightStr: string) => {
    const w = parseFloat(weightStr);
    if (isNaN(w) || w <= 0) return 'AUTO-CALC';
    if (w < 5) return 'Small (under 5kg)';
    if (w <= 15) return 'Medium (5-15kg)';
    return 'Large (over 15kg)';
  };

  const isImageFile = (file: File | null, url: string | null) => {
    if (file) return file.type.startsWith('image/');
    if (url) return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
    return false;
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

        <div className="info-summary-card">
          <div className="summary-left">
            <div className="summary-date flex-item">
              <FaCalendarAlt className="summary-icon" />
              <span>{`${formattedDateDisplay} at ${timeSlot}`}</span>
            </div>
            <div className="summary-total">Total Amount: ₱0.00</div>
          </div>

          <div className="summary-right">
            <div className="summary-downpayment">
              <FaCreditCard className="summary-icon" />
              <div>
                <strong>30% Down Payment: ₱0.00</strong>
                <span className="sub-text">(VAT Inclusive)</span>
              </div>
            </div>
            <button className="proceed-btn">Proceed to Summary &rarr;</button>
          </div>
        </div>

        {petForms.map((pet, index) => {
          const currentBreedList = pet.petType === 'Dog' ? dogBreeds : catBreeds;

          return (
            <div key={pet.id} className="pet-form-card">
              <div className="pet-card-header">
                <div className="pet-badge-tag">Pet #{index + 1}</div>
                <div className="pet-header-actions">
                  <span className="pet-price">₱0.00</span>

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

                {pet.selectedServices.map((svcVal, sIdx) => (
                  <div key={sIdx} className="form-group service-row-group">
                    <label className="field-label flex-label">
                      <FaTag className="tag-icon" /> Select Service {sIdx + 1} *
                    </label>
                    <div className="input-with-action">
                      <select
                        className="form-control"
                        value={svcVal}
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

                      {/* Plus icon on last row */}
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

                      {/* Remove icon if more than 1 service row exists */}
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

                {/* Validation Banner if empty add attempt */}
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

                <div className="calc-size-box">
                  Calculated Size: <strong>{calculateSize(pet.weight)}</strong>
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

                {/* Medical Records Preview & Dropzone */}
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

                {/* AI Pet Haircut Generator */}
                <div className="ai-generator-box">
                  <h4 className="ai-title">AI Pet Haircut Generator</h4>
                  <div className="ai-banner">
                    <FaExclamationCircle className="ai-warn-icon" />
                    <span>
                      <strong>Style Preview Info:</strong> The AI generates a preview based <strong>strictly</strong> on your pet's <strong>Type, Breed, Weight</strong>, and <strong>Hairstyle choice!</strong>
                    </span>
                  </div>

                  <div className="ai-controls">
                    <div className="ai-style-selector">
                      <label>Desired Style:</label>
                      <select
                        className="form-control inline-select"
                        value={pet.desiredStyle}
                        onChange={(e) => updatePetField(pet.id, 'desiredStyle', e.target.value)}
                      >
                        <option value="Lion Cut">Lion Cut</option>
                        <option value="Teddy Bear Cut">Teddy Bear Cut</option>
                        <option value="Puppy Cut">Puppy Cut</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      className="ai-generate-btn"
                      onClick={() => alert('AI Haircut Preview Generator is coming soon!')}
                    >
                      Generate AI Style Preview
                    </button>
                  </div>
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