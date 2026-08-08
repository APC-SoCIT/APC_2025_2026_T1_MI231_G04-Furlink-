/* /src/app/(loggedIn)/service_provider/manage_listing/onboarding/hooks/useValidation.ts */
import { useState } from "react";

/**
 * useValidation
 * ---------------------------------------------------------------------------
 * Encapsulates all validation logic for the service provider onboarding form,
 * ensuring business details, operating hours, employees, and files meet 
 * required criteria before moving to step 2 or final submission.
 */
export function useValidation() {
  const [errors, setErrors] = useState({});

  const setFieldError = (field, message) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearFieldError = (field) => {
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  const validate = async (supabase, providerId, businessInfo, employees, fileState) => {
    let newErrors = {};
    let isValid = true;

    // 1. Business Info Validations
    if (!businessInfo.businessName.trim()) {
      newErrors.businessName = "Business name is required.";
      isValid = false;
    }

    if (!businessInfo.businessEmail.trim()) {
      newErrors.businessEmail = "Email is required.";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(businessInfo.businessEmail)) {
      newErrors.businessEmail = "Invalid email format.";
      isValid = false;
    }

    // Philippine Mobile Number Validation (10 digits following +63, starting with 9)
    const mobileRegex = /^9\d{9}$/;
    if (!businessInfo.businessMobile.trim()) {
      newErrors.businessMobile = "Mobile number is required.";
      isValid = false;
    } else if (!mobileRegex.test(businessInfo.businessMobile)) {
      newErrors.businessMobile = "Must be a valid PH mobile number";
      isValid = false;
    }

    if (!businessInfo.description.trim()) {
      newErrors.description = "Business description is required.";
      isValid = false;
    }

    // 2. Address Validations
    if (!businessInfo.houseStreet.trim()) {
      newErrors.houseStreet = "Street is required.";
      isValid = false;
    }
    if (!businessInfo.region.trim()) {
      newErrors.region = "Region is required.";
      isValid = false;
    }
    if (!businessInfo.province.trim()) {
      newErrors.province = "Province is required.";
      isValid = false;
    }
    if (!businessInfo.city.trim()) {
      newErrors.city = "City is required.";
      isValid = false;
    }
    if (!businessInfo.barangay.trim()) {
      newErrors.barangay = "Barangay is required.";
      isValid = false;
    }
    if (!businessInfo.postalCode.trim() || businessInfo.postalCode.length !== 4) {
      newErrors.postalCode = "Valid 4-digit postal code is required.";
      isValid = false;
    }

    // 3. Document Validations
    if (!fileState.hasPermit) {
      newErrors.businessPermitFile = "Business permit is required.";
      isValid = false;
    }

    if (fileState.facilityCount === 0) {
      newErrors.facilityImages = "At least one facility image is required.";
      isValid = false;
    }

    if (fileState.paymentCount === 0) {
      newErrors.paymentChannelFiles = "At least one payment QR is required.";
      isValid = false;
    }

    // 4. Employee Validations
    
    // NEW REQUIREMENT (C): Require at least minimum of 2 employees
    if (employees.length < 2) {
      newErrors.employees = "You must have at least a minimum of 2 employees.";
      isValid = false;
    }

    employees.forEach((emp, idx) => {
      if (!emp.firstName.trim()) {
        newErrors[`employee_${idx}_first`] = "Required";
        isValid = false;
      }
      if (!emp.lastName.trim()) {
        newErrors[`employee_${idx}_last`] = "Required";
        isValid = false;
      }
      if (!emp.position) {
        newErrors[`employee_${idx}_pos`] = "Required";
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  return {
    errors,
    setErrors,
    setFieldError,
    clearFieldError,
    validate,
  };
}