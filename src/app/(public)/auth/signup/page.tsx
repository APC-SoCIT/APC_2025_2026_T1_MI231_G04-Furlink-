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

const OTP_VALIDITY_SECONDS = 120; // Exactly 2 minutes validity per code

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

  const [formError, setFormError] = useState<string | null>(null);

  const [pendingVerification, setPendingVerification] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);

  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(OTP_VALIDITY_SECONDS);

  const [resendLoading, setResendLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

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
    if ((name === "password" || name === "confirmPassword") && value.length > 16) {
      return;
    }
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      const validationErrors = validateSignup(updated, agreedToTerms);
      setErrors(validationErrors);
      return updated;
    });
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
    setFormData((prev) => {
      const updated = { ...prev, mobile: digitsOnly };
      const validationErrors = validateSignup(updated, agreedToTerms);
      setErrors(validationErrors);
      return updated;
    });
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtpToken(digitsOnly);
  };

  const isFormValid = () => {
    const validationErrors = validateSignup(formData, agreedToTerms);
    const hasErrors = Object.values(validationErrors).some((err) => !!err);

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

  // Rate limit check for requesting new codes
  const checkSignupRateLimit = (email: string, isResend = false) => {
    const key = `signup_attempts_${email.trim().toLowerCase()}`;
    const now = Date.now();
    const windowMs = 10 * 60 * 1000; // 10 minutes rolling window
    const lockoutMs = 15 * 60 * 1000; // 15 minutes lockout

    const rawData = localStorage.getItem(key);
    let data: { attempts?: number[]; blockedUntil?: number } = rawData ? JSON.parse(rawData) : {};

    if (data.blockedUntil && now < data.blockedUntil) {
      const remainingMs = data.blockedUntil - now;
      const remainingMins = Math.ceil(remainingMs / 60000);
      setIsRateLimited(true);
      return {
        allowed: false,
        message: `You have reached the maximum requests. Please try again in ${remainingMins} minute(s), or log back in later to request a new verification code.`
      };
    }

    let attemptsArray = data?.attempts || [];
    let validAttempts = attemptsArray.filter(timestamp => now - timestamp < windowMs);

    // If they already have 5 attempts recorded and are trying to make a *new* request (beyond the 5th)
    if (validAttempts.length >= 5) {
      const blockedUntil = now + lockoutMs;
      localStorage.setItem(key, JSON.stringify({ attempts: validAttempts, blockedUntil }));
      setIsRateLimited(true);
      return {
        allowed: false,
        message: "You have reached the maximum requests. Please try again in 15 minutes, or log back in later to request a new verification code."
      };
    }

    if (isResend) {
      validAttempts.push(now);
    }

    if (validAttempts.length >= 5) {
      const blockedUntil = now + lockoutMs;
      localStorage.setItem(key, JSON.stringify({ attempts: validAttempts, blockedUntil }));
      setIsRateLimited(true);
    } else {
      localStorage.setItem(key, JSON.stringify({ attempts: validAttempts, blockedUntil: undefined }));
      setIsRateLimited(false);
    }

    return { allowed: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateSignup(formData, agreedToTerms);
    setErrors(validationErrors);
    setTouched({
      firstName: true, lastName: true, username: true, email: true,
      mobile: true, dob: true, password: true, confirmPassword: true,
      roleChoice: true, terms: true,
    });

    if (!isFormValid()) {
      setFormError("Please fill out all required fields properly before continuing.");
      return;
    }

    const usernameTaken = await checkFieldExists("username", formData.username);
    const emailTaken = await checkFieldExists("email", formData.email);

    if (usernameTaken || emailTaken) {
      setFormError("Account already exists. Please log in instead.");
      return;
    }

    setFormError(null);

    // Initial sign-up is request #1. Pass false for isResend so it registers the first attempt.
    const key = `signup_attempts_${formData.email.trim().toLowerCase()}`;
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const rawData = localStorage.getItem(key);
    let data: { attempts?: number[]; blockedUntil?: number } = rawData ? JSON.parse(rawData) : {};

    if (data.blockedUntil && now < data.blockedUntil) {
      const remainingMs = data.blockedUntil - now;
      const remainingMins = Math.ceil(remainingMs / 60000);
      setIsRateLimited(true);
      setFormError(`You have reached the maximum requests. Please try again in ${remainingMins} minute(s), or log back in later to request a new verification code.`);
      return;
    }

    let attemptsArray = data?.attempts || [];
    let validAttempts = attemptsArray.filter(timestamp => now - timestamp < windowMs);

    if (validAttempts.length >= 5) {
      setIsRateLimited(true);
      setFormError("You have reached the maximum requests. Please try again in 15 minutes, or log back in later to request a new verification code.");
      return;
    }

    validAttempts.push(now);
    localStorage.setItem(key, JSON.stringify({ attempts: validAttempts, blockedUntil: undefined }));

    setLoading(true);

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            username: formData.username,
            mobile_number: formData.mobile,
            date_of_birth: formData.dob,
            role: formData.roleChoice,
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already been used")) {
          setFormError("Account already exists. Please log in instead.");
          setLoading(false);
          return;
        }

        setFormError(error.message);
        setLoading(false);
        return;
      }

      setOtpTimer(OTP_VALIDITY_SECONDS);
      setOtpError(null);
      setPendingVerification(true);
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
      const { data, error } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: otpToken,
        type: "signup",
      });

      if (error) {
        setOtpError("Invalid OTP Code. Please check the code or try again after 15 minutes if limit was reached.");
        return;
      }

      if (!data.session) {
        setOtpError("Account verified, but automatic sign-in failed. Redirecting you to log in...");
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
    if (otpTimer > 0 || isRateLimited) return;

    const rateCheck = checkSignupRateLimit(formData.email, true);
    if (!rateCheck.allowed) {
      setOtpError(rateCheck.message ?? null);
      setIsRateLimited(true);
      return;
    }

    setOtpError(null);
    setResendLoading(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: formData.email,
      });

      if (error) {
        setOtpError(error.message);
      } else {
        setOtpTimer(OTP_VALIDITY_SECONDS);
        setOtpToken("");
      }
    } catch {
      setOtpError("Something went wrong resending the code. Please check your connection.");
    } finally {
      setResendLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <div className="signup-wrapper">
        <form className="signup-card" onSubmit={handleVerifyOtp}>
          <h1>Verify Your Email</h1>
          <p className="otp-instructions">
            We have sent a verification code to <strong>{formData.email}</strong>. Please enter it below to activate your account.
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
              onChange={handleOtpChange}
              maxLength={6}
              required
              inputMode="numeric"
              disabled={otpTimer <= 0}
            />
          </div>

          {otpTimer > 0 ? (
            <p className="otp-timer">Code expires in {formatTimer(otpTimer)}</p>
          ) : (
            <p className="otp-timer otp-expired">Code expired.</p>
          )}

          <p className="otp-resend">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendLoading || otpTimer > 0 || isRateLimited}
              className="resend-link"
            >
              {resendLoading ? "Resending..." : isRateLimited ? "Request limit reached" : "Resend code"}
            </button>
          </p>

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
            <div className={`phone-input-container ${errors.username ? "input-error" : ""}`}>
              <span className="phone-prefix">@</span>
              <div className="phone-divider"></div>
              <input name="username" placeholder="username" value={formData.username} onChange={handleChange} onBlur={handleBlur} />
            </div>
            {touched.username && errors.username && <span className="error-text">{errors.username}</span>}
          </div>
          <div className="input-group">
            <input name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} onBlur={handleBlur} className={errors.email ? "input-error" : ""} />
            {touched.email && errors.email && <span className="error-text">{errors.email}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="input-group">
            <label className="field-guide-label">Mobile Number</label>
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
            <label className="field-guide-label">Date of Birth</label>
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
        {touched.roleChoice && errors.roleChoice && <span className="error-text">{errors.roleChoice}</span>}

        <div className="form-row">
          <div className="input-group">
            <div className="password-container">
              <input type={showPassword ? "text" : "password"} name="password" placeholder="Password" value={formData.password} onChange={handleChange} onBlur={handleBlur} maxLength={16} />
              <button type="button" className="toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {touched.password && errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <div className="input-group">
            <div className="password-container">
              <input type={showPasswordConfirm ? "text" : "password"} name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} maxLength={16} />
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

        <p className="auth-redirect-text">
          Have an account?{" "}
          <Link href="/auth/login" className="login-link">Log In</Link>
        </p>
      </form>
    </div>
  );
}