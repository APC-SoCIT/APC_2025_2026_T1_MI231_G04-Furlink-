import { validateAdminSignup } from "@/app/(public)/auth/validation/adminSignupValidation";

describe("adminSignupValidation Unit Tests (Admin Sign-Up)", () => {
  const validAdminBaseData = {
    firstName: "Maria",
    lastName: "Santos",
    username: "adminmaria",
    email: "admin.maria@furlink.com",
    mobile: "9181234567",
    dob: "1990-01-01",
    password: "AdminPass12!ab", // 14 characters (valid under admin 6-16 rule)
    confirmPassword: "AdminPass12!ab",
  };

  test("ADM-SGN_TC01: Valid admin sign-up data passes validation with zero errors", () => {
    const errors = validateAdminSignup(validAdminBaseData, true);
    expect(Object.keys(errors).length).toBe(0);
  });

  test("ADM-SGN_TC02: Missing required admin fields trigger validation errors", () => {
    const incompleteData = { ...validAdminBaseData, mobile: "" };
    const errors = validateAdminSignup(incompleteData, true);

    expect(errors.mobile).toBe("Mobile number is required.");
  });

  test("ADM-SGN_TC03: Invalid email format is rejected on admin signup", () => {
    const invalidEmailData = { ...validAdminBaseData, email: "admin.maria" };
    const errors = validateAdminSignup(invalidEmailData, true);

    expect(errors.email).toBe("Email is invalid.");
  });

  test("ADM-SGN_TC05 & ADM-SGN_TC06: Admin password rule allows 6-16 chars but rejects weak passwords", () => {
    // 14-character strong password (exceeds regular 12-char cap, but passes admin 6-16 rule)
    const validAdminPwd = { ...validAdminBaseData, password: "AdminPass12!ab", confirmPassword: "AdminPass12!ab" };
    expect(validateAdminSignup(validAdminPwd, true).password).toBeUndefined();

    // Weak / simple password below complexity rules (ADM-SGN_TC06)
    const weakPwd = { ...validAdminBaseData, password: "admin123", confirmPassword: "admin123" };
    expect(validateAdminSignup(weakPwd, true).password).toBe("6-16 chars, mix of Aa, 0-9, symbol.");
  });

  test("ADM-SGN_TC07: Mismatched password and confirm password trigger error", () => {
    const mismatchData = { ...validAdminBaseData, confirmPassword: "DifferentPassword1!" };
    const errors = validateAdminSignup(mismatchData, true);

    expect(errors.confirmPassword).toBe("Passwords don't match.");
  });

  test("ADM-SGN_TC08: Invalid Philippine mobile number format is rejected", () => {
    const invalidMobile = { ...validAdminBaseData, mobile: "5551234567" };
    const errors = validateAdminSignup(invalidMobile, true);

    expect(errors.mobile).toBe("Enter a valid PH mobile number.");
  });

  test("ADM-SGN_TC09: Underage DOB below 13 years old is blocked", () => {
    const currentYear = new Date().getFullYear();
    const underageDob = `${currentYear - 8}-01-01`; // Only 8 years old
    const underageData = { ...validAdminBaseData, dob: underageDob };
    const errors = validateAdminSignup(underageData, true);

    expect(errors.dob).toBe("Must be at least 13 years old.");
  });
});