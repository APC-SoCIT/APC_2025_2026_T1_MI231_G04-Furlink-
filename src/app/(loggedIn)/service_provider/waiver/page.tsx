/* src/app/service_provider/waiver/page.tsx */
'use client';

import React from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import "../manage_listing/manage_listing.css";

export default function PlatformWaiverPage() {
  const router = useRouter();

  return (
    <div className="manage-listing-page-layout">
      <div className="manage-listing-container">
        <div style={{ maxWidth: '800px', margin: '40px auto', background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          
          {/* Back Button */}
          <button 
            type="button" 
            onClick={() => router.back()} 
            style={{ background: 'none', border: 'none', color: '#0E2679', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px', padding: 0, fontSize: '14px' }}
          >
            ← Back to Onboarding
          </button>

          <h2 style={{ color: '#0a217a', marginBottom: '8px' }}>Furlink Standard Service Provider Liability Waiver</h2>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '30px' }}>Last updated: October 2026</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#333', lineHeight: '1.6', fontSize: '14px' }}>
            <section>
              <h3 style={{ color: '#0a217a', fontSize: '16px', marginBottom: '8px' }}>1. Health, Medical Conditions, and Vaccinations</h3>
              <p><strong>Vaccination Requirement:</strong> The Pet Owner verifies that the pet is current on all required vaccinations, specifically Rabies. Proof of vaccination may be requested prior to service.</p>
              <p><strong>Health Disclosure:</strong> The Pet Owner confirms the pet is fit and healthy for grooming. Any pre-existing medical conditions (e.g., heart issues, arthritis, seizures, allergies, or recent surgeries) must be fully disclosed prior to the appointment.</p>
              <p><strong>Parasites:</strong> If fleas or ticks are discovered during the grooming process, the Service Provider reserves the right to administer a flea/tick treatment at the Pet Owner's additional expense to prevent contamination of the facility.</p>
            </section>

            <section>
              <h3 style={{ color: '#0a217a', fontSize: '16px', marginBottom: '8px' }}>2. Coat Condition and Matting</h3>
              <p><strong>De-matting Risks:</strong> Severely matted coats require extra care and often necessitate shaving the hair close to the skin. This process uncovers pre-existing skin conditions and increases the risk of nicks, cuts, clipper burns, or skin irritation.</p>
              <p><strong>Release of Liability:</strong> The Pet Owner agrees that the Service Provider will not be held liable for any grooming-related injuries or post-grooming skin issues caused by the removal of a severely matted coat.</p>
            </section>

            <section>
              <h3 style={{ color: '#0a217a', fontSize: '16px', marginBottom: '8px' }}>3. Behavior and Comfort</h3>
              <p><strong>Priority on Your Pet's Comfort & Safety:</strong> Our top priority is ensuring your pet has a stress-free and positive experience. If a pet becomes overly anxious, distressed, or shows signs of extreme discomfort, our groomers may gently pause or discontinue the session. If this happens, we will discuss the best next steps together, and you will only be charged for the portion of the grooming service safely completed.</p>
            </section>

            <section>
              <h3 style={{ color: '#0a217a', fontSize: '16px', marginBottom: '8px' }}>4. Veterinary Emergencies</h3>
              <p>In the event of an emergency, the Service Provider will immediately attempt to contact the Pet Owner. If the Pet Owner cannot be reached, the Pet Owner authorizes the Service Provider to seek immediate veterinary care at the nearest available veterinary clinic at the owner's expense.</p>
            </section>

            <section>
              <h3 style={{ color: '#0a217a', fontSize: '16px', marginBottom: '8px' }}>5. Platform Indemnification (Furlink)</h3>
              <p>The Pet Owner acknowledges that Furlink acts solely as a booking platform connecting Pet Owners with independent Service Providers. Furlink is not liable for any injuries, damages, or health complications arising directly from the services rendered.</p>
            </section>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
}