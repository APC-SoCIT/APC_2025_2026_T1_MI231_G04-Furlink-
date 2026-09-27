"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa";
import { ROUTES } from "@/config/routes";
import { HistoryEntry } from "../_types";
import { useHistoryPage } from "../_hooks/useHistoryPage";
import { WarningSuspensionHistoryTable } from "../_components/WarningSuspensionHistoryTable";
import { HistoryDetailsModal } from "../_components/HistoryDetailsModal";
import styles from "../page.module.css";

function FullHistoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get("id");

  const { user, loading, warnings, suspensions, historyLoading, error } = useHistoryPage(userId);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

  if (loading) return <div className={styles["loading-state"]}>Loading history...</div>;
  if (error) return <div className={styles["error-state"]}>Error: {error}</div>;
  if (!user) return <div className={styles["empty-state"]}>User not found.</div>;

  return (
    <div className={styles["admin-dashboard-page"]}>
      <main className={styles["admin-dashboard-wrapper"]}>
        <div className={styles["back-button-container"]}>
          <button
            className={styles["btn-back"]}
            onClick={() => router.push(`${ROUTES.ADMIN.USER_DETAILS}?id=${userId}`)}
          >
            <FaArrowLeft /> Back to {user.first_name} {user.last_name}
          </button>
        </div>

        <div className={styles["page-header"]}>
          <h1 className={styles["page-title"]}>
            Warning &amp; Suspension History — {user.first_name} {user.last_name}
          </h1>
        </div>

        <WarningSuspensionHistoryTable
          warnings={warnings}
          suspensions={suspensions}
          loading={historyLoading}
          onViewDetails={setSelectedEntry}
        />
      </main>

      {selectedEntry && (
        <HistoryDetailsModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}

export default function FullHistoryPage() {
  return (
    <Suspense fallback={<div className={styles["loading-state"]}>Loading history...</div>}>
      <FullHistoryContent />
    </Suspense>
  );
}