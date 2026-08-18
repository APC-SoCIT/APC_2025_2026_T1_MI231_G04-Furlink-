'use client';

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ServiceProviderDashboardPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [hasEntry, setHasEntry] = useState(false);

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: spInfo, error } = await supabase
          .from("sp_general_info")
          .select("registration_status")
          .eq("profiles_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching service provider info:", error);
        }

        if (!spInfo) {
          setHasEntry(false);
        } else {
          setHasEntry(true);
          setRegistrationStatus(spInfo.registration_status);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkRegistrationStatus();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p className="text-gray-500">Loading service provider listings...</p>
      </div>
    );
  }

  // If the user has no entry in sp_general_info table, show the form/onboarding view
  if (!hasEntry) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4">Service Provider Onboarding Form</h1>
          <p className="text-gray-600 mb-4">
            Please fill out your business details to complete your registration.
          </p>
          {/* Insert your onboarding form component or JSX here */}
          <div className="p-4 border border-dashed border-gray-300 rounded-md bg-gray-50 text-center text-gray-500">
            [Onboarding Form Fields Go Here]
          </div>
        </div>
      </div>
    );
  }

  // If status is pending or rejected, print the onboarding status notice
  if (registrationStatus === 'pending' || registrationStatus === 'rejected') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white shadow-md rounded-lg p-6 text-center">
          <h1 className="text-2xl font-bold mb-2 capitalize">
            Registration Status: <span className={registrationStatus === 'rejected' ? 'text-red-600' : 'text-yellow-600'}>{registrationStatus}</span>
          </h1>
          <p className="text-gray-600">
            {registrationStatus === 'pending' 
              ? "Your application is currently under review by our administrators. Please check back later."
              : "Unfortunately, your registration was rejected. Please review your details or contact support."}
          </p>
        </div>
      </div>
    );
  }

  // Default dashboard view for approved service providers
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Listing</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          Add New Listing
        </button>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <p className="text-gray-600">
          Your service provider dashboard is ready. FOR APPOINTMENTS GANERN
        </p>
      </div>
    </div>
  );
}