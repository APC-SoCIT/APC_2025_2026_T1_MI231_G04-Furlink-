'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { validateAdminSignup } from "@/app/(public)/auth/validation/adminSignupValidation";
import { checkFieldExists } from "@/app/(public)/auth/validation-db";
import { supabase } from "@/lib/supabase";
import "@/app/(public)/auth/auth.css";
import { ROUTES } from "@/config/routes";

const OTP_VALIDITY_SECONDS = 120; // Exactly 2 minutes validity per code

export default function AdminSignupPage() {
  const router = useRouter();
  
  const [accessGranted, setAccessGranted] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState("");
  const [gateStep, setGateStep] = useState<"email" | "otp">("email");
  const [gateOtpToken, setGateOtpToken] = useState("");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessRateLimited, setAccessRateLimited] = useState(false);
  const [gateLockoutUntil, setGateLockoutUntil] = useState<number | null>(null);
  const [gateCountdown, setGateCountdown] = useState(0);
  const [gateOtpTimer, setGateOtpTimer] = useState(OTP_VALIDITY_SECONDS);
  const [gateResendLoading, setGateResendLoading] = useState(false);

  const GATE_LOCKOUT_KEY = "admin_gate_attempts";

  const getStoredGateBlock = (): number | null => {
    const rawData = localStorage.getItem(GATE_LOCKOUT_KEY);
    const data: { attempts?: number[]; blockedUntil?: number } = rawData ? JSON.parse(rawData) : {};
    if (data.blockedUntil && Date.now() < data.blockedUntil) {
      return data.blockedUntil;
    }
    return null;
  };

  useEffect(() => {
    const blockedUntil = getStoredGateBlock();
    if (blockedUntil) {
      setAccessRateLimited(true);
      setGateLockoutUntil(blockedUntil);
    }
  }, []);

  useEffect(() => {
    if (!gateLockoutUntil) return;

    const tick = () => {
      const remainingMs = gateLockoutUntil - Date.now();
      if (remainingMs <= 0) {
        setAccessRateLimited(false);
        setGateLockoutUntil(null);
        setGateCountdown(0);
        setAccessError(null);
      } else {
        setGateCountdown(Math.ceil(remainingMs / 1000));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [gateLockoutUntil]);

  useEffect(() => {
    if (gateStep !== "otp" || gateOtpTimer <= 0) return;
    const interval = setInterval(() => {
      setGateOtpTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [gateStep, gateOtpTimer]);

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", username: "", email: "",
    mobile: "", dob: "", password: "", confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [errors, setErrors] = useState<any>({});
  const [touched, setTouched] = useState<any>({});

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
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split("T")[0];
  };

  const getMinDob = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 65);
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
    const validationErrors = validateAdminSignup(formData, true);
    setErrors(validationErrors);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if ((name === "password" || name === "confirmPassword") && value.length > 16) {
      return;
    }
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      const validationErrors = validateAdminSignup(updated, true);
      setErrors(validationErrors);
      return updated;
    });
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
    setFormData((prev) => {
      const updated = { ...prev, mobile: digitsOnly };
      const validationErrors = validateAdminSignup(updated, true);
      setErrors(validationErrors);
      return updated;
    });
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
    setGateOtpToken(digitsOnly);
  };

  const isFormValid = () => {
    const validationErrors = validateAdminSignup(formData, true);
    const hasErrors = Object.values(validationErrors).some((err) => !!err);

    const allFieldsFilled =
      formData.firstName &&
      formData.lastName &&
      formData.username &&
      formData.email &&
      formData.mobile &&
      formData.dob &&
      formData.password &&
      formData.confirmPassword;

    return !hasErrors && !!allFieldsFilled;
  };

  const checkSignupRateLimit = (email: string, isResend = false) => {
    const key = `admin_signup_attempts_${email.trim().toLowerCase()}`;
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const lockoutMs = 15 * 60 * 1000;

    const rawData = localStorage.getItem(key);
    let data: { attempts?: number[]; blockedUntil?: number } = rawData ? JSON.parse(rawData) : {};

    if (data.blockedUntil && now < data.blockedUntil) {
      const remainingMs = data.blockedUntil - now;
      const remainingMins = Math.ceil(remainingMs / 60000);
      setIsRateLimited(true);
      return {
        allowed: false,
        message: `You have reached the maximum requests. Please try again in ${remainingMins} minute(s).`
      };
    }

    let attemptsArray = data?.attempts || [];
    let validAttempts = attemptsArray.filter(timestamp => now - timestamp < windowMs);

    if (validAttempts.length >= 5) {
      const blockedUntil = now + lockoutMs;
      localStorage.setItem(key, JSON.stringify({ attempts: validAttempts, blockedUntil }));
      setIsRateLimited(true);
      return {
        allowed: false,
        message: "You have reached the maximum requests. Please try again in 15 minutes."
      };
    }

    if (isResend) {
      validAttempts.push(now);
    }

    localStorage.setItem(key, JSON.stringify({ attempts: validAttempts, blockedUntil: undefined }));
    setIsRateLimited(false);
    return { allowed: true };
  };

  const checkGateRateLimit = () => {
    const key = "admin_gate_attempts";
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const lockoutMs = 15 * 60 * 1000;

    const rawData = localStorage.getItem(key);
    let data: { attempts?: number[]; blockedUntil?: number } = rawData ? JSON.parse(rawData) : {};

    if (data.blockedUntil && now < data.blockedUntil) {
      const remainingMins = Math.ceil((data.blockedUntil - now) / 60000);
      setAccessRateLimited(true);
      setGateLockoutUntil(data.blockedUntil);
      return {
        allowed: false,
        validAttempts: [] as number[],
        message: `You have reached the maximum requests. Please try again in ${remainingMins} minute(s).`,
      };
    }

    const validAttempts = (data?.attempts || []).filter((t) => now - t < windowMs);

    if (validAttempts.length >= 5) {
      const blockedUntil = now + lockoutMs;
      localStorage.setItem(key, JSON.stringify({ attempts: validAttempts, blockedUntil }));
      setAccessRateLimited(true);
      setGateLockoutUntil(blockedUntil);
      return {
        allowed: false,
        validAttempts,
        message: "You have reached the maximum requests. Please try again in 15 minutes.",
      };
    }

    return { allowed: true, validAttempts, message: null as string | null };
  };

  const recordFailedGateAttempt = (validAttempts: number[]) => {
    const key = "admin_gate_attempts";
    const now = Date.now();
    const updated = [...validAttempts, now];
    const lockoutMs = 15 * 60 * 1000;

    if (updated.length >= 5) {
      const blockedUntil = now + lockoutMs;
      localStorage.setItem(key, JSON.stringify({ attempts: updated, blockedUntil }));
      setAccessRateLimited(true);
      setGateLockoutUntil(blockedUntil);
    } else {
      localStorage.setItem(key, JSON.stringify({ attempts: updated, blockedUntil: undefined }));
    }
  };

  const handleRequestGateOtp = async (e: React.FormEvent, isResend = false) => {
    e.preventDefault();
    setAccessError(null);

    const rateCheck = checkGateRateLimit();
    if (!rateCheck.allowed) {
      setAccessError(rateCheck.message);
      return;
    }

    if (!adminEmailInput.trim() || !adminEmailInput.includes("@")) {
      setAccessError("Please enter a valid email address.");
      return;
    }

    if (isResend) {
      setGateResendLoading(true);
    } else {
      setAccessLoading(true);
    }

    try {
      const res = await fetch("/api/admin_signup_auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmailInput }),
      });
      const data = await res.json();

      setAccessError("If this account is an admin account you will receive an email");

      if (data.isAdmin) {
        if (data.error) {
          const errorMessage: string = data.error;
          setAccessError(errorMessage);
          setAccessLoading(false);
          setGateResendLoading(false);
          return;
        }
        recordFailedGateAttempt(rateCheck.validAttempts);
        setGateStep("otp");
        setGateOtpTimer(OTP_VALIDITY_SECONDS);
      } else {
        recordFailedGateAttempt(rateCheck.validAttempts);
      }
    } catch {
      setAccessError("Something went wrong. Please check your connection and try again.");
    } finally {
      setAccessLoading(false);
      setGateResendLoading(false);
    }
  };

  // Step 2: Verify the gate OTP code and unlock form without keeping an active login session
  const handleVerifyGateOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gateOtpToken) return;
    setAccessError(null);
    setAccessLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: adminEmailInput.trim().toLowerCase(),
        token: gateOtpToken,
        type: "email",
      });

      if (error) {
        setAccessError("Invalid or expired verification code.");
        setAccessLoading(false);
        return;
      }

      // Immediately sign out so verifying the gate OTP does NOT log the admin into a session yet,
      // allowing them to cleanly fill out and complete their own new admin registration.
      await supabase.auth.signOut();

      setAccessGranted(true);
    } catch {
      setAccessError("Failed to verify code. Please try again.");
    } finally {
      setAccessLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateAdminSignup(formData, true);
    setErrors(validationErrors);
    setTouched({
      firstName: true, lastName: true, username: true, email: true,
      mobile: true, dob: true, password: true, confirmPassword: true,
    });

    if (!isFormValid()) {
      setFormError("Please fill out all required fields properly before continuing.");
      return;
    }

    const usernameTaken = await checkFieldExists("username", formData.username);
    const emailTaken = await checkFieldExists("email", formData.email);

    if (usernameTaken || emailTaken) {
      setFormError("Admin account already exists. Please log in instead.");
      return;
    }

    setFormError(null);

    const rateCheck = checkSignupRateLimit(formData.email, true);
    if (!rateCheck.allowed) {
      setFormError(rateCheck.message ?? null);
      setIsRateLimited(true);
      return;
    }

    setLoading(true);

    try {
      const formattedMobile = "+63" + formData.mobile.replace(/^0+/, "");
      
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
            role: "admin",
            must_change_password: true,
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
        setOtpError("Invalid or expired token. Please check the code or try again after 15 minutes if limit was reached.");
        setVerificationLoading(false);
        return;
      }

      if (!data.session) {
        setOtpError("Account verified, but automatic sign-in failed. Redirecting you to log in...");
        setTimeout(() => router.push(ROUTES.AUTH.LOGIN), 2000);
        return;
      }

      router.refresh();
      router.push(ROUTES.ADMIN.ADMIN_DASHBOARD);
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

  if (!accessGranted) {
    return (
      <div className="signup-wrapper">
        {gateStep === "email" ? (
          <form className="signup-card" onSubmit={(e) => handleRequestGateOtp(e, false)} noValidate>
            <h1>Admin Access Required</h1>
            <p className="otp-instructions">
              Enter your registered admin email address to receive an authentication code.
            </p>

            {accessError && (
              <p style={{ backgroundColor: "#eef2ff", color: "#3b429f", padding: "12px", borderRadius: "8px", fontSize: "14px", marginBottom: "15px", border: "1px solid #c7d2fe" }}>
                {accessError}
              </p>
            )}

            <div className="input-group" style={{ marginBottom: "20px" }}>
              <input
                type="email"
                placeholder="Admin Email Address"
                value={adminEmailInput}
                onChange={(e) => setAdminEmailInput(e.target.value)}
                disabled={accessRateLimited}
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              className="register-btn"
              disabled={accessLoading || accessRateLimited}
            >
              {accessLoading
                ? "Verifying Email..."
                : accessRateLimited
                  ? `Try again in ${formatTimer(gateCountdown)}`
                  : "Send Authentication Code"}
            </button>

            <p className="auth-redirect-text">
              Not an admin?{" "}
              <Link href="/auth/login" className="login-link">Log In</Link>
            </p>
          </form>
        ) : (
          <form className="signup-card" onSubmit={handleVerifyGateOtp} noValidate>
            <h1>Verify Admin Access</h1>
            <p className="otp-instructions">
              If this account is an admin account you will receive an email. Enter it below to proceed.
            </p>

            {accessError && (
              <p style={{ backgroundColor: "#eef2ff", color: "#3b429f", padding: "12px", borderRadius: "8px", fontSize: "14px", marginBottom: "15px", border: "1px solid #c7d2fe" }}>
                {accessError}
              </p>
            )}

            <div className="input-group" style={{ marginBottom: "20px" }}>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={gateOtpToken}
                onChange={handleOtpChange}
                maxLength={6}
                required
                inputMode="numeric"
              />
            </div>

            {gateOtpTimer > 0 ? (
              <p className="otp-timer">Code expires in {formatTimer(gateOtpTimer)}</p>
            ) : (
              <p className="otp-timer otp-expired">Code expired.</p>
            )}

            <p className="otp-resend">
              <button
                type="button"
                onClick={(e) => handleRequestGateOtp(e, true)}
                disabled={gateResendLoading || accessRateLimited}
                className="resend-link"
              >
                {gateResendLoading ? "Resending..." : accessRateLimited ? "Request limit reached" : "Resend code"}
              </button>
            </p>

            <button
              type="submit"
              className="register-btn"
              disabled={accessLoading || !gateOtpToken}
            >
              {accessLoading ? "Verifying..." : "Verify & Proceed"}
            </button>
          </form>
        )}
      </div>
    );
  }

  if (pendingVerification) {
    return (
      <div className="signup-wrapper">
        <form className="signup-card" onSubmit={handleVerifyOtp} noValidate>
          <h1>Verify Admin Account</h1>
          <p className="otp-instructions">
            We have sent a verification OTP code to <strong>{formData.email}</strong>. Please enter it below.
          </p>
          <p className="otp-spam-note">
            Didn&apos;t receive it? Check your spam or trash folder.
          </p>

          {otpError && <p className="form-error-banner">{otpError}</p>}

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
            {verificationLoading ? "Verifying..." : "Verify Admin Account"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="signup-wrapper">
      <form className="signup-card" onSubmit={handleSubmit} noValidate>
        <h1>Create Admin Account</h1>

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
                min={getMinDob()}
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

        <div className="form-row" style={{ marginTop: "10px" }}>
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

        <button
          type="submit"
          className="register-btn"
          disabled={loading || !isFormValid()}
        >
          {loading ? "Creating Admin Account..." : "Sign Up as Admin"}
        </button>

        <p className="auth-redirect-text">
          Already have an account?{" "}
          <Link href="/auth/login" className="login-link">Log In</Link>
        </p>
      </form>
    </div>
  );
}