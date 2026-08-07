'use client';

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Profile = {
  first_name?: string;
  last_name?: string;
  role?: string;
  email?: string;
};

export default function ManageAccountPage() {
  const supabase = createClientComponentClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        } else {
          setProfile({ ...data, email: user.email });
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p className="text-gray-500">Loading account details...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Manage Account</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email Address</label>
          <p className="mt-1 text-gray-900">{profile?.email || "N/A"}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">First Name</label>
          <p className="mt-1 text-gray-900">{profile?.first_name || "Not set"}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Last Name</label>
          <p className="mt-1 text-gray-900">{profile?.last_name || "Not set"}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Account Role</label>
          <span className="inline-block mt-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold capitalize">
            {profile?.role?.replace(/_/g, ' ') || "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
}