'use client';

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { 
  FaBell, 
  FaUserCircle, 
  FaSignOutAlt, 
  FaStore, 
  FaCalendarAlt,
  FaUser,
  FaBars,
  FaTimes
} from "react-icons/fa";
import brandIcon from "../app/icon.png";

export default function HeaderLoggedIn() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pathname = usePathname();
  
  const [showNotif, setShowNotif] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const desktopNotifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return;

        // Fetch User Profile Role
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, role") 
          .eq("id", user.id)
          .single();
        setProfile(profileData);

        // Fetch Notifications
        const { data: notifData } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        
        setNotifications(notifData || []);
      } catch (err) {
        console.error("Auth fetch error:", err);
      }
    };

    fetchData();
  }, [supabase]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const outsideDesktop = desktopNotifRef.current && !desktopNotifRef.current.contains(e.target as Node);
      const outsideMobile = mobileNotifRef.current && !mobileNotifRef.current.contains(e.target as Node);
      
      if (outsideDesktop && outsideMobile) {
        setShowNotif(false);
      }

      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userRole = profile?.role; // 'pet_owner', 'service_provider', 'both', 'admin'

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("token");
    router.push("/");
  };

  const handleNavClick = (path: string) => {
    setShowMobileMenu(false);
    setShowMenu(false);
    router.push(path);
  };

  const NotificationDropdown = () => (
    <div className="dropdown notif-dropdown">
      <div className="notif-header">
        <h3>Notifications</h3>
      </div>
      <div className="notif-list">
        {notifications.length > 0 ? (
          notifications.map((n, index) => (
            <div key={n.id} className={`notif-item ${!n.read ? "unread" : ""}`}>
              <div className="notif-content">
                <span className="notif-title">{n.title}</span>
                <p className="notif-message">{n.message}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="no-notif-empty">
            <p>All caught up!</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <header className="site-header">
      <div className="header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* Left Side: Notification Icon, Role Button, Profile Icon */}
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          {/* Notification Icon */}
          <div ref={desktopNotifRef} className="notif-wrapper">
            <button className="icon-btn" onClick={() => setShowNotif(!showNotif)}>
              <FaBell className="icon" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="notif-badge">{notifications.filter(n => !n.read).length}</span>
              )}
            </button>
            {showNotif && <NotificationDropdown />}
          </div>

          {/* Role-Specific Action Buttons */}
          {userRole === 'pet_owner' && (
            <button className="header-action-btn" onClick={() => router.push("/service_provider/onboarding")}>
              Become a Service Provider
            </button>
          )}

          {userRole === 'service_provider' && (
            <button className="header-action-btn" onClick={() => router.push("/pet_owner/onboarding")}>
              Become a Pet Owner
            </button>
          )}

          {userRole === 'both' && (
            <button className="header-action-btn" onClick={() => router.push("/switch-business")}>
              Switch to Business
            </button>
          )}

          {/* Profile Icon & Dropdown */}
          <div ref={menuRef} className="profile-wrapper" style={{ position: 'relative' }}>
            <button className="icon-btn profile-icon-btn" onClick={() => setShowMenu(!showMenu)}>
              <FaUserCircle className="icon" />
            </button>
            
            {showMenu && (
              <div className="dropdown profile-dropdown" style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '8px 0', minWidth: '180px', zIndex: 100 }}>
                <p className="user-name" style={{ padding: '8px 16px', fontWeight: 'bold', borderBottom: '1px solid #eee', color: '#333' }}>
                  Hi, {profile?.first_name || "User"}
                </p>

                {/* Manage Account (All roles) */}
                <button className="menu-item-btn" onClick={() => handleNavClick("/auth/manage_account/profile")} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: '#333' }}>
                  <FaUser /> Manage Account
                </button>

                {/* Manage Listing (Service Provider & Both) */}
                {(userRole === 'service_provider' || userRole === 'both') && (
                  <button className="menu-item-btn" onClick={() => handleNavClick("/service_provider/manage_listing/ViewListing")} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: '#333' }}>
                    <FaStore /> Manage Listing
                  </button>
                )}

                {/* Manage Bookings (Pet Owner & Both) */}
                {(userRole === 'pet_owner' || userRole === 'both') && (
                  <button className="menu-item-btn" onClick={() => handleNavClick("/pet_owner/manage_bookings/po_dashboard")} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: '#333' }}>
                    <FaCalendarAlt /> Manage Booking
                  </button>
                )}

                {/* Log Out */}
                <button className="logout-btn" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: '#ef4444', borderTop: '1px solid #eee' }}>
                  <FaSignOutAlt /> Log out
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Logo */}
        <div className="header-right logo-container">
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <img 
              src={brandIcon.src} 
              alt="Furlink Brand Logo" 
              style={{ width: '60px', height: '60px', objectFit: 'contain' }} 
            />
          </Link>
        </div>

      </div>
    </header>
  );
}