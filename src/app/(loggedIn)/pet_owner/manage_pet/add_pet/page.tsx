'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { FaArrowLeft, FaPaw, FaFileUpload, FaCheckCircle } from "react-icons/fa";
import "./add_pet.css";

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

  // Form State matching po_registered_pet schema
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState<"dog" | "cat">("dog");
  const [petBreed, setPetBreed] = useState("");
  const [petGender, setPetGender] = useState<"male" | "female">("male");
  const [petDateOfBirth, setPetDateOfBirth] = useState("");
  const [petWeight, setPetWeight] = useState("");
  const [petBehaviors, setPetBehaviors] = useState<PetBehavior[]>(["friendly"]);
  
  // File Upload State
  const [vaccineFile, setVaccineFile] = useState<File | null>(null);
  const [illnessFile, setIllnessFile] = useState<File | null>(null);

  const [petGroomingNotes, setPetGroomingNotes] = useState("");
  const [petEmergencyConsent, setPetEmergencyConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Success Pop-up Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Dynamic Breed Loading State
  const [breeds, setBreeds] = useState<string[]>([]);
  const [loadingBreeds, setLoadingBreeds] = useState<boolean>(false);

  useEffect(() => {
    const fetchBreeds = async () => {
      setLoadingBreeds(true);
      setPetBreed("");
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
        } else if (petType === "cat") {
          const res = await fetch("https://api.thecatapi.com/v1/breeds");
          const data = await res.json();
          if (Array.isArray(data)) {
            const catBreeds = ["Puspin", ...data.map((b: { name: string }) => b.name)].sort();
            setBreeds(catBreeds);
          }
        }
      } catch (error) {
        console.error("Failed to fetch breeds:", error);
        setBreeds(petType === "dog" ? ["Aspin"] : ["Puspin"]);
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

  // Helper function to upload file to the private pet-medical-docs bucket
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
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError.message);
        alert(`Upload error: ${uploadError.message}`);
        return null;
      }

      const { data: signedData, error: signedError } = await supabase.storage
        .from('pet-medical-docs')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1-year signed URL

      if (signedError || !signedData?.signedUrl) {
        return fileName;
      }

      return signedData.signedUrl;
    } catch (error: any) {
      console.error("Image upload exception:", error);
      alert(`Unexpected upload error: ${error?.message || error}`);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (petBehaviors.length === 0) {
      alert("Please select at least one behavior trait.");
      return;
    }

    if (!vaccineFile) {
      alert("Please upload a vaccine record image.");
      return;
    }

    try {
      setSubmitting(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("User session not found. Please log in again.");
        return;
      }

      // Upload Vaccine Record
      const vaccineUrl = await uploadImage(vaccineFile, "vaccine", user.id);
      if (!vaccineUrl) {
        setSubmitting(false);
        return;
      }

      // Upload Illness Proof (Optional)
      let illnessUrl: string | null = null;
      if (illnessFile) {
        illnessUrl = await uploadImage(illnessFile, "illness", user.id);
      }

      const { error } = await supabase.from("po_registered_pet").insert([
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
        alert("Error registering pet: " + error.message);
      } else {
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error("Unexpected error saving pet:", err);
      alert("An unexpected error occurred while saving profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    router.push("/pet_owner/manage_pet");
    router.refresh();
  };

  return (
    <div className="add-pet-container">
      <div className="add-pet-card">
        <Link href="/pet_owner/manage_pet" className="back-link">
          <FaArrowLeft /> Back to Pets
        </Link>

        <div className="add-pet-header">
          <h1 className="add-pet-title">
            <FaPaw className="title-icon" /> Register New Pet
          </h1>
          <p className="add-pet-subtitle">
            Fill in the details below to add a new pet profile to your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="add-pet-form">
          <div className="form-group">
            <label className="form-label">Pet Name *</label>
            <input
              type="text"
              required
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              className="form-input"
              placeholder="e.g. Milo"
            />
          </div>

          <div className="form-grid-two">
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select
                value={petType}
                onChange={(e) => setPetType(e.target.value as "dog" | "cat")}
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
              <select
                required
                value={petBreed}
                onChange={(e) => setPetBreed(e.target.value)}
                className="form-input"
                disabled={loadingBreeds}
              >
                <option value="">
                  {loadingBreeds ? "Loading breeds..." : `-- Select ${petType} breed --`}
                </option>
                {breeds.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
                <option value="Mixed Breed / Other">Mixed Breed / Other</option>
              </select>
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
                placeholder="0.00"
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
            <label className="form-label">Behaviors (Select at least 1) *</label>
            <div className="checkbox-group">
              {AVAILABLE_BEHAVIORS.map((behavior) => (
                <label key={behavior} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={petBehaviors.includes(behavior)}
                    onChange={() => handleBehaviorToggle(behavior)}
                  />
                  {behavior}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Vaccine Record Image (Max 1MB) *</label>
            <div className="file-upload-wrapper">
              <label htmlFor="vaccine-upload" className="file-upload-box">
                <FaFileUpload className="file-icon" />
                <span className="file-text">
                  {vaccineFile ? vaccineFile.name : "Click to upload vaccine record (PNG, JPG)"}
                </span>
              </label>
              <input
                id="vaccine-upload"
                type="file"
                accept="image/png, image/jpeg"
                required
                onChange={(e) => setVaccineFile(e.target.files?.[0] || null)}
                className="file-input-hidden"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Medical Record / Illness Proof Image (Max 1MB)</label>
            <div className="file-upload-wrapper">
              <label htmlFor="illness-upload" className="file-upload-box">
                <FaFileUpload className="file-icon" />
                <span className="file-text">
                  {illnessFile ? illnessFile.name : "Click to upload medical record (PNG, JPG)"}
                </span>
              </label>
              <input
                id="illness-upload"
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
              placeholder="Special instructions (Max 250 characters)"
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

          <div className="form-actions">
            <Link href="/pet_owner/manage_pet" className="cancel-btn">
              Cancel
            </Link>
            <button type="submit" disabled={submitting} className="submit-btn">
              {submitting ? "Uploading & Saving..." : "Save Pet Profile"}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="popup-overlay">
          <div className="popup-card">
            <FaCheckCircle className="popup-icon" />
            <h2 className="popup-title">Added New Pet</h2>
            <p className="popup-message">Your pet profile has been created successfully!</p>
            <button onClick={handleCloseModal} className="popup-btn">
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}