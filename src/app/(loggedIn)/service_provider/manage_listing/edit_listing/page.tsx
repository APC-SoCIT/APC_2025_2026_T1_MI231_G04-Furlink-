'use client';

import React from "react";
import Link from "next/link";
import { ROUTES } from "@/config/routes";

export default function EditListingPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Edit Listing</h1>
      <p className="text-gray-600 mb-6">Modify your listing details here.</p>
      
      <Link 
        href={ROUTES.SERVICE_PROVIDER.MANAGE_LISTING}
        className="text-blue-600 hover:underline text-sm font-medium"
      >
        &larr; Back to Manage Listing
      </Link>
    </div>
  );
}