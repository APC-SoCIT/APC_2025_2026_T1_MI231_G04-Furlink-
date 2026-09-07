// Popup overlay for Generate Admin Report

"use client";

import { useState } from "react";
import { FaFileAlt, FaTimes, FaDownload } from "react-icons/fa";
import { pdf } from "@react-pdf/renderer";
import { AdminReportDocument } from "./AdminReportDocument";
import { DashboardCounts, DateRange } from "../_types";
import styles from "../page.module.css";

interface Props {
  counts: DashboardCounts;
  dateRange: DateRange;
  onClose: () => void;
}

export const AdminReportModal = ({ counts, dateRange, onClose }: Props) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const blob = await pdf(
        <AdminReportDocument counts={counts} dateRange={dateRange} />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      
      link.href = url;
      link.download = `Admin_Dashboard_Report_${dateStr}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className={styles["report-modal-overlay"]} onClick={onClose}>
      <div className={styles["report-modal-content"]} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className={styles["report-modal-header"]}>
          <div className={styles["report-header-title"]}>
            <FaFileAlt size={20} />
            <h2>Admin Dashboard Report</h2>
          </div>
          <button className={styles["modal-close-btn"]} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {/* Scrollable Body containing the full report */}
        <div className={styles["report-modal-body"]}>
          
          {/* Report Info */}
          <div className={styles["report-info-section"]}>
            <div className={styles["report-info-row"]}>
              <span className={styles["report-label"]}>Report Generated:</span>
              <span className={styles["report-value"]}>
                {new Date().toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
            {(dateRange.start || dateRange.end) && (
              <div className={styles["report-info-row"]}>
                <span className={styles["report-label"]}>Date Filter Applied:</span>
                <span className={styles["report-value"]}>
                  {dateRange.start} to {dateRange.end || 'Present'}
                </span>
              </div>
            )}
          </div>

          {/* Executive Summary */}
          <div className={styles["report-section"]}>
            <h3 className={styles["report-section-title"]}>Executive Summary</h3>
            <div className={styles["report-kpi-grid"]}>
              <div className={styles["report-kpi-item"]}>
                <span className={styles["report-kpi-label"]}>Pending Approvals</span>
                <span className={styles["report-kpi-value"]}>{counts.pendingCount}</span>
              </div>
              <div className={styles["report-kpi-item"]}>
                <span className={styles["report-kpi-label"]}>Active Listings</span>
                <span className={styles["report-kpi-value"]}>{counts.activeCount}</span>
              </div>
              <div className={styles["report-kpi-item"]}>
                <span className={styles["report-kpi-label"]}>Rejected Listings</span>
                <span className={styles["report-kpi-value"]}>{counts.rejectedCount}</span>
              </div>
              <div className={styles["report-kpi-item"]}>
                <span className={styles["report-kpi-label"]}>Total Users</span>
                <span className={styles["report-kpi-value"]}>{counts.totalUsers}</span>
              </div>
              <div className={styles["report-kpi-item"]}>
                <span className={styles["report-kpi-label"]}>Avg Approval Time</span>
                <span className={styles["report-kpi-value"]}>{counts.avgApprovalTime}</span>
              </div>
            </div>
          </div>

          {/* Platform Insights */}
          <div className={styles["report-section"]}>
            <h3 className={styles["report-section-title"]}>Platform Insights</h3>
            <div className={styles["report-insights"]}>
              <div className={styles["insight-item"]}>
                <strong>Application Status:</strong>
                <p>
                  {counts.pendingCount > 0
                    ? `There are currently ${counts.pendingCount} complete application(s) pending review.`
                    : "All applications have been reviewed."}
                </p>
              </div>
              <div className={styles["insight-item"]}>
                <strong>Service Provider Network:</strong>
                <p>The platform has {counts.activeCount} active service provider(s) available.</p>
              </div>
              <div className={styles["insight-item"]}>
                <strong>Approval Efficiency:</strong>
                <p>Applications are being approved in an average of {counts.avgApprovalTime}.</p>
              </div>
            </div>
          </div>

          {/* Recommended Actions */}
          <div className={styles["report-section"]}>
            <h3 className={styles["report-section-title"]}>Recommended Actions</h3>
            <div className={styles["action-items-list"]}>
              {counts.pendingCount > 0 && (
                <div className={styles["action-item"]}>
                  <span className={`${styles["action-priority"]} ${styles["pending"]}`}>Pending</span>
                  <span className={styles["action-text"]}>
                    Review {counts.pendingCount} pending application(s) to maintain quality standards.
                  </span>
                </div>
              )}
              {counts.pendingCount === 0 && (
                <div className={styles["action-item"]}>
                  <span className={`${styles["action-priority"]} ${styles["completed"]}`}>Completed</span>
                  <span className={styles["action-text"]}>
                    All applications reviewed - No pending items.
                  </span>
                </div>
              )}
              {counts.activeCount < 10 && (
                <div className={styles["action-item"]}>
                  <span className={`${styles["action-priority"]} ${styles["info"]}`}>Info</span>
                  <span className={styles["action-text"]}>
                    Consider marketing initiatives to attract more service providers.
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer with Download Button */}
        <div className={styles["report-modal-footer"]}>
          <button
            className={styles["btn-download-pdf"]}
            onClick={generatePDF}
            disabled={isGeneratingPDF}
          >
            <FaDownload size={14} />
            <span>{isGeneratingPDF ? "Generating PDF..." : "Download as PDF"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};