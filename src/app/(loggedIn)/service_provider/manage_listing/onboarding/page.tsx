'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ROUTES } from "@/config/routes";

export default function ServiceProviderOnboardingPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  
  const [businessData, setBusinessData] = useState({
    businessName: "",
    serviceType: "",
    address: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBusinessData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Example: Save onboarding data to Supabase (adjust table/columns to your schema)
      const { error } = await supabase
        .from("service_provider_profiles")
        .upsert({
          id: user.id,
          business_name: businessData.businessName,
          service_type: businessData.serviceType,
          address: businessData.address,
          updated_at: new Date(),
        });

      if (error) {
        console.error("Error saving onboarding info:", error);
        alert(error.message);
      } else {
        // Redirect to the manage listing or summary dashboard page after completion
        router.push(ROUTES.SERVICE_PROVIDER.MANAGE_LISTING);
      }
    } catch (err) {
      console.error("Unexpected onboarding error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <div className="bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-bold mb-2">Service Provider Onboarding</h1>
        <p className="text-gray-600 mb-6">
          Please provide your business details to get your listings up and running!
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input
              type="text"
              name="businessName"
              required
              value={businessData.businessName}
              onChange={handleChange}
              placeholder="e.g., Paws & Claws Grooming"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
            <select
              name="serviceType"
              required
              value={businessData.serviceType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a service type</option>
              <option value="grooming">Pet Grooming</option>
              <option value="boarding">Pet Boarding</option>
              
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
            <input
              type="text"
              name="address"
              required
              value={businessData.address}
              onChange={handleChange}
              placeholder="e.g., 123 Main Street, City"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Saving..." : "Complete Setup & View Listings"}
          </button>
        </form>
      </div>
    </div>
  );
}