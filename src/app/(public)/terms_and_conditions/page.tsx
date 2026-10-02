import React from "react";
import "@/app/globals.css";

export default function TermsAndConditionsPage() {
  return (
    <div className="policy-page-wrapper">
      <div className="policy-container">
        <h1>Terms and Conditions</h1>
        <p className="policy-intro">
          These Terms and Conditions (“Terms”) shall govern your access and use of the Platform and 
          of the services therein. The term “Platform” pertains to the website operated by LogiTeh and 
          its affiliates at furlink, including the website and social media pages made 
          available by us. By continuing to access or use the Platform and/or any of the services 
          therein, you represent that you are at least 13 years old and you have read, understood, and 
          agree, without limitation or qualification, to be bound by these Terms and our Privacy Policy.
        </p>

        <section className="policy-section">
          <h2>General</h2>
          <p>In using the Platform and the services therein, you agree to:</p>
          <ul>
            <li>Do so only for its intended and lawful purposes;</li>
            <li>Ensure that all information or data you provide in the Platform are accurate and agree to take sole responsibility for such information and data;</li>
            <li>Be responsible for maintaining confidentiality of your account information and password and for restricting access to such information and to your computer. You agree to accept responsibility for all activities that occur under your account, whether such activity is authorized or not. You should notify us immediately if you have knowledge of that or have reason for suspecting that the confidentiality of your account has been compromised or if there has been any unauthorized use thereof;</li>
            <li>Not try or attempt to try to interrupt or harm the Platform, its operations, services, facilities, or software in any manner;</li>
            <li>Not impersonate any person or entity or falsely state or otherwise misrepresent your affiliation with any person or entity; and</li>
            <li>Not use or upload any material that contains, or which you have reason to suspect contains, viruses, worms, trojan horses, spyware, adware, damaging components, malicious code or harmful or disruptive components which may impair or corrupt the Platform’s data or damage or interfere with the operation of the Platform.</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>Obligations for Pet Owners</h2>
          <p>To ensure the safety of Service Providers and the well-being of your pets, you agree to:</p>
          <ul>
            <li>Provide truthful and complete details regarding your pet’s health, temperament, vaccination status, and behavioral history;</li>
            <li>Disclose if a pet has a history of aggression or specific medical triggers;</li>
            <li>Take sole responsibility for maintaining accurate pet profile data (including species, breed, and weight parameters); and</li>
            <li>Refrain from posting profanity or foul language within un-editable booking comments or review fields.</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>Obligations for Service Providers</h2>
          <p>To maintain professional standards on the Platform, you agree to:</p>
          <ul>
            <li>Ensure your profile accurately reflects your experience, certifications, operating hours, slot capacities, and services;</li>
            <li>Use the Platform tools (listing creation, booking management, and payment confirmations) responsibly and maintain client confidentiality; and</li>
            <li>Respond promptly to incoming appointment requests and manage schedules efficiently.</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>Registration and Account Security</h2>
          <p>
            To access and use the Platform, you are required to register and create an account. However, 
            we have the absolute discretion to refuse your registration.
          </p>
          <ul>
            <li>You must provide us with accurate, complete, and up-to-date registration information; and</li>
            <li>Account merging or linking (allowing users to merge existing separate profiles or associate multiple email addresses under a single profile) is strictly out of scope; each account remains tied to a unique email address.</li>
          </ul>
          <p>
            You are responsible for safeguarding your username and password and for any activities or actions under your password.
          </p>
        </section>

        <section className="policy-section">
          <h2>User Information</h2>
          <p>
            Other than Personal Data as defined under Republic Act No. 10173 (Data Privacy Act of 2012), 
            which is subject to our Privacy Policy, any material, information, suggestions, idea, concept, 
            know-how, technique, question, comment, feedback/review, or other communication you transmit, 
            upload, or post to or through the Platform in any manner (&quot;User Communications&quot;) are and will 
            be considered non-confidential and non-proprietary.
          </p>
        </section>

        <section className="policy-section">
          <h2>Creating an Account and Booking Services</h2>
          <p>
            Upon creation of an account, you may book available grooming services in the Platform, 
            choose your preferred schedule, and customize your booking by providing the details of your pet. 
            By submitting a booking request, you are effectively offering to reserve an appointment, 
            which service providers may review, accept, or decline via their dashboard.
          </p>
        </section>

        <section className="policy-section">
          <h2>Payment, Cancellations, and Refunds</h2>
          <p>All prices indicated in the Platform are in Philippine Peso, processed securely via the PayMongo API:</p>
          <ul>
            <li>
              <strong>Provider-Side Cancellations & Rejections:</strong> On the Service Provider Dashboard, 
              the Booking Details modal provides service providers with a comprehensive summary of incoming 
              booking requests, displaying appointment schedules, total amounts, booking statuses, request 
              timestamps, and itemized pet profiles alongside selected services. Within this interface, 
              service providers can review appointment specifics and take administrative action, including 
              declining an appointment by submitting a required rejection reason. Executing &quot;Confirm Reject&quot; 
              updates the booking record and automatically triggers a 100% refund back to the pet owner via 
              the PayMongo payment gateway, ensuring pet owners are never financially penalized when an 
              appointment cannot be fulfilled by the provider.
            </li>
            <li>
              <strong>Pet Owner-Side Cancellations:</strong> In contrast to provider cancellations, pet 
              owner-initiated cancellations involve a 25% fee deduction (issuing a 75% refund) to absorb 
              non-refundable gateway processing fees and partially compensate the provider for blocked calendar time. 
              This 25% policy remains customer-friendly.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>Platform Moderation: Warnings and Suspensions</h2>
          <p>
            To maintain platform integrity, infractions are categorized across severity tiers (Minor, Normal, 
            Severe, and Critical) leading to warnings and temporary suspensions for both Pet Owners and Service Providers:
          </p>
          <ul>
            <li>
              <strong>Pet Owner Infractions:</strong> Minor infractions include excessive cancellations, inaccurate pet info, or profanity in feedback (3 minor warnings result in a 3-day suspension). 
              Normal infractions include no-shows or repeated minor infractions. Severe infractions cover schedule 
              siphoning or severe review abuse. Critical infractions involve direct fraud or threats.
            </li>
            <li>
              <strong>Service Provider Infractions:</strong> Minor infractions cover response delays or minor service complaints. Normal infractions include high cancellation rates or low ratings (7-day suspension). 
              Severe infractions cover mass refunds or severe operational complaints. Critical infractions involve 
              accumulated suspensions or fraud.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>Service Level Agreement (SLA)</h2>
          <p>This Service Level Agreement outlines Furlink’s commitment to platform availability and response performance:</p>
          <ul>
            <li>
              <strong>Platform Availability & Uptime:</strong> Furlink targets a cloud infrastructure availability of 
              <strong> 99.99%</strong> uptime, excluding scheduled maintenance windows typically executed during off-peak hours.
            </li>
            <li>
              <strong>Response Standards:</strong> Service providers are expected to review booking requests promptly. Automated 
              email notifications and Supabase database webhooks target near-instant delivery upon booking status modifications.
            </li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>Limitation of Liability</h2>
          <p>
            The Platform acts solely as a venue to connect pet owners and service providers. The Platform 
            shall not be liable for any disputes, claims, damages, injuries, or liabilities arising between 
            them, nor does it offer direct insurance coverage.
          </p>
        </section>

        <section className="policy-section">
          <h2>Termination of Account and Platform Services</h2>
          <p>
            We may suspend or terminate your account or your use of the Platform at any time upon violation 
            of these Terms and Conditions or accumulation of critical disciplinary warnings. Users may also 
            request account deactivation via their profile settings, subject to completing active or unfinished bookings.
          </p>
        </section>

        <section className="policy-section">
          <h2>Disclaimer of Warranties</h2>
          <p>
            Your access and use of the Platform and our Services are for your personal use and made voluntarily, 
            at your own risk. The Platform and its content are provided &quot;as is&quot; and &quot;as available&quot; without 
            warranties of any kind.
          </p>
        </section>

        <section className="policy-section">
          <h2>Revisions to the Terms of Use</h2>
          <p>
            We may change these Terms from time to time without prior notice. Revised versions will be posted 
            on this page together with an updated effective date. Your continued use of any of our services 
            shall be deemed as acceptance of any revisions.
          </p>
        </section>
      </div>
    </div>
  );
}