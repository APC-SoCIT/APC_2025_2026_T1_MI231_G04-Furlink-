"use client";

import { Employee } from "../_types";
import styles from "../page.module.css";

export const EmployeesSection = ({ employees }: { employees: Employee[] }) => {
  return (
    <section className={styles["detail-section"]}>
      <h3>Employees</h3>
      {employees && employees.length > 0 ? (
        <ul>
          {employees.map((emp) => (
            <li key={emp.id}>
              <strong>{emp.employee_first_name} {emp.employee_last_name}</strong> -{" "}
              <span style={{ textTransform: "capitalize" }}>
                {emp.employee_position.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No employees listed.</p>
      )}
    </section>
  );
};