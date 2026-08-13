export const validateManageAccountField = (
  field: string,
  value: string,
  extraData?: { password?: string; confirmPassword?: string }
) => {

    const nameRegex = /^[A-Za-z\s'\-\.]{2,50}$/;
  const usernameRegex = /^[a-zA-Z0-9_]{4,15}$/;
  const mobileRegex = /^9\d{9}$/;
  const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])(?!.*\s).{6,12}$/;

  if (field === "firstName") {
    if (!value || !value.trim()) return "First Name is required";
  } else if (field === "lastName") {
    if (!value || !value.trim()) return "Last Name is required";
  } else if (field === "username") {
    if (!value || !value.trim()) {
      return "Username is required.";
    }
    if (!usernameRegex.test(value.trim())) {
      return "4-15 letters, numbers, or _ only.";
    }
  } else if (field === "mobileNumber") {
    if (!value || !value.trim()) {
      return "Mobile number is required.";
    }
    // Clean string if user typed with prefix
    const cleanNum = value.startsWith("+63") ? value.replace("+63", "") : value;
    if (!mobileRegex.test(cleanNum)) {
      return "Enter a valid PH mobile number.";
    }
  } else if (field === "dob") {
    if (!value || !value.trim()) {
      return "Date of Birth is required.";
    }
    const dobDate = new Date(value);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    const dayDiff = today.getDate() - dobDate.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;
    if (age < 13) {
      return "Must be at least 13 years old.";
    }
  } else if (field === "password") {
    if (!extraData?.password) {
      return "Required.";
    }
    if (!pwdRegex.test(extraData.password)) {
      return "6-12 chars, mix of Aa, 0-9, symbol.";
    }
    if (extraData.password !== extraData.confirmPassword) {
      return "Passwords don't match.";
    }
  }
  return null;
};