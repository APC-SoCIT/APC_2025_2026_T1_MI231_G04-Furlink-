import type { SupabaseClient } from '@supabase/supabase-js';
import { PetFormData } from '../types';
import { resizeImageFile, compressBlobUnderLimit } from '../utils/imageUtils';
import { requestHaircutPreview } from '../utils/aiHaircutApi';
import { uploadFileToBucket } from '../utils/storage';
import { getAiPreviewReset } from '../utils/petFormFactory';

interface Args {
  supabase: SupabaseClient;
  petForms: PetFormData[];
  patchPetForm: (petId: string, patch: Partial<PetFormData>) => void;
  getFreshUser: () => Promise<{ id: string } | null>;
}

export function useAiHaircutPreview({ supabase, petForms, patchPetForm, getFreshUser }: Args) {
  const handleUploadPetPhoto = async (petId: string, file: File) => {
    try {
      const compressedFile = await resizeImageFile(file);
      patchPetForm(petId, {
        aiSourcePhotoFile: compressedFile,
        aiSourcePhotoPreview: URL.createObjectURL(compressedFile),
        ...getAiPreviewReset(),
      });
    } catch (err) {
      console.error('Image compression failed:', err);
      alert('That photo could not be processed. Please try a different image.');
    }
  };

  const handleRemovePetPhoto = (petId: string) => {
    patchPetForm(petId, {
      aiSourcePhotoFile: null,
      aiSourcePhotoPreview: null,
      ...getAiPreviewReset(),
    });
  };

  const handleEditConfirmedAiPreview = (petId: string) => {
    patchPetForm(petId, { aiHaircutUrl: null });
  };

  const handleGenerateAiPreview = async (petId: string) => {
    const pet = petForms.find((p) => p.id === petId);
    if (!pet) return;

    if (!pet.aiSourcePhotoFile) {
      alert('Please upload a photo of your pet first.');
      return;
    }
    if (!pet.desiredStyle) {
      alert('Please select a desired haircut style.');
      return;
    }

    // Reuse a previously generated preview for the same style
    const cached = pet.aiPreviewCache[pet.desiredStyle];
    if (cached) {
      patchPetForm(petId, {
        aiPreviewBlob: cached.blob,
        aiPreviewImageUrl: cached.url,
        aiPreviewStatus: 'idle',
        aiPreviewError: null,
        aiHaircutUrl: null,
      });
      return;
    }

    try {
      const user = await getFreshUser();
      if (!user) {
        throw new Error(
          'Your session timed out while this page was idle. Please sign in again in a new tab, then come back here and click Generate. Your form details are still saved on this page.',
        );
      }

      patchPetForm(petId, { aiPreviewStatus: 'generating', aiPreviewError: null });

      const blob = await requestHaircutPreview({
        sourcePhoto: pet.aiSourcePhotoFile,
        petType: pet.petType,
        style: pet.desiredStyle,
      });

      const previewObjectUrl = URL.createObjectURL(blob);

      patchPetForm(petId, {
        aiPreviewBlob: blob,
        aiPreviewImageUrl: previewObjectUrl,
        aiPreviewStatus: 'idle',
        aiPreviewError: null,
        aiHaircutUrl: null,
        aiPreviewCache: {
          ...pet.aiPreviewCache,
          [pet.desiredStyle]: { blob, url: previewObjectUrl },
        },
      });
    } catch (err: any) {
      if (!err?.expected) console.error('AI haircut generation error:', err);
      patchPetForm(petId, {
        aiPreviewStatus: 'error',
        aiPreviewError: err.message || 'Something went wrong while generating the preview.',
      });
    }
  };

  const handleConfirmAiPreview = async (petId: string) => {
    const pet = petForms.find((p) => p.id === petId);
    if (!pet || !pet.aiPreviewBlob) return;

    patchPetForm(petId, { aiPreviewStatus: 'uploading', aiPreviewError: null });

    try {
      const user = await getFreshUser();
      if (!user) {
        throw new Error(
          'Your session timed out while this page was idle. Please sign in again in a new tab, then click "Confirm this look" again.',
        );
      }

      const fileName = `${Date.now()}_ai_haircut_${petId}.jpg`;
      const compressedBlob = await compressBlobUnderLimit(pet.aiPreviewBlob);
      const fileToUpload = new File([compressedBlob], fileName, { type: 'image/jpeg' });

      const uploadedUrl = await uploadFileToBucket(supabase, fileToUpload, `${user.id}/${fileName}`);

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

  return {
    handleUploadPetPhoto,
    handleRemovePetPhoto,
    handleEditConfirmedAiPreview,
    handleGenerateAiPreview,
    handleConfirmAiPreview,
  };
}