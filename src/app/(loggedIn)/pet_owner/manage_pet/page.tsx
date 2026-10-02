'use client';

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { FaPaw, FaEdit, FaTrashAlt, FaPlus, FaTimes, FaFileUpload, FaCheckCircle, FaExclamationTriangle, FaExclamationCircle } from "react-icons/fa";
import Footer from "@/components/Footer";
import { getTodayLocalISO, isFutureDate, validateMedicalFile, MEDICAL_FILE_ACCEPT } from "./petFormValidation";
import { SortOrder } from "../manage_bookings/types/booking";
import {
  formatDateDisplay,
  formatTimeDisplay,
  formatStatusLabel,
  sortByBookingStart,
} from "../manage_bookings/utils/bookingFormatters";
import "./manage_pet.css";

type PetBehavior = "friendly" | "aggressive" | "anxious" | "energetic" | "trained";

const AVAILABLE_BEHAVIORS: PetBehavior[] = [
  "friendly",
  "aggressive",
  "anxious",
  "energetic",
  "trained",
];

type PetProfile = {
  id: string;
  profiles_id: string;
  pet_name: string;
  pet_type: "dog" | "cat";
  pet_breed: string;
  pet_gender: "male" | "female";
  pet_date_of_birth: string;
  pet_weight: number;
  pet_behaviors: PetBehavior[];
  pet_vaccine_url: string;
  pet_illness_proof_url: string | null;
  pet_grooming_notes: string | null;
  pet_emergency_consent: boolean;
};

// One past/upcoming booking of a pet, flattened for the history list
type PetBookingHistoryItem = {
  id: string;
  booking_date: string;
  booking_timeslot: string;
  booking_status: string;
  business_name: string;
  services: string[];
};

