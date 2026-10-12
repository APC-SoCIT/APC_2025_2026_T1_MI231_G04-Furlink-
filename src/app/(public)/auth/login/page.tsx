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
const LOCKOUT_DURATION_MS = 60 * 1000; // 1 minute lockout
const MAX_FAILED_ATTEMPTS = 3; // Lock out after 3 failed attempts

export default function LoginPage() {
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState<any>({});
  const [touched, setTouched] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Lockout states
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState<number | null>(null);

  const [pendingVerification, setPendingVerification] = useState(false);
  const [resolvedEmail, setResolvedEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpTimer, setOtpTimer] = useState(OTP_VALIDITY_SECONDS);
  const [resendLoading, setResendLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Deactivation / Reactivation states
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivateUserId, setReactivateUserId] = useState<string | null>(null);
  const [reactivating, setReactivating] = useState(false);

  const supabase = createClientComponentClient();
  const router = useRouter();

  // Check lockout on identifier change or tick down
  useEffect(() => {
    if (!formData.identifier) {
      setLockoutSecondsLeft(null);
      return;
    }
    const cleanId = formData.identifier.trim().toLowerCase();
    const lockoutKey = `login_lockout_${cleanId}`;
    const rawLockout = localStorage.getItem(lockoutKey);

    if (rawLockout) {
      const lockoutUntil = parseInt(rawLockout, 10);
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutSecondsLeft(remaining);
      } else {
        localStorage.removeItem(lockoutKey);
        localStorage.removeItem(`login_fails_${cleanId}`);
        setLockoutSecondsLeft(null);
      }
    }
  }, [formData.identifier]);

  useEffect(() => {
    if (lockoutSecondsLeft === null || lockoutSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setLockoutSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          const cleanId = formData.identifier.trim().toLowerCase();
          localStorage.removeItem(`login_lockout_${cleanId}`);
          localStorage.removeItem(`login_fails_${cleanId}`);
          
          // Automatically clear the lockout error message when timer expires
          setErrors((currentErrors: any) => {
            const updated = { ...currentErrors };
            delete updated.form;
            return updated;
          });

          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSecondsLeft, formData.identifier]);

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

  const proceedWithRouting = async (userId: string) => {
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrors({ form: "Authentication session missing. Please log in again." });
      setLoading(false);
      return;
    }

    const role = userProfile?.role || user.user_metadata?.role || 'pet_owner';
    const mustChangePassword = user.user_metadata?.must_change_password;

    let registrationStatus = null;
    if (role === 'service_provider' || role === 'both_sp_po') {
      const { data: spInfo } = await supabase
        .from("sp_general_info")
        .select("registration_status")
        .eq("profiles_id", userId)
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ identifier: true, password: true });

    const cleanId = formData.identifier.trim().toLowerCase();
    const lockoutKey = `login_lockout_${cleanId}`;
    const failKey = `login_fails_${cleanId}`;

    // Check if currently locked out
    const rawLockout = localStorage.getItem(lockoutKey);
    if (rawLockout) {
      const remaining = Math.ceil((parseInt(rawLockout, 10) - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutSecondsLeft(remaining);
        setErrors({ form: `Too many failed login attempts. Account is locked due to failed attempts. Please try again after ${remaining} seconds.` });
        return;
      }
    }

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
          handleFailedAttempt(cleanId, failKey, lockoutKey);
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
          localStorage.removeItem(failKey);
          localStorage.removeItem(lockoutKey);
          await triggerVerificationFlow(currentResolvedIdentifier);
          return;
        }

        handleFailedAttempt(cleanId, failKey, lockoutKey);
        return;
      }

      if (!data.user) {
        handleFailedAttempt(cleanId, failKey, lockoutKey);
        return;
      }

      // Success: clear failures and lockout
      localStorage.removeItem(failKey);
      localStorage.removeItem(lockoutKey);

      const user = data.user;

      if (user.identities && user.identities.length === 0) {
        await triggerVerificationFlow(currentResolvedIdentifier);
        return;
      }

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", user.id)
        .maybeSingle();

      if (userProfile?.status === "deactivated") {
        setReactivateUserId(user.id);
        setShowReactivateModal(true);
        setLoading(false);
        return;
      }

      await proceedWithRouting(user.id);
    } catch (err) {
      setErrors({ form: "Something went wrong. Please try again." });
      setLoading(false);
    }
  };

  const handleFailedAttempt = (cleanId: string, failKey: string, lockoutKey: string) => {
    let currentFails = parseInt(localStorage.getItem(failKey) || "0", 10) + 1;
    localStorage.setItem(failKey, currentFails.toString());

    if (currentFails >= MAX_FAILED_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem(lockoutKey, lockoutUntil.toString());
      setLockoutSecondsLeft(60);
      setErrors({ form: "Too many failed login attempts. Account is locked due to failed attempts. Please try again after 60 seconds." });
    } else {
      setErrors({ form: "Invalid email/username or password. Please try again." });
    }
    setLoading(false);
  };

  const triggerVerificationFlow = async (email: string) => {
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

  const handleConfirmReactivate = async () => {
    if (!reactivateUserId) return;
    setReactivating(true);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ status: "active" })
        .eq("id", reactivateUserId);

      if (updateError) {
        throw updateError;
      }

      setShowReactivateModal(false);
      await proceedWithRouting(reactivateUserId);
    } catch (err: any) {
      setErrors({ form: err.message || "Failed to reactivate account." });
      setReactivating(false);
    }
  };

  const handleCancelReactivate = async () => {
    await supabase.auth.signOut();
    setShowReactivateModal(false);
    setReactivateUserId(null);
    setLoading(false);
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
        setOtpError("Invalid token. Please check the code or try again later.");
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
        .select("role, status")
        .eq("id", data.user.id)
        .maybeSingle();

      if (userProfile?.status === "deactivated") {
        setReactivateUserId(data.user.id);
        setShowReactivateModal(true);
        setVerificationLoading(false);
        setPendingVerification(false);
        return;
      }

      await proceedWithRouting(data.user.id);
    } catch {
      setOtpError("Failed to verify code. Please check your connection and try again.");
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0 || isRateLimited) return;
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

          <div className="input-group">
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

  const isLocked = lockoutSecondsLeft !== null && lockoutSecondsLeft > 0;

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <h1>Login to <i>furlink</i></h1>
        
        <div className="input-group">
          <input 
              type="text"
              className={touched.identifier && errors.identifier ? "input-error" : ""}
              placeholder={isLocked ? "Account locked - please wait..." : "Email address or username"} 
              value={formData.identifier}
              onChange={handleIdentifierChange}
              onBlur={handleBlur}
              name="identifier"
              disabled={isLocked}
              style={{
                backgroundColor: isLocked ? "#f1f5f9" : "inherit",
                cursor: isLocked ? "not-allowed" : "text",
                opacity: isLocked ? 0.7 : 1
              }}
          />
          {touched.identifier && errors.identifier && <span className="error-text">{errors.identifier}</span>}
        </div>

        <div className="input-group">
          <div className="password-container">
            <input 
                type={showPassword ? "text" : "password"} 
                className={touched.password && errors.password ? "input-error" : ""}
                placeholder={isLocked ? "Account locked - please wait..." : "Password"} 
                value={formData.password}
                onChange={handlePasswordChange}
                onBlur={handleBlur}
                name="password"
                maxLength={16}
                disabled={isLocked}
                style={{
                  backgroundColor: isLocked ? "#f1f5f9" : "inherit",
                  cursor: isLocked ? "not-allowed" : "text",
                  opacity: isLocked ? 0.7 : 1
                }}
            />
            <button 
              type="button" 
              className="toggle-password" 
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLocked}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {touched.password && errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        {isLocked ? (
          <p className="auth-form-error" style={{ color: "#ef4444", fontWeight: "bold" }}>
            Too many failed login attempts. Account is locked due to failed attempts. Please try again after {lockoutSecondsLeft}s.
          </p>
        ) : (
          errors.form && <p className="auth-form-error">{errors.form}</p>
        )}

        <div className="auth-links-row">
          <Link href="/auth/forgot_password" className="forgot-password-link">
            Forgot Password?
          </Link>
        </div>

        <button type="submit" disabled={loading || isLocked}>
            {loading ? "Logging in..." : "Log In"}
        </button>

        <p className="auth-redirect-text">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="login-link">
            Sign Up
          </Link>
        </p>
      </form>

      {/* Account Reactivation Confirmation Modal */}
      {showReactivateModal && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <h3>Reactivate Account</h3>
            <p>
              Your account is currently deactivated. Are you sure you want to reactivate your account and log back in?
            </p>
            <div className="confirmation-btn-group">
              <button
                className="save-btn"
                onClick={handleConfirmReactivate}
                disabled={reactivating}
              >
                {reactivating ? "Reactivating..." : "Yes, reactivate"}
              </button>
              <button 
                className="cancel-btn" 
                onClick={handleCancelReactivate}
                disabled={reactivating}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}