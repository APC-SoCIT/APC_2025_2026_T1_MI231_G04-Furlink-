"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { FaEdit, FaEye, FaEyeSlash, FaAt } from "react-icons/fa";
import { validateManageAccountField } from "./validation/manageAccountValidation";
import Footer from "@/components/Footer";
import "./manage_account.css";

type ProfileFormData = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  mobileNumber: string;
  dob: string;
  role: string;
};

const ROLE_LABELS: Record<string, string> = {
  service_provider: "Service Provider",
  pet_owner: "Pet Owner",
  both_sp_po: "Pet Owner and Service Provider",
  admin: "furlink Administrator",
};

const formatRole = (roleKey: string) => ROLE_LABELS[roleKey] ?? (roleKey || "Pet Owner");

const formatDateDisplay = (dateString: string) => {
  if (!dateString) return "Not set";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return dateString;
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return dateObj.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

const getMaxDobDate = () => {
  const today = new Date();
  today.setFullYear(today.getFullYear() - 13);
  return today.toISOString().split("T")[0];
};

function StraightEditableField({
  label,
  type = "text",
  value,
  displayValue,
  isEditing,
  tempValue,
  onTempChange,
  onStartEdit,
  onSave,
  onCancel,
  prefix,
  fieldError,
  inputProps,
}: {
  label: string;
  type?: "text" | "date";
  value: string;
  displayValue?: string;
  isEditing: boolean;
  tempValue: string;
  onTempChange: (value: string) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  prefix?: React.ReactNode;
  fieldError?: string | null;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <div className="account-field-group">
      <label>{label}</label>
      <div className="field-row">
        {isEditing ? (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className={prefix ? "input-with-prefix" : ""}>
              {prefix && <span className="input-prefix-box">{prefix}</span>}
              <input
                type={type}
                value={tempValue}
                onChange={(e) => onTempChange(e.target.value)}
                autoFocus
                {...inputProps}
              />
            </div>
            {fieldError && <p className="field-inline-error">{fieldError}</p>}
            <div className="mini-btn-group">
              <button className="mini-save-btn" onClick={onSave}>Save</button>
              <button className="mini-cancel-btn" onClick={onCancel}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <span className="field-value">{displayValue ?? value ?? "Not set"}</span>
            <button
              className="edit-icon-btn icon-tooltip"
              onClick={onStartEdit}
              data-tooltip={`Edit ${label}`}
              aria-label={`Edit ${label}`}
            >
              <FaEdit />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ManageAccountPage() {
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    mobileNumber: "",
    dob: "",
    role: "",
  });

  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [tempConfirmPassword, setTempConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [fieldError, setFieldError] = useState<string | null>(null);
  
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const [pendingFieldUpdate, setPendingFieldUpdate] = useState<{ field: string; value: any } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (editingField === "password") {
      const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])(?!.*\s).{6,12}$/;
      
      if (tempPassword && !pwdRegex.test(tempPassword)) {
        setNewPasswordError("6-12 chars, mix of Aa, 0-9, symbol.");
      } else {
        setNewPasswordError(null);
      }

      if (tempConfirmPassword && tempPassword !== tempConfirmPassword) {
        setConfirmPasswordError("Passwords don't match.");
      } else {
        setConfirmPasswordError(null);
      }
    }
  }, [tempPassword, tempConfirmPassword, editingField]);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setFormData({
        firstName: profile?.first_name || user.user_metadata?.first_name || "",
        lastName: profile?.last_name || user.user_metadata?.last_name || "",
        username: profile?.username || user.user_metadata?.username || "",
        email: profile?.email || user.email || "",
        mobileNumber: profile?.mobile_number || "",
        dob: profile?.date_of_birth || "",
        role: profile?.role || user.user_metadata?.role || "pet_owner",
      });
    } catch {
      setGeneralError("Failed to load account information.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (fieldName: string) => {
    setGeneralError(null);
    setSuccessMessage(null);
    setFieldError(null);
    setCurrentPasswordError(null);
    setNewPasswordError(null);
    setConfirmPasswordError(null);
    setEditingField(fieldName);
    if (fieldName === "password") {
      setCurrentPassword("");
      setTempPassword("");
      setTempConfirmPassword("");
    } else if (fieldName === "mobileNumber") {
      const rawNum = formData.mobileNumber;
      setTempValue(rawNum.startsWith("+63") ? rawNum.replace("+63", "") : rawNum);
    } else {
      setTempValue((formData as any)[fieldName] || "");
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setTempValue("");
    setCurrentPassword("");
    setTempPassword("");
    setTempConfirmPassword("");
    setFieldError(null);
    setCurrentPasswordError(null);
    setNewPasswordError(null);
    setConfirmPasswordError(null);
  };

  const handlePreConfirmUpdate = async (fieldName: string) => {
    setGeneralError(null);
    setSuccessMessage(null);
    setFieldError(null);
    setCurrentPasswordError(null);

    let valueToValidate = tempValue;
    if (fieldName === "mobileNumber") {
      valueToValidate = tempValue.startsWith("+63") ? tempValue : "+63" + tempValue.replace(/^0+/, "");
    }

    if (fieldName === "password") {
      if (!currentPassword) {
        setCurrentPasswordError("Current password is required.");
        return;
      }
      if (newPasswordError || confirmPasswordError) {
        return;
      }
    }

    const validationError = validateManageAccountField(fieldName, valueToValidate, {
      password: tempPassword,
      confirmPassword: tempConfirmPassword,
    });

    if (validationError && fieldName !== "password") {
      setFieldError(validationError);
      return;
    }

    if (fieldName === "username" && tempValue.trim() !== formData.username) {
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", tempValue.trim())
        .maybeSingle();

      if (existingUser) {
        setFieldError("Username is already taken by another user.");
        return;
      }
    }

    setPendingFieldUpdate({
      field: fieldName,
      value: fieldName === "password" ? tempPassword : valueToValidate,
    });
    setShowConfirmation(true);
  };

  const executeUpdate = async () => {
    if (!pendingFieldUpdate) return;
    setShowConfirmation(false);
    setLoading(true);
    setGeneralError(null);
    setCurrentPasswordError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error("No active session");

      const { field, value } = pendingFieldUpdate;

      if (field === "password") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

        if (signInError) {
          setCurrentPasswordError("Invalid password.");
          setLoading(false);
          return;
        }

        const { error: authError } = await supabase.auth.updateUser({ password: value });
        if (authError) throw authError;
      } else {
        const dbMapping: Record<string, string> = {
          firstName: "first_name",
          lastName: "last_name",
          username: "username",
          mobileNumber: "mobile_number",
          dob: "date_of_birth",
        };

        const column = dbMapping[field];
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ [column]: value })
          .eq("id", user.id);

        if (profileError) throw profileError;

        if (field === "firstName" || field === "lastName" || field === "username") {
          await supabase.auth.updateUser({
            data: {
              [column]: value,
            },
          });
        }
      }

      setSuccessMessage("Your account information was successfully updated!");
      setEditingField(null);
      fetchUserData();
    } catch (err: any) {
      setGeneralError(err.message || "Failed to update account information.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.email) {
    return <div className="manage-account-wrapper"><p>Loading account details...</p></div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div className="manage-account-wrapper" style={{ flex: 1 }}>
        <div className="manage-account-card">
          <h1>MANAGE ACCOUNT INFORMATION</h1>

          {successMessage && <div className="success-banner">{successMessage}</div>}
          {generalError && <div className="form-error-banner">{generalError}</div>}

          <div className="straight-layout-container">
            <StraightEditableField
              label="First Name"
              value={formData.firstName}
              isEditing={editingField === "firstName"}
              tempValue={tempValue}
              onTempChange={setTempValue}
              onStartEdit={() => handleStartEdit("firstName")}
              onSave={() => handlePreConfirmUpdate("firstName")}
              onCancel={handleCancelEdit}
              fieldError={editingField === "firstName" ? fieldError : null}
            />

            <StraightEditableField
              label="Last Name"
              value={formData.lastName}
              isEditing={editingField === "lastName"}
              tempValue={tempValue}
              onTempChange={setTempValue}
              onStartEdit={() => handleStartEdit("lastName")}
              onSave={() => handlePreConfirmUpdate("lastName")}
              onCancel={handleCancelEdit}
              fieldError={editingField === "lastName" ? fieldError : null}
            />

            <StraightEditableField
              label="Username"
              value={formData.username}
              isEditing={editingField === "username"}
              tempValue={tempValue}
              onTempChange={setTempValue}
              onStartEdit={() => handleStartEdit("username")}
              onSave={() => handlePreConfirmUpdate("username")}
              onCancel={handleCancelEdit}
              prefix={<FaAt style={{ fontSize: "14px", color: "#3b429f" }} />}
              fieldError={editingField === "username" ? fieldError : null}
              inputProps={{ placeholder: "username" }}
            />

            <div className="account-field-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ margin: 0 }}>Password</label>
                {editingField !== "password" && (
                  <button
                    className="edit-icon-btn icon-tooltip"
                    onClick={() => handleStartEdit("password")}
                    data-tooltip="Edit Password"
                    aria-label="Edit Password"
                  >
                    <FaEdit />
                  </button>
                )}
              </div>
              <div className="field-row">
                {editingField === "password" ? (
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div className="password-container">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        maxLength={12}
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                      >
                        {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {currentPasswordError && <p className="field-inline-error">{currentPasswordError}</p>}

                    <div className="password-container">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="New Password"
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                        maxLength={12}
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {newPasswordError && <p className="field-inline-error">{newPasswordError}</p>}

                    <div className="password-container">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm New Password"
                        value={tempConfirmPassword}
                        onChange={(e) => setTempConfirmPassword(e.target.value)}
                        maxLength={12}
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {confirmPasswordError && <p className="field-inline-error">{confirmPasswordError}</p>}

                    <div className="mini-btn-group" style={{ marginTop: "5px" }}>
                      <button className="mini-save-btn" onClick={() => handlePreConfirmUpdate("password")}>Save</button>
                      <button className="mini-cancel-btn" onClick={handleCancelEdit}>Cancel</button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <StraightEditableField
              label="Mobile Number"
              value={formData.mobileNumber}
              displayValue={formData.mobileNumber || "Not set"}
              isEditing={editingField === "mobileNumber"}
              tempValue={tempValue}
              onTempChange={setTempValue}
              onStartEdit={() => handleStartEdit("mobileNumber")}
              onSave={() => handlePreConfirmUpdate("mobileNumber")}
              onCancel={handleCancelEdit}
              prefix="+63"
              fieldError={editingField === "mobileNumber" ? fieldError : null}
              inputProps={{ maxLength: 10, inputMode: "numeric", placeholder: "9XXXXXXXXX" }}
            />

            <StraightEditableField
              label="Date of Birth"
              type="date"
              value={formData.dob}
              displayValue={formatDateDisplay(formData.dob)}
              isEditing={editingField === "dob"}
              tempValue={tempValue}
              onTempChange={setTempValue}
              onStartEdit={() => handleStartEdit("dob")}
              onSave={() => handlePreConfirmUpdate("dob")}
              onCancel={handleCancelEdit}
              fieldError={editingField === "dob" ? fieldError : null}
              inputProps={{ max: getMaxDobDate() }}
            />

            <div className="account-field-group">
              <label>Role/s</label>
              <div className="field-row">
                <span className="field-value">{formatRole(formData.role)}</span>
              </div>
            </div>

            <div className="account-field-group">
              <label>Email Address</label>
              <div className="field-row">
                <span className="field-value">{formData.email}</span>
              </div>
            </div>
          </div>

          {showConfirmation && (
            <div className="confirmation-overlay">
              <div className="confirmation-dialog">
                <h3>Confirm Changes</h3>
                <p>Are you sure you want to update this information?</p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  <button className="save-btn" onClick={executeUpdate}>
                    Yes, Update
                  </button>
                  <button className="cancel-btn" onClick={() => setShowConfirmation(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}