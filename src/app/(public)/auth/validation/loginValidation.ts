export const validateLogin = (data: any) => {
  const errors: any = {};

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const identifier = data.identifier ? data.identifier.trim() : "";

  const isEmail = emailRegex.test(identifier);
  const isUsername = identifier.length >= 3;

  if (!identifier) {
    errors.identifier = "Email or username is required";
  } else if (!isEmail && !isUsername) {
    errors.identifier = "Please enter a valid email address or username";
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