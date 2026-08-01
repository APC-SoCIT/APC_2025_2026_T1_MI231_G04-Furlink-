'use client';

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ServiceProviderDashboardPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Add any listing fetch logic here
    setLoading(false);
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p className="text-gray-500">Loading service provider listings...</p>
      </div>
    );
  }

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