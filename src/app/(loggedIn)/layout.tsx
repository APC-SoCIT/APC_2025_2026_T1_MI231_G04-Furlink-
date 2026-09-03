// src/app/(loggedIn)/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ROUTES } from "@/config/routes";
import HeaderLoggedIn from '@/components/HeaderLoggedIn';

export default function LoggedInLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.replace(ROUTES.HOME);
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("status")
          .eq("id", session.user.id)
          .single();

        if (error || !profile || profile.status !== "active") {
          await supabase.auth.signOut();
          router.replace(ROUTES.HOME);
          return;
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Authentication check failed:", err);
        router.replace(ROUTES.HOME);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.replace(ROUTES.HOME);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p style={{ color: "#0a217a", fontWeight: "bold" }}>Verifying session...</p>
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