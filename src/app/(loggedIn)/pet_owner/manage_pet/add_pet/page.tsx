'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { FaPaw, FaPlus, FaTimes, FaFileUpload, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import Footer from "@/components/Footer";
import "./add_pet.css"; // Ensure this path correctly points to your CSS file

type PetBehavior = "friendly" | "aggressive" | "anxious" | "energetic" | "trained";

const AVAILABLE_BEHAVIORS: PetBehavior[] = [
  "friendly",
  "aggressive",
  "anxious",
  "energetic",
  "trained",
];

export default function AddPetPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState<"dog" | "cat">("dog");
  const [petBreed, setPetBreed] = useState("");
  const [petGender, setPetGender] = useState<"male" | "female">("male");
  const [petDateOfBirth, setPetDateOfBirth] = useState("");
  const [petWeight, setPetWeight] = useState("");
  const [petBehaviors, setPetBehaviors] = useState<PetBehavior[]>([]);
  const [petGroomingNotes, setPetGroomingNotes] = useState("");
  const [petEmergencyConsent, setPetEmergencyConsent] = useState(false);

  // Files
  const [vaccineFile, setVaccineFile] = useState<File | null>(null);
  const [illnessFile, setIllnessFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Error Modal State
  const [errorMessage, setErrorMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Dynamic Breed loading
  const [breeds, setBreeds] = useState<string[]>([]);
  const [loadingBreeds, setLoadingBreeds] = useState(false);

  // Fetch breed list on type change
  useEffect(() => {
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
  }, [petType]);

  const handleBehaviorToggle = (behavior: PetBehavior) => {
    if (petBehaviors.includes(behavior)) {
      setPetBehaviors(petBehaviors.filter((b) => b !== behavior));
    } else {
      setPetBehaviors([...petBehaviors, behavior]);
    }
  };

  const uploadImage = async (file: File, folder: string, userId: string): Promise<string | null> => {
    if (file.size > 1 * 1024 * 1024) {
      setErrorMessage(`File "${file.name}" exceeds the 1 MB size limit.`);
      setShowErrorModal(true);
      return null;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${folder}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('pet-medical-docs')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        setErrorMessage(`Upload error: ${uploadError.message}`);
        setShowErrorModal(true);
        return null;
      }

      const { data: signedData } = await supabase.storage
        .from('pet-medical-docs')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365);

      return signedData?.signedUrl || fileName;
    } catch (error: any) {
      setErrorMessage(`Unexpected upload error: ${error?.message || error}`);
      setShowErrorModal(true);
      return null;
    }
  };

  const handleAddPet = async (e: React.FormEvent) => {
    e.preventDefault();

    if (petBehaviors.length === 0) {
      setErrorMessage("Please select at least one behavior trait.");
      setShowErrorModal(true);
      return;
    }

    if (!vaccineFile) {
      setErrorMessage("Please upload a vaccine record.");
      setShowErrorModal(true);
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMessage("You must be logged in to add a pet.");
        setShowErrorModal(true);
        return;
      }

      let vaccineUrl = "";
      if (vaccineFile) {
        const uploaded = await uploadImage(vaccineFile, "vaccine", user.id);
        if (uploaded) vaccineUrl = uploaded;
        else return;
      }

      let illnessUrl = null;
      if (illnessFile) {
        const uploaded = await uploadImage(illnessFile, "illness", user.id);
        if (uploaded) illnessUrl = uploaded;
        else return;
      }

      const { error } = await supabase
        .from("po_registered_pet")
        .insert([
          {
            profiles_id: user.id,
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
          },
        ]);

      if (error) {
        setErrorMessage("Error adding pet: " + error.message);
        setShowErrorModal(true);
      } else {
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("An unexpected error occurred.");
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="manage-pets-container">
      <main className="manage-pets-main">
        <div className="page-header">
          <div>
            <h1 className="page-title">Add New Pet</h1>
            <p className="page-subtitle">Register a new pet to your account for easy booking.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/pet_owner/manage_pet")}
            className="cancel-btn"
          >
            Back to Manage Pets
          </button>
        </div>

        <div className="modal-card" style={{ maxWidth: "800px", margin: "0 auto" }}>
          <form onSubmit={handleAddPet} className="edit-form">
            <div className="form-group">
              <label className="form-label">Pet Name *</label>
              <input
                type="text"
                required
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                className="form-input"
                placeholder="Enter pet name"
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
                  list="add-breed-options"
                  value={petBreed}
                  onChange={(e) => setPetBreed(e.target.value)}
                  className="form-input"
                  placeholder={loadingBreeds ? "Loading breeds..." : `Type or select ${petType} breed...`}
                  disabled={loadingBreeds}
                />
                <datalist id="add-breed-options">
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
                  placeholder="e.g. 6"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Date of Birth *</label>
              <input
                type="date"
                required
                value={petDateOfBirth}
                onChange={(e) => setPetDateOfBirth(e.target.value)}
                className="form-input"
              />
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
              <label className="form-label">Upload Vaccine Record (Max 1MB) *</label>
              <div className="file-upload-wrapper">
                <label htmlFor="add-vaccine" className="file-upload-box">
                  <FaFileUpload className="file-icon" />
                  <span>{vaccineFile ? vaccineFile.name : "Choose vaccine record file"}</span>
                </label>
                <input
                  id="add-vaccine"
                  type="file"
                  required
                  accept="image/png, image/jpeg"
                  onChange={(e) => setVaccineFile(e.target.files?.[0] || null)}
                  className="file-input-hidden"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Upload Illness Proof Image (Max 1MB)</label>
              <div className="file-upload-wrapper">
                <label htmlFor="add-illness" className="file-upload-box">
                  <FaFileUpload className="file-icon" />
                  <span>{illnessFile ? illnessFile.name : "Choose illness proof file (optional)"}</span>
                </label>
                <input
                  id="add-illness"
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={(e) => setIllnessFile(e.target.files?.[0] || null)}
                  className="file-input-hidden"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Grooming Notes</label>
              <textarea
                value={petGroomingNotes}
                onChange={(e) => setPetGroomingNotes(e.target.value)}
                maxLength={250}
                rows={3}
                className="form-input"
                placeholder="Special notes or grooming instructions..."
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
              <button
                type="button"
                onClick={() => router.push("/pet_owner/manage_pet")}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="submit-btn">
                {submitting ? "Adding Pet..." : "Add Pet"}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* ERROR MODAL */}
      {showErrorModal && (
        <div className="popup-overlay">
          <div className="popup-card error-card">
            <FaExclamationCircle className="popup-icon error-icon" />
            <h2 className="popup-title">Notice</h2>
            <p className="popup-message">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setShowErrorModal(false)}
              className="popup-btn"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="popup-overlay">
          <div className="popup-card">
            <FaCheckCircle className="popup-icon" />
            <h2 className="popup-title">Success</h2>
            <p className="popup-message">New pet has been successfully registered!</p>
            <button
              type="button"
              onClick={() => router.push("/pet_owner/manage_pet")}
              className="popup-btn"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}