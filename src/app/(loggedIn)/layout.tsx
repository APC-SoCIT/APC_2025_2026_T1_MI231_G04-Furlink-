// src/app/(loggedIn)/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ROUTES } from "@/config/routes";
import HeaderLoggedIn from '@/components/HeaderLoggedIn';
import SessionTimeoutModal from '@/components/SessionTimeoutModal';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { AccountStatusProvider } from '@/context/AccountStatusContext';

export default function LoggedInLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pathname = usePathname();
  const { showWarning, secondsLeft, stayLoggedIn } = useSessionTimeout();

  useEffect(() => {
    const verifyAccessAndPermissions = async () => {
      try {
        // 1. Check active session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.replace(ROUTES.HOME); 
          return;
        }

        // 2. Lift this user's suspension if it has run out, then fetch role and status
        await supabase.rpc("lift_expired_suspensions", { p_user: session.user.id });

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, status")
          .eq("id", session.user.id)
          .single();

        // Suspended users stay logged in (read-only); only other statuses are signed out
        if (error || !profile || (profile.status !== "active" && profile.status !== "suspended")) {
          await supabase.auth.signOut();
          router.replace(ROUTES.HOME);
          return;
        }

        if (profile.status === "suspended") {
          const { data: suspension } = await supabase
            .from("user_suspensions")
            .select("suspended_until")
            .eq("user_id", session.user.id)
            .eq("status", "active")
            .order("suspended_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          setSuspendedUntil(suspension?.suspended_until ?? null);
          setIsSuspended(true);
        } else {
          setIsSuspended(false);
          setSuspendedUntil(null);
        }

        const role = profile.role; 

        // 3. Admin-only pages check
        if (pathname.startsWith("/admin")) {
          if (role !== "admin") {
            router.replace(ROUTES.PET_OWNER.DASHBOARD);
            return;
          }
        }

        // 4. Pet Owner pages check 
        if (pathname.startsWith("/pet_owner")) {
          if (role !== "pet_owner" && role !== "both_sp_po") {
            if (role === "admin") {
              router.replace(ROUTES.ADMIN.ADMIN_DASHBOARD);
            } else {
              router.replace(ROUTES.SERVICE_PROVIDER.SUMMARY_DASHBOARD);
            }
            return;
          }
        }

        // 5. Service Provider pages check
        if (pathname.startsWith("/service_provider")) {
          const isOnboarding = pathname.includes("onboarding");

          // Allow pet_owner to access the onboarding page to apply
          if (!isOnboarding && role !== "service_provider" && role !== "both_sp_po") {
            router.replace(ROUTES.PET_OWNER.DASHBOARD);
            return;
          }

          if (isOnboarding && role === "pet_owner") {
            setIsLoading(false);
            return;
          }

          // Check application registration status for Service Providers
          const { data: spInfo } = await supabase
            .from("sp_general_info")
            .select("registration_status")
            .eq("profiles_id", session.user.id)
            .maybeSingle();

          const regStatus = spInfo?.registration_status;

          if (isOnboarding) {
            if (regStatus === "approved") {
              // Approved SPs shouldn't be on onboarding, push to summary dashboard
              router.replace(ROUTES.SERVICE_PROVIDER.SUMMARY_DASHBOARD);
              return;
            }
          } else {
            // Summary dashboard or management pages strictly require an APPROVED application
            if (regStatus !== "approved") {
              router.replace(ROUTES.SERVICE_PROVIDER.ONBOARDING);
              return;
            }
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Route protection validation error:", err);
        router.replace(ROUTES.HOME);
      }
    };

    verifyAccessAndPermissions();
  }, [router, supabase, pathname]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p style={{ color: "#0a217a", fontWeight: "bold" }}>Verifying permissions...</p>
      </div>
    );
  }

  return (
    <AccountStatusProvider value={{ isSuspended, suspendedUntil }}>
      <HeaderLoggedIn />
      {isSuspended && (
        <div
          role="alert"
          style={{ background: "#fef3c7", color: "#92400e", borderBottom: "1px solid #fcd34d", padding: "10px 16px", fontSize: 14, fontWeight: 600, textAlign: "center" }}
        >
          Your account is suspended
          {suspendedUntil
            ? ` until ${new Date(suspendedUntil).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`
            : ""}
          . You can still view your bookings, pets and account, but you cannot make or accept bookings.
        </div>
      )}
      <main className="main-wrapper">
        {children}
      </main>
      {showWarning && (
        <SessionTimeoutModal secondsLeft={secondsLeft} onStayLoggedIn={stayLoggedIn} />
      )}
    </AccountStatusProvider>
  );
}