/* /src/app/(loggedIn)/service_provider/manage_listing/onboarding/hooks/useValidation.ts */
import { useState } from "react";

export function useValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setFieldError = (field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const validate = async (
    supabase: any,
    providerId: string | null,
    businessInfo: any,
    employees: any[],
    fileState: { facilityCount: number; paymentCount: number; hasPermit: boolean }
  ) => {
    let isValid = true;
    let newErrors: Record<string, string> = {};

    // 1. Business Info Validation
    if (!businessInfo.businessName.trim()) {
      newErrors.businessName = "Business name is required";
      isValid = false;
    }

    if (businessInfo.isBranch && !businessInfo.branchName.trim()) {
      newErrors.branchName = "Branch name is required";
      isValid = false;
    }

    if (businessInfo.businessName.trim() && (!businessInfo.isBranch || businessInfo.branchName.trim())) {
      try {
        const finalName = businessInfo.isBranch 
          ? `${businessInfo.businessName.trim()} - ${businessInfo.branchName.trim()}` 
          : businessInfo.businessName.trim();

        const { data, error } = await supabase
          .from("sp_general_info")
          .select("id")
          .eq("business_name", finalName)
          .neq("profiles_id", providerId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          if (businessInfo.isBranch) newErrors.branchName = "This branch name already exists.";
          else newErrors.businessName = "This business name is already registered.";
          isValid = false;
        }
      } catch (err) {
        console.error("Error checking business name:", err);
      }
    }

    if (!businessInfo.businessEmail.trim()) {
      newErrors.businessEmail = "Email is required";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessInfo.businessEmail)) {
      newErrors.businessEmail = "Invalid email format";
      isValid = false;
    }

    if (!businessInfo.businessMobile.trim()) {
      newErrors.businessMobile = "Mobile number is required";
      isValid = false;
    } else if (businessInfo.businessMobile.length !== 10) {
      newErrors.businessMobile = "Must be 10 digits";
      isValid = false;
    }

    if (!businessInfo.description.trim()) {
      newErrors.description = "Business description is required";
      isValid = false;
    }

    // 2. Address Validation
    if (!businessInfo.houseStreet.trim()) {
      newErrors.houseStreet = "Required";
      isValid = false;
    }
    if (!businessInfo.region.trim()) {
      newErrors.region = "Required";
      isValid = false;
    }
    if (!businessInfo.province.trim()) {
      newErrors.province = "Required";
      isValid = false;
    }
    if (!businessInfo.city.trim()) {
      newErrors.city = "Required";
      isValid = false;
    }
    if (!businessInfo.barangay.trim()) {
      newErrors.barangay = "Required";
      isValid = false;
    }
    if (!businessInfo.postalCode.trim() || businessInfo.postalCode.length !== 4) {
      newErrors.postalCode = "Required (4 digits)";
      isValid = false;
    }

    // 3. File Validation
    if (!fileState.hasPermit) {
      newErrors.businessPermitFile = "Business Permit is required";
      isValid = false;
    }
    
    if (fileState.facilityCount === 0) {
      newErrors.facilityImages = "At least one facility image is required";
      isValid = false;
    }

    if (fileState.paymentCount === 0) {
      newErrors.paymentChannelFiles = "At least one payment QR is required";
      isValid = false;
    }

    // 4. Employee Validation (Enforcing Minimum 2)
    if (employees.length < 2) {
      newErrors.employees = "You must add at least two employees.";
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

  return { errors, setErrors, setFieldError, clearFieldError, validate };
}