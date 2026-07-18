'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { validateSignup } from "../validation/signUpValidation";
import { checkFieldExists } from "../validation-db";
import { supabase } from "@/lib/supabase";
import "../auth.css";

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

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev: any) => ({ ...prev, [name]: true }));

    // Always use the latest state for full validation
    const currentData = { ...formData, [name]: value };
    const validationErrors = validateSignup(currentData, agreedToTerms);
    
    // Only run DB check if field is valid so far
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

            // RE-VALIDATE after updating role
            const newFormData = { ...prev, roleChoice: next };
            const validationErrors = validateSignup(newFormData, agreedToTerms);
            setErrors(validationErrors); 
            
            return newFormData;
        });
    };

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
            alert(error.message);
        } else {
            router.push("/");
        }
        setLoading(false);
    };

    // Add this helper function inside your SignupPage component
    const isFormValid = () => {
        // Check if any error exists
        const hasErrors = Object.values(errors).some(err => err !== "");
        // Check if all fields have values (optional, but good for UX)
        const allFieldsFilled = formData.firstName && formData.username && formData.email && formData.password;
        
        return agreedToTerms && !hasErrors && allFieldsFilled;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    console.log("Current Errors:", errors);
    console.log("Is button disabled?", loading || Object.values(errors).some(err => err !== "") || !agreedToTerms);

  return (
    <div className="signup-wrapper">
        <form className="signup-card" onSubmit={handleSubmit}> {/* Changed to handleSubmit */}
            <h1>Create Your Account</h1>

            <div className="form-row">
            <div className="input-group">
                <input name="firstName" placeholder="First Name" onChange={(e) => setFormData({...formData, firstName: e.target.value})} onBlur={handleBlur} className={errors.firstName ? "input-error" : ""} />
                {touched.firstName && errors.firstName && <span className="error-text">{errors.firstName}</span>}
            </div>
            <div className="input-group">
                <input name="lastName" placeholder="Last Name" onChange={(e) => setFormData({...formData, lastName: e.target.value})} onBlur={handleBlur} className={errors.lastName ? "input-error" : ""} />
                {touched.lastName && errors.lastName && <span className="error-text">{errors.lastName}</span>}
            </div>
            </div>

            <div className="form-row">
            <div className="input-group">
                <input name="username" placeholder="Username" onChange={(e) => setFormData({...formData, username: e.target.value})} onBlur={handleBlur} className={errors.username ? "input-error" : ""} />
                {touched.username && errors.username && <span className="error-text">{errors.username}</span>}
            </div>
            <div className="input-group">
                <input name="email" placeholder="Email Address" onChange={(e) => setFormData({...formData, email: e.target.value})} onBlur={handleBlur} className={errors.email ? "input-error" : ""} />
                {touched.email && errors.email && <span className="error-text">{errors.email}</span>}
            </div>
            </div>

            <div className="form-row">
            <div className="input-group">
                <div className="phone-input-container">
                    <span className="phone-prefix">+63</span>
                    <div className="phone-divider"></div>
                    <input 
                        name="mobile" 
                        placeholder="9XXXXXXXXX" 
                        onChange={handleChange} 
                        onBlur={handleBlur} 
                    />
                </div>
                {touched.mobile && errors.mobile && <span className="error-text">{errors.mobile}</span>}
            </div>
            <div className="input-group">
                <div className="date-input-container">
                    <input 
                        type="date" 
                        name="dob" 
                        onChange={handleChange} 
                        onBlur={handleBlur} 
                        className={errors.dob ? "input-error" : ""} 
                    />
                </div>
                {touched.dob && errors.dob && <span className="error-text">{errors.dob}</span>}
            </div>
            </div>

            <p>I want to join as a:</p>
            <div className="role-buttons">
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
            {errors.roleChoice && <span className="error-text">{errors.roleChoice}</span>}

            <div className="form-row">
            <div className="input-group">
                <div className="password-container">
                <input type={showPassword ? "text" : "password"} name="password" placeholder="Password" onChange={(e) => setFormData({...formData, password: e.target.value})} onBlur={handleBlur} />
                <button type="button" className="toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
                </div>
                {touched.password && errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            <div className="input-group">
                <div className="password-container">
                <input type={showPasswordConfirm ? "text" : "password"} name="confirmPassword" placeholder="Confirm Password" onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} onBlur={handleBlur} />
                <button type="button" className="toggle-btn" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}>
                    {showPasswordConfirm ? <FaEyeSlash /> : <FaEye />}
                </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>
            </div>

            <div className="terms-container">
            <input type="checkbox" id="termsCheckbox" onChange={(e) => setAgreedToTerms(e.target.checked)} />
            <label htmlFor="termsCheckbox">
                I agree to the <Link href="/terms" className="terms-link">Terms and Conditions</Link> and <Link href="/privacy" className="terms-link">Privacy Policy</Link> of furlink.
            </label>
            {errors.terms && <span className="error-text">{errors.terms}</span>}
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