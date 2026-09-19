'use client';

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  FaUserCircle,
  FaSignOutAlt,
  FaStore,
  FaCalendarAlt,
  FaPaw,
  FaUser,
  FaBars,
  FaTimes,
  FaBell
} from "react-icons/fa";
import brandIcon from "../app/icon.png";
import { ROUTES } from "@/config/routes";
import NotificationsDropdown from "./NotificationsDropdown";

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
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [homeRoute, setHomeRoute] = useState<string>(ROUTES.HOME);
  const [registrationStatus, setRegistrationStatus] = useState<string | null | undefined>(undefined);

  const desktopNotifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add("logged-in-page");

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
          if (role === 'service_provider' || role === 'both_sp_po') {
            const { data: spInfo } = await supabase
              .from("sp_general_info")
              .select("registration_status")
              .eq("profiles_id", user.id)
              .maybeSingle();

            const status = spInfo ? spInfo.registration_status : null;
            setRegistrationStatus(status);

            if (status === 'approved') {
              setHomeRoute(ROUTES.SERVICE_PROVIDER.SUMMARY_DASHBOARD);
            } else {
              setHomeRoute(ROUTES.SERVICE_PROVIDER.ONBOARDING);
            }
          } else if (role === 'pet_owner') {
            setHomeRoute(ROUTES.PET_OWNER.DASHBOARD);
          } else if (role === 'admin') {
            setHomeRoute(ROUTES.ADMIN.ADMIN_DASHBOARD);
          }
        }
      } catch (err) {
        console.error("Auth fetch error:", err);
      }
    };

    fetchData();

    return () => {
      document.body.classList.remove("logged-in-page");
    };
  }, [supabase]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isActive = true;

    const fetchUnreadCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isActive) return;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (!error && count !== null && isActive) {
        setUnreadCount(count);
      }
    };

    fetchUnreadCount();

    const setupRealtimeBadge = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isActive) return;

      const topic = `header-notifications-${user.id}`;
      const stale = supabase.getChannels().find((c) => c.topic === `realtime:${topic}`);
      if (stale) {
        await supabase.removeChannel(stale);
      }

      if (!isActive) return;

      channel = supabase
        .channel(topic)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            setUnreadCount((prev) => prev + 1);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();
    };

    setupRealtimeBadge();

    return () => {
      isActive = false;
      if (channel) supabase.removeChannel(channel);
    };
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
  const isBoth = userRole === 'both_sp_po';
  const isServiceProvider = userRole === 'service_provider' || isBoth;
  const isPetOwner = userRole === 'pet_owner' || isBoth;

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');

  const isCurrentlyServiceProvider =
    pathname === ROUTES.SERVICE_PROVIDER.SUMMARY_DASHBOARD ||
    pathname === ROUTES.SERVICE_PROVIDER.MANAGE_LISTING ||
    pathname === ROUTES.SERVICE_PROVIDER.EDIT_LISTING ||
    pathname === ROUTES.SERVICE_PROVIDER.EDIT_BUSINESS_INFO;

  const handleLogout = async () => {
    document.body.classList.remove("logged-in-page");
    await supabase.auth.signOut();
    localStorage.removeItem("token");
    router.push(ROUTES.HOME);
  };

  const handleNavClick = (path: string) => {
    setShowMobileMenu(false);
    setShowMenu(false);
    router.push(path);
  };

  const handleActionClick = async () => {
    setShowMobileMenu(false);
    setShowMenu(false);

    if (userRole === 'pet_owner') {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push(ROUTES.SERVICE_PROVIDER.ONBOARDING);
          return;
        }

        const { data: spInfo } = await supabase
          .from("sp_general_info")
          .select("registration_status")
          .eq("profiles_id", user.id)
          .maybeSingle();

        if (!spInfo) {
          router.push(ROUTES.SERVICE_PROVIDER.ONBOARDING);
        } else {
          const status = spInfo.registration_status;
          if (status === 'pending' || status === 'rejected') {
            router.push(ROUTES.SERVICE_PROVIDER.ONBOARDING);
          } else {
            router.push(ROUTES.SERVICE_PROVIDER.SUMMARY_DASHBOARD);
          }
        }
      } catch (err) {
        console.error("Error checking sp status:", err);
        router.push(ROUTES.SERVICE_PROVIDER.ONBOARDING);
      }
      return;
    }

    if (userRole === 'service_provider') {
      if (registrationStatus === 'pending' || registrationStatus === 'rejected' || registrationStatus === null) {
        router.push(ROUTES.SERVICE_PROVIDER.ONBOARDING);
      } else {
        router.push(ROUTES.AUTH.MANAGE_ACCOUNT);
      }
      return;
    }

    if (isBoth) {
      if (registrationStatus === 'pending' || registrationStatus === 'rejected') {
        return null;
      }

      if (isCurrentlyServiceProvider) {
        router.push(ROUTES.PET_OWNER.DASHBOARD);
      } else {
        if (registrationStatus === 'pending' || registrationStatus === 'rejected' || registrationStatus === null) {
          router.push(ROUTES.SERVICE_PROVIDER.ONBOARDING);
        } else {
          router.push(ROUTES.SERVICE_PROVIDER.SUMMARY_DASHBOARD);
        }
      }
    }
  };

  const RoleActionButton = () => {
    if (userRole === 'pet_owner') {
      if (registrationStatus === 'pending' || registrationStatus === 'rejected') {
        return null;
      }
      return (
        <button className="header-action-btn-outline" onClick={handleActionClick}>
          Become a Service Provider
        </button>
      );
    }

    if (userRole === 'service_provider') {
      if (registrationStatus === 'pending' || registrationStatus === 'rejected') {
        return null;
      }
      let buttonText = registrationStatus === 'approved' ? "Become a Pet Owner" : "Register Now!";
      return (
        <button className="header-action-btn-outline" onClick={handleActionClick}>
          {buttonText}
        </button>
      );
    }

    if (isBoth) {
      if (registrationStatus === 'pending' || registrationStatus === 'rejected') {
        return null;
      }

      let buttonText = isCurrentlyServiceProvider ? "Switch to Pet Owner" : "Switch to Business";
      if (registrationStatus === null) {
        buttonText = "Become a service provider";
      }

      return (
        <button className="header-action-btn" onClick={handleActionClick}>
          {buttonText}
        </button>
      );
    }

    return null;
  };

  const ProfileMenuItems = ({ onNavigate }: { onNavigate: (path: string) => void }) => (
    <>
      {pathname !== ROUTES.AUTH.MANAGE_ACCOUNT && (
        <button className="profile-dropdown-item" onClick={() => onNavigate(ROUTES.AUTH.MANAGE_ACCOUNT)}>
          <FaUser /> <span>Manage Account</span>
        </button>
      )}

      {isServiceProvider && pathname !== ROUTES.SERVICE_PROVIDER.MANAGE_LISTING && (
        <button className="profile-dropdown-item" onClick={() => onNavigate(ROUTES.SERVICE_PROVIDER.MANAGE_LISTING)}>
          <FaStore /> <span>Manage Listing</span>
        </button>
      )}

      {isPetOwner && (
        <>
          {pathname !== ROUTES.PET_OWNER.MANAGE_BOOKING && (
            <button className="profile-dropdown-item" onClick={() => onNavigate(ROUTES.PET_OWNER.MANAGE_BOOKING)}>
              <FaCalendarAlt /> <span>Manage Bookings</span>
            </button>
          )}
          {pathname !== ROUTES.PET_OWNER.MANAGE_PET && (
            <button className="profile-dropdown-item" onClick={() => onNavigate(ROUTES.PET_OWNER.MANAGE_PET)}>
              <FaPaw /> <span>Manage Pet</span>
            </button>
          )}
        </>
      )}
    </>
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
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
              {showNotif && <NotificationsDropdown onClose={() => setShowNotif(false)} />}
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
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
              {showNotif && <NotificationsDropdown onClose={() => setShowNotif(false)} />}
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
              <p className="drawer-hi">Hi,</p>
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