"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { validateLogin } from "@/app/(public)/auth/validation/loginValidation";
import { ROUTES } from "@/config/routes";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "@/app/(public)/auth/auth.css";

const OTP_VALIDITY_SECONDS = 120;

export default function LoginPage() {
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState<any>({});
  const [touched, setTouched] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [pendingVerification, setPendingVerification] = useState(false);
  const [resolvedEmail, setResolvedEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(OTP_VALIDITY_SECONDS);
  const [resendLoading, setResendLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const supabase = createClientComponentClient();
  const router = useRouter();

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

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtpToken(digitsOnly);
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length > 50) return;
    setFormData((prev) => {
      const updated = { ...prev, identifier: value };
      const validation = validateLogin(updated);
      setErrors(validation.errors);
      return updated;
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length > 16) return;
    setFormData((prev) => {
      const updated = { ...prev, password: value };
      const validation = validateLogin(updated);
      setErrors(validation.errors);
      return updated;
    });
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched((prev: any) => ({ ...prev, [name]: true }));
    const validation = validateLogin(formData);
    setErrors(validation.errors);
  };

  const checkLoginRateLimit = (email: string, isResend = false) => {
    const key = `login_attempts_${email.trim().toLowerCase()}`;
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
        message: `You have reached the maximum requests. Please try again in ${remainingMins} minute(s), or log back in later to request a new verification code.`
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
        message: "You have reached the maximum requests. Please try again in 15 minutes, or log back in later to request a new verification code."
      };
    }

    if (isResend) {
      validAttempts.push(now);
    }

    if (validAttempts.length > 5) {
      const blockedUntil = now + lockoutMs;
      localStorage.setItem(key, JSON.stringify({ attempts: validAttempts, blockedUntil }));
      setIsRateLimited(true);
    } else {
      localStorage.setItem(key, JSON.stringify({ attempts: validAttempts, blockedUntil: undefined }));
      setIsRateLimited(false);
    }

    return { allowed: true };
  };

  const triggerVerificationFlow = async (email: string) => {
    localStorage.removeItem(`login_attempts_${email.trim().toLowerCase()}`);
        
    const rateCheck = checkLoginRateLimit(email, true);
    if (!rateCheck.allowed) {
      setErrors({ form: rateCheck.message });
      setLoading(false);
      return;
    }

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    if (resendError && !resendError.message.toLowerCase().includes("security purposes")) {
      setErrors({ form: resendError.message });
      setLoading(false);
      return;
    }

    setResolvedEmail(email);
    setOtpTimer(OTP_VALIDITY_SECONDS);
    setOtpError(null);
    setPendingVerification(true);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ identifier: true, password: true });

    const validation = validateLogin(formData);
    setErrors(validation.errors);
    if (!validation.isValid) {
      return;
    }

    setLoading(true);
    let currentResolvedIdentifier = formData.identifier.trim();

    try {
      if (!currentResolvedIdentifier.includes("@")) {
        const { data: emailData, error: emailError } = await supabase
          .rpc("get_email_for_username", { lookup_username: currentResolvedIdentifier });

        if (emailError || !emailData) {
          setErrors({ form: "Invalid email/username or password. Please try again." });
          setLoading(false);
          return;
        }

        currentResolvedIdentifier = emailData;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: currentResolvedIdentifier,
        password: formData.password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          await triggerVerificationFlow(currentResolvedIdentifier);
          return;
        }

        setErrors({ form: "Invalid email/username or password. Please try again." });
        setLoading(false);
        return;
      }

      if (!data.user) {
        setErrors({ form: "Invalid email/username or password. Please try again." });
        setLoading(false);
        return;
      }

      const user = data.user;

      if (user.identities && user.identities.length === 0) {
        await triggerVerificationFlow(currentResolvedIdentifier);
        return;
      }

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = userProfile?.role || user.user_metadata?.role || 'pet_owner';
      const mustChangePassword = user.user_metadata?.must_change_password;

      let registrationStatus = null;
      if (role === 'service_provider' || role === 'both_sp_po') {
        const { data: spInfo } = await supabase
          .from("sp_general_info")
          .select("registration_status")
          .eq("profiles_id", user.id)
          .maybeSingle();
        
        registrationStatus = spInfo?.registration_status;
      }

      router.refresh();

      // Check if role is admin and if it's their first login (must_change_password is true)
      if (role === 'admin' && mustChangePassword) {
        router.push("/auth/admin_first_login");
        return;
      }

      if (role === 'service_provider') {
        if (registrationStatus === 'approved') {
          router.push(ROUTES.SERVICE_PROVIDER.SUMMARY_DASHBOARD);
        } else {
          router.push(ROUTES.SERVICE_PROVIDER.ONBOARDING);
        }
      } else if (role === 'admin') {
        router.push(ROUTES.ADMIN.ADMIN_DASHBOARD);
      } else {
        router.push(ROUTES.PET_OWNER.DASHBOARD);
      }
    } catch (err) {
      setErrors({ form: "Something went wrong. Please try again." });
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
        email: resolvedEmail,
        token: otpToken,
        type: "signup",
      });

      if (error) {
        setOtpError("Invalid token. Please check the code or try again after 15 minutes if limit was reached.");
        setVerificationLoading(false);
        return;
      }

      if (!data.session || !data.user) {
        setOtpError("Account verified, but automatic sign-in failed. Redirecting you to log in...");
        setTimeout(() => {
          setPendingVerification(false);
          setOtpToken("");
        }, 2000);
        return;
      }

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
        
      const role = userProfile?.role || data.user.user_metadata?.role || 'pet_owner';
      const mustChangePassword = data.user.user_metadata?.must_change_password;

      let registrationStatus = null;
      if (role === 'service_provider' || role === 'both_sp_po') {
        const { data: spInfo } = await supabase
          .from("sp_general_info")
          .select("registration_status")
          .eq("profiles_id", data.user.id)
          .maybeSingle();
        
        registrationStatus = spInfo?.registration_status;
      }

      router.refresh();

      if (role === 'admin' && mustChangePassword) {
        router.push("/auth/admin_first_login");
        return;
      }

      if (role === 'service_provider') {
        if (registrationStatus === 'approved') {
          router.push(ROUTES.SERVICE_PROVIDER.SUMMARY_DASHBOARD);
        } else {
          router.push(ROUTES.SERVICE_PROVIDER.ONBOARDING);
        }
      } else if (role === 'admin') {
        router.push(ROUTES.ADMIN.ADMIN_DASHBOARD);
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

    const rateCheck = checkLoginRateLimit(resolvedEmail, true);
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
        email: resolvedEmail,
      });

      if (error) {
        if (!error.message.toLowerCase().includes("security purposes")) {
          setOtpError(error.message);
        } else {
          setOtpTimer(OTP_VALIDITY_SECONDS);
          setOtpToken("");
        }
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
        <form className="signup-card" onSubmit={handleVerifyOtp} noValidate>
          <h1>Verify Your Account</h1>
          <p className="otp-instructions">
            Your account is unverified. We have sent a verification code to <strong>{resolvedEmail}</strong>. Please enter it below.
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
            {verificationLoading ? "Verifying..." : "Verify Account"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <h1>Login to <i>furlink</i></h1>
        
        <div className="input-group">
          <input 
              type="text"
              className={touched.identifier && errors.identifier ? "input-error" : ""}
              placeholder="Email address or username" 
              value={formData.identifier}
              onChange={handleIdentifierChange}
              onBlur={handleBlur}
              name="identifier"
          />
          {touched.identifier && errors.identifier && <span className="error-text">{errors.identifier}</span>}
        </div>

        <div className="input-group">
          <div className="password-container">
            <input 
                type={showPassword ? "text" : "password"} 
                className={touched.password && errors.password ? "input-error" : ""}
                placeholder="Password" 
                value={formData.password}
                onChange={handlePasswordChange}
                onBlur={handleBlur}
                name="password"
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
          {touched.password && errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        {errors.form && <p className="auth-form-error">{errors.form}</p>}

        <div className="auth-links-row">
          <Link href="/auth/forgot_password" className="forgot-password-link">
            Forgot Password?
          </Link>
        </div>

        <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
        </button>

        <p className="auth-redirect-text">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="login-link">
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
}