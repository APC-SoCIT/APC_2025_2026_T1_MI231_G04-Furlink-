import { validateManageAccountField } from "@/app/(loggedIn)/both_sp_po/manage_account/validation/manageAccountValidation";

describe("manageAccountValidation Unit Tests", () => {
  describe("First Name & Last Name Validation", () => {
    test("Empty first name or last name is rejected", () => {
      expect(validateManageAccountField("firstName", "")).toBe("First Name is required");
      expect(validateManageAccountField("lastName", "   ")).toBe("Last Name is required");
    });

    test("Valid names pass validation", () => {
      expect(validateManageAccountField("firstName", "Atasha")).toBeNull();
      expect(validateManageAccountField("lastName", "Santos")).toBeNull();
    });
  });

  describe("Username Validation", () => {
    test("Empty username is rejected", () => {
      expect(validateManageAccountField("username", "")).toBe("Username is required.");
    });

    test("Username violating length/character rules is rejected", () => {
      // Too short (< 4 chars)
      expect(validateManageAccountField("username", "abc")).toBe("4-15 letters, numbers, or _ only.");
      // Contains invalid characters (e.g., spaces or symbols like @)
      expect(validateManageAccountField("username", "user name")).toBe("4-15 letters, numbers, or _ only.");
    });

    test("Valid username passes validation", () => {
      expect(validateManageAccountField("username", "atasha_santos")).toBeNull();
    });
  });

  describe("Mobile Number Validation (PH format +63 / 9XXXXXXXXX)", () => {
    test("Empty mobile number is rejected", () => {
      expect(validateManageAccountField("mobileNumber", "")).toBe("Mobile number is required.");
    });

    test("Invalid Philippine mobile number format is rejected", () => {
      expect(validateManageAccountField("mobileNumber", "81234567")).toBe("Enter a valid PH mobile number."); // Doesn't start with 9
      expect(validateManageAccountField("mobileNumber", "9123456")).toBe("Enter a valid PH mobile number.");   // Too short
    });

    test("Valid PH mobile number (with or without prefix) passes validation", () => {
      expect(validateManageAccountField("mobileNumber", "9181234567")).toBeNull();
      expect(validateManageAccountField("mobileNumber", "+639181234567")).toBeNull();
    });
  });

  describe("Date of Birth Validation (Age >= 13)", () => {
    test("Empty date of birth is rejected", () => {
      expect(validateManageAccountField("dob", "")).toBe("Date of Birth is required.");
    });

    test("Underage user below 13 years old is blocked", () => {
      const currentYear = new Date().getFullYear();
      const underageDob = `${currentYear - 8}-01-01`; // Only 8 years old
      expect(validateManageAccountField("dob", underageDob)).toBe("Must be at least 13 years old.");
    });

    test("Valid adult/teenager date of birth passes validation", () => {
      const currentYear = new Date().getFullYear();
      const validDob = `${currentYear - 20}-01-01`; // 20 years old
      expect(validateManageAccountField("dob", validDob)).toBeNull();
    });
  });

  describe("Password Update Validation", () => {
    test("Missing password fields are blocked", () => {
      expect(
        validateManageAccountField("password", "", { password: "", confirmPassword: "" })
      ).toBe("Required.");
    });

    test("Weak password failing complexity rules is rejected", () => {
      expect(
        validateManageAccountField("password", "", { password: "weak", confirmPassword: "weak" })
      ).toBe("6-12 chars, mix of Aa, 0-9, symbol.");
    });

    test("Mismatched password and confirmation throw error", () => {
      expect(
        validateManageAccountField("password", "", {
          password: "AdminPass1!",
          confirmPassword: "AdminPass2@",
        })
      ).toBe("Passwords don't match.");
    });

    test("Valid strong matching password passes validation", () => {
      expect(
        validateManageAccountField("password", "", {
          password: "AdminPass1!",
          confirmPassword: "AdminPass1!",
        })
      ).toBeNull();
    });
  });
});