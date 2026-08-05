/* /src/app/(loggedIn)/service_provider/manage_listing/onboarding/hooks/useFileUploads.ts */
import { useState } from "react";

/**
 * useFileUploads
 * ---------------------------------------------------------------------------
 * Owns every attachment-related piece of state for the onboarding form
 * (waiver, business permit, facility images, payment QR codes) plus the
 * handlers to select, remove, and upload them.
 *
 * Loading of *existing* files (on first page load / reapplication) still
 * happens in page.tsx's data-fetch effect — this hook just exposes the
 * setters so that effect can seed the state. Everything from "user picks
 * a new file" onward lives here.
 *
 * @param supabase   Supabase client, used for storage upload/remove + table deletes
 * @param providerId current provider's id (used when deleting existing rows)
 * @param errorApi   { setFieldError, clearFieldError } from useValidation, so
 *                    file-size/count issues surface in the same error map
 *                    the rest of the form uses
 */
export function useFileUploads(supabase, providerId, { setFieldError, clearFieldError }) {
  const [waiverFile, setWaiverFile] = useState(null);
  const [existingWaiverUrl, setExistingWaiverUrl] = useState(null);

  const [facilityImages, setFacilityImages] = useState([]);
  const [existingFacilityImages, setExistingFacilityImages] = useState([]);

  const [paymentChannelFiles, setPaymentChannelFiles] = useState([]);
  const [existingPaymentChannels, setExistingPaymentChannels] = useState([]);

  const [businessPermitFile, setBusinessPermitFile] = useState(null);
  const [existingPermitUrl, setExistingPermitUrl] = useState(null);

  /** Single-file select (waiver, permit) with a max-size check. */
  const handleFileSelect = (setter, e, maxSizeMB, fieldName) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > maxSizeMB * 1024 * 1024) {
        setFieldError(fieldName, `File size must not exceed ${maxSizeMB}MB.`);
        e.target.value = "";
        return;
      }
      clearFieldError(fieldName);
      setter(file);
    }
  };

  /** Multi-file select (facility images, payment QR) with max-count + max-size checks. */
  const handleMultiFileSelect = (setter, currentFiles, e, maxFiles, fieldName, existingCount = 0, maxSizeMB = 2) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);

      if (currentFiles.length + files.length + existingCount > maxFiles) {
        setFieldError(fieldName, `You can upload up to ${maxFiles} files total.`);
        e.target.value = "";
        return;
      }

      const invalidFile = files.find((f) => f.size > maxSizeMB * 1024 * 1024);
      if (invalidFile) {
        setFieldError(fieldName, `One or more files exceed the ${maxSizeMB}MB limit.`);
        e.target.value = "";
        return;
      }

      clearFieldError(fieldName);
      setter((prev) => [...prev, ...files]);
      e.target.value = "";
    }
  };

  /** Removes a not-yet-uploaded file (by index) from a multi-file list. */
  const removeFile = (setter, index) => setter((prev) => prev.filter((_, i) => i !== index));

  /** Clears a single-file field's new selection AND its existing-url reference. */
  const removeSingleFile = (fileSetter, urlSetter) => {
    fileSetter(null);
    urlSetter(null);
  };

  /** Recovers the storage path from a public Supabase Storage URL, for deletion. */
  const getFilePathFromUrl = (url) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      const match = u.pathname.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+)$/);
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  };

  /** Deletes an already-saved file: removes it from Storage, then from its DB table + local state. */
  const removeExistingFile = async (type, id, fileUrl) => {
    if (!window.confirm("Are you sure you want to remove this file?")) return;
    try {
      let tableName = "";
      if (type === "image") tableName = "service_provider_images";
      else if (type === "payment") tableName = "service_provider_payments";
      else if (type === "permit") tableName = "service_provider_permits";

      const filePath = getFilePathFromUrl(fileUrl);
      if (filePath) await supabase.storage.from("service_provider_uploads").remove([filePath]);

      if (tableName) {
        await supabase.from(tableName).delete().eq("id", id);
        if (type === "image") setExistingFacilityImages((prev) => prev.filter((i) => i.id !== id));
        if (type === "payment") setExistingPaymentChannels((prev) => prev.filter((p) => p.id !== id));
        if (type === "permit") setExistingPermitUrl(null);
      }
    } catch (e) {
      console.error("Remove error", e);
    }
  };

  /** Uploads one File to Supabase Storage and returns its public URL. */
  const uploadFileToStorage = async (userId, folder, file) => {
    if (!file) return null;
    const filePath = `${userId}/${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("service_provider_uploads").upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from("service_provider_uploads").getPublicUrl(filePath);
    return data.publicUrl;
  };

  return {
    // state
    waiverFile, existingWaiverUrl,
    facilityImages, existingFacilityImages,
    paymentChannelFiles, existingPaymentChannels,
    businessPermitFile, existingPermitUrl,

    // setters (used by page.tsx to seed existing data on load, and inline JSX to update)
    setWaiverFile, setExistingWaiverUrl,
    setFacilityImages, setExistingFacilityImages,
    setPaymentChannelFiles, setExistingPaymentChannels,
    setBusinessPermitFile, setExistingPermitUrl,

    // derived counts, handy for both validation and the confirmation modal
    facilityCount: facilityImages.length + existingFacilityImages.length,
    paymentCount: paymentChannelFiles.length + existingPaymentChannels.length,
    hasPermit: Boolean(businessPermitFile || existingPermitUrl),

    // handlers
    handleFileSelect,
    handleMultiFileSelect,
    removeFile,
    removeSingleFile,
    removeExistingFile,
    uploadFileToStorage,
    getFilePathFromUrl,
  };
}