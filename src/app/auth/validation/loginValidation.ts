// src/app/auth/validation/loginValidation.ts
export const validateLogin = (data: any) => {
  const errors: any = {};

  // Basic regex for email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!data.identifier) {
    errors.identifier = "Email is required";
  } else if (!emailRegex.test(data.identifier)) {
    errors.identifier = "Please enter a valid email address";
  }

  if (!data.password) {
    errors.password = "Password is required";
  } else if (data.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};