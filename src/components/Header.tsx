'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Ensures component only evaluates pathname rendering after client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a safe skeleton or null match for the server render to prevent mismatches
    return <header className="site-header"><div className="header-con..." /></header>;
  }

  return (
    <header className="site-header">
      <div className="header-con...">
        {/* Your navigation links using pathname safely now */}
        <nav className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
          {pathname !== '/auth/signup' && (
            <Link 
              href="/auth/signup" 
              className="nav-text-link signup-mobile-text" 
              onClick={() => setIsMenuOpen(false)}
            >
              Sign Up
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}