'use client';

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { FaArrowLeft, FaPaw } from "react-icons/fa";
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
  const [petVaccineUrl, setPetVaccineUrl] = useState("");
  const [petIllnessProofUrl, setPetIllnessProofUrl] = useState("");
  const [petGroomingNotes, setPetGroomingNotes] = useState("");
  const [petEmergencyConsent, setPetEmergencyConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleBehaviorToggle = (behavior: PetBehavior) => {
    if (petBehaviors.includes(behavior)) {
      setPetBehaviors(petBehaviors.filter((b) => b !== behavior));
    } else {
      setPetBehaviors([...petBehaviors, behavior]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (petBehaviors.length === 0) {
      alert("Please select at least one behavior trait.");
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
          pet_vaccine_url: petVaccineUrl,
          pet_illness_proof_url: petIllnessProofUrl || null,
          pet_grooming_notes: petGroomingNotes || null,
          pet_emergency_consent: petEmergencyConsent,
        },
      ]);

      if (error) {
        alert("Error registering pet: " + error.message);
      } else {
        // Successfully inserted, navigate back to pet list
        router.push("/pet_owner/manage_pet");
        router.refresh();
      }
    } catch (err) {
      console.error("Unexpected error saving pet:", err);
      alert("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-pet-container">
      <div className="add-pet-card">
        {/* Navigation Link Back */}
        <Link href="/pet_owner/manage_pet" className="back-link">
          <FaArrowLeft /> Back to Pets
        </Link>

        {/* Title Header */}
        <div className="add-pet-header">
          <h1 className="add-pet-title">
            <FaPaw className="title-icon" /> Register New Pet
          </h1>
          <p className="add-pet-subtitle">
            Fill in the details below to add a new pet profile to your account.
          </p>
        </div>

        {/* Registration Form */}
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
              <input
                type="text"
                required
                value={petBreed}
                onChange={(e) => setPetBreed(e.target.value)}
                className="form-input"
                placeholder="e.g. Golden Retriever"
              />
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
            <label className="form-label">Vaccine Record URL *</label>
            <input
              type="url"
              required
              value={petVaccineUrl}
              onChange={(e) => setPetVaccineUrl(e.target.value)}
              className="form-input"
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Medical Record / Illness Proof URL</label>
            <input
              type="url"
              value={petIllnessProofUrl}
              onChange={(e) => setPetIllnessProofUrl(e.target.value)}
              className="form-input"
              placeholder="https://..."
            />
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
              {submitting ? "Saving Profile..." : "Save Pet Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}