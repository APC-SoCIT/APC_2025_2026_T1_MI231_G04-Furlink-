/* /src/app/(loggedIn)/service_provider/manage_listing/onboarding/hooks/useFileUploads.ts */
'use client';

import { useState, useEffect } from "react";

interface UseFileUploadsCallbacks {
  setFieldError: (field: string, message: string) => void;
  clearFieldError: (field: string) => void;
}

export function useFileUploads(supabase: any, providerId: string | null, { setFieldError, clearFieldError }: UseFileUploadsCallbacks) {
  const [waiverFile, setWaiverFile] = useState<File | null>(null);
  const [businessPermitFile, setBusinessPermitFile] = useState<File | null>(null);
  const [facilityImages, setFacilityImages] = useState<File[]>([]);
  const [paymentChannelFiles, setPaymentChannelFiles] = useState<File[]>([]);

  const [existingWaiverUrl, setExistingWaiverUrl] = useState<string | null>(null);
  const [existingPermitUrl, setExistingPermitUrl] = useState<string | null>(null);
  const [existingFacilityImages, setExistingFacilityImages] = useState<any[]>([]);
  const [existingPaymentChannels, setExistingPaymentChannels] = useState<any[]>([]);

  // Fetch existing files from Supabase once providerId is ready
  useEffect(() => {
    if (!providerId) return;

    const fetchExistingFiles = async () => {
      try {
        const { data: generalData } = await supabase
          .from("sp_general_info")
          .select("business_waiver_url, business_permit_url, business_payment_qr_url, id")
          .eq("profiles_id", providerId)
          .maybeSingle();

        if (generalData) {
          if (generalData.business_waiver_url && generalData.business_waiver_url !== "PLATFORM_DEFAULT_WAIVER") {
            setExistingWaiverUrl(generalData.business_waiver_url);
          }
          if (generalData.business_permit_url) {
            setExistingPermitUrl(generalData.business_permit_url);
          }
          if (generalData.business_payment_qr_url) {
            // Split multiple comma-separated QR URLs if any
            const qrs = generalData.business_payment_qr_url.split(',').map((url: string, idx: number) => ({
              id: idx.toString(),
              file_url: url.trim()
            }));
            setExistingPaymentChannels(qrs);
          }

          // Fetch facility images using the resolved generalData.id (the sp_id)
          const { data: facilityData } = await supabase
            .from("sp_img_facilities")
            .select("id, business_facility_images")
            .eq("sp_id", generalData.id);

          if (facilityData) {
            setExistingFacilityImages(facilityData.map((item: any) => ({
              id: item.id,
              image_url: item.business_facility_images
            })));
          }
        }
      } catch (err) {
        console.error("Error fetching existing files:", err);
      }
    };

    fetchExistingFiles();
  }, [providerId, supabase]);

  // Single File Select Handler with Size & MIME Type validation
  const handleFileSelect = (
    setter: (file: File | null) => void, 
    e: React.ChangeEvent<HTMLInputElement>, 
    maxSizeMB: number, 
    fieldName: string, 
    allowedTypes: string[]
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      setFieldError(fieldName, `Invalid file format. Please upload an approved file type.`);
      setter(null);
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setFieldError(fieldName, `File size must be less than ${maxSizeMB}MB`);
      setter(null);
      return;
    }

    clearFieldError(fieldName);
    setter(file);
  };

  // Multi File Select Handler with Size & MIME Type validation
  const handleMultiFileSelect = (
    setter: React.Dispatch<React.SetStateAction<File[]>>, 
    currentFiles: File[], 
    e: React.ChangeEvent<HTMLInputElement>, 
    maxFiles: number, 
    fieldName: string, 
    allowedTypes: string[],
    existingCount: number = 0, 
    maxSizeMB: number = 1
  ) => {
    const chosenFiles = Array.from(e.target.files || []) as File[];
    const totalCurrentCount = currentFiles.length + existingCount;

    if (totalCurrentCount + chosenFiles.length > maxFiles) {
      setFieldError(fieldName, `You can only upload a maximum of ${maxFiles} files.`);
      return;
    }

    const validFiles: File[] = [];
    for (const f of chosenFiles) {
      const fileItem = f as File;
      
      if (!allowedTypes.includes(fileItem.type)) {
        setFieldError(fieldName, `Invalid file format detected: ${fileItem.name}.`);
        return;
      }

      if (fileItem.size > maxSizeMB * 1024 * 1024) {
        setFieldError(fieldName, `Each file must be less than ${maxSizeMB}MB`);
        return;
      }
      validFiles.push(fileItem);
    }

    clearFieldError(fieldName);
    setter((prev: File[]) => [...prev, ...validFiles]);
  };

  const removeFile = (setter: React.Dispatch<React.SetStateAction<File[]>>, index: number) => {
    setter((prev: File[]) => prev.filter((_: File, i: number) => i !== index));
  };

  const removeSingleFile = (fileSetter: (val: null) => void, urlSetter: (val: null) => void) => {
    fileSetter(null);
    urlSetter(null);
  };

  const removeExistingFile = async (type: string, id: string, fileUrl: string) => {
    try {
      if (type === "image") {
        await supabase.from("sp_img_facilities").delete().eq("id", id);
        setExistingFacilityImages((prev: any[]) => prev.filter((img: any) => img.id !== id));
      } else if (type === "payment") {
        setExistingPaymentChannels([]);
      }
    } catch (err) {
      console.error("Error removing file record:", err);
    }
  };

  const uploadFileToStorage = async (userId: string, folder: string, file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      let bucketName = '';
      if (folder === 'facilities') bucketName = 'sp-facility-images';
      else if (folder === 'waivers') bucketName = 'sp-waiver';
      else if (folder === 'permits') bucketName = 'sp-permit';
      else if (folder === 'payments') bucketName = 'sp-payment-qr';

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error("Storage upload failed:", err);
      // Throw the error so the main submission process stops immediately and triggers a rollback!
      throw new Error(`Failed to upload ${file.name}. Ensure it's a valid format and size.`);
    }
  };

  return {
    waiverFile, setWaiverFile,
    businessPermitFile, setBusinessPermitFile,
    facilityImages, setFacilityImages,
    paymentChannelFiles, setPaymentChannelFiles,
    existingWaiverUrl, setExistingWaiverUrl,
    existingPermitUrl, setExistingPermitUrl,
    existingFacilityImages, existingPaymentChannels,
    facilityCount: facilityImages.length + existingFacilityImages.length,
    paymentCount: paymentChannelFiles.length + existingPaymentChannels.length,
    hasPermit: !!businessPermitFile || !!existingPermitUrl,
    handleFileSelect,
    handleMultiFileSelect,
    removeFile,
    removeSingleFile,
    removeExistingFile,
    uploadFileToStorage,
  };
}