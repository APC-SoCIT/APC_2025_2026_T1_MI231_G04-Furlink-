'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Header from './Header';
import HeaderLoggedIn from './HeaderLoggedIn';

export default function HeaderResolver() {
  const supabase = createClientComponentClient();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setIsLoggedIn(!!session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setIsLoggedIn(!!session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (isLoggedIn === null) {
    return <header className="site-header" style={{ backgroundColor: '#ffffff' }} />;
  }

  return isLoggedIn ? <HeaderLoggedIn /> : <Header />;
}