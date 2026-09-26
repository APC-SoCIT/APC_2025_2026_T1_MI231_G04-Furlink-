// src/app/(loggedIn)/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ROUTES } from "@/config/routes";
import HeaderLoggedIn from '@/components/HeaderLoggedIn';

export default function LoggedInLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const verifyAccessAndPermissions = async () => {
      try {
        // 1. Check active session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.replace(ROUTES.HOME); 
          return;
        }

        // 2. Fetch user profile role and status
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, status")
          .eq("id", session.user.id)
          .single();

        if (error || !profile || profile.status !== "active") {
          await supabase.auth.signOut();
          router.replace(ROUTES.HOME);
          return;
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
    <>
      <HeaderLoggedIn />
      <main className="main-wrapper">
        {children}
      </main>
    </>
  );
}