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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminProfile();
    fetchDashboardCounts();
  }, []);

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

  // Helpers

  const formatDate = (dateString: string | null) => {
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
        <button className="generate-report-btn" onClick={handleGenerateReport} disabled>
          <FaFileAlt size={16} />
          <span>Generate Admin Report</span>
        </button>
      </div>

      {/* KPI cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper pending">
            <FaStore size={24} />
          </div>
          <div className="stat-content">
            <h3>{pendingCount}</h3>
            <span>Pending Approvals</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper active">
            <FaCheckCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>{activeCount}</h3>
            <span>Active Listings</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper rejected">
            <FaTimesCircle size={24} />
          </div>
          <div className="stat-content">
            <h3>{rejectedCount}</h3>
            <span>Rejected Listings</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper info">
            <FaClock size={24} />
          </div>
          <div className="stat-content">
            <h3>{avgApprovalTime}</h3>
            <span>Avg. Approval Time</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper users">
            <FaUsers size={24} />
          </div>
          <div className="stat-content">
            <h3>{totalUsers}</h3>
            <span>Total Users</span>
          </div>
        </div>
      </div>
    </main>
    </div>
  );
}