export default function ManagePetPage() {
  const supabase = createClientComponentClient();

  const [pets, setPets] = useState<PetProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal States
  const [editingPet, setEditingPet] = useState<PetProfile | null>(null);
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState<"dog" | "cat">("dog");
  const [petBreed, setPetBreed] = useState("");
  const [petGender, setPetGender] = useState<"male" | "female">("male");
  const [petDateOfBirth, setPetDateOfBirth] = useState("");
  const [petWeight, setPetWeight] = useState("");
  const [petBehaviors, setPetBehaviors] = useState<PetBehavior[]>([]);
  const [petGroomingNotes, setPetGroomingNotes] = useState("");
  const [petEmergencyConsent, setPetEmergencyConsent] = useState(false);

  // Booking History Modal States
  const [historyPet, setHistoryPet] = useState<PetProfile | null>(null);
  const [historyItems, setHistoryItems] = useState<PetBookingHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySort, setHistorySort] = useState<SortOrder>("desc");

  // Delete Modal State
  const [deletingPet, setDeletingPet] = useState<PetProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Files
  const [vaccineFile, setVaccineFile] = useState<File | null>(null);
  const [illnessFile, setIllnessFile] = useState<File | null>(null);
  const [vaccineWarning, setVaccineWarning] = useState("");
  const [illnessWarning, setIllnessWarning] = useState("");
  const [dobWarning, setDobWarning] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Dynamic Breed loading
  const [breeds, setBreeds] = useState<string[]>([]);
  const [loadingBreeds, setLoadingBreeds] = useState(false);

  const fetchPets = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("po_registered_pet")
        .select("*")
        .eq("profiles_id", user.id);

      if (!error && data) {
        setPets(data as PetProfile[]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPets();
  }, []);

  // Fetch breed list on type change inside edit modal
  useEffect(() => {
    if (!editingPet) return;

    const fetchBreeds = async () => {
      setLoadingBreeds(true);
      try {
        if (petType === "dog") {
          const res = await fetch("https://dog.ceo/api/breeds/list/all");
          const data = await res.json();
          if (data.status === "success") {
            const breedList: string[] = ["Aspin"];
            Object.keys(data.message).forEach((mainBreed) => {
              const subBreeds: string[] = data.message[mainBreed];
              if (subBreeds.length > 0) {
                subBreeds.forEach((sub) => {
                  const formatted = `${sub} ${mainBreed}`
                    .split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ");
                  breedList.push(formatted);
                });
              } else {
                const formatted = mainBreed.charAt(0).toUpperCase() + mainBreed.slice(1);
                breedList.push(formatted);
              }
            });
            setBreeds(breedList.sort());
          }
        } else {
          const res = await fetch("https://api.thecatapi.com/v1/breeds");
          const data = await res.json();
          if (Array.isArray(data)) {
            setBreeds(["Puspin", ...data.map((b: { name: string }) => b.name)].sort());
          }
        }
      } catch (err) {
        console.error("Failed to load breeds", err);
      } finally {
        setLoadingBreeds(false);
      }
    };

    fetchBreeds();
  }, [petType, editingPet]);

  const handleOpenEdit = (pet: PetProfile) => {
    setEditingPet(pet);
    setPetName(pet.pet_name);
    setPetType(pet.pet_type);
    setPetBreed(pet.pet_breed);
    setPetGender(pet.pet_gender);
    setPetDateOfBirth(pet.pet_date_of_birth);
    setPetWeight(pet.pet_weight.toString());
    setPetBehaviors(pet.pet_behaviors || []);
    setPetGroomingNotes(pet.pet_grooming_notes || "");
    setPetEmergencyConsent(pet.pet_emergency_consent);
    setVaccineFile(null);
    setIllnessFile(null);
    setVaccineWarning("");
    setIllnessWarning("");
    setDobWarning("");
  };

  // Opens the booking history of a pet (bookings are linked through booking_pet_info.registered_pet_id)
  const handleOpenHistory = async (pet: PetProfile) => {
    setHistoryPet(pet);
    setHistoryItems([]);
    setHistoryLoading(true);

    const { data, error } = await supabase
      .from("booking_pet_info")
      .select(
        "id, booking_service_info(booking_service_name), booking_info!inner(booking_date, booking_timeslot, booking_status, sp_general_info(business_name))"
      )
      .eq("registered_pet_id", pet.id);

    if (error) {
      console.error("Error fetching booking history:", error);
    } else {
      setHistoryItems(
        (data as any[]).map((row) => ({
          id: row.id,
          booking_date: row.booking_info.booking_date,
          booking_timeslot: row.booking_info.booking_timeslot,
          booking_status: row.booking_info.booking_status,
          business_name: row.booking_info.sp_general_info?.business_name || "Unknown provider",
          services: (row.booking_service_info || []).map(
            (s: { booking_service_name: string }) => s.booking_service_name
          ),
        }))
      );
    }
    setHistoryLoading(false);
  };

  // History ordered by booking date/time according to the selected filter
  const sortedHistory = useMemo(
    () => sortByBookingStart(historyItems, historySort),
    [historyItems, historySort]
  );

  const handleCloseEdit = () => {
    setEditingPet(null);
  };

  const handleDobChange = (value: string) => {
    if (isFutureDate(value)) {
      setDobWarning("Date of birth cannot be in the future.");
      return;
    }
    setDobWarning("");
    setPetDateOfBirth(value);
  };

  const handleMedicalFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setWarning: (msg: string) => void
  ) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setFile(null);
      setWarning("");
      return;
    }
    const problem = validateMedicalFile(file);
    if (problem) {
      setFile(null);
      setWarning(problem);
      e.target.value = "";
      return;
    }
    setWarning("");
    setFile(file);
  };

  const handleBehaviorToggle = (behavior: PetBehavior) => {
    if (petBehaviors.includes(behavior)) {
      setPetBehaviors(petBehaviors.filter((b) => b !== behavior));
    } else {
      setPetBehaviors([...petBehaviors, behavior]);
    }
  };

  const uploadImage = async (file: File, folder: string, userId: string): Promise<string | null> => {
    if (file.size > 1 * 1024 * 1024) {
      alert(`File "${file.name}" exceeds the 1 MB size limit.`);
      return null;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${folder}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('pet-medical-docs')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        alert(`Upload error: ${uploadError.message}`);
        return null;
      }

      const { data: signedData } = await supabase.storage
        .from('pet-medical-docs')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365);

      return signedData?.signedUrl || fileName;
    } catch (error: any) {
      alert(`Unexpected upload error: ${error?.message || error}`);
      return null;
    }
  };

  const handleUpdatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPet) return;

    if (isFutureDate(petDateOfBirth)) {
      setDobWarning("Date of birth cannot be in the future.");
      return;
    }

    if (petBehaviors.length === 0) {
      alert("Please select at least one behavior trait.");
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let vaccineUrl = editingPet.pet_vaccine_url;
      if (vaccineFile) {
        const uploaded = await uploadImage(vaccineFile, "vaccine", user.id);
        if (uploaded) vaccineUrl = uploaded;
      }

      let illnessUrl = editingPet.pet_illness_proof_url;
      if (illnessFile) {
        const uploaded = await uploadImage(illnessFile, "illness", user.id);
        if (uploaded) illnessUrl = uploaded;
      }

      const { error } = await supabase
        .from("po_registered_pet")
        .update({
          pet_name: petName,
          pet_type: petType,
          pet_breed: petBreed,
          pet_gender: petGender,
          pet_date_of_birth: petDateOfBirth,
          pet_weight: parseFloat(petWeight),
          pet_behaviors: petBehaviors,
          pet_vaccine_url: vaccineUrl,
          pet_illness_proof_url: illnessUrl,
          pet_grooming_notes: petGroomingNotes || null,
          pet_emergency_consent: petEmergencyConsent,
        })
        .eq("id", editingPet.id);

      if (error) {
        alert("Error updating pet: " + error.message);
      } else {
        setEditingPet(null);
        setSuccessMessage("The pet details have been successfully saved.");
        setShowSuccessModal(true);
        fetchPets();
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Pet Handler
  const handleDeletePet = async () => {
    if (!deletingPet) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from("po_registered_pet")
        .delete()
        .eq("id", deletingPet.id);

      if (error) {
        alert("Error deleting pet profile: " + error.message);
      } else {
        setDeletingPet(null);
        setSuccessMessage(`${deletingPet.pet_name}'s profile has been deleted.`);
        setShowSuccessModal(true);
        fetchPets();
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred while deleting.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="manage-pets-container">
      <main className="manage-pets-main">
        <div className="page-header">
          <div>
            <h1 className="page-title">Manage Pet Profiles</h1>
            <p className="page-subtitle">View, edit, or delete your registered pets.</p>
          </div>
          <Link href="/pet_owner/manage_pet/add_pet" className="add-pet-btn">
            <FaPlus /> Add New Pet
          </Link>
        </div>

        {loading ? (
          <p className="loading-text">Loading pet profiles...</p>
        ) : pets.length === 0 ? (
          <div className="empty-state">
            <FaPaw className="empty-icon" />
            <h3>No pets registered yet</h3>
            <p>Add your first pet to start booking services!</p>
          </div>
        ) : (
          <div className="pets-grid">
            {pets.map((pet) => (
              <div
                key={pet.id}
                className="pet-card clickable"
                role="button"
                tabIndex={0}
                title="View booking history"
                onClick={() => handleOpenHistory(pet)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target === e.currentTarget) handleOpenHistory(pet);
                }}
              >
                <div className="pet-card-header">
                  <div>
                    <h3 className="pet-card-title">{pet.pet_name}</h3>
                    <span className="pet-badge">{pet.pet_type}</span>
                  </div>
                  <div className="card-action-btns">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(pet);
                      }}
                      className="action-icon-btn edit-btn-style"
                      title="Edit Pet Profile"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingPet(pet);
                      }}
                      className="action-icon-btn delete-btn-style"
                      title="Delete Pet Profile"
                    >
                      <FaTrashAlt />
                    </button>
                  </div>
                </div>

                <div className="pet-card-body">
                  <p><strong>Breed:</strong> {pet.pet_breed}</p>
                  <p><strong>Gender:</strong> <span className="capitalize">{pet.pet_gender}</span></p>
                  <p><strong>Weight:</strong> {pet.pet_weight} kg</p>
                  <p><strong>Birthdate:</strong> {pet.pet_date_of_birth}</p>
                  <div className="tags-wrapper">
                    {pet.pet_behaviors?.map((b) => (
                      <span key={b} className="behavior-tag">{b}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* BOOKING HISTORY MODAL */}
      {historyPet && (
        <div className="modal-overlay">
          <div className="modal-card history-modal">
            <div className="modal-header">
              <h2>{historyPet.pet_name}'s Booking History</h2>
              <button onClick={() => setHistoryPet(null)} className="close-btn"><FaTimes /></button>
            </div>

            <div className="history-filter">
              <label htmlFor="history-sort">Sort by date</label>
              <select
                id="history-sort"
                value={historySort}
                onChange={(e) => setHistorySort(e.target.value as SortOrder)}
              >
                <option value="desc">Descending (newest first)</option>
                <option value="asc">Ascending (oldest first)</option>
              </select>
            </div>

            {historyLoading ? (
              <p className="loading-text">Loading booking history...</p>
            ) : sortedHistory.length === 0 ? (
              <p className="history-empty">No bookings yet for {historyPet.pet_name}.</p>
            ) : (
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Date &amp; Time</th>
                      <th>Service Provider</th>
                      <th>Service Availed</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHistory.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{formatDateDisplay(item.booking_date)}</strong>
                          <span className="history-time">{formatTimeDisplay(item.booking_timeslot)}</span>
                        </td>
                        <td>{item.business_name}</td>
                        <td>{item.services.length > 0 ? item.services.join(", ") : "N/A"}</td>
                        <td>
                          <span className="history-status">{formatStatusLabel(item.booking_status)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingPet && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Edit {editingPet.pet_name}'s Profile</h2>
              <button onClick={handleCloseEdit} className="close-btn"><FaTimes /></button>
            </div>

            <form onSubmit={handleUpdatePet} className="edit-form">
              <div className="form-group">
                <label className="form-label">Pet Name *</label>
                <input
                  type="text"
                  required
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-grid-two">
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select
                    value={petType}
                    onChange={(e) => {
                      const newType = e.target.value as "dog" | "cat";
                      setPetType(newType);
                      setPetBreed("");
                    }}
                    className="form-input"
                  >
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select
                    value={petGender}
                    onChange={(e) => setPetGender(e.target.value as "male" | "female")}
                    className="form-input"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-two">
                <div className="form-group">
                  <label className="form-label">Breed *</label>
                  <input
                    type="text"
                    required
                    list="edit-breed-options"
                    value={petBreed}
                    onChange={(e) => setPetBreed(e.target.value)}
                    className="form-input"
                    placeholder={loadingBreeds ? "Loading breeds..." : `Type or select ${petType} breed...`}
                    disabled={loadingBreeds}
                  />
                  <datalist id="edit-breed-options">
                    {breeds.map((b) => (
                      <option key={b} value={b} />
                    ))}
                    <option value="Mixed Breed / Other" />
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label">Weight (kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={petWeight}
                    onChange={(e) => setPetWeight(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Date of Birth *</label>
                <input
                  type="date"
                  required
                  max={getTodayLocalISO()}
                  value={petDateOfBirth}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className={`form-input${dobWarning ? " form-input-error" : ""}`}
                />
                {dobWarning && (
                  <div className="file-warning" role="alert">
                    <FaExclamationCircle style={{ marginTop: 3 }} />
                    <span>{dobWarning}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Behaviors *</label>
                <div className="checkbox-group">
                  {AVAILABLE_BEHAVIORS.map((b) => (
                    <label key={b} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={petBehaviors.includes(b)}
                        onChange={() => handleBehaviorToggle(b)}
                      />
                      {b}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Update Vaccine Record (Max 1MB)</label>
                <div className="file-upload-wrapper">
                  <label htmlFor="edit-vaccine" className="file-upload-box">
                    <FaFileUpload className="file-icon" />
                    <span>{vaccineFile ? vaccineFile.name : "Choose file to replace current record"}</span>
                  </label>
                  <input
                    id="edit-vaccine"
                    type="file"
                    accept={MEDICAL_FILE_ACCEPT}
                    onChange={(e) => handleMedicalFileChange(e, setVaccineFile, setVaccineWarning)}
                    className="file-input-hidden"
                  />
                </div>
                {vaccineWarning && (
                  <div className="file-warning" role="alert">
                    <FaExclamationCircle style={{ marginTop: 3 }} />
                    <span>{vaccineWarning}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Update Illness Proof Image (Max 1MB)</label>
                <div className="file-upload-wrapper">
                  <label htmlFor="edit-illness" className="file-upload-box">
                    <FaFileUpload className="file-icon" />
                    <span>{illnessFile ? illnessFile.name : "Choose file to replace current record"}</span>
                  </label>
                  <input
                    id="edit-illness"
                    type="file"
                    accept={MEDICAL_FILE_ACCEPT}
                    onChange={(e) => handleMedicalFileChange(e, setIllnessFile, setIllnessWarning)}
                    className="file-input-hidden"
                  />
                </div>
                {illnessWarning && (
                  <div className="file-warning" role="alert">
                    <FaExclamationCircle style={{ marginTop: 3 }} />
                    <span>{illnessWarning}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Grooming Notes</label>
                <textarea
                  value={petGroomingNotes}
                  onChange={(e) => setPetGroomingNotes(e.target.value)}
                  maxLength={250}
                  rows={3}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={petEmergencyConsent}
                    onChange={(e) => setPetEmergencyConsent(e.target.checked)}
                  />
                  I give consent for emergency treatment if required.
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={handleCloseEdit} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="submit-btn">
                  {submitting ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingPet && (
        <div className="popup-overlay">
          <div className="popup-card">
            <FaExclamationTriangle className="popup-icon warning-icon" />
            <h2 className="popup-title">Delete Pet Profile?</h2>
            <p className="popup-message">
              Are you sure you want to delete <strong>{deletingPet.pet_name}</strong>? This action cannot be undone.
            </p>
            <div className="modal-actions full-width">
              <button onClick={() => setDeletingPet(null)} className="cancel-btn">
                Cancel
              </button>
              <button
                onClick={handleDeletePet}
                disabled={deleting}
                className="delete-confirm-btn"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="popup-overlay">
          <div className="popup-card">
            <FaCheckCircle className="popup-icon" />
            <h2 className="popup-title">Success</h2>
            <p className="popup-message">{successMessage}</p>
            <button onClick={() => setShowSuccessModal(false)} className="popup-btn">
              OK
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}