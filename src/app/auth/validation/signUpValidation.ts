export const validateSignup = (formData: any, agreedToTerms: boolean) => {
  let errors: any = {};

  // Check first, then assign only if invalid
  if (!formData.firstName) errors.firstName = "First Name is required";
  if (!formData.lastName) errors.lastName = "Last Name is required";
  
  if (!formData.username) errors.username = "Username is required.";
  else if (!/^[a-zA-Z0-9_]{4,15}$/.test(formData.username)) errors.username = "Username is invalid.";

  // Ensure it starts with 9 and has 10 digits total
  else if (!/^9\d{9}$/.test(formData.mobile)) errors.mobile = "Mobile number must be a Philippine mobile number.";

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!formData.email) errors.email = "Email is required.";
  else if (!emailRegex.test(formData.email)) errors.email = "Email is invalid.";

  // Date of Birth (13+ years old)
  if (!formData.dob) {
    errors.dob = "Required";
  } else {
    const dobDate = new Date(formData.dob);
    const today = new Date();
    const age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    
    // Check if age is < 13
    if (age < 13 || (age === 13 && monthDiff < 0)) {
      errors.dob = "You must be at least 13 years old.";
    }
  }

  // Role Selection (Pet Owner, Service Provider, or Both)
  if (!formData.roleChoice) errors.roleChoice = "Required";

  // Password requires 6-12 characters, lower/upper/number/special
  const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])(?!.*\s).{6,12}$/;
  if (!formData.password) errors.password = "Password is required.";
  else if (!pwdRegex.test(formData.password)) errors.password = "Password must be a combination of uppercase, lowercase, numbers, and special characters.";
  
  // Confirmed password
  if (!formData.password) errors.password = "Password is required.";
  else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])(?!.*\s).{6,12}$/.test(formData.password)) 
    errors.password = "Password must be a combination of uppercase, lowercase, numbers, and special characters.";
  
  // Only check confirmPassword if password exists
  if (!formData.confirmPassword) errors.confirmPassword = "Required";
  else if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Password does not match.";

  if (!agreedToTerms) errors.terms = "Agreement required.";

  return errors;
};