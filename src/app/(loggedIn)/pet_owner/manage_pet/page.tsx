'use client';

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { FaPaw, FaPlus, FaTrash, FaEdit } from "react-icons/fa";

type Pet = {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  gender?: string;
  notes?: string;
};

export default function ManagePetPage() {
  const supabase = createClientComponentClient();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state for adding a new pet
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("Dog");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [notes, setNotes] = useState("");

  const fetchPets = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Adjust the table name here if your schema uses something else (e.g., "pets")
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", user.id);

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

  const handleAddPet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("pets").insert([
        {
          owner_id: user.id,
          name,
          species,
          breed,
          age: age ? parseInt(age, 10) : null,
          gender,
          notes,
        },
      ]);

      if (error) {
        alert("Error adding pet: " + error.message);
      } else {
        // Reset form and refresh list
        setName("");
        setSpecies("Dog");
        setBreed("");
        setAge("");
        setGender("Male");
        setNotes("");
        setShowModal(false);
        fetchPets();
      }
    } catch (err) {
      console.error("Unexpected error saving pet:", err);
    }
  };

  const handleDeletePet = async (petId: string) => {
    if (!confirm("Are you sure you want to remove this pet?")) return;

    try {
      const { error } = await supabase.from("pets").delete().eq("id", petId);
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaPaw className="text-orange-500" /> Manage My Pets
          </h1>
          <p className="text-sm text-gray-600">Add and manage your pet profiles for bookings and grooming services.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-700 transition"
        >
          <FaPlus /> Add New Pet
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading your pets...</div>
      ) : pets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <FaPaw className="mx-auto text-4xl text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-700">No pets added yet</h3>
          <p className="text-gray-500 text-sm mt-1 mb-4">Get started by adding your first pet profile.</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 transition"
          >
            Add Pet Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet) => (
            <div key={pet.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">{pet.name}</h3>
                  <span className="text-xs px-2.5 py-1 bg-orange-50 text-orange-600 rounded-full font-medium">
                    {pet.species}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1"><strong>Breed:</strong> {pet.breed || "Not specified"}</p>
                <p className="text-sm text-gray-600 mb-1"><strong>Age:</strong> {pet.age ? `${pet.age} yrs old` : "N/A"}</p>
                <p className="text-sm text-gray-600 mb-1"><strong>Gender:</strong> {pet.gender || "N/A"}</p>
                {pet.notes && <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">{pet.notes}</p>}
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-50">
                <button
                  onClick={() => handleDeletePet(pet.id)}
                  className="text-red-500 hover:text-red-700 p-2 text-sm flex items-center gap-1 transition"
                >
                  <FaTrash /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Adding Pet */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add Pet Profile</h2>
            <form onSubmit={handleAddPet} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pet Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. Bantay"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
                  <select
                    value={species}
                    onChange={(e) => setSpecies(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Bird">Bird</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                  <input
                    type="text"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. Aspin / Poodle"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age (Years)</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. 2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Notes / Medical History</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Allergies, temperament, medical needs..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition"
                >
                  Save Pet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}