'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { validateSignup } from "@/app/(public)/auth/validation/signUpValidation";
import { checkFieldExists } from "@/app/(public)/auth/validation-db";
import { supabase } from "@/lib/supabase";
import "@/app/(public)/auth/auth.css";
import { ROUTES } from "@/config/routes";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", username: "", email: "",
    mobile: "", dob: "", password: "", confirmPassword: "", roleChoice: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [errors, setErrors] = useState<any>({});
  const [touched, setTouched] = useState<any>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // New state to toggle UI into OTP verification view after successful signup trigger
  const [pendingVerification, setPendingVerification] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);

  // Countdown timer for OTP validity (seconds), seeded from the server's response
  const [otpTimer, setOtpTimer] = useState(300);

  // How many more times the user is allowed to request a new code, from the server
  const [resendsRemaining, setResendsRemaining] = useState<number | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  // Ticks the countdown down every second while on the verification screen
  useEffect(() => {
    if (!pendingVerification || otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingVerification, otpTimer]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Anyone younger than 13 today can't be selected in the calendar picker
  const getMaxDob = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 13);
    return d.toISOString().split("T")[0];
  };

  const formatDobDisplay = (isoDate: string) => {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${m}/${d}/${y}`;
  };

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev: any) => ({ ...prev, [name]: true }));

    const currentData = { ...formData, [name]: value };
    const validationErrors = validateSignup(currentData, agreedToTerms);

    if ((name === "username" || name === "email") && !validationErrors[name]) {
      const exists = await checkFieldExists(name as 'username' | 'email', value);
      if (exists) {
        validationErrors[name] = `${name.charAt(0).toUpperCase() + name.slice(1)} has already been used`;
      }
    }

    setErrors(validationErrors);
  };

  // MULTI-ROLE LOGIC HANDLING: pet_owner, service_provider, or both_sp_po
  const handleRoleToggle = (role: string) => {
    setFormData(prev => {
      const current = prev.roleChoice;
      let next;
      if (current === "") next = role;
      else if (current === role) next = "";
      else if (current === "both_sp_po") next = role === 'pet_owner' ? 'service_provider' : 'pet_owner';
      else next = 'both_sp_po';

      const newFormData = { ...prev, roleChoice: next };
      const validationErrors = validateSignup(newFormData, agreedToTerms);
      setErrors(validationErrors);

      return newFormData;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
    setFormData((prev) => ({ ...prev, mobile: digitsOnly }));
  };

  const isFormValid = () => {
    const hasErrors = Object.values(errors).some((err) => !!err);
    const allFieldsFilled =
      formData.firstName &&
      formData.lastName &&
      formData.username &&
      formData.email &&
      formData.mobile &&
      formData.dob &&
      formData.roleChoice &&
      formData.password &&
      formData.confirmPassword;

    return agreedToTerms && !hasErrors && !!allFieldsFilled;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send_otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const result = await res.json();

      if (!res.ok) {
        alert(result.error || "Failed to send verification code.");
      } else {
        setOtpTimer(result.validitySeconds ?? 300);
        setResendsRemaining(result.resendsRemaining ?? 0);
        setPendingVerification(true);
      }
    } catch (err) {
      console.error("Unexpected signup error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handles verification of the OTP token sent to email
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken || otpTimer <= 0) return;
    setVerificationLoading(true);

    try {
      const res = await fetch("/api/auth/verify_otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          code: otpToken,
          password: formData.password,
          userData: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            username: formData.username,
            mobile_number: formData.mobile,
            date_of_birth: formData.dob,
            role: formData.roleChoice,
          },
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        alert(result.error || "Verification failed.");
        return;
      }

      // Sign the newly created user in immediately, since admin.createUser
      // doesn't create a client-side session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        alert("Account created, but automatic sign-in failed. Please log in.");
        router.push(ROUTES.AUTH.LOGIN);
        return;
      }

      router.refresh();
      if (formData.roleChoice === "service_provider") {
        router.push(ROUTES.SERVICE_PROVIDER.ONBOARDING);
      } else {
        router.push(ROUTES.PET_OWNER.DASHBOARD);
      }
    } catch (err) {
      console.error("OTP verification error:", err);
      alert("Failed to verify code. Please try again.");
    } finally {
      setVerificationLoading(false);
    }
  };

  // Resends a fresh OTP and resets the countdown, respecting the server's resend cap
  const handleResendOtp = async () => {
    if (resendsRemaining !== null && resendsRemaining <= 0) return;
    setResendLoading(true);

    try {
      const res = await fetch("/api/auth/send_otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const result = await res.json();

      if (!res.ok) {
        alert(result.error || "Failed to resend code.");
        if (res.status === 429) {
          setResendsRemaining(0);
        }
      } else {
        setOtpTimer(result.validitySeconds ?? 300);
        setResendsRemaining(result.resendsRemaining ?? 0);
        setOtpToken("");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      alert("Something went wrong resending the code.");
    } finally {
      setResendLoading(false);
    }
  };

  // If signup completed successfully, render the OTP verification screen step
  if (pendingVerification) {
    const resendExhausted = resendsRemaining !== null && resendsRemaining <= 0;

    return (
      <div className="signup-wrapper">
        <form className="signup-card" onSubmit={handleVerifyOtp}>
          <h1>Verify Your Email</h1>
          <p className="otp-instructions">
            We have sent a verification OTP code to <strong>{formData.email}</strong>. Please enter it below to activate your account.
          </p>
          <p className="otp-spam-note">
            Didn&apos;t receive it? Check your spam or trash folder.
          </p>

          <div className="input-group" style={{ marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otpToken}
              onChange={(e) => setOtpToken(e.target.value)}
              maxLength={6}
              required
              disabled={otpTimer <= 0}
            />
          </div>

          {otpTimer > 0 ? (
            <p className="otp-timer">Code expires in {formatTimer(otpTimer)}</p>
          ) : (
            <p className="otp-timer otp-expired">Code expired.</p>
          )}

          {resendExhausted ? (
            <p className="otp-resend-limit">
              You&apos;ve reached the maximum number of code requests. Please check your spam or trash folder, or try again later.
            </p>
          ) : (
            <p className="otp-resend">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendLoading || otpTimer > 0}
                className="resend-link"
              >
                {resendLoading ? "Resending..." : "Resend code"}
              </button>
              {resendsRemaining !== null && (
                <span className="otp-resend-count"> ({resendsRemaining} left)</span>
              )}
            </p>
          )}

          <button
            type="submit"
            className="register-btn"
            disabled={verificationLoading || !otpToken || otpTimer <= 0}
          >
            {verificationLoading ? "Verifying..." : "Verify Account"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="signup-wrapper">
      <form className="signup-card" onSubmit={handleSubmit}>
        <h1>Create Your Account</h1>

        <div className="form-row">
          <div className="input-group">
            <input name="firstName" placeholder="First Name" onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} onBlur={handleBlur} className={errors.firstName ? "input-error" : ""} />
            {touched.firstName && errors.firstName && <span className="error-text">{errors.firstName}</span>}
          </div>
          <div className="input-group">
            <input name="lastName" placeholder="Last Name" onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} onBlur={handleBlur} className={errors.lastName ? "input-error" : ""} />
            {touched.lastName && errors.lastName && <span className="error-text">{errors.lastName}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="input-group">
            <div className={`phone-input-container ${errors.username ? "input-error" : ""}`}>
              <span className="phone-prefix">@</span>
              <div className="phone-divider"></div>
              <input name="username" placeholder="username" onChange={(e) => setFormData({ ...formData, username: e.target.value })} onBlur={handleBlur} />
            </div>
            {touched.username && errors.username && <span className="error-text">{errors.username}</span>}
          </div>
          <div className="input-group">
            <input name="email" placeholder="Email Address" onChange={(e) => setFormData({ ...formData, email: e.target.value })} onBlur={handleBlur} className={errors.email ? "input-error" : ""} />
            {touched.email && errors.email && <span className="error-text">{errors.email}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="input-group">
            <div className={`phone-input-container ${errors.mobile ? "input-error" : ""}`}>
              <span className="phone-prefix">+63</span>
              <div className="phone-divider"></div>
              <input
                name="mobile"
                placeholder="9XXXXXXXXX"
                value={formData.mobile}
                onChange={handleMobileChange}
                onBlur={handleBlur}
                inputMode="numeric"
                maxLength={10}
              />
            </div>
            {touched.mobile && errors.mobile && <span className="error-text">{errors.mobile}</span>}
          </div>
          <div className="input-group">
            <div className="date-input-container">
              <input
                type="date"
                name="dob"
                lang="en-US"
                max={getMaxDob()}
                value={formData.dob}
                onChange={handleChange}
                onBlur={handleBlur}
                className={errors.dob ? "input-error" : ""}
              />
              <span className="date-display">{formData.dob ? formatDobDisplay(formData.dob) : "mm/dd/yyyy"}</span>
            </div>
            {touched.dob && errors.dob && errors.dob !== "Date of Birth is required." && (
              <span className="error-text">{errors.dob}</span>
            )}
          </div>
        </div>

        <p>I want to join as a: <span className="required-asterisk">*</span></p>
        <div className={`role-buttons ${errors.roleChoice ? "role-buttons-required" : ""}`}>
          <button
            type="button"
            onClick={() => handleRoleToggle('pet_owner')}
            className={formData.roleChoice === 'pet_owner' || formData.roleChoice === 'both_sp_po' ? 'active' : ''}
          >
            Pet Owner
          </button>
          <button
            type="button"
            onClick={() => handleRoleToggle('service_provider')}
            className={formData.roleChoice === 'service_provider' || formData.roleChoice === 'both_sp_po' ? 'active' : ''}
          >
            Service Provider
          </button>
        </div>

        <div className="form-row">
          <div className="input-group">
            <div className="password-container">
              <input type={showPassword ? "text" : "password"} name="password" placeholder="Password" onChange={(e) => setFormData({ ...formData, password: e.target.value })} onBlur={handleBlur} />
              <button type="button" className="toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {touched.password && errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <div className="input-group">
            <div className="password-container">
              <input type={showPasswordConfirm ? "text" : "password"} name="confirmPassword" placeholder="Confirm Password" onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} onBlur={handleBlur} />
              <button type="button" className="toggle-btn" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}>
                {showPasswordConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {touched.confirmPassword && errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>
        </div>

        <div className="terms-container">
          <input
            type="checkbox"
            id="termsCheckbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className={errors.terms ? "checkbox-required" : ""}
          />
          <label htmlFor="termsCheckbox">
            I agree to the <Link href="/terms" className="terms-link">Terms and Conditions</Link> and <Link href="/privacy" className="terms-link">Privacy Policy</Link> of furlink <span className="required-asterisk">*</span>
          </label>
        </div>

        <button
          type="submit"
          className="register-btn"
          disabled={loading || !isFormValid()}
        >
          {loading ? "Signing Up..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
}