'use client';

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  FaBell,
  FaUserCircle,
  FaSignOutAlt,
  FaStore,
  FaCalendarAlt,
  FaPaw,
  FaUser,
  FaBars,
  FaTimes
} from "react-icons/fa";
import brandIcon from "../app/icon.png";
import { ROUTES } from "@/config/routes";

type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
};

type Profile = {
  first_name?: string;
  last_name?: string;
  role?: 'pet_owner' | 'service_provider' | 'both_sp_po' | 'admin';
};

export default function HeaderLoggedIn() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pathname = usePathname();

  const [showNotif, setShowNotif] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [homeRoute, setHomeRoute] = useState<string>(ROUTES.HOME);

  const desktopNotifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return;

        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name, role")
          .eq("id", user.id)
          .single();

        setProfile(profileData);

        if (profileData?.role) {
          const role = profileData.role;
          if (role === 'pet_owner' || role === 'both_sp_po') {
            setHomeRoute(ROUTES.PET_OWNER.DASHBOARD); // Evaluates to "/pet_owner/manage_bookings"
          } else if (role === 'service_provider') {
            setHomeRoute(ROUTES.SERVICE_PROVIDER.ONBOARDING); // Evaluates to "/service_provider/manage_listing/onboarding"
          } else if (role === 'admin') {
            setHomeRoute(ROUTES.ADMIN.ADMIN_DASHBOARD);
          }
        }

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

  const userRole = profile?.role;

  // 'both_sp_po' is the only dual-role value your schema allows
  const isBoth = userRole === 'both_sp_po';
  const isServiceProvider = userRole === 'service_provider' || isBoth;
  const isPetOwner = userRole === 'pet_owner' || isBoth;

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("token");
    router.push(ROUTES.HOME);
  };

  const handleNavClick = (path: string) => {
    setShowMobileMenu(false);
    setShowMenu(false);
    router.push(path);
  };

  const handleNotifClick = async (notif: Notification) => {
    try {
      await supabase.from("notifications").update({ read: true }).eq("id", notif.id);
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
      setShowNotif(false);
      router.push(notif.link || ROUTES.PET_OWNER.DASHBOARD);
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const RoleActionButton = () => {
    if (userRole === 'pet_owner') {
      return (
        <button className="header-action-btn-outline" onClick={() => handleNavClick(ROUTES.SERVICE_PROVIDER.ONBOARDING)}>
          Become a Service Provider
        </button>
      );
    }
    if (userRole === 'service_provider') {
      return (
        <button className="header-action-btn-outline" onClick={() => handleNavClick(ROUTES.AUTH.MANAGE_ACCOUNT)}>
          Become a Pet Owner
        </button>
      );
    }
    if (isBoth) {
      const isCurrentlyPetOwner = pathname.includes("/pet_owner");

      return (
        <button className="header-action-btn" onClick={() => handleNavClick(ROUTES.SHARED.SWITCH_BUSINESS)}>
          {isCurrentlyPetOwner ? "Switch to Business" : "Switch to Pet Owner"}
        </button>
      );
    }
    return null;
  };

  const ProfileMenuItems = ({ onNavigate }: { onNavigate: (path: string) => void }) => (
    <>
      <button className="profile-dropdown-item" onClick={() => onNavigate(ROUTES.AUTH.MANAGE_ACCOUNT)}>
        <FaUser /> <span>Manage Account</span>
      </button>

      {isServiceProvider && (
        <button className="profile-dropdown-item" onClick={() => onNavigate(ROUTES.SERVICE_PROVIDER.MANAGE_LISTING)}>
          <FaStore /> <span>Manage Listing</span>
        </button>
      )}

      {isPetOwner && (
        <>
          <button className="profile-dropdown-item" onClick={() => onNavigate(ROUTES.PET_OWNER.DASHBOARD)}>
            <FaCalendarAlt /> <span>Manage Bookings</span>
          </button>
          <button className="profile-dropdown-item" onClick={() => onNavigate(ROUTES.PET_OWNER.MANAGE_PET)}>
            <FaPaw /> <span>Manage Pet</span>
          </button>
        </>
      )}
    </>
  );

  const NotificationDropdown = () => (
    <div className="notif-dropdown">
      <div className="notif-header">
        <h3>Notifications</h3>
        {unreadCount > 0 && (
          <button className="notif-mark-read" onClick={handleMarkAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>
      <div className="notif-list">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${!n.read ? "unread" : ""}`}
              onClick={() => handleNotifClick(n)}
            >
              <div className="notif-title-row">
                <span className="notif-title">{n.title}</span>
                <span className="notif-date">
                  {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="notif-message">{n.message}</p>
            </div>
          ))
        ) : (
          <div className="notif-empty">All caught up!</div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <header className="site-header">
        <div className="header-container">

          <div className="logo-container">
            <Link href={homeRoute}>
              <img
                src={brandIcon.src}
                alt="Furlink Brand Logo"
                style={{ width: '60px', height: '60px', objectFit: 'contain' }}
              />
            </Link>
          </div>

          <div className="header-right desktop-only-group">
            <RoleActionButton />

            <div ref={desktopNotifRef} className="notif-wrapper">
              <button className="icon-box-btn" onClick={() => setShowNotif(!showNotif)} aria-label="Notifications">
                <FaBell />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>
              {showNotif && <NotificationDropdown />}
            </div>

            <div ref={menuRef} className="profile-menu">
              <button className="icon-box-btn" onClick={() => setShowMenu(!showMenu)} aria-label="Account menu">
                <FaUserCircle />
              </button>

              {showMenu && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-header">Hi, {fullName || "there"}</div>
                  <ProfileMenuItems onNavigate={handleNavClick} />
                  <button className="profile-dropdown-item logout" onClick={handleLogout}>
                    <FaSignOutAlt /> <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="header-right mobile-only-group">
            <div ref={mobileNotifRef} className="notif-wrapper">
              <button className="icon-box-btn" onClick={() => setShowNotif(!showNotif)} aria-label="Notifications">
                <FaBell />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>
              {showNotif && <NotificationDropdown />}
            </div>

            <button className="icon-btn mobile-menu-btn" onClick={() => setShowMobileMenu(true)} aria-label="Open menu">
              <FaBars />
            </button>
          </div>

        </div>
      </header>

      <div className={`mobile-drawer-overlay ${showMobileMenu ? 'active' : ''}`} onClick={() => setShowMobileMenu(false)}></div>
      <div className={`mobile-drawer ${showMobileMenu ? 'active' : ''}`}>
        <div className="mobile-drawer-header">
          <img src={brandIcon.src} alt="Furlink Brand Logo" className="mobile-drawer-logo" />
          <button className="close-drawer-btn" onClick={() => setShowMobileMenu(false)} aria-label="Close menu">
            <FaTimes />
          </button>
        </div>

        <div className="mobile-drawer-content">
          <div className="drawer-user-card">
            <FaUserCircle className="drawer-user-icon" />
            <div>
              <p className="drawer-welcome">Welcome back,</p>
              <p className="drawer-username">{fullName || "there"}</p>
            </div>
          </div>

          {(userRole === 'pet_owner' || userRole === 'service_provider' || isBoth) && (
            <div className="drawer-section">
              <RoleActionButton />
            </div>
          )}

          <div className="drawer-links">
            <ProfileMenuItems onNavigate={handleNavClick} />
          </div>

          <div className="drawer-footer">
            <button className="drawer-logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}