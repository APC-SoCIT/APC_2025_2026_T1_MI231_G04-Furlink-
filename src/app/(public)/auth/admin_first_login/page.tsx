"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/config/routes";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "@/app/(public)/auth/auth.css";

export default function AdminPasswordChangePage() {
  const [formData, setFormData] = useState({ newPassword: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClientComponentClient();
  const router = useRouter();

  const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])(?!.*\s).{6,16}$/;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value.length > 16) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.newPassword || !formData.confirmPassword) {
      setError("Please fill out both password fields.");
      return;
    }

    if (!pwdRegex.test(formData.newPassword)) {
      setError("Password must be 6-16 chars, with uppercase, lowercase, number, and symbol.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Update the user's password and clear the must_change_password flag
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
        data: { must_change_password: false },
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      router.refresh();
      router.push(ROUTES.ADMIN.ADMIN_DASHBOARD);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handlePasswordChangeSubmit} className="auth-form" noValidate>
        <h1>Change Password</h1>
        <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>
          For security purposes on your first login, please update your temporary password to a new one.
        </p>

        {error && <p className="auth-form-error">{error}</p>}

        <div className="input-group">
          <div className="password-container">
            <input
              type={showPassword ? "text" : "password"}
              name="newPassword"
              placeholder="New Password (6-16 chars)"
              value={formData.newPassword}
              onChange={handleChange}
              maxLength={16}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <div className="input-group">
          <div className="password-container">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm New Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              maxLength={16}
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Updating Password..." : "Update Password & Continue"}
        </button>
      </form>
    </div>
  );
}