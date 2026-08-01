'use client';

import React from "react";
import Link from "next/link";
import { ROUTES } from "@/config/routes"; // Adjust import path to your routes file if needed

export default function ManageListingPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Manage Listing (View)</h1>
      <p className="text-gray-600 mb-6">This is the main view page for your listings.</p>
      
      <div className="flex gap-4">
        <Link 
          href={ROUTES.SERVICE_PROVIDER.EDIT_LISTING}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Go to Edit Listing
        </Link>
        <Link 
          href={ROUTES.SERVICE_PROVIDER.EDIT_BUSINESS_INFO}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
        >
          Go to Edit Business Info
        </Link>
      </div>
    </div>
  );
}