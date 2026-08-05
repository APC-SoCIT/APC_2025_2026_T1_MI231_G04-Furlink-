/* /src/app/(loggedIn)/service_provider/manage_listing/onboarding/hooks/useValidation.ts */
import { useCallback, useState } from "react";
import {
  EMAIL_REGEX,
  PH_MOBILE_REGEX,
  URL_REGEX,
  POSTAL_CODE_REGEX,
  DESCRIPTION_MAX_LENGTH,
} from "../constants";

/**
 * useValidation
 * ---------------------------------------------------------------------------
 * Owns the `validationErrors` object shown throughout the form and exposes:
 *  - `errors`             current error map (field name -> message)
 *  - `setErrors`          raw setter, for edge cases (e.g. clearing "general")
 *  - `setFieldError`      set/overwrite one field's error
 *  - `clearFieldError`    remove one field's error (e.g. once corrected)
 *  - `validate`           runs full form validation, returns true if valid
 *
 * `setFieldError` / `clearFieldError` are also handed to `useFileUploads` so
 * file-size/count problems land in the same shared error map without that
 * hook needing its own error state.
 */
export function useValidation() {
  const [errors, setErrors] = useState({});

  const setFieldError = useCallback((field, message) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }, []);

  const clearFieldError = useCallback((field) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  /**
   * Validates the full application.
   *
   * @param supabase     Supabase client (used for the business-name uniqueness check)
   * @param providerId   current provider's id, so the uniqueness check excludes itself
   * @param businessInfo the businessInfo state object from page.tsx
   * @param employees    the employees array from page.tsx
   * @param fileCounts   { facilityCount, paymentCount, hasPermit } — totals combining
   *                     existing + newly-selected files, computed by the caller
   * @returns true if the form has no validation errors
   */
  const validate = useCallback(async (supabase, providerId, businessInfo, employees, fileCounts) => {
    const nextErrors = {};

    // --- Business name (required + must be unique across providers) ---
    if (!businessInfo.businessName.trim()) {
      nextErrors.businessName = "Business Name is required";
    } else {
      const { data: existingBusiness } = await supabase
        .from("service_providers")
        .select("id")
        .eq("business_name", businessInfo.businessName.trim())
        .neq("id", providerId || "00000000-0000-0000-0000-000000000000")
        .maybeSingle();

      if (existingBusiness) {
        nextErrors.businessName = "This business name is already registered. Please choose another.";
      }
    }

    // --- Description ---
    if (!businessInfo.description.trim()) {
      nextErrors.description = "Business Description is required";
    } else if (businessInfo.description.length > DESCRIPTION_MAX_LENGTH) {
      nextErrors.description = `Maximum of ${DESCRIPTION_MAX_LENGTH} characters allowed`;
    }

    // --- Contact info ---
    if (!businessInfo.businessEmail.trim()) {
      nextErrors.businessEmail = "Email is required";
    } else if (!EMAIL_REGEX.test(businessInfo.businessEmail)) {
      nextErrors.businessEmail = "Must have a valid domain format";
    }

    if (!PH_MOBILE_REGEX.test(businessInfo.businessMobile)) {
      nextErrors.businessMobile = "Must be a valid PH mobile number";
    }

    // --- Optional links (only validated if provided) ---
    if (businessInfo.socialMediaUrl && !URL_REGEX.test(businessInfo.socialMediaUrl)) {
      nextErrors.socialMediaUrl = "Must be a valid URL";
    }
    if (businessInfo.googleMapUrl && !URL_REGEX.test(businessInfo.googleMapUrl)) {
      nextErrors.googleMapUrl = "Must be a valid URL";
    }

    // --- Operating hours: at least one slot, each with at least one day selected ---
    if (!businessInfo.operatingHours || businessInfo.operatingHours.length === 0) {
      nextErrors.operatingHours = "At least one operating hour slot is required";
    } else {
      businessInfo.operatingHours.forEach((slot) => {
        if (slot.days.length === 0) nextErrors.operatingHours = "Select at least one day for each slot";
      });
    }

    // --- Address ---
    ["houseStreet", "barangay", "city", "province"].forEach((field) => {
      if (!businessInfo[field] || !businessInfo[field].trim()) {
        nextErrors[field] = "Please provide business address details";
      }
    });

    if (!POSTAL_CODE_REGEX.test(businessInfo.postalCode)) {
      nextErrors.postalCode = "Must only allow 4 integers";
    }

    // --- Required attachments (counts combine existing + newly-selected, from caller) ---
    if (fileCounts.facilityCount === 0) nextErrors.facilityImages = "At least 1 facility image required";
    if (fileCounts.paymentCount === 0) nextErrors.paymentChannelFiles = "At least 1 payment QR required";
    if (!fileCounts.hasPermit) nextErrors.businessPermitFile = "Business Permit is required";

    // --- Employees: at least one, each fully filled out ---
    if (employees.length === 0) nextErrors.employees = "At least one employee is required";
    employees.forEach((emp, i) => {
      if (!emp.firstName.trim()) nextErrors[`employee_${i}_first`] = "Required";
      if (!emp.lastName.trim()) nextErrors[`employee_${i}_last`] = "Required";
      if (!emp.position.trim()) nextErrors[`employee_${i}_pos`] = "Required";
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, []);

  return { errors, setErrors, setFieldError, clearFieldError, validate };
}