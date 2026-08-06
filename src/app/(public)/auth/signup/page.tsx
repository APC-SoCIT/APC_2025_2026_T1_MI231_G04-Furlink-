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
  const [dbErrors, setDbErrors] = useState<{ username?: string; email?: string }>({});
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  const [pendingVerification, setPendingVerification] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);

  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(300);

  const [resendExhausted, setResendExhausted] = useState(false);
  const [resendRetryMinutes, setResendRetryMinutes] = useState<number | null>(null);
  const [resendLoading, setResendLoading] = useState(false);

  // Ticks the countdown down every second while on the verification screen
  useEffect(() => {
    if (!pendingVerification || otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingVerification, otpTimer]);

  // Automatically check database for email and username existence (handles autofill and typing)
  useEffect(() => {
    const timer = setTimeout(async () => {
      const emailTrim = formData.email.trim();
      const usernameTrim = formData.username.trim();

      // Check Email
      if (emailTrim && emailTrim.includes("@") && emailTrim.includes(".")) {
        const emailExists = await checkFieldExists('email', emailTrim);
        setDbErrors(prev => ({
          ...prev,
          email: emailExists ? "Email has already been used" : undefined
        }));
      } else {
        setDbErrors(prev => ({ ...prev, email: undefined }));
      }

      // Check Username
      if (usernameTrim.length >= 3) {
        const usernameExists = await checkFieldExists('username', usernameTrim);
        setDbErrors(prev => ({
          ...prev,
          username: usernameExists ? "Username has already been used" : undefined
        }));
      } else {
        setDbErrors(prev => ({ ...prev, username: undefined }));
      }
    }, 400); // 400ms debounce to prevent excessive queries

    return () => clearTimeout(timer);
  }, [formData.email, formData.username]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

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

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched((prev: any) => ({ ...prev, [name]: true }));
    const validationErrors = validateSignup(formData, agreedToTerms);
    setErrors(validationErrors);
  };

  const handleRoleToggle = (role: 'pet_owner' | 'service_provider') => {
    setFormData(prev => {
      const isPetOwner = prev.roleChoice === 'pet_owner' || prev.roleChoice === 'both_sp_po';
      const isServiceProvider = prev.roleChoice === 'service_provider' || prev.roleChoice === 'both_sp_po';

      const nextPetOwner = role === 'pet_owner' ? !isPetOwner : isPetOwner;
      const nextServiceProvider = role === 'service_provider' ? !isServiceProvider : isServiceProvider;

      let next = '';
      if (nextPetOwner && nextServiceProvider) next = 'both_sp_po';
      else if (nextPetOwner) next = 'pet_owner';
      else if (nextServiceProvider) next = 'service_provider';

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
    const validationErrors = validateSignup(formData, agreedToTerms);
    const hasErrors = Object.values(validationErrors).some((err) => !!err);
    const hasDbErrors = !!dbErrors.username || !!dbErrors.email;
    
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

    return agreedToTerms && !hasErrors && !hasDbErrors && !!allFieldsFilled;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setFormError(null);
    setLoading(true);

    try {
      // Final check right before triggering OTP to prevent race conditions
      const emailExists = await checkFieldExists('email', formData.email);
      const usernameExists = await checkFieldExists('username', formData.username);

      if (emailExists || usernameExists) {
        setDbErrors({
          email: emailExists ? "Email has already been used" : undefined,
          username: usernameExists ? "Username has already been used" : undefined,
        });
        setFormError("The username or email is already registered. Please use different credentials.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/send_otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const result = await res.json();

      if (!res.ok) {
        setFormError(result.error || "Failed to send verification code.");
      } else {
        setOtpTimer(result.validitySeconds ?? 300);
        setResendExhausted(!!result.resendsExhausted);
        setResendRetryMinutes(result.retryAfterMinutes ?? null);
        setOtpError(null);
        setPendingVerification(true);
      }
    } catch {
      setFormError("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken || otpTimer <= 0) return;
    setOtpError(null);
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
        setOtpError(result.error || "Verification failed. Please try again.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        setOtpError("Account created, but automatic sign-in failed. Redirecting you to log in...");
        setTimeout(() => router.push(ROUTES.AUTH.LOGIN), 2000);
        return;
      }

      router.refresh();
      if (formData.roleChoice === "service_provider") {
        router.push(ROUTES.SERVICE_PROVIDER.ONBOARDING);
      } else {
        router.push(ROUTES.PET_OWNER.DASHBOARD);
      }
    } catch {
      setOtpError("Failed to verify code. Please check your connection and try again.");
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendExhausted) return;
    setOtpError(null);
    setResendLoading(true);

    try {
      const res = await fetch("/api/auth/send_otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const result = await res.json();

      if (!res.ok) {
        setOtpError(result.error || "Failed to resend code.");
        if (res.status === 429) {
          setResendExhausted(true);
          setResendRetryMinutes(result.retryAfterMinutes ?? null);
        }
      } else {
        setOtpTimer(result.validitySeconds ?? 300);
        setResendExhausted(!!result.resendsExhausted);
        setResendRetryMinutes(result.retryAfterMinutes ?? null);
        setOtpToken("");
      }
    } catch {
      setOtpError("Something went wrong resending the code. Please check your connection.");
    } finally {
      setResendLoading(false);
    }
  };

  if (pendingVerification) {
    const showResendLimitBanner = resendExhausted && (otpTimer <= 0 || !!otpError);

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

          {otpError && <p className="otp-error-banner">{otpError}</p>}

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

          {showResendLimitBanner && (
            <p className="otp-resend-limit">
              You&apos;ve requested too many codes.{" "}
              {resendRetryMinutes
                ? `Please come back in ${resendRetryMinutes} minute${resendRetryMinutes === 1 ? "" : "s"}.`
                : "Please try again later."}{" "}
              In the meantime, check your spam or trash folder for a previous code.
            </p>
          )}

          {!resendExhausted && (
            <p className="otp-resend">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendLoading || otpTimer > 0}
                className="resend-link"
              >
                {resendLoading ? "Resending..." : "Resend code"}
              </button>
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
      <form className="signup-card" onSubmit={handleSubmit} noValidate>
        <h1>Create Your Account</h1>

        {formError && <p className="form-error-banner">{formError}</p>}

        <div className="form-row">
          <div className="input-group">
            <input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} onBlur={handleBlur} className={errors.firstName ? "input-error" : ""} />
            {touched.firstName && errors.firstName && <span className="error-text">{errors.firstName}</span>}
          </div>
          <div className="input-group">
            <input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} onBlur={handleBlur} className={errors.lastName ? "input-error" : ""} />
            {touched.lastName && errors.lastName && <span className="error-text">{errors.lastName}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="input-group">
            <div className={`phone-input-container ${(errors.username || dbErrors.username) ? "input-error" : ""}`}>
              <span className="phone-prefix">@</span>
              <div className="phone-divider"></div>
              <input name="username" placeholder="username" value={formData.username} onChange={handleChange} onBlur={handleBlur} />
            </div>
            {(touched.username || dbErrors.username) && (errors.username || dbErrors.username) && (
              <span className="error-text">{dbErrors.username || errors.username}</span>
            )}
          </div>
          <div className="input-group">
            <input name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} onBlur={handleBlur} className={(errors.email || dbErrors.email) ? "input-error" : ""} />
            {(touched.email || dbErrors.email) && (errors.email || dbErrors.email) && (
              <span className="error-text">{dbErrors.email || errors.email}</span>
            )}
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
              <input type={showPassword ? "text" : "password"} name="password" placeholder="Password" value={formData.password} onChange={handleChange} onBlur={handleBlur} />
              <button type="button" className="toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {touched.password && errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <div className="input-group">
            <div className="password-container">
              <input type={showPasswordConfirm ? "text" : "password"} name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} />
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

        <p className="login-redirect">
          Already have an account?{" "}
          <Link href="/auth/login" className="login-link">Log In Here</Link>
        </p>
      </form>
    </div>
  );
}