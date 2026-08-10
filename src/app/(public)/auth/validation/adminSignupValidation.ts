export const validateAdminSignup = (formData: any, agreedToTerms: boolean) => {
  let errors: any = {};

  // Names
  if (!formData.firstName) errors.firstName = "First Name is required";
  if (!formData.lastName) errors.lastName = "Last Name is required";

  // Username
  if (!formData.username) errors.username = "Username is required.";
  else if (!/^[a-zA-Z0-9_]{4,15}$/.test(formData.username))
    errors.username = "4-15 letters, numbers, or _ only.";

  // Mobile
  if (!formData.mobile) errors.mobile = "Mobile number is required.";
  else if (!/^9\d{9}$/.test(formData.mobile))
    errors.mobile = "Enter a valid PH mobile number.";

  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!formData.email) errors.email = "Email is required.";
  else if (!emailRegex.test(formData.email)) errors.email = "Email is invalid.";

  // Date of Birth (13+ years old)
  if (!formData.dob) {
    errors.dob = "Date of Birth is required.";
  } else {
    const dobDate = new Date(formData.dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    const dayDiff = today.getDate() - dobDate.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;
    if (age < 13) errors.dob = "Must be at least 13 years old.";
  }

  // Password
  const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])(?!.*\s).{6,16}$/;
  if (!formData.password) errors.password = "Required.";
  else if (!pwdRegex.test(formData.password))
    errors.password = "6-16 chars, mix of Aa, 0-9, symbol.";

  // Confirm password
  if (!formData.confirmPassword) errors.confirmPassword = "Required";
  else if (formData.password !== formData.confirmPassword)
    errors.confirmPassword = "Passwords don't match.";

  return errors;
};