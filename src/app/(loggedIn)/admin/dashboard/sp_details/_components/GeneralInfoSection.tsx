"use client";

import { ProviderDetails } from "../_types";
import styles from "../page.module.css";

export const GeneralInfoSection = ({ provider }: { provider: ProviderDetails }) => {
  return (
    <section className={styles["detail-section"]}>
      <h3>General Information</h3>
      <p><strong>Email:</strong> {provider.business_email}</p>
      <p><strong>Contact:</strong> {provider.business_contact}</p>
      <p>
        <strong>Location:</strong> {provider.business_street}, {provider.business_barangay},{" "}
        {provider.business_city}, {provider.business_province} {provider.business_postal_code}
      </p>
      <p><strong>Service Type:</strong> {provider.business_service_type}</p>
      <p><strong>Bio:</strong> {provider.business_bio}</p>

      {provider.registration_status === "rejected" && provider.registration_rejection_reason && (
        <div style={{ marginTop: "15px", padding: "12px", backgroundColor: "#fef2f2", borderLeft: "4px solid #ef4444", borderRadius: "4px" }}>
          <p style={{ margin: 0, color: "#991b1b" }}>
            <strong>Rejection Reason:</strong> {provider.registration_rejection_reason}
          </p>
        </div>
      )}

      <div style={{ marginTop: "15px" }}>
        {provider.business_permit_url && (
          <a href={provider.business_permit_url} target="_blank" rel="noreferrer" className={styles["document-link"]}>
            View Business Permit
          </a>
        )}
        {provider.business_waiver_url && (
          <a href={provider.business_waiver_url} target="_blank" rel="noreferrer" className={styles["document-link"]}>
            View Waiver
          </a>
        )}
      </div>
    </section>
  );
};