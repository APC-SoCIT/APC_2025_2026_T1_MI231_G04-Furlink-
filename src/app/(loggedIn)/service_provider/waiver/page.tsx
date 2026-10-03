/* src/app/(loggedIn)/service_provider/waiver/page.tsx */
import React from "react";
import Footer from "@/components/Footer";
import "@/app/globals.css";

// Uses the same shared "policy-*" styles as the Terms and Conditions and
// Privacy Policy pages (defined in globals.css) so all legal pages look alike.
export default function PlatformWaiverPage() {
  return (
    <>
      <div className="policy-page-wrapper">
        <div className="policy-container">
          <h1>Furlink Standard Service Provider Liability Waiver</h1>
          <p className="policy-date">Last Updated: October 2026</p>

          <section className="policy-section">
            <h2>1. Health, Medical Conditions, and Vaccinations</h2>
            <ul>
              <li><strong>Vaccination Requirement:</strong> The Pet Owner verifies that the pet is current on all required vaccinations, specifically Rabies. Proof of vaccination may be requested prior to service.</li>
              <li><strong>Health Disclosure:</strong> The Pet Owner confirms the pet is fit and healthy for grooming. Any pre-existing medical conditions (e.g., heart issues, arthritis, seizures, allergies, or recent surgeries) must be fully disclosed prior to the appointment.</li>
              <li><strong>Parasites:</strong> If fleas or ticks are discovered during the grooming process, the Service Provider reserves the right to administer a flea/tick treatment at the Pet Owner&apos;s additional expense to prevent contamination of the facility.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>2. Coat Condition and Matting</h2>
            <ul>
              <li><strong>De-matting Risks:</strong> Severely matted coats require extra care and often necessitate shaving the hair close to the skin. This process uncovers pre-existing skin conditions and increases the risk of nicks, cuts, clipper burns, or skin irritation.</li>
              <li><strong>Release of Liability:</strong> The Pet Owner agrees that the Service Provider will not be held liable for any grooming-related injuries or post-grooming skin issues caused by the removal of a severely matted coat.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>3. Behavior and Comfort</h2>
            <p>
              <strong>Priority on Your Pet&apos;s Comfort &amp; Safety:</strong> Our top priority is ensuring your pet has a stress-free and positive experience. If a pet becomes overly anxious, distressed, or shows signs of extreme discomfort, our groomers may gently pause or discontinue the session. If this happens, we will discuss the best next steps together, and you will only be charged for the portion of the grooming service safely completed.
            </p>
          </section>

          <section className="policy-section">
            <h2>4. Veterinary Emergencies</h2>
            <p>
              In the event of an emergency, the Service Provider will immediately attempt to contact the Pet Owner. If the Pet Owner cannot be reached, the Pet Owner authorizes the Service Provider to seek immediate veterinary care at the nearest available veterinary clinic at the owner&apos;s expense.
            </p>
          </section>

          <section className="policy-section">
            <h2>5. Platform Indemnification (Furlink)</h2>
            <p>
              The Pet Owner acknowledges that Furlink acts solely as a booking platform connecting Pet Owners with independent Service Providers. Furlink is not liable for any injuries, damages, or health complications arising directly from the services rendered.
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}