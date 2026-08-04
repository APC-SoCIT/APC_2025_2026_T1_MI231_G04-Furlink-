'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { FaPaw, FaPlus, FaTrash, FaVenus, FaMars } from "react-icons/fa";
import "./manage_pet.css";

type PetBehavior = "friendly" | "aggressive" | "anxious" | "energetic" | "trained";

type Pet = {
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
  pet_illness_proof_url?: string | null;
  pet_grooming_notes?: string | null;
  pet_emergency_consent?: boolean | null;
  pet_ai_haircut_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export default function ManagePetPage() {
  const supabase = createClientComponentClient();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPets = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("po_registered_pet")
        .select("*")
        .eq("profiles_id", user.id);

      if (error) {
        console.error("Error fetching pets:", error.message || JSON.stringify(error));
        alert("Failed to load pets: " + (error.message || "Unknown database error"));
      } else {
        setPets(data || []);
      }
    } catch (err) {
      console.error("Unexpected error fetching pets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPets();
  }, [supabase]);

  const handleDeletePet = async (petId: string) => {
    if (!confirm("Are you sure you want to remove this pet?")) return;

    try {
      const { error } = await supabase
        .from("po_registered_pet")
        .delete()
        .eq("id", petId);

      if (error) {
        alert("Error deleting pet: " + error.message);
      } else {
        setPets((prev) => prev.filter((p) => p.id !== petId));
      }
    } catch (err) {
      console.error("Unexpected error deleting pet:", err);
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="pageHeader">
        <div>
          <h1 className="title">
            <FaPaw className="titleIcon" /> Registered Pets
          </h1>
          <p className="subtitle">
            Manage your registered pet profiles, health details, and grooming notes.
          </p>
        </div>
        <Link href="/pet_owner/manage_pet/add_pet" className="addBtn">
          <FaPlus /> Add New Pet
        </Link>
      </div>

      {/* Main Content State */}
      {loading ? (
        <div className="loadingState">Loading pet profiles...</div>
      ) : pets.length === 0 ? (
        <div className="emptyState">
          <FaPaw className="emptyIcon" />
          <h3 className="emptyTitle">No pets registered yet</h3>
          <p className="emptySubtitle">
            Get started by creating your pet's profile.
          </p>
          <Link href="/pet_owner/manage_pet/add_pet" className="addBtn">
            Add Pet Now
          </Link>
        </div>
      ) : (
        <div className="petGrid">
          {pets.map((pet) => (
            <div key={pet.id} className="petCard">
              <div className="cardHeader">
                <h3 className="petName">{pet.pet_name}</h3>
                <div className="cardHeaderBadges">
                  <span className="typeBadge">{pet.pet_type}</span>
                  <span className="genderIcon">
                    {pet.pet_gender === "male" ? (
                      <FaMars style={{ color: "#2563eb" }} />
                    ) : (
                      <FaVenus style={{ color: "#ec4899" }} />
                    )}
                  </span>
                </div>
              </div>

              <div className="petDetails">
                <p><strong>Breed:</strong> {pet.pet_breed}</p>
                <p><strong>DOB:</strong> {pet.pet_date_of_birth}</p>
                <p><strong>Weight:</strong> {pet.pet_weight} kg</p>
                
                {pet.pet_behaviors?.length > 0 && (
                  <div className="behaviorsWrapper">
                    {pet.pet_behaviors.map((b) => (
                      <span key={b} className="behaviorBadge">
                        {b}
                      </span>
                    ))}
                  </div>
                )}

                {pet.pet_grooming_notes && (
                  <p className="notesBox">
                    <strong>Notes:</strong> {pet.pet_grooming_notes}
                  </p>
                )}

                <div className="linkGroup">
                  <a
                    href={pet.pet_vaccine_url}
                    target="_blank"
                    rel="noreferrer"
                    className="docLink"
                  >
                    Vaccine Records ↗
                  </a>
                  {pet.pet_illness_proof_url && (
                    <a
                      href={pet.pet_illness_proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="docLink"
                    >
                      Medical Records ↗
                    </a>
                  )}
                </div>
              </div>

              <div className="cardFooter">
                <button
                  onClick={() => handleDeletePet(pet.id)}
                  className="deleteBtn"
                >
                  <FaTrash /> Delete Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}