import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom"; // <-- Add this line
import AdminPasswordChangePage from "@/app/(public)/auth/admin_first_login/page";

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("@supabase/auth-helpers-nextjs", () => ({
  createClientComponentClient: () => ({
    auth: {
      updateUser: jest.fn(),
    },
  }),
}));

describe("AdminPasswordChangePage (Admin First Login)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("USR-LOG_TC22: Empty password fields show required error message", async () => {
    render(<AdminPasswordChangePage />);

    const submitBtn = screen.getByRole("button", { name: /Update Password & Continue/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Please fill out both password fields\./i)).toBeInTheDocument();
  });

  test("USR-LOG_TC23: Weak password failing complexity regex shows error", async () => {
    render(<AdminPasswordChangePage />);

    const newPwdInput = screen.getByPlaceholderText("New Password");
    const confirmPwdInput = screen.getByPlaceholderText("Confirm New Password");
    const submitBtn = screen.getByRole("button", { name: /Update Password & Continue/i });

    fireEvent.change(newPwdInput, { target: { value: "weak123" } });
    fireEvent.change(confirmPwdInput, { target: { value: "weak123" } });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Password must be 6-16 chars, with uppercase, lowercase, number, and symbol\./i)
    ).toBeInTheDocument();
  });

  test("USR-LOG_TC24: Mismatched passwords show error", async () => {
    render(<AdminPasswordChangePage />);

    const newPwdInput = screen.getByPlaceholderText("New Password");
    const confirmPwdInput = screen.getByPlaceholderText("Confirm New Password");
    const submitBtn = screen.getByRole("button", { name: /Update Password & Continue/i });

    fireEvent.change(newPwdInput, { target: { value: "AdminPass1!" } });
    fireEvent.change(confirmPwdInput, { target: { value: "DifferentPass2@" } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Passwords do not match\./i)).toBeInTheDocument();
  });
});