// src/components/ProtectedRoute.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ROUTES } from "@/config/routes";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles = [] }: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        // 1. Check active session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.replace(ROUTES.AUTH.LOGIN);
          return;
        }

        // 2. Fetch profile status and role
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, status")
          .eq("id", session.user.id)
          .single();

        if (error || !profile || profile.status !== "active") {
          await supabase.auth.signOut();
          router.replace(ROUTES.AUTH.LOGIN);
          return;
        }

        // 3. Auto-detect role requirements based on current pathname if allowedRoles is empty
        let rolesToCheck = allowedRoles;
        if (rolesToCheck.length === 0) {
          if (pathname.startsWith("/admin")) {
            rolesToCheck = ["admin"];
          } else if (pathname.startsWith("/pet_owner")) {
            rolesToCheck = ["pet_owner", "both_sp_po"];
          } else if (pathname.startsWith("/service_provider")) {
            rolesToCheck = ["service_provider", "both_sp_po"];
          }
        }

        // 4. Enforce role restrictions
        if (rolesToCheck.length > 0 && !rolesToCheck.includes(profile.role)) {
          if (profile.role === "admin") {
            router.replace(ROUTES.ADMIN.ADMIN_DASHBOARD);
          } else if (profile.role === "service_provider" || profile.role === "both_sp_po") {
            router.replace(ROUTES.SERVICE_PROVIDER.SUMMARY_DASHBOARD);
          } else {
            router.replace(ROUTES.PET_OWNER.DASHBOARD);
          }
          return;
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Access verification failed:", err);
        router.replace(ROUTES.AUTH.LOGIN);
      }
    };

    verifyAccess();
  }, [router, supabase, allowedRoles, pathname]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p style={{ color: "#0a217a", fontWeight: "bold" }}>Verifying access...</p>
      </div>
    );
  }

  return <>{children}</>;
}