'use client';

import React from 'react';
import {
  FaPlus,
  FaTrashAlt,
  FaMagic,
  FaTag,
  FaMinus,
  FaExclamationCircle,
  FaTimes,
  FaFileUpload,
  FaFileAlt,
} from 'react-icons/fa';
import { PetFormData, RegisteredPet, ServiceOption, BEHAVIOR_OPTIONS } from '../types';

interface PetFormCardProps {
  pet: PetFormData;
  index: number;
  isLast: boolean;
  totalPets: number;
  userRegisteredPets: RegisteredPet[];
  availableServices: ServiceOption[];
  loadingServices: boolean;
  dogBreeds: string[];
  catBreeds: string[];
  loadingBreeds: boolean;
  onAddPet: () => void;
  onDeletePet: (id: string) => void;
  onUpdateField: (id: string, field: keyof PetFormData, value: any) => void;
  onServiceChange: (petId: string, index: number, serviceId: string) => void;
  onAddServiceField: (petId: string) => void;
  onRemoveServiceField: (petId: string, index: number) => void;
  onAutofillPet: (formId: string, registeredPetId: string) => void;
  onToggleBehavior: (id: string, behavior: string) => void;
}

export const PetFormCard: React.FC<PetFormCardProps> = ({
  pet,
  index,
  isLast,
  totalPets,
  userRegisteredPets,
  availableServices,
  loadingServices,
  dogBreeds,
  catBreeds,
  loadingBreeds,
  onAddPet,
  onDeletePet,
  onUpdateField,
  onServiceChange,
  onAddServiceField,
  onRemoveServiceField,
  onAutofillPet,
  onToggleBehavior,
}) => {
  const currentBreedList = pet.petType === 'Dog' ? dogBreeds : catBreeds;
  const petFormTotal = pet.selectedServices.reduce((sum, item) => sum + item.price, 0);

  const isImageFile = (file: File | null, url: string | null) => {
    if (file) return file.type.startsWith('image/');
    if (url) return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
    return false;
  };

  return (
    <div className="pet-form-card">
      <div className="pet-card-header">
        <div className="pet-badge-tag">Pet #{index + 1}</div>
        <div className="pet-header-actions">
          <span className="pet-price">₱{petFormTotal.toFixed(2)}</span>
          {isLast && (
            <button type="button" className="icon-action-btn add-btn" onClick={onAddPet} title="Add another pet slot">
              <FaPlus />
            </button>
          )}
          {totalPets > 1 && (
            <button type="button" className="icon-action-btn delete-btn" onClick={() => onDeletePet(pet.id)} title="Remove pet form">
              <FaTrashAlt />
            </button>
          )}
        </div>
      </div>

      {userRegisteredPets.length > 0 && (
        <div className="autofill-banner-box">
          <div className="autofill-label">
            <FaMagic className="magic-icon" />
            <span>Autofill from Registered Pets</span>
          </div>
          <select
            className="form-control autofill-select"
            value={pet.selectedRegisteredPetId}
            onChange={(e) => onAutofillPet(pet.id, e.target.value)}
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

      {/* Services Section */}
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
                onChange={(e) => onServiceChange(pet.id, sIdx, e.target.value)}
                disabled={loadingServices}
              >
                <option value="">{loadingServices ? 'Loading services...' : 'Choose a Service'}</option>
                {availableServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.service_name} ({service.service_type === 'individual_service' ? 'Individual' : 'Package'})
                  </option>
                ))}
              </select>
              {sIdx === pet.selectedServices.length - 1 && (
                <button type="button" className="add-service-btn" onClick={() => onAddServiceField(pet.id)} title="Add service">
                  <FaPlus />
                </button>
              )}
              {pet.selectedServices.length > 1 && (
                <button type="button" className="remove-service-btn" onClick={() => onRemoveServiceField(pet.id, sIdx)} title="Remove service">
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

      {/* Pet Information Section */}
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
                onUpdateField(pet.id, 'petType', newType);
                onUpdateField(pet.id, 'breed', '');
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
              onChange={(e) => onUpdateField(pet.id, 'petName', e.target.value)}
            />
          </div>
        </div>

        <div className="form-grid-two">
          <div className="form-group">
            <label className="field-label">Breed *</label>
            <select
              className="form-control"
              value={pet.breed}
              onChange={(e) => onUpdateField(pet.id, 'breed', e.target.value)}
              disabled={loadingBreeds}
            >
              <option value="">{loadingBreeds ? 'Loading breeds...' : '-- Select Breed --'}</option>
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
              onChange={(e) => onUpdateField(pet.id, 'gender', e.target.value as 'Male' | 'Female')}
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
              onChange={(e) => onUpdateField(pet.id, 'dob', e.target.value)}
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
              onChange={(e) => onUpdateField(pet.id, 'weight', e.target.value)}
            />
          </div>
        </div>

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
                  onChange={() => onToggleBehavior(pet.id, opt)}
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
                    onUpdateField(pet.id, 'vaccineFile', null);
                    onUpdateField(pet.id, 'vaccineUrl', null);
                  }}
                >
                  <FaTimes />
                </button>
                {isImageFile(pet.vaccineFile, pet.vaccineUrl) ? (
                  <img
                    src={pet.vaccineFile ? URL.createObjectURL(pet.vaccineFile) : pet.vaccineUrl!}
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
                      onUpdateField(pet.id, 'vaccineFile', file);
                      onUpdateField(pet.id, 'vaccineUrl', null);
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
                    onUpdateField(pet.id, 'illnessFile', null);
                    onUpdateField(pet.id, 'illnessUrl', null);
                  }}
                >
                  <FaTimes />
                </button>
                {isImageFile(pet.illnessFile, pet.illnessUrl) ? (
                  <img
                    src={pet.illnessFile ? URL.createObjectURL(pet.illnessFile) : pet.illnessUrl!}
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
                      onUpdateField(pet.id, 'illnessFile', file);
                      onUpdateField(pet.id, 'illnessUrl', null);
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {/* Specifications */}
        <div className="form-group">
          <label className="field-label">Grooming Specifications</label>
          <textarea
            rows={3}
            className="form-control"
            placeholder="e.g., leave the tail fluffy, trim short around eyes..."
            value={pet.groomingSpecs}
            onChange={(e) => onUpdateField(pet.id, 'groomingSpecs', e.target.value)}
          />
        </div>

        {/* Consent */}
        <div className="form-group consent-check">
          <label className="custom-checkbox">
            <input
              type="checkbox"
              checked={pet.emergencyConsent}
              onChange={(e) => onUpdateField(pet.id, 'emergencyConsent', e.target.checked)}
            />
            <span>
              I agree that in a critical emergency, the Provider has permission to transport my pet to the nearest emergency facility.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};