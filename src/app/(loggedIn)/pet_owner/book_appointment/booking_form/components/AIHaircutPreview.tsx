'use client';

import React from 'react';
import {
  FaMagic,
  FaTimes,
  FaSpinner,
  FaRedoAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaCamera,
  FaPen,
} from 'react-icons/fa';
import { PetFormData, HAIRCUT_STYLE_OPTIONS } from '../types';

interface AIHaircutPreviewProps {
  pet: PetFormData;
  onUploadPetPhoto: (petId: string, file: File) => void;
  onRemovePetPhoto: (petId: string) => void;
  onUpdateField: (id: string, field: keyof PetFormData, value: any) => void;
  onGeneratePreview: (petId: string) => void;
  onConfirmPreview: (petId: string) => void;
  onEditConfirmedPreview: (petId: string) => void;
}

export const AIHaircutPreview: React.FC<AIHaircutPreviewProps> = ({
  pet,
  onUploadPetPhoto,
  onRemovePetPhoto,
  onUpdateField,
  onGeneratePreview,
  onConfirmPreview,
  onEditConfirmedPreview,
}) => {
  const isBusy = pet.aiPreviewStatus === 'uploading' || pet.aiPreviewStatus === 'generating';
  const hasSourcePhoto = !!(pet.aiSourcePhotoFile || pet.aiSourcePhotoPreview);
  const hasUnconfirmedPreview = !!pet.aiPreviewImageUrl && !pet.aiHaircutUrl;
  const isConfirmed = !!pet.aiHaircutUrl;

  const busyLabel = pet.aiPreviewStatus === 'uploading' ? 'Uploading photo...' : 'Generating preview...';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadPetPhoto(pet.id, file);
    }
    // allow re-selecting the same file later
    e.target.value = '';
  };

  return (
    <div className="ai-haircut-box">
      <div className="ai-haircut-header">
        <FaMagic className="ai-haircut-sparkle-icon" />
        <span>AI Haircut Preview</span>
      </div>

      {isConfirmed ? (
        <div className="ai-confirmed-badge">
          <div className="ai-confirmed-info">
            <img src={pet.aiHaircutUrl!} alt="Confirmed AI haircut preview" className="ai-confirmed-thumb" />
            <span>
              <FaCheckCircle style={{ marginRight: 4 }} />
              AI preview confirmed
            </span>
          </div>
          <button type="button" className="ai-edit-preview-btn" onClick={() => onEditConfirmedPreview(pet.id)}>
            <FaPen style={{ marginRight: 4 }} />
            Change
          </button>
        </div>
      ) : (
        <>
          <div className="ai-photo-row">
            {hasSourcePhoto ? (
              <div className="ai-photo-dropzone">
                <img
                  src={pet.aiSourcePhotoPreview || (pet.aiSourcePhotoFile ? URL.createObjectURL(pet.aiSourcePhotoFile) : '')}
                  alt="Pet photo"
                />
                <button
                  type="button"
                  className="ai-photo-remove-badge"
                  onClick={() => onRemovePetPhoto(pet.id)}
                  disabled={isBusy}
                  title="Remove photo"
                >
                  <FaTimes />
                </button>
              </div>
            ) : (
              <label className="ai-photo-dropzone">
                <FaCamera style={{ fontSize: 18 }} />
                <span>Upload Pet Photo *</span>
                <input type="file" accept="image/*" hidden onChange={handleFileChange} />
              </label>
            )}

            <div className="ai-style-controls">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="field-label">Desired Haircut Style *</label>
                <select
                  className="form-control"
                  value={pet.desiredStyle}
                  onChange={(e) => onUpdateField(pet.id, 'desiredStyle', e.target.value)}
                  disabled={isBusy}
                >
                  {HAIRCUT_STYLE_OPTIONS.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="ai-generate-btn"
                onClick={() => onGeneratePreview(pet.id)}
                disabled={isBusy || !hasSourcePhoto}
              >
                {isBusy ? (
                  <>
                    <FaSpinner className="ai-spin-icon" /> {busyLabel}
                  </>
                ) : (
                  <>
                    <FaMagic /> Generate AI Preview
                  </>
                )}
              </button>
            </div>
          </div>

          {pet.aiPreviewStatus === 'error' && pet.aiPreviewError && (
            <div className="ai-preview-error">
              <FaExclamationCircle />
              <span>{pet.aiPreviewError}</span>
            </div>
          )}

          {hasUnconfirmedPreview && (
            <div className="ai-preview-result">
              <div className="ai-preview-result-label">
                <FaMagic /> Here's the AI-generated preview:
              </div>
              <div className="ai-preview-image-frame">
                <img src={pet.aiPreviewImageUrl!} alt="AI generated haircut preview" />
              </div>
              <div className="ai-preview-actions">
                <button
                  type="button"
                  className="ai-confirm-btn"
                  onClick={() => onConfirmPreview(pet.id)}
                  disabled={isBusy}
                >
                  <FaCheckCircle /> Confirm this look
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};