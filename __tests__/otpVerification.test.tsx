import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import LoginPage from "@/app/(public)/auth/login/page";
import ForgotPasswordPage from "@/app/(public)/auth/forgot_password/page";

const mockVerifyOtp = jest.fn();
const mockResetPassword = jest.fn();
const mockRouter = { push: jest.fn(), refresh: jest.fn() };

jest.mock("next/navigation", () => ({
  useRouter: () => (router: any) => mockRouter,
  useSearchParams: () => ({ get: () => null }),
}));

jest.mock("@supabase/auth-helpers-nextjs", () => ({
  createClientComponentClient: () => ({
    auth: {
      signInWithPassword: jest.fn().mockResolvedValue({
        error: { message: "Email not confirmed" },
      }),
      resetPasswordForEmail: mockResetPassword,
      verifyOtp: mockVerifyOtp,
      resend: jest.fn().mockResolvedValue({ error: null }),
    },
    rpc: jest.fn().mockReturnValue({
      maybeSingle: jest.fn().mockResolvedValue({
        data: { resolved_email: "juan.delacruz@gmail.com", is_confirmed: true },
        error: null,
      }),
    }),
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => ({ data: { role: "pet_owner" } }) }) }),
    }),
  }),
}));

describe("Comprehensive OTP Verification Flow Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("USR-LOG_TC09 & USR-LOG_TC11: Login with unconfirmed email triggers OTP and verifies successfully", async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      data: { session: { access_token: "mock-token" }, user: { id: "123" } },
      error: null,
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("Email address or username"), {
      target: { value: "juan.delacruz@gmail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Log In/i }));

    const otpInput = await screen.findByPlaceholderText("Enter 6-digit OTP");
    fireEvent.change(otpInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify Account/i }));

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith(
        expect.objectContaining({ token: "123456", type: "signup" })
      );
    });
  });

  test("FGT-PWD_TC04 & FGT-PWD_TC08: Forgot password flow proceeds to OTP step and verifies recovery token", async () => {
    mockResetPassword.mockResolvedValueOnce({ error: null });
    mockVerifyOtp.mockResolvedValueOnce({
      data: { session: { access_token: "mock-token" }, user: { id: "123" } },
      error: null,
    });

    render(<ForgotPasswordPage />);

    // Step 1: Submit identifier
    fireEvent.change(screen.getByPlaceholderText("Email address or username"), {
      target: { value: "juan.delacruz@gmail.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Verification Code/i }));

    // Step 2: Enter OTP for password recovery
    const otpInput = await screen.findByPlaceholderText("Enter 6-digit OTP");
    fireEvent.change(otpInput, { target: { value: "654321" } });
    fireEvent.click(screen.getByRole("button", { name: /Verify Account/i }));

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith(
        expect.objectContaining({ token: "654321", type: "recovery" })
      );
    });
  });
});