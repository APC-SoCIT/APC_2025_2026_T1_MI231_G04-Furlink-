import { PetFormData } from '../types';

type AiPreviewFields = Pick<
  PetFormData,
  | 'aiUploadedSourceUrl'
  | 'aiPreviewBlob'
  | 'aiPreviewImageUrl'
  | 'aiPreviewStatus'
  | 'aiPreviewError'
  | 'aiHaircutUrl'
  | 'aiPreviewCache'
>;

/** Fresh "no preview yet" state for the AI haircut fields. */
export const getAiPreviewReset = (): AiPreviewFields => ({
  aiUploadedSourceUrl: null,
  aiPreviewBlob: null,
  aiPreviewImageUrl: null,
  aiPreviewStatus: 'idle',
  aiPreviewError: null,
  aiHaircutUrl: null,
  aiPreviewCache: {},
});

export const createDefaultPet = (index: number): PetFormData => ({
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
  ...getAiPreviewReset(),
});