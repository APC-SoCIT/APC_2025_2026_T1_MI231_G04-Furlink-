"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaStore,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUsers,
  FaArrowRight,
  FaFileAlt,
  FaTimes,
  FaDownload,
} from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import { ROUTES } from "@/config/routes";

type FilterType = "pending" | "active" | "rejected" | "users" | null;
type UserRoleFilter = "all" | "pet_owner" | "service_provider" | "both";

interface DateRange {
  start: string;
  end: string;
}

interface SavedFilters {
  currentFilter: FilterType;
  userRoleFilter: UserRoleFilter;
  dateRange: DateRange;
}

interface ProviderRow {
  id: string;
  business_name: string;
  business_city: string | null;
  business_province: string | null;
  registration_status: string;
  created_at: string | null;
  updated_at: string | null;
  registration_approved_at?: string | null;
}

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  mobile_number: string | null;
  role: string | null;
  created_at: string | null;
}

const FILTERS_STORAGE_KEY = "adminDashboardFilters";

const DEFAULT_FILTERS: SavedFilters = {
  currentFilter: "pending",
  userRoleFilter: "all",
  dateRange: { start: "", end: "" },
};

// --- FILTRS ---
const loadSavedFilters = (): SavedFilters => {
  try {
    const saved = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        currentFilter: parsed.currentFilter ?? DEFAULT_FILTERS.currentFilter,
        userRoleFilter: parsed.userRoleFilter ?? DEFAULT_FILTERS.userRoleFilter,
        dateRange: parsed.dateRange ?? DEFAULT_FILTERS.dateRange,
      };
    }
  } catch (err) {
    console.error("Error loading saved filters:", err);
  }
  return DEFAULT_FILTERS;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement>(null);

  // --- HEADER ---
  const [adminName, setAdminName] = useState("Admin");

  // --- KPI cards ---
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [avgApprovalTime, setAvgApprovalTime] = useState("-");
  const [totalUsers, setTotalUsers] = useState(0);

  // --- PENDING APPROVALS LIST ---
  const [currentFilter, setCurrentFilter] = useState<FilterType>(
    DEFAULT_FILTERS.currentFilter
  );

  // --- USER ROLE FILTER ---
  const [userRoleFilter, setUserRoleFilter] = useState<UserRoleFilter>(
    DEFAULT_FILTERS.userRoleFilter
  );

  // --- SHARED DATE RANGE FILTER ---
  const [dateRange, setDateRange] = useState<DateRange>(
    DEFAULT_FILTERS.dateRange
  );

  const [filtersRestored, setFiltersRestored] = useState(false);

  const [tableData, setTableData] = useState<(ProviderRow | UserRow)[]>([]);
  const [loading, setLoading] = useState(true);

  // --- REPORT MODAL / PDF EXPORT ---
  const [showReportModal, setShowReportModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    fetchAdminProfile();
    fetchDashboardCounts();

    // Restore filter/tab user is on
    const saved = loadSavedFilters();
    setCurrentFilter(saved.currentFilter);
    setUserRoleFilter(saved.userRoleFilter);
    setDateRange(saved.dateRange);
    setFiltersRestored(true);
  }, []);

  // Filrer persistence
  useEffect(() => {
    if (!filtersRestored) return;
    sessionStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({ currentFilter, userRoleFilter, dateRange })
    );
  }, [currentFilter, userRoleFilter, dateRange, filtersRestored]);

  // Fetch list when card/user role filter changes
  useEffect(() => {
    if (!filtersRestored) return;
    if (currentFilter === "pending") {
      fetchPendingList();
    } else if (currentFilter === "active") {
      fetchActiveList();
    } else if (currentFilter === "rejected") {
      fetchRejectedList();
    } else if (currentFilter === "users") {
      fetchUsersList();
    }
  }, [currentFilter, userRoleFilter, filtersRestored]);

  // Refetch the provider tabs when date changes
  useEffect(() => {
    if (!filtersRestored) return;
    if (currentFilter === "pending") {
      fetchPendingList();
    } else if (currentFilter === "active") {
      fetchActiveList();
    } else if (currentFilter === "rejected") {
      fetchRejectedList();
    }
  }, [dateRange, filtersRestored]);

  //Fetch the functions
  const fetchAdminProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();

      if (data) setAdminName(data.first_name);
    }
  };

  const fetchDashboardCounts = async () => {
    try {
      // Pending
      const { count: pending } = await supabase
        .from("sp_general_info")
        .select("id, sp_services!inner(id)", { count: "exact", head: true })
        .eq("registration_status", "pending");

      const { count: approved } = await supabase
        .from("sp_general_info")
        .select("*", { count: "exact", head: true })
        .eq("registration_status", "approved");

      const { count: rejected } = await supabase
        .from("sp_general_info")
        .select("*", { count: "exact", head: true })
        .eq("registration_status", "rejected");

      // profiles
      const { count: users } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .neq("role", "admin");

      // Average approval time
      const { data: approvals } = await supabase
        .from("sp_general_info")
        .select("created_at, registration_approved_at")
        .eq("registration_status", "approved")
        .not("registration_approved_at", "is", null);

      let avgStr = "-";
      if (approvals && approvals.length > 0) {
        const totalMs = approvals.reduce((sum, row) => {
          const start = new Date(row.created_at).getTime();
          const end = new Date(row.registration_approved_at).getTime();
          return sum + (end - start);
        }, 0);

        const avgMs = totalMs / approvals.length;
        const totalHours = avgMs / (1000 * 60 * 60);

        if (totalHours < 1) {
          avgStr = "< 1 hr";
        } else if (totalHours < 24) {
          avgStr = `${totalHours.toFixed(1)} hrs`;
        } else {
          const days = Math.floor(totalHours / 24);
          const remainingHours = Math.round(totalHours % 24);
          avgStr = `${days}d ${remainingHours}h`;
        }
      }

      setPendingCount(pending || 0);
      setActiveCount(approved || 0);
      setRejectedCount(rejected || 0);
      setTotalUsers(users || 0);
      setAvgApprovalTime(avgStr);
    } catch (err) {
      console.error("Error fetching dashboard counts:", err);
    }
  };

  //Fetch just the pending (complete applications) list
  const fetchPendingList = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sp_general_info")
        .select(
          "id, business_name, business_city, business_province, registration_status, created_at, updated_at, sp_services!inner(id)"
        )
        .eq("registration_status", "pending");

      // Shared date range filter (based on created_at)
      if (dateRange.start) {
        query = query.gte("created_at", dateRange.start);
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setUTCHours(23, 59, 59, 999);
        query = query.lte("created_at", endDate.toISOString());
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (!error) setTableData(data || []);
    } catch (err) {
      console.error("Error fetching pending list:", err);
    } finally {
      setLoading(false);
    }
  };

  //Fetch just the active (approved) listings
  const fetchActiveList = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sp_general_info")
        .select(
          "id, business_name, business_city, business_province, registration_status, created_at, updated_at, registration_approved_at"
        )
        .eq("registration_status", "approved");

      // Shared date range filter (based on registration_approved_at)
      if (dateRange.start) {
        query = query.gte("registration_approved_at", dateRange.start);
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setUTCHours(23, 59, 59, 999);
        query = query.lte("registration_approved_at", endDate.toISOString());
      }

      const { data, error } = await query.order("registration_approved_at", {
        ascending: false,
      });

      if (!error) setTableData(data || []);
    } catch (err) {
      console.error("Error fetching active list:", err);
    } finally {
      setLoading(false);
    }
  };

  //Fetch just the rejected listings
  const fetchRejectedList = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sp_general_info")
        .select(
          "id, business_name, business_city, business_province, registration_status, created_at, updated_at"
        )
        .eq("registration_status", "rejected");

      // Shared date range filter (based on updated_at)
      if (dateRange.start) {
        query = query.gte("updated_at", dateRange.start);
      }
      if (dateRange.end) {
        const endDate = new Date(dateRange.end);
        endDate.setUTCHours(23, 59, 59, 999);
        query = query.lte("updated_at", endDate.toISOString());
      }

      const { data, error } = await query.order("updated_at", { ascending: false });

      if (!error) setTableData(data || []);
    } catch (err) {
      console.error("Error fetching rejected list:", err);
    } finally {
      setLoading(false);
    }
  };

  //Fetch just the registred users list
  const fetchUsersList = async () => {
    setLoading(true);
    setTableData([]);

    try {
      let query = supabase
        .from("profiles")
        .select("id, first_name, last_name, username, mobile_number, role, created_at")
        .neq("role", "admin");

      // Apply role filter if not "all"
      if (userRoleFilter === "both") {
        query = query.in("role", ["pet_owner", "service_provider"]);
      } else if (userRoleFilter !== "all") {
        query = query.eq("role", userRoleFilter);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (!error) {
        setTableData(data || []);
      } else {
        console.error("Supabase error:", JSON.stringify(error, null, 2));
        setTableData([]);
      }
    } catch (err) {
      console.error("Error fetching users list:", err);
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  // Helpers

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleGenerateReport = () => {
    setShowReportModal(true);
  };

  const handleCardClick = (filter: FilterType) => {
    setCurrentFilter(filter);
  };

  const handleDateRangeChange = (field: "start" | "end", value: string) => {
    setDateRange((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearDateRangeHandler = () => {
    setDateRange({ start: "", end: "" });
  };

  const getListTitle = () => {
    switch (currentFilter) {
      case "pending":
        return "Pending Approvals (Complete Applications)";
      case "active":
        return "Active Listings";
      case "rejected":
        return "Rejected Listings";
      case "users":
        return "Registered Users";
      default:
        return "";
    }
  };

  // --- PDF GENERATION ---
  const generatePDF = async () => {
    if (!reportRef.current) return;

    setIsGeneratingPDF(true);

    try {
      // Create a clone of the report content to manipulate for PDF
      const reportContent = reportRef.current;
      const clone = reportContent.cloneNode(true) as HTMLDivElement;

      // Apply PDF-specific styling
      clone.style.width = "210mm"; // A4 width
      clone.style.padding = "20px";
      clone.style.backgroundColor = "white";
      clone.style.position = "absolute";
      clone.style.left = "-9999px";
      clone.style.top = "0";

      document.body.appendChild(clone);

      // Generate from the cloned element
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Remove clone
      document.body.removeChild(clone);

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 w in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Create PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 297; // A4 size

      // Add more page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      // Generate filename with current date
      const dateStr = new Date()
        .toLocaleDateString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replace(/\//g, "-");

      const filename = `Admin_Dashboard_Report_${dateStr}.pdf`;

      // Save the PDF
      pdf.save(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className={styles["admin-dashboard-page"]}>
      <main className={styles["admin-dashboard-wrapper"]}>
        <div className={styles["admin-header-center"]}>
          <h1>Hi, {adminName}!</h1>
          <p>Here is your daily overview.</p>
        </div>

        {/* Date and Generate report btn */}
        <div className={styles["report-button-container"]}>
          <div className={styles["as-of-date"]}>
            As of{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <button
            className={styles["generate-report-btn"]}
            onClick={handleGenerateReport}
          >
            <FaFileAlt size={16} />
            <span>Generate Admin Report</span>
          </button>
        </div>

        {/* KPI cards */}
        <div className={styles["stats-grid"]}>
          <div
            className={`${styles["stat-card"]} ${
              currentFilter === "pending" ? styles["active-filter"] : ""
            }`}
            onClick={() => handleCardClick("pending")}
          >
            <div className={`${styles["stat-icon-wrapper"]} ${styles["pending"]}`}>
              <FaStore size={24} />
            </div>
            <div className={styles["stat-content"]}>
              <h3>{pendingCount}</h3>
              <span>Pending Approvals</span>
            </div>
          </div>

          <div
            className={`${styles["stat-card"]} ${
              currentFilter === "active" ? styles["active-filter"] : ""
            }`}
            onClick={() => handleCardClick("active")}
          >
            <div className={`${styles["stat-icon-wrapper"]} ${styles["active"]}`}>
              <FaCheckCircle size={24} />
            </div>
            <div className={styles["stat-content"]}>
              <h3>{activeCount}</h3>
              <span>Active Listings</span>
            </div>
          </div>

          <div
            className={`${styles["stat-card"]} ${
              currentFilter === "rejected" ? styles["active-filter"] : ""
            }`}
            onClick={() => handleCardClick("rejected")}
          >
            <div className={`${styles["stat-icon-wrapper"]} ${styles["rejected"]}`}>
              <FaTimesCircle size={24} />
            </div>
            <div className={styles["stat-content"]}>
              <h3>{rejectedCount}</h3>
              <span>Rejected Listings</span>
            </div>
          </div>

          <div className={`${styles["stat-card"]} ${styles["non-clickable"]}`}>
            <div className={`${styles["stat-icon-wrapper"]} ${styles["info"]}`}>
              <FaClock size={24} />
            </div>
            <div className={styles["stat-content"]}>
              <h3>{avgApprovalTime}</h3>
              <span>Avg. Approval Time</span>
            </div>
          </div>

          <div
            className={`${styles["stat-card"]} ${
              currentFilter === "users" ? styles["active-filter"] : ""
            }`}
            onClick={() => handleCardClick("users")}
          >
            <div className={`${styles["stat-icon-wrapper"]} ${styles["users"]}`}>
              <FaUsers size={24} />
            </div>
            <div className={styles["stat-content"]}>
              <h3>{totalUsers}</h3>
              <span>Total Users</span>
            </div>
          </div>
        </div>

        {/* List shows the currently selected card's data (defaults to Pending) */}
        {currentFilter && (
          <div className={styles["dashboard-list-container"]}>
            <div className={styles["list-header"]}>
              <h2 className={styles["list-title"]}>{getListTitle()}</h2>

              {/* --- USER ROLE FILTER --- */}
              {currentFilter === "users" && (
                <div className={styles["user-filter-group"]}>
                  <button
                    className={`${styles["filter-btn"]} ${
                      userRoleFilter === "all" ? styles["active"] : ""
                    }`}
                    onClick={() => setUserRoleFilter("all")}
                  >
                    All
                  </button>
                  <button
                    className={`${styles["filter-btn"]} ${
                      userRoleFilter === "pet_owner" ? styles["active"] : ""
                    }`}
                    onClick={() => setUserRoleFilter("pet_owner")}
                  >
                    Pet Owner
                  </button>
                  <button
                    className={`${styles["filter-btn"]} ${
                      userRoleFilter === "service_provider" ? styles["active"] : ""
                    }`}
                    onClick={() => setUserRoleFilter("service_provider")}
                  >
                    Service Provider
                  </button>
                  <button
                    className={`${styles["filter-btn"]} ${
                      userRoleFilter === "both" ? styles["active"] : ""
                    }`}
                    onClick={() => setUserRoleFilter("both")}
                  >
                    Both
                  </button>
                </div>
              )}

              {/* --- DATE RANGE FILTER FOR SERVICE PROVIDER TABS --- */}
              {currentFilter !== "users" && (
                <div className={styles["date-range-filter"]}>
                  <div className={styles["date-inputs-group"]}>
                    <div className={styles["date-input-wrapper"]}>
                      <label className={styles["date-label"]}>From:</label>
                      <input
                        type="date"
                        className={styles["date-input"]}
                        value={dateRange.start}
                        onChange={(e) => handleDateRangeChange("start", e.target.value)}
                        max={dateRange.end || new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className={styles["date-input-wrapper"]}>
                      <label className={styles["date-label"]}>To:</label>
                      <input
                        type="date"
                        className={styles["date-input"]}
                        value={dateRange.end}
                        onChange={(e) => handleDateRangeChange("end", e.target.value)}
                        min={dateRange.start}
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    {(dateRange.start || dateRange.end) && (
                      <button
                        className={styles["clear-dates-btn"]}
                        onClick={clearDateRangeHandler}
                        title="Clear date range"
                      >
                        Clear Dates
                      </button>
                    )}
                  </div>
                  {(dateRange.start || dateRange.end) && (
                    <div className={styles["active-filter-indicator"]}>
                      <span className={styles["filter-active-dot"]}></span>
                      <span className={styles["filter-active-text"]}>Date filter active</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles["providers-table-wrapper"]}>
              {loading ? (
                <div className={styles["loading-state"]}>Loading data...</div>
              ) : tableData.length === 0 ? (
                <div className={styles["empty-state"]}>
                  No records found for this category.
                </div>
              ) : (
                <table className={styles["providers-table"]}>
                  <thead>
                    {currentFilter === "users" ? (
                      <tr>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Username</th>
                        <th>Contact Number</th>
                        <th>Role</th>
                        <th>Action</th>
                      </tr>
                    ) : (
                      <tr>
                        <th>Business Name</th>
                        <th>Location</th>
                        <th>
                          Date{" "}
                          {currentFilter === "pending"
                            ? "Submitted"
                            : currentFilter === "active"
                            ? "Approved"
                            : "Updated"}
                        </th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    )}
                  </thead>

                  <tbody>
                    {currentFilter === "users"
                      ? (tableData as UserRow[]).map((item) => (
                          <tr key={item.id}>
                            <td className={styles["fw-bold"]}>{item.first_name || "-"}</td>
                            <td className={styles["fw-bold"]}>{item.last_name || "-"}</td>
                            <td>{item.username || "-"}</td>
                            <td>{item.mobile_number || "-"}</td>
                            <td style={{ textTransform: "capitalize" }}>
                              {item.role ? item.role.replace(/_/g, " ") : "-"}
                            </td>
                            <td>
                              <button
                                className={styles["btn-view-details"]}
                                onClick={() => router.push(`${ROUTES.ADMIN.PO_DETAILS}?id=${item.id}`)}
                              >
                                View Details{" "} <FaArrowRight size={12} style={{ marginLeft: 5 }} />
                              </button>
                            </td>
                          </tr>
                        ))
                      : (tableData as ProviderRow[]).map((item) => (
                          <tr key={item.id}>
                            <td className={styles["fw-bold"]}>{item.business_name}</td>
                            <td>
                              {item.business_city}
                              {item.business_city && item.business_province ? ", " : ""}
                              {item.business_province}
                            </td>
                            <td>
                              {formatDate(
                                currentFilter === "pending"
                                  ? item.created_at
                                  : currentFilter === "active"
                                  ? item.registration_approved_at
                                  : item.updated_at
                              )}
                            </td>
                            <td>
                              <span
                                className={`${styles["status-pill"]} ${styles[item.registration_status]}`}
                              >
                                {item.registration_status}
                              </span>
                            </td>
                            <td>
                              <button
                                className={styles["btn-view-details"]}
                                onClick={() => router.push(`${ROUTES.ADMIN.SP_DETAILS}?id=${item.id}`)}
                              >
                                View Details{" "} <FaArrowRight size={12} style={{ marginLeft: 5 }} />
                              </button>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* --- ADMIN REPORT MODAL --- */}
        {showReportModal && (
          <div
            className={styles["report-modal-overlay"]}
            onClick={() => setShowReportModal(false)}
          >
            <div
              className={styles["report-modal-content"]}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={styles["report-modal-header"]}>
                <div className={styles["report-header-title"]}>
                  <FaFileAlt size={20} />
                  <h2>Admin Dashboard Report</h2>
                </div>
                <button
                  className={styles["modal-close-btn"]}
                  onClick={() => setShowReportModal(false)}
                >
                  <FaTimes />
                </button>
              </div>

              {/* Modal Body */}
              <div className={styles["report-modal-body"]} ref={reportRef}>
                {/* Report Header Info */}
                <div className={styles["report-info-section"]}>
                  <div className={styles["report-info-row"]}>
                    <span className={styles["report-label"]}>Report Generated:</span>
                    <span className={styles["report-value"]}>
                      {new Date().toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {(dateRange.start || dateRange.end) && (
                    <div className={styles["report-info-row"]}>
                      <span className={styles["report-label"]}>Date Filter Applied:</span>
                      <span className={styles["report-value"]}>
                        {dateRange.start && dateRange.end
                          ? `${new Date(dateRange.start).toLocaleDateString("en-US", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })} - ${new Date(dateRange.end).toLocaleDateString("en-US", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })}`
                          : dateRange.start
                          ? `From ${new Date(dateRange.start).toLocaleDateString("en-US", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })}`
                          : `Until ${new Date(dateRange.end).toLocaleDateString("en-US", {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            })}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Exec Summary */}
                <div className={styles["report-section"]}>
                  <h3 className={styles["report-section-title"]}>Executive Summary</h3>
                  <div className={styles["report-kpi-grid"]}>
                    <div className={styles["report-kpi-item"]}>
                      <span className={styles["report-kpi-label"]}>Pending Approvals</span>
                      <span className={styles["report-kpi-value"]}>{pendingCount}</span>
                      <span className={styles["report-kpi-description"]}>
                        Complete applications awaiting review
                      </span>
                    </div>
                    <div className={styles["report-kpi-item"]}>
                      <span className={styles["report-kpi-label"]}>Active Listings</span>
                      <span className={styles["report-kpi-value"]}>{activeCount}</span>
                      <span className={styles["report-kpi-description"]}>
                        Approved service providers
                      </span>
                    </div>
                    <div className={styles["report-kpi-item"]}>
                      <span className={styles["report-kpi-label"]}>Rejected Listings</span>
                      <span className={styles["report-kpi-value"]}>{rejectedCount}</span>
                      <span className={styles["report-kpi-description"]}>
                        Applications not approved
                      </span>
                    </div>
                    <div className={styles["report-kpi-item"]}>
                      <span className={styles["report-kpi-label"]}>Total Users</span>
                      <span className={styles["report-kpi-value"]}>{totalUsers}</span>
                      <span className={styles["report-kpi-description"]}>
                        Registered platform users
                      </span>
                    </div>
                    <div className={styles["report-kpi-item"]}>
                      <span className={styles["report-kpi-label"]}>Avg Approval Time</span>
                      <span className={styles["report-kpi-value"]}>{avgApprovalTime}</span>
                      <span className={styles["report-kpi-description"]}>
                        Time to approve applications
                      </span>
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
                        {pendingCount > 0
                          ? `There are currently ${pendingCount} complete application${
                              pendingCount !== 1 ? "s" : ""
                            } pending review. ${
                              pendingCount >= 5
                                ? "Consider prioritizing these reviews to maintain platform quality."
                                : ""
                            }`
                          : "All applications have been reviewed. Great work staying on top of approvals!"}
                      </p>
                    </div>

                    <div className={styles["insight-item"]}>
                      <strong>Service Provider Network:</strong>
                      <p>
                        The platform has {activeCount} active service provider
                        {activeCount !== 1 ? "s" : ""} available to pet owners.
                        {rejectedCount > 0 &&
                          ` ${rejectedCount} application${
                            rejectedCount !== 1 ? "s have" : " has"
                          } been rejected.`}
                      </p>
                    </div>

                    <div className={styles["insight-item"]}>
                      <strong>User Base:</strong>
                      <p>
                        Total registered users: {totalUsers}. This includes both pet owners
                        and service providers who are actively using the platform.
                      </p>
                    </div>

                    <div className={styles["insight-item"]}>
                      <strong>Approval Efficiency:</strong>
                      <p>
                        {avgApprovalTime === "-"
                          ? "No approval data available yet. Start reviewing applications to track approval times."
                          : `Applications are being approved in an average of ${avgApprovalTime}. ${
                              avgApprovalTime.includes("< 1")
                                ? "Excellent response time!"
                                : "Consider streamlining the approval process if possible."
                            }`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Items */}
                <div className={styles["report-section"]}>
                  <h3 className={styles["report-section-title"]}>Recommended Actions</h3>
                  <div className={styles["action-items-list"]}>
                    {pendingCount > 0 && (
                      <div className={styles["action-item"]}>
                        <span className={`${styles["action-priority"]} ${styles["pending"]}`}>
                          Pending
                        </span>
                        <span className={styles["action-text"]}>
                          Review {pendingCount} pending application{pendingCount !== 1 ? "s" : ""}{" "}
                          to maintain quality standards
                        </span>
                      </div>
                    )}
                    {pendingCount === 0 && (
                      <div className={styles["action-item"]}>
                        <span className={`${styles["action-priority"]} ${styles["completed"]}`}>
                          Completed
                        </span>
                        <span className={styles["action-text"]}>
                          All applications reviewed - No pending items
                        </span>
                      </div>
                    )}
                    {activeCount < 10 && (
                      <div className={styles["action-item"]}>
                        <span className={`${styles["action-priority"]} ${styles["info"]}`}>
                          Info
                        </span>
                        <span className={styles["action-text"]}>
                          Consider marketing initiatives to attract more service providers
                        </span>
                      </div>
                    )}
                    {rejectedCount > activeCount && (
                      <div className={styles["action-item"]}>
                        <span className={`${styles["action-priority"]} ${styles["warning"]}`}>
                          Alert
                        </span>
                        <span className={styles["action-text"]}>
                          High rejection rate detected - Review approval criteria
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
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
        )}
      </main>
    </div>
  );
}