import { useCallback, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns a function that gets the current user, refreshing the session first
 * if the access token is expired or about to expire (e.g. after the page sat
 * idle in a background tab). Also refreshes when the tab becomes visible again.
 */
export function useFreshUser(supabase: SupabaseClient) {
  const getFreshUser = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const msLeft = session?.expires_at ? session.expires_at * 1000 - Date.now() : 0;

    if (session && msLeft > 60_000) return session.user;

    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Session refresh failed:', error.message);
      return null;
    }
    return data.session?.user ?? null;
  }, [supabase]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession(); // triggers a refresh if the token has expired
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [supabase]);

  return getFreshUser;
}