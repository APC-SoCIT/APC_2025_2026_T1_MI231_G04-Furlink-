"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ROUTES } from "@/config/routes";
import { FaArrowLeft } from "react-icons/fa";
import styles from "../sp_details/page.module.css"; // reusing sp_details styles for now

export default function PODetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get("id");

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    } else {
      setError("No User ID found in URL.");
      setLoading(false);
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (err: any) {
      console.error("Error fetching user details:", err);
      setError(err.message || "Failed to load user details.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading)
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        Loading user details...
      </div>
    );
  if (error)
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "red" }}>
        Error: {error}
      </div>
    );
  if (!user)
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        User not found.
      </div>
    );

  return (
    <div className={styles["admin-dashboard-page"]}>
      <main className={styles["admin-dashboard-wrapper"]}>
        {/* Header / Back Button */}
        <div style={{ marginBottom: "20px" }}>
          <button
            className={styles["btn-view-details"]}
            onClick={() => router.push(ROUTES.ADMIN.ADMIN_DASHBOARD)}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <FaArrowLeft /> Back to Dashboard
          </button>
        </div>

        <div className={styles["dashboard-list-container"]}>
          <div className={styles["list-header"]} style={{ alignItems: "flex-start" }}>
            <div>
              <h2 className={styles["list-title"]}>
                {user.first_name} {user.last_name}
              </h2>
              {user.role && (
                <span
                  className={styles["status-pill"]}
                  style={{ display: "inline-block", marginTop: "10px", textTransform: "capitalize" }}
                >
                  {user.role.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>

          {/* GENERAL INFO SECTION */}
          <section className={styles["detail-section"]}>
            <h3>General Information</h3>
            <p><strong>Username:</strong> {user.username || "-"}</p>
            <p><strong>Contact Number:</strong> {user.mobile_number || "-"}</p>
            <p><strong>Email:</strong> {user.email || "-"}</p>
            <p><strong>Joined:</strong> {formatDate(user.created_at)}</p>
          </section>
        </div>
      </main>
    </div>
  );
}