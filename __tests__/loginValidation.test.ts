import { validateLogin } from "@/app/(public)/auth/validation/loginValidation";

describe("loginValidation Unit Tests (Login & Authentication)", () => {
  test("USR-LOG_TC01 & TC02: Valid email and valid username identifiers pass validation", () => {
    // Valid email case
    const validEmailInput = { identifier: "juan.delacruz@gmail.com", password: "Password123!" };
    let result = validateLogin(validEmailInput);
    expect(result.isValid).toBe(true);
    expect(result.errors.identifier).toBeUndefined();

    // Valid username case (>= 3 chars)
    const validUsernameInput = { identifier: "juandc", password: "Password123!" };
    result = validateLogin(validUsernameInput);
    expect(result.isValid).toBe(true);
    expect(result.errors.identifier).toBeUndefined();
  });

  test("USR-LOG_TC03: Empty identifier field triggers error", () => {
    const emptyInput = { identifier: "", password: "Password123!" };
    const result = validateLogin(emptyInput);

    expect(result.isValid).toBe(false);
    expect(result.errors.identifier).toBe("Email or username is required");
  });

  test("USR-LOG_TC04: Identifier that is neither a valid email nor 3+ characters is rejected", () => {
    const shortIdentifier = { identifier: "ab", password: "Password123!" };
    const result = validateLogin(shortIdentifier);

    expect(result.isValid).toBe(false);
    expect(result.errors.identifier).toBe("Please enter a valid email address or username");
  });

  test("USR-LOG_TC05: Empty password field triggers error", () => {
    const emptyPwd = { identifier: "juan.delacruz@gmail.com", password: "" };
    const result = validateLogin(emptyPwd);

    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBe("Password is required");
  });

  test("USR-LOG_TC06: Password shorter than 6 characters is rejected", () => {
    const shortPwd = { identifier: "juan.delacruz@gmail.com", password: "abc12" };
    const result = validateLogin(shortPwd);

    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBe("Password must be at least 6 characters");
  });
});