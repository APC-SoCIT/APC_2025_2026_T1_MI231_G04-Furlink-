// src/hooks/useSessionTimeout.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/config/routes";

const WARNING_BEFORE_MS = 5 * 60 * 1000; // show popup 5 min before token expiry
const CHECK_INTERVAL_MS = 15 * 1000;     // re-check session every 15s

export function useSessionTimeout() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loggingOutRef = useRef(false);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  // No answer / expired -> sign out. Form inputs are intentionally NOT saved.
  const forceLogout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    stopTick();
    setShowWarning(false);
    try {
      await supabase.auth.signOut();
    } finally {
      router.replace(ROUTES.HOME);
    }
  }, [supabase, router, stopTick]);

  // Countdown is derived from a fixed deadline (Date.now based), so it stays
  // accurate even if the browser throttles timers in a background tab.
  const startCountdown = useCallback(
    (deadlineMs: number) => {
      if (tickRef.current) return; // already counting down

      const update = () => {
        const left = Math.ceil((deadlineMs - Date.now()) / 1000);
        if (left <= 0) {
          forceLogout();
          return;
        }
        setSecondsLeft(left);
      };

      const initialLeft = Math.ceil((deadlineMs - Date.now()) / 1000);
      if (initialLeft <= 0) {
        forceLogout();
        return;
      }
      setSecondsLeft(initialLeft);
      setShowWarning(true);
      tickRef.current = setInterval(update, 1000);
    },
    [forceLogout]
  );

  const checkSession = useCallback(async () => {
    if (loggingOutRef.current) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.expires_at) return; // no session: layout's own check handles redirect

    const expiresAtMs = session.expires_at * 1000;
    const msLeft = expiresAtMs - Date.now();

    if (msLeft <= 0) {
      forceLogout();
    } else if (msLeft <= WARNING_BEFORE_MS) {
      startCountdown(expiresAtMs);
    }
  }, [supabase, forceLogout, startCountdown]);

  // "Yes, keep me signed in" -> real token renewal through Supabase
  const stayLoggedIn = useCallback(async () => {
    stopTick();
    setShowWarning(false);
    const { error } = await supabase.auth.refreshSession();
    if (error) forceLogout(); // refresh token is dead too
  }, [supabase, forceLogout, stopTick]);

  useEffect(() => {
    checkSession();
    const interval = setInterval(checkSession, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", checkSession);
    window.addEventListener("focus", checkSession);

    return () => {
      clearInterval(interval);
      stopTick();
      document.removeEventListener("visibilitychange", checkSession);
      window.removeEventListener("focus", checkSession);
    };
  }, [checkSession, stopTick]);

  return { showWarning, secondsLeft, stayLoggedIn };
}