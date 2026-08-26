"use client";

import { Service } from "../_types";
import styles from "../page.module.css";

export const ServicesSection = ({ services }: { services: Service[] }) => {
  return (
    <section className={styles["detail-section"]}>
      <h3>Services Offered</h3>
      {services && services.length > 0 ? (
        <div className={styles["service-card-container"]}>
          {services.map((service) => (
            <div key={service.id} className={styles["service-card"]}>
              <h4>
                {service.service_name}{" "}
                <span style={{ fontSize: "0.85rem", fontWeight: "normal", color: "#6b7280", textTransform: "capitalize" }}>
                  ({service.service_type.replace("_", " ")})
                </span>
              </h4>
              <p>{service.service_description}</p>
              {service.service_notes && (
                <p style={{ fontSize: "0.85rem", fontStyle: "italic" }}>Note: {service.service_notes}</p>
              )}

              {service.sp_service_options && service.sp_service_options.length > 0 && (
                <table className={styles["providers-table"]}>
                  <thead>
                    <tr>
                      <th>Pet Type</th>
                      <th>Size</th>
                      <th>Weight Range</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {service.sp_service_options.map((option) => (
                      <tr key={option.id}>
                        <td style={{ textTransform: "capitalize" }}>{option.pet_type.replace(/_/g, " ")}</td>
                        <td style={{ textTransform: "capitalize" }}>{option.pet_size.replace(/_/g, " ")}</td>
                        <td>{option.pet_min_weight_range} - {option.pet_max_weight_range} kg</td>
                        <td>₱{option.service_price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p>No services registered yet.</p>
      )}
    </section>
  );
};