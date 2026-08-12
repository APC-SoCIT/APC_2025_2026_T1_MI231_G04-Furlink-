export const validateForgotPasswordIdentifier = (identifier: string) => {
  if (!identifier || identifier.trim() === "") {
    return "Please enter your email or username.";
  }
  return null;
};

export const validateForgotPasswordOtp = (otp: string) => {
  if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    return "Invalid token. Please check the code or try again.";
  }
  return null;
};

export const validateNewPassword = (passwords: { newPassword: string; confirmPassword: string }) => {
  const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])(?!.*\s).{6,16}$/;
  
  if (!passwords.newPassword || !passwords.confirmPassword) {
    return "Please fill out both password fields.";
  }
  if (!pwdRegex.test(passwords.newPassword)) {
    return "Password must be 6-16 chars, with uppercase, lowercase, number, and symbol.";
  }
  if (passwords.newPassword !== passwords.confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
};