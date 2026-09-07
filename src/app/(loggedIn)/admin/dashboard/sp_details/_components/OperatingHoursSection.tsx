"use client";

import { OperatingHour } from "../_types";
import styles from "../page.module.css";

export const OperatingHoursSection = ({ hours }: { hours: OperatingHour[] }) => {
  return (
    <section className={styles["detail-section"]}>
      <h3>Operating Hours</h3>
      {hours && hours.length > 0 ? (
        <ul>
          {hours.map((hour) => (
            <li key={hour.id}>
              <strong>{hour.day_of_week}:</strong> {hour.opening_time} - {hour.closing_time} (Capacity: {hour.slot_capacity})
            </li>
          ))}
        </ul>
      ) : (
        <p>No operating hours set.</p>
      )}
    </section>
  );
};