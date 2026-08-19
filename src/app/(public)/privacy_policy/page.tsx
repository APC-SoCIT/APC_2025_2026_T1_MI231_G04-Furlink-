import React from "react";
import "@/app/globals.css";

export default function PrivacyPolicyPage() {
  return (
    <div className="policy-page-wrapper">
      <div className="policy-container">
        <h1>Privacy Policy</h1>
        <p className="policy-date">Last Updated: February 16, 2026</p>
        
        <p className="policy-intro">
          This Privacy Policy explains how we collect, use, and protect your personal information in 
          compliance with the Data Privacy Act of 2012 (RA 10173) of the Philippines.
        </p>

        <section className="policy-section">
          <h2>1. Information We Collect</h2>
          <p>We collect personal details to facilitate booking services, including:</p>
          <ul>
            <li><strong>Personal Identity:</strong> Your name, email address, and mobile number.</li>
            <li><strong>Pet Information:</strong> Names, breeds, medical history, and temperament.</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>2. How We Use Your Data</h2>
          <ul>
            <li><strong>Management:</strong> To manage your account and process bookings.</li>
            <li><strong>Service Delivery:</strong> Service Providers will see your contact details only when a booking is confirmed.</li>
            <li><strong>Optimization:</strong> To improve our service offerings and platform performance.</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>3. Data Security</h2>
          <p>We implement industry-standard security measures to ensure your data is only accessible to authorized users, including:</p>
          <ul>
            <li><strong>Row Level Security (RLS):</strong> To programmatically restrict data access.</li>
            <li><strong>Encryption:</strong> To protect data during storage and transmission.</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>4. Cookies</h2>
          <p>We use essential cookies to:</p>
          <ul>
            <li>Keep you logged into your secure session.</li>
            <li>Remember your preferences and display settings.</li>
          </ul>
        </section>

        <section className="policy-section">
          <h2>5. Data Retention & Compliance (RA 10173)</h2>
          <ul>
            <li><strong>Account Deactivation:</strong> If you deactivate your account, we will retain your profile and pet information.</li>
            <li><strong>Legitimate Business Purpose:</strong> In accordance with Philippine law, Transaction Data (such as booking history, payment records, and shop analytics) is retained indefinitely for legitimate business purposes, including accounting, tax compliance, and platform-wide analytics, even after account deactivation.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}