"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { FaEdit, FaEye, FaEyeSlash, FaAt, FaUser, FaExclamationTriangle, FaUserSlash, FaSlidersH } from "react-icons/fa";
import { validateManageAccountField } from "./validation/manageAccountValidation";
import { StraightEditableField } from "./components/StraightEditableField";
import { formatRole, formatDateDisplay, formatDateTimeDisplay, getMaxDobDate, formatOnboardingStatus } from "./utils/warningUtils";
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

type WarningItem = {
  id: string;
  warning_message: string;
  severity: string;
  status: string;
  created_at: string;
  expires_at: string | null;
};

export default function ManageAccountPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"profile" | "warnings" | "deactivate">("profile");

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

  const [spStatus, setSpStatus] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [warningsLoading, setWarningsLoading] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");

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

  const [deactivationBlockerMessage, setDeactivationBlockerMessage] = useState<string | null>(null);
  const [blockerActionType, setBlockerActionType] = useState<"MANAGE_BOOKING" | "SUMMARY_DASHBOARD" | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (editingField === "password") {
      const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])(?!.*\s).{6,12}$/;
      setNewPasswordError(tempPassword && !pwdRegex.test(tempPassword) ? "6-12 chars, mix of Aa, 0-9, symbol." : null);
      setConfirmPasswordError(tempConfirmPassword && tempPassword !== tempConfirmPassword ? "Passwords don't match." : null);
    }
  }, [tempPassword, tempConfirmPassword, editingField]);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const userRole = profile?.role || user.user_metadata?.role || "pet_owner";

      setFormData({
        firstName: profile?.first_name || user.user_metadata?.first_name || "",
        lastName: profile?.last_name || user.user_metadata?.last_name || "",
        username: profile?.username || user.user_metadata?.username || "",
        email: profile?.email || user.email || "",
        mobileNumber: profile?.mobile_number || "",
        dob: profile?.date_of_birth || "",
        role: userRole,
      });

      const { data: spInfo } = await supabase.from("sp_general_info").select("registration_status").eq("profiles_id", user.id).maybeSingle();
      setSpStatus(spInfo?.registration_status || null);

      if (userRole === "admin") setActiveTab("profile");
    } catch {
      setGeneralError("Failed to load account information.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserWarnings = async () => {
    setWarningsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from("user_warnings").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setWarnings(data || []);
    } catch (err) {
      console.error("Failed to load warnings", err);
    } finally {
      setWarningsLoading(false);
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

  const handleTempChangeWithValidation = (fieldName: string, val: string) => {
    if (fieldName === "mobileNumber") {
      const sanitized = val.replace(/\D/g, "").slice(0, 10);
      setTempValue(sanitized);
    } else {
      setTempValue(val);
    }
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
      if (newPasswordError || confirmPasswordError) return;
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
      const { data: existingUser } = await supabase.from("profiles").select("id").eq("username", tempValue.trim()).maybeSingle();
      if (existingUser) {
        setFieldError("Username is already taken by another user.");
        return;
      }
    }

    setPendingFieldUpdate({ field: fieldName, value: fieldName === "password" ? tempPassword : valueToValidate });
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
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
        if (signInError) {
          setCurrentPasswordError("Invalid password.");
          setLoading(false);
          return;
        }
        const { error: authError } = await supabase.auth.updateUser({ password: value });
        if (authError) throw authError;
      } else {
        const dbMapping: Record<string, string> = { firstName: "first_name", lastName: "last_name", username: "username", mobileNumber: "mobile_number", dob: "date_of_birth" };
        const column = dbMapping[field];
        const { error: profileError } = await supabase.from("profiles").update({ [column]: value }).eq("id", user.id);
        if (profileError) throw profileError;

        if (["firstName", "lastName", "username"].includes(field)) {
          await supabase.auth.updateUser({ data: { [column]: value } });
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

  const handleTabSwitch = async (tab: "profile" | "warnings" | "deactivate") => {
    if (formData.role === "admin" && tab !== "profile") return;
    setActiveTab(tab);
    setDeactivationBlockerMessage(null);
    setBlockerActionType(null);

    if (tab === "warnings") fetchUserWarnings();

    if (tab === "deactivate") {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const role = formData.role;

        if (role === "service_provider" || role === "both_sp_po") {
          const { data: spRecord } = await supabase.from("sp_general_info").select("id").eq("profiles_id", user.id).maybeSingle();
          if (spRecord) {
            const { data: spBookings } = await supabase.from("booking_info").select("booking_status").eq("sp_id", spRecord.id).in("booking_status", ["pending_sp_response", "to pay", "approved"]);
            if (spBookings && spBookings.length > 0) {
              setDeactivationBlockerMessage("You still have new requests received, payments to verify, or upcoming booking requests. You are required to respond to or cancel these booking requests before you can deactivate your account.");
              setBlockerActionType("SUMMARY_DASHBOARD");
              setLoading(false);
              return;
            }
          }
        }

        if (role === "pet_owner" || role === "both_po_sp" || role === "both_sp_po") {
          const { data: poBookings } = await supabase.from("booking_info").select("booking_status").eq("profiles_id", user.id).in("booking_status", ["pending_sp_response", "to pay", "approved", "cancelled", "to_refund"]);
          const activeBlockers = poBookings?.filter(b => ["pending_sp_response", "to pay", "approved", "cancelled", "to_refund"].includes(b.booking_status || ""));
          if (activeBlockers && activeBlockers.length > 0) {
            setDeactivationBlockerMessage("You still have an upcoming or unfinished booking request which needs to be finished or must be cancelled by you before you can smoothly deactivate.");
            setBlockerActionType("MANAGE_BOOKING");
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleConfirmDeactivate = async () => {
    setIsDeactivating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: updateError } = await supabase.from("profiles").update({ status: "deactivated" }).eq("id", user.id);
      if (updateError) throw updateError;

      await supabase.auth.signOut();
      router.push("/auth/login?deactivated=true");
    } catch (err: any) {
      setGeneralError(err.message || "Failed to deactivate account.");
      setIsDeactivating(false);
    }
  };

  const filteredWarnings = warnings.filter((w) => severityFilter === "all" || w.severity === severityFilter).sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return dateSort === "newest" ? timeB - timeA : timeA - timeB;
  });

  if (loading && !formData.email && activeTab === "profile") {
    return <div className="manage-account-wrapper"><p>Loading account details...</p></div>;
  }

  return (
    <div className="manage-account-page-layout">
      <div className="manage-account-container">
        <div className="manage-account-split-grid">
          
          <div className="manage-account-sidebar">
            <h2>Account settings</h2>
            <div className="manage-account-nav-list">
              <button onClick={() => handleTabSwitch("profile")} className={`manage-account-nav-btn ${activeTab === "profile" ? "active-profile" : ""}`}>
                <FaUser style={{ color: "#0a217a" }} /> Profile Information
              </button>
              {formData.role !== "admin" && (
                <>
                  <button onClick={() => handleTabSwitch("warnings")} className={`manage-account-nav-btn ${activeTab === "warnings" ? "active-warnings" : ""}`}>
                    <FaExclamationTriangle style={{ color: "#f0ad4e" }} /> Warning History
                  </button>
                  <button onClick={() => handleTabSwitch("deactivate")} className={`manage-account-nav-btn ${activeTab === "deactivate" ? "active-deactivate" : ""}`}>
                    <FaUserSlash style={{ color: "#d9534f" }} /> Deactivate Account
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="manage-account-divider"></div>

          <div className="manage-account-content-pane">
            {successMessage && <div className="success-banner">{successMessage}</div>}
            {generalError && <div className="form-error-banner">{generalError}</div>}

            {activeTab === "profile" && (
              <div>
                <h3>Profile Information</h3>
                <div className="straight-layout-container">
                  <StraightEditableField label="First Name" value={formData.firstName} isEditing={editingField === "firstName"} tempValue={tempValue} onTempChange={(val) => handleTempChangeWithValidation("firstName", val)} onStartEdit={() => handleStartEdit("firstName")} onSave={() => handlePreConfirmUpdate("firstName")} onCancel={handleCancelEdit} fieldError={editingField === "firstName" ? fieldError : null} />
                  <StraightEditableField label="Last Name" value={formData.lastName} isEditing={editingField === "lastName"} tempValue={tempValue} onTempChange={(val) => handleTempChangeWithValidation("lastName", val)} onStartEdit={() => handleStartEdit("lastName")} onSave={() => handlePreConfirmUpdate("lastName")} onCancel={handleCancelEdit} fieldError={editingField === "lastName" ? fieldError : null} />
                  <StraightEditableField label="Username" value={formData.username} isEditing={editingField === "username"} tempValue={tempValue} onTempChange={(val) => handleTempChangeWithValidation("username", val)} onStartEdit={() => handleStartEdit("username")} onSave={() => handlePreConfirmUpdate("username")} onCancel={handleCancelEdit} prefix={<FaAt style={{ fontSize: "14px", color: "#0a217a" }} />} fieldError={editingField === "username" ? fieldError : null} inputProps={{ placeholder: "username" }} />
                  
                  <div className="account-field-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <label style={{ margin: 0 }}>Password</label>
                      {editingField !== "password" && (
                        <button className="edit-icon-btn icon-tooltip" onClick={() => handleStartEdit("password")} data-tooltip="Edit Password"><FaEdit /></button>
                      )}
                    </div>
                    <div className="field-row">
                      {editingField === "password" && (
                        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div className="password-container">
                            <input type={showCurrentPassword ? "text" : "password"} placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} maxLength={12} />
                            <button type="button" className="toggle-password" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>{showCurrentPassword ? <FaEyeSlash /> : <FaEye />}</button>
                          </div>
                          {currentPasswordError && <p className="field-inline-error">{currentPasswordError}</p>}
                          <div className="password-container">
                            <input type={showPassword ? "text" : "password"} placeholder="New Password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} maxLength={12} />
                            <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <FaEyeSlash /> : <FaEye />}</button>
                          </div>
                          {newPasswordError && <p className="field-inline-error">{newPasswordError}</p>}
                          <div className="password-container">
                            <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm New Password" value={tempConfirmPassword} onChange={(e) => setTempConfirmPassword(e.target.value)} maxLength={12} />
                            <button type="button" className="toggle-password" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <FaEyeSlash /> : <FaEye />}</button>
                          </div>
                          {confirmPasswordError && <p className="field-inline-error">{confirmPasswordError}</p>}
                          <div className="mini-btn-group" style={{ marginTop: "5px" }}>
                            <button className="mini-save-btn" onClick={() => handlePreConfirmUpdate("password")}>Save</button>
                            <button className="mini-cancel-btn" onClick={handleCancelEdit}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <StraightEditableField label="Mobile Number" value={formData.mobileNumber} displayValue={formData.mobileNumber || "Not set"} isEditing={editingField === "mobileNumber"} tempValue={tempValue} onTempChange={(val) => handleTempChangeWithValidation("mobileNumber", val)} onStartEdit={() => handleStartEdit("mobileNumber")} onSave={() => handlePreConfirmUpdate("mobileNumber")} onCancel={handleCancelEdit} prefix="+63" fieldError={editingField === "mobileNumber" ? fieldError : null} inputProps={{ maxLength: 10, inputMode: "numeric", placeholder: "9XXXXXXXXX" }} />
                  <StraightEditableField label="Date of Birth" type="date" value={formData.dob} displayValue={formatDateDisplay(formData.dob)} isEditing={editingField === "dob"} tempValue={tempValue} onTempChange={(val) => handleTempChangeWithValidation("dob", val)} onStartEdit={() => handleStartEdit("dob")} onSave={() => handlePreConfirmUpdate("dob")} onCancel={handleCancelEdit} fieldError={editingField === "dob" ? fieldError : null} inputProps={{ max: getMaxDobDate() }} />

                  <div className="account-field-group">
                    <label>Role/s & Status</label>
                    <div className="field-row" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
                      <span className="field-value">{formatRole(formData.role)}</span>
                      <span style={{ fontSize: "13px", color: "#555" }}>
                        Onboarding Application Status: <strong style={{ textTransform: "capitalize" }}>{formatOnboardingStatus(spStatus)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="account-field-group">
                    <label>Email Address</label>
                    <div className="field-row"><span className="field-value">{formData.email}</span></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "warnings" && formData.role !== "admin" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0 }}>Warning History</h3>
                  {!warningsLoading && warnings.length > 0 && (
                    <button onClick={() => setShowFilters(!showFilters)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "20px", border: "1px solid #cbd5e1", background: showFilters ? "#f1f5f9" : "#fff", color: "#0a217a", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                      <FaSlidersH /> Filters
                    </button>
                  )}
                </div>

                {!warningsLoading && warnings.length > 0 && showFilters && (
                  <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", background: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div>
                      <label style={{ fontSize: "11px", display: "block", marginBottom: "4px", fontWeight: "bold", color: "#475569", textTransform: "uppercase" }}>Severity</label>
                      <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#fff" }}>
                        <option value="all">All Severities</option>
                        <option value="minor">Minor</option>
                        <option value="normal">Normal</option>
                        <option value="severe">Severe</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", display: "block", marginBottom: "4px", fontWeight: "bold", color: "#475569", textTransform: "uppercase" }}>Date Order</label>
                      <select value={dateSort} onChange={(e) => setDateSort(e.target.value as "newest" | "oldest")} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#fff" }}>
                        <option value="newest">Newest First (First Issued)</option>
                        <option value="oldest">Oldest First</option>
                      </select>
                    </div>
                  </div>
                )}

                {warningsLoading ? (
                  <p style={{ fontSize: "14px", color: "#666", textAlign: "center", padding: "20px 0" }}>Loading warnings...</p>
                ) : warnings.length === 0 ? (
                  <div style={{ padding: "40px 10px", textAlign: "center", color: "#666" }}>
                    <FaExclamationTriangle style={{ fontSize: "40px", color: "#f0ad4e", marginBottom: "15px" }} />
                    <p style={{ fontSize: "14px", marginTop: "8px" }}>You have no recorded warnings. Keep up the great standing on Furlink!</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {filteredWarnings.map((w) => {
                      // Distinct color styling for each severity level
                      let badgeBg = "#e6f4ea"; // default minor (green)
                      let badgeColor = "#137333";
                      
                      if (w.severity === "normal") {
                        badgeBg = "#fef3c7"; // amber/yellow
                        badgeColor = "#b45309";
                      } else if (w.severity === "severe") {
                        badgeBg = "#fed7aa"; // orange
                        badgeColor = "#c2410c";
                      } else if (w.severity === "critical") {
                        badgeBg = "#fce8e6"; // red
                        badgeColor = "#c5221f";
                      }

                      return (
                        <div key={w.id} style={{ border: "1px solid #e0e0e0", borderRadius: "8px", padding: "16px", backgroundColor: "#fffdf9" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", padding: "3px 8px", borderRadius: "4px", backgroundColor: badgeBg, color: badgeColor }}>
                              Severity: {w.severity}
                            </span>
                            <span style={{ fontSize: "12px", color: "#666" }}>{formatDateTimeDisplay(w.created_at)}</span>
                          </div>
                          <p style={{ fontSize: "14px", color: "#333", margin: "8px 0 0 0" }}>{w.warning_message}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "deactivate" && formData.role !== "admin" && (
              <div>
                <h3>Deactivate Account</h3>
                {deactivationBlockerMessage ? (
                  <div>
                    <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#444", marginBottom: "25px" }}>
                      {deactivationBlockerMessage}
                    </p>
                    <button
                      className="save-btn"
                      onClick={() => {
                        if (blockerActionType === "MANAGE_BOOKING") {
                          router.push("/pet_owner/manage_bookings");
                        } else if (blockerActionType === "SUMMARY_DASHBOARD") {
                          router.push("/service_provider/sp_dashboard");
                        }
                      }}
                    >
                      Go to {blockerActionType === "MANAGE_BOOKING" ? "Manage Bookings" : "Dashboard"}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#444", marginBottom: "15px" }}>
                      You won&apos;t be able to book new services, receive updates from providers, or view past appointments. Your account data will be safely stored if you decide to return.
                    </p>
                    <p style={{ fontSize: "13px", lineHeight: "1.5", color: "#666", marginBottom: "25px", fontStyle: "italic" }}>
                      Reminder: You can easily reactivate your account anytime simply by logging back in.
                    </p>
                    <button
                      className="save-btn"
                      style={{ backgroundColor: "#d9534f" }}
                      onClick={handleConfirmDeactivate}
                      disabled={isDeactivating}
                    >
                      {isDeactivating ? "Deactivating..." : "Yes, deactivate"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {showConfirmation && (
          <div className="confirmation-overlay">
            <div className="confirmation-dialog">
              <h3>Confirm Changes</h3>
              <p>Are you sure you want to update this information?</p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button className="save-btn" onClick={executeUpdate}>Yes, Update</button>
                <button className="cancel-btn" onClick={() => setShowConfirmation(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}