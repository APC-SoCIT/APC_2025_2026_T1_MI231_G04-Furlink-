"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaStore,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUsers,
  FaArrowRight,
  FaFileAlt,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import "./page.css";

type FilterType = "pending" | "active" | "rejected" | "users" | null;

interface ProviderRow {
  id: string;
  business_name: string;
  city: string | null;
  province: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  approved_at?: string | null;
}

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  mobile_number: string | null;
  role: string | null;
  created_at: string | null;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  // --- HEADER ---
  const [adminName, setAdminName] = useState("Admin");

  // --- KPI cards ---
  const [pendingCount, setPendingCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [avgApprovalTime, setAvgApprovalTime] = useState("-");
  const [totalUsers, setTotalUsers] = useState(0);

  // --- PENDING APPROVALS LIST ---
  const [currentFilter, setCurrentFilter] = useState<FilterType>("pending");
  const [tableData, setTableData] = useState<(ProviderRow | UserRow)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminProfile();
    fetchDashboardCounts();
  }, []);

  //Fetch the list whenever the selected card changes (runs on mount too, since default is "pending")
  useEffect(() => {
    if (currentFilter === "pending") {
      fetchPendingList();
    } else if (currentFilter === "active") {
      fetchActiveList();
    } else if (currentFilter === "rejected") {
      fetchRejectedList();
    } else if (currentFilter === "users") {
      fetchUsersList();
    }
  }, [currentFilter]);

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
        .eq("status", "pending");

      const { count: approved } = await supabase
        .from("sp_general_info")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved");

      const { count: rejected } = await supabase
        .from("sp_general_info")
        .select("*", { count: "exact", head: true })
        .eq("status", "rejected");

      const { count: users } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .neq("role", "admin");

      // Average approval time
      const { data: approvals } = await supabase
        .from("sp_general_info")
        .select("created_at, approved_at")
        .eq("status", "approved")
        .not("approved_at", "is", null);

      let avgStr = "-";
      if (approvals && approvals.length > 0) {
        const totalMs = approvals.reduce((sum, row) => {
          const start = new Date(row.created_at).getTime();
          const end = new Date(row.approved_at).getTime();
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
      const { data, error } = await supabase
        .from("sp_general_info")
        .select(
          "id, business_name, city, province, status, created_at, updated_at, sp_services!inner(id)"
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true });

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
      const { data, error } = await supabase
        .from("sp_general_info")
        .select(
          "id, business_name, city, province, status, created_at, updated_at, approved_at"
        )
        .eq("status", "approved")
        .order("approved_at", { ascending: false });

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
      const { data, error } = await supabase
        .from("sp_general_info")
        .select(
          "id, business_name, city, province, status, created_at, updated_at"
        )
        .eq("status", "rejected")
        .order("updated_at", { ascending: false });

      if (!error) setTableData(data || []);
    } catch (err) {
      console.error("Error fetching rejected list:", err);
    } finally {
      setLoading(false);
    }
  };

  //Fetch just the registered users list
  const fetchUsersList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, display_name, email, mobile_number, role, created_at"
        )
        .neq("role", "admin")
        .order("created_at", { ascending: false });

      if (!error) setTableData(data || []);
    } catch (err) {
      console.error("Error fetching users list:", err);
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
    // for repiort generation
  };

  const handleCardClick = (filter: FilterType) => {
    setCurrentFilter(filter);
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

  return (
    <div className="admin-dashboard-page">
      <main className="admin-dashboard-wrapper">
        <div className="admin-header-center">
          <h1>Hi, {adminName}!</h1>
          <p>Here is your daily overview.</p>
        </div>

        {/* Date and Generate report btn */}
        <div className="report-button-container">
          <div className="as-of-date">
            As of{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <button
            className="generate-report-btn"
            onClick={handleGenerateReport}
            disabled
          >
            <FaFileAlt size={16} />
            <span>Generate Admin Report</span>
          </button>
        </div>

        {/* KPI cards */}
        <div className="stats-grid">
          <div
            className={`stat-card ${
              currentFilter === "pending" ? "active-filter" : ""
            }`}
            onClick={() => handleCardClick("pending")}
          >
            <div className="stat-icon-wrapper pending">
              <FaStore size={24} />
            </div>
            <div className="stat-content">
              <h3>{pendingCount}</h3>
              <span>Pending Approvals</span>
            </div>
          </div>

          <div
            className={`stat-card ${
              currentFilter === "active" ? "active-filter" : ""
            }`}
            onClick={() => handleCardClick("active")}
          >
            <div className="stat-icon-wrapper active">
              <FaCheckCircle size={24} />
            </div>
            <div className="stat-content">
              <h3>{activeCount}</h3>
              <span>Active Listings</span>
            </div>
          </div>

          <div
            className={`stat-card ${
              currentFilter === "rejected" ? "active-filter" : ""
            }`}
            onClick={() => handleCardClick("rejected")}
          >
            <div className="stat-icon-wrapper rejected">
              <FaTimesCircle size={24} />
            </div>
            <div className="stat-content">
              <h3>{rejectedCount}</h3>
              <span>Rejected Listings</span>
            </div>
          </div>

          <div className="stat-card non-clickable">
            <div className="stat-icon-wrapper info">
              <FaClock size={24} />
            </div>
            <div className="stat-content">
              <h3>{avgApprovalTime}</h3>
              <span>Avg. Approval Time</span>
            </div>
          </div>

          <div
            className={`stat-card ${
              currentFilter === "users" ? "active-filter" : ""
            }`}
            onClick={() => handleCardClick("users")}
          >
            <div className="stat-icon-wrapper users">
              <FaUsers size={24} />
            </div>
            <div className="stat-content">
              <h3>{totalUsers}</h3>
              <span>Total Users</span>
            </div>
          </div>
        </div>

        {/* List shows the currently selected card's data (defaults to Pending) */}
        {currentFilter && (
          <div className="dashboard-list-container">
            <div className="list-header">
              <h2 className="list-title">{getListTitle()}</h2>
            </div>

            <div className="providers-table-wrapper">
              {loading ? (
                <div className="loading-state">Loading data...</div>
              ) : tableData.length === 0 ? (
                <div className="empty-state">
                  No records found for this category.
                </div>
              ) : (
                <table className="providers-table">
                  <thead>
                    {currentFilter === "users" ? (
                      <tr>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Display Name</th>
                        <th>Email</th>
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
                            <td className="fw-bold">{item.first_name || "-"}</td>
                            <td className="fw-bold">{item.last_name || "-"}</td>
                            <td>{item.display_name || "N/A"}</td>
                            <td>{item.email || "-"}</td>
                            <td>{item.mobile_number || "-"}</td>
                            <td style={{ textTransform: "capitalize" }}>
                              {item.role ? item.role.replace(/_/g, " ") : "-"}
                            </td>
                            <td>
                              <button className="btn-view-details" disabled>
                                View Details{" "}
                                <FaArrowRight size={12} style={{ marginLeft: 5 }} />
                              </button>
                            </td>
                          </tr>
                        ))
                      : (tableData as ProviderRow[]).map((item) => (
                          <tr key={item.id}>
                            <td className="fw-bold">{item.business_name}</td>
                            <td>
                              {item.city}
                              {item.city && item.province ? ", " : ""}
                              {item.province}
                            </td>
                            <td>
                              {formatDate(
                                currentFilter === "pending"
                                  ? item.created_at
                                  : currentFilter === "active"
                                  ? item.approved_at
                                  : item.updated_at
                              )}
                            </td>
                            <td>
                              <span className={`status-pill ${item.status}`}>
                                {item.status}
                              </span>
                            </td>
                            <td>
                              <button className="btn-view-details" disabled>
                                View Details{" "}
                                <FaArrowRight size={12} style={{ marginLeft: 5 }} />
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
      </main>
    </div>
  );
}