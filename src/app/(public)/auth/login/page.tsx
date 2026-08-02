"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { validateLogin } from "@/app/(public)/auth/validation/loginValidation";
import { ROUTES } from "@/config/routes";
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
        // Fetch the user's role directly from your profiles table
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
        console.log("DEBUG: Retrieved user role from database is ->", role);
        router.refresh();

        // Role-based routing matching your configuration
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
        <h1>Login to Furlink</h1>
        
        <input 
            type="email"
            className={errors.identifier ? "input-error" : ""}
            placeholder="Email address" 
            value={formData.identifier}
            onChange={(e) => setFormData({...formData, identifier: e.target.value})} 
        />
        {errors.identifier && <span className="error-text">{errors.identifier}</span>}

        <div className="password-wrapper">
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
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        {errors.password && <span className="error-text">{errors.password}</span>}

        {errors.form && <p className="error">{errors.form}</p>}

        <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}