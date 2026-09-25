// src/components/HeaderLoggedIn.tsx
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

const SERVICE_PROVIDER_AREA = "/service_provider";

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
  const [showConfirmModal, setShowConfirmModal] = useState(false); 
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<string | null | undefined>(undefined);

  const desktopNotifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add("logged-in-page");
    return () => {
      document.body.classList.remove("logged-in-page");
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user || !isActive) return;

        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name, role")
          .eq("id", user.id)
          .single();

        if (!profileData || !isActive) return;

        let role: Profile['role'] = profileData.role;
        let status: string | null | undefined = undefined;

        if (role === 'pet_owner' || role === 'service_provider' || role === 'both_sp_po') {
          const { data: spInfo } = await supabase
            .from("sp_general_info")
            .select("registration_status")
            .eq("profiles_id", user.id)
            .maybeSingle();

          status = spInfo?.registration_status ?? null;

          if (role === 'pet_owner' && status === 'approved') {
            const { error: roleError } = await supabase
              .from("profiles")
              .update({ role: 'both_sp_po' })
              .eq("id", user.id);

            if (!roleError) {
              role = 'both_sp_po';
            }
          }
        }

        if (!isActive) return;
        setProfile({ ...profileData, role });
        setRegistrationStatus(status);
      } catch (err) {
        console.error("Auth fetch error:", err);
      }
    };

    fetchData();

    return () => {
      isActive = false;
    };
  }, [supabase, pathname]);

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

  const inServiceProviderArea =
    pathname === SERVICE_PROVIDER_AREA || pathname.startsWith(`${SERVICE_PROVIDER_AREA}/`);
  const isOnboardingPage = pathname.includes("onboarding");

  const hasApplication = registrationStatus !== null && registrationStatus !== undefined;
  const isApproved = registrationStatus === 'approved';
  const isPendingOrRejected = registrationStatus && ['pending', 're-applied', 'rejected'].includes(registrationStatus);

  const serviceProviderHome = isApproved
    ? ROUTES.SERVICE_PROVIDER.SUMMARY_DASHBOARD
    : ROUTES.SERVICE_PROVIDER.ONBOARDING;

  // Logo destination rules
  let homeRoute: string = ROUTES.HOME;
  if (userRole === 'admin') {
    homeRoute = ROUTES.ADMIN.ADMIN_DASHBOARD;
  } else if (userRole === 'pet_owner') {
    homeRoute = ROUTES.PET_OWNER.DASHBOARD;
  } else if (userRole === 'service_provider') {
    homeRoute = serviceProviderHome;
  } else if (isBoth) {
    if (inServiceProviderArea) {
      homeRoute = serviceProviderHome;
    } else {
      homeRoute = ROUTES.PET_OWNER.DASHBOARD;
    }
  }

  // Role Action Button Label Logic
  const getRoleActionLabel = (): string | null => {
    if (registrationStatus === undefined || isOnboardingPage) return null;

    if (userRole === 'pet_owner') {
      if (!hasApplication) return "Become a Service Provider";
      return isPendingOrRejected ? "View Application" : null;
    }

    if (userRole === 'service_provider') {
      if (isPendingOrRejected) return "View Application";
      return isApproved ? "Become a Pet Owner" : "Register Now!";
    }

    if (isBoth) {
      if (isPendingOrRejected) return "View Application";
      if (!hasApplication) return "Register Now!";
      return inServiceProviderArea ? "Switch to Pet Owner" : "Switch to Business";
    }

    return null;
  };

  const roleActionLabel = getRoleActionLabel();

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

  const handleActionClick = () => {
    setShowMobileMenu(false);
    setShowMenu(false);

    if (isPendingOrRejected || userRole === 'pet_owner' && !hasApplication) {
      router.push(ROUTES.SERVICE_PROVIDER.ONBOARDING);
      return;
    }

    if (userRole === 'service_provider') {
      if (isApproved) {
        // Trigger modal confirmation to become 'both_sp_po'
        setShowConfirmModal(true);
      } else {
        router.push(ROUTES.SERVICE_PROVIDER.ONBOARDING);
      }
      return;
    }

    if (isBoth) {
      if (!hasApplication) {
        router.push(ROUTES.SERVICE_PROVIDER.ONBOARDING);
      } else if (isApproved) {
        router.push(inServiceProviderArea ? ROUTES.PET_OWNER.DASHBOARD : ROUTES.SERVICE_PROVIDER.SUMMARY_DASHBOARD);
      }
    }
  };

  // Confirm role change to both_sp_po and redirect straight to Manage Account page
  const confirmBecomePetOwner = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ role: 'both_sp_po' })
        .eq("id", user.id);

      if (!error) {
        setProfile((prev) => prev ? { ...prev, role: 'both_sp_po' } : null);
        setShowConfirmModal(false);
        router.push(ROUTES.AUTH.MANAGE_ACCOUNT);
      } else {
        console.error("Error updating role to both_sp_po:", error);
      }
    } catch (err) {
      console.error("Confirmation action error:", err);
    }
  };

  const RoleActionButton = () => {
    if (!roleActionLabel) return null;

    return (
      <button
        className={isBoth ? "header-action-btn" : "header-action-btn-outline"}
        onClick={handleActionClick}
      >
        {roleActionLabel}
      </button>
    );
  };

  const ProfileMenuItems = ({ onNavigate }: { onNavigate: (path: string) => void }) => {
    // Only show "Manage Listing" if user is an Approved SP or Approved both_sp_po and NOT pending/rejected
    const canSeeManageListing = isServiceProvider && isApproved && !isPendingOrRejected;

    return (
      <>
        {pathname !== ROUTES.AUTH.MANAGE_ACCOUNT && (
          <button className="profile-dropdown-item" onClick={() => onNavigate(ROUTES.AUTH.MANAGE_ACCOUNT)}>
            <FaUser /> <span>Manage Account</span>
          </button>
        )}

        {canSeeManageListing && pathname !== ROUTES.SERVICE_PROVIDER.MANAGE_LISTING && (
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
  };

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

      {/* Confirmation Modal for Service Provider -> Both SP & PO Role Change */}
      {showConfirmModal && (
        <div className="header-modal-overlay">
          <div className="header-modal-card">
            <h3 className="header-modal-title">Confirm Role Change</h3>
            <p className="header-modal-text">
              Are you sure you want to become a Pet Owner as well? This will update your account role to both Service Provider and Pet Owner.
            </p>
            <div className="header-modal-actions">
              <button
                className="header-modal-btn-cancel"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                className="header-modal-btn-confirm"
                onClick={confirmBecomePetOwner}
              >
                Yes, Confirm
              </button>
            </div>
          </div>
        </div>
      )}

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

          {roleActionLabel && (
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