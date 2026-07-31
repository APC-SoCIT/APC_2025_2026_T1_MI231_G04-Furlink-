'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { validateSignup } from "@/app/(public)/auth/validation/signUpValidation";
import { checkFieldExists } from "@/app/(public)/auth/validation-db";
import { supabase } from "@/lib/supabase";
import "@/app/(public)/auth/auth.css";

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

  // Anyone younger than 13 today can't be selected in the calendar picker
  const getMaxDob = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 13);
    return d.toISOString().split("T")[0];
  };

  // The native date input's displayed format follows the browser/OS locale and can't be
  // forced to mm/dd/yyyy directly, so we hide its native text and overlay our own formatting.
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

  // Mobile: digits only, capped at 10
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
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            username: formData.username,
            mobile_number: formData.mobile,
            date_of_birth: formData.dob,
            role: formData.roleChoice
          }
        }
      });

      if (error) {
        console.error("Signup error:", error);
        alert(error.message);
      } else {
        router.refresh();

        // THIS IS THE REDIRECTION LOGIC
        if (formData.roleChoice === 'service_provider') {
          router.push('/service_provider');
        } else {
          router.push('/pet_owner');
        }
      }
    } catch (err) {
      console.error("Unexpected signup error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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