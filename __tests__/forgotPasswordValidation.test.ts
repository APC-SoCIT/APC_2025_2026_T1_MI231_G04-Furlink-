import {
  validateForgotPasswordIdentifier,
  validateForgotPasswordOtp,
  validateNewPassword,
} from "@/app/(public)/auth/validation/forgotPasswordValidation";

describe("forgotPasswordValidation Unit Tests", () => {
  describe("Step 1: Identifier Validation", () => {
    test("FGT-PWD_TC02: Empty identifier returns error message", () => {
      expect(validateForgotPasswordIdentifier("")).toBe("Please enter your email or username.");
      expect(validateForgotPasswordIdentifier("   ")).toBe("Please enter your email or username.");
    });

    test("FGT-PWD_TC04: Valid email or username passes validation", () => {
      expect(validateForgotPasswordIdentifier("juan.delacruz@gmail.com")).toBeNull();
      expect(validateForgotPasswordIdentifier("juandc21")).toBeNull();
    });
  });

  describe("Step 2: OTP Validation", () => {
    test("FGT-PWD_TC07: Invalid or incomplete OTP format is rejected", () => {
      expect(validateForgotPasswordOtp("12345")).toBe("Invalid token. Please check the code or try again.");
      expect(validateForgotPasswordOtp("1234567")).toBe("Invalid token. Please check the code or try again.");
      expect(validateForgotPasswordOtp("abcde1")).toBe("Invalid token. Please check the code or try again.");
      expect(validateForgotPasswordOtp("")).toBe("Invalid token. Please check the code or try again.");
    });

    test("FGT-PWD_TC08: Exactly 6-digit numeric OTP passes validation", () => {
      expect(validateForgotPasswordOtp("123456")).toBeNull();
    });
  });

  describe("Step 3: New Password Validation", () => {
    test("FGT-PWD_TC14: Empty password fields are blocked", () => {
      const error = validateNewPassword({ newPassword: "", confirmPassword: "" });
      expect(error).toBe("Please fill out both password fields.");
    });

    test("FGT-PWD_TC15: Weak password failing complexity rules is rejected", () => {
      const error = validateNewPassword({ newPassword: "weak", confirmPassword: "weak" });
      expect(error).toBe("Password must be 6-16 chars, with uppercase, lowercase, number, and symbol.");
    });

    test("FGT-PWD_TC16: Mismatched password and confirmation throw error", () => {
      const error = validateNewPassword({ newPassword: "Password1!", confirmPassword: "Password2@" });
      expect(error).toBe("Passwords do not match.");
    });

    test("FGT-PWD_TC01 / TC18: Valid, matching strong password passes validation", () => {
      const error = validateNewPassword({ newPassword: "Password1!", confirmPassword: "Password1!" });
      expect(error).toBeNull();
    });
  });
});