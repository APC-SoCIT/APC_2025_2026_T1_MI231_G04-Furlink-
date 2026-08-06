"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { validateLogin } from "@/app/(public)/auth/validation/loginValidation";
import { ROUTES } from "@/config/routes";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "@/app/(public)/auth/auth.css";

export default function LoginPage() {
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = validateLogin(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.identifier,
      password: formData.password,
    });

    if (error) {
      setErrors({ form: "Invalid email or password. Please try again." });
      setLoading(false);
    } else {
      const user = data.user;

      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          setErrors({ form: "Failed to fetch user profile role." });
          setLoading(false);
          return;
        }

        const role = profileData.role;
        router.refresh();

        if (role === 'service_provider') {
          router.push(ROUTES.SERVICE_PROVIDER.ONBOARDING);
        } else if (role === 'admin') {
          router.push(ROUTES.ADMIN.ADMIN_DASHBOARD);
        } else {
          router.push(ROUTES.PET_OWNER.DASHBOARD);
        }
      }
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <h1>Login to <i>furlink</i></h1>
        
        <div className="input-group">
          <input 
              type="email"
              className={errors.identifier ? "input-error" : ""}
              placeholder="Email address" 
              value={formData.identifier}
              onChange={(e) => setFormData({...formData, identifier: e.target.value})} 
          />
          {errors.identifier && <span className="error-text">{errors.identifier}</span>}
        </div>

        <div className="input-group">
          <div className="password-container">
            <input 
                type={showPassword ? "text" : "password"} 
                className={errors.password ? "input-error" : ""}
                placeholder="Password" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
            />
            <button 
              type="button" 
              className="toggle-password" 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        {/* Error message positioned before the Forgot Password button */}
        {errors.form && <p className="auth-form-error">{errors.form}</p>}

        {/* Forgot Password Link on the Left Side */}
        <div className="auth-links-row">
          <Link href="/auth/forgot_password" className="forgot-password-link">
            Forgot Password?
          </Link>
        </div>

        <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
        </button>

        {/* Sign Up Redirect Link */}
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