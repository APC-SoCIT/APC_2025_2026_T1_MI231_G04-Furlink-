import { validateSignup } from "@/app/(public)/auth/validation/signUpValidation";

describe("signUpValidation Unit Tests (Regular User Sign-Up)", () => {
  const validBaseData = {
    firstName: "Juan",
    lastName: "Dela Cruz",
    username: "juandc21",
    email: "juan.delacruz@gmail.com",
    mobile: "9171234567",
    dob: "2000-05-14",
    roleChoice: "pet_owner",
    password: "Passw0rd!",
    confirmPassword: "Passw0rd!",
  };

  test("USR-SGN_TC01: Valid user sign-up data passes validation with zero errors", () => {
    const errors = validateSignup(validBaseData, true);
    expect(Object.keys(errors).length).toBe(0);
  });

  test("USR-SGN_TC02 & USR-SGN_TC12: Missing required fields/unchecked terms trigger errors", () => {
    const incompleteData = { ...validBaseData, mobile: "", roleChoice: "" };
    const errors = validateSignup(incompleteData, false);

    expect(errors.mobile).toBe("Mobile number is required.");
    expect(errors.roleChoice).toBe("Required");
    expect(errors.terms).toBe(true);
  });

  test("USR-SGN_TC03: Invalid email format is rejected", () => {
    const invalidEmailData = { ...validBaseData, email: "juan.delacruz" };
    const errors = validateSignup(invalidEmailData, true);

    expect(errors.email).toBe("Email is invalid.");
  });

  test("USR-SGN_TC06 & USR-SGN_TC07: Weak passwords or passwords exceeding 12 characters are rejected", () => {
    // Too short / missing complexity requirements (USR-SGN_TC06)
    const weakPwd = { ...validBaseData, password: "abc", confirmPassword: "abc" };
    expect(validateSignup(weakPwd, true).password).toBe("6-12 chars, mix of Aa, 0-9, symbol.");

    // Exceeding 12 character upper bound (USR-SGN_TC07)
    const longPwd = { ...validBaseData, password: "Passw0rd!Extra1", confirmPassword: "Passw0rd!Extra1" };
    expect(validateSignup(longPwd, true).password).toBe("6-12 chars, mix of Aa, 0-9, symbol.");
  });

  test("USR-SGN_TC08: Mismatched password and confirm password trigger error", () => {
    const mismatchData = { ...validBaseData, confirmPassword: "DifferentPassword1!" };
    const errors = validateSignup(mismatchData, true);

    expect(errors.confirmPassword).toBe("Passwords don't match.");
  });

  test("USR-SGN_TC09: Invalid Philippine mobile number format is rejected", () => {
    const invalidMobile = { ...validBaseData, mobile: "1234567890" };
    const errors = validateSignup(invalidMobile, true);

    expect(errors.mobile).toBe("Enter a valid PH mobile number.");
  });

  test("USR-SGN_TC11: Underage user below 13 years old is blocked", () => {
    const currentYear = new Date().getFullYear();
    const underageDob = `${currentYear - 5}-01-01`; // Only 5 years old
    const underageData = { ...validBaseData, dob: underageDob };
    const errors = validateSignup(underageData, true);

    expect(errors.dob).toBe("Must be at least 13 years old.");
  });
});