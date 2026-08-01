'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import brandIcon from '../app/icon.png';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoginPage = mounted && pathname === '/auth/login';

  return (
    <header className="site-header">
      <div className="header-container">
        <Link href="/" className="logo-container" style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={brandIcon.src} 
            alt="Furlink Brand Logo" 
            style={{ width: '80px', height: '80px', objectFit: 'contain' }} 
          />
        </Link>
        
        {/* Responsive Hamburger Toggle Button */}
        <button 
          className={`hamburger-toggle ${isMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Navigation Menu Wrapper*/}
        <nav className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          {(!mounted || pathname !== '/about') && (
            <Link href="/about" className="nav-text-link" onClick={() => setIsMenuOpen(false)}>
              About furlink
            </Link>
          )}
          {(!mounted || pathname !== '/auth/signup') && (
            <Link 
              href="/auth/signup" 
              // Use 'nav-text-link' normally, and only switch to 'nav-btn-link' (blue background) when on the login page
              className={isLoginPage ? "nav-btn-link" : "nav-text-link signup-mobile-text"} 
              onClick={() => setIsMenuOpen(false)}
            >
              Sign Up
            </Link>
          )}
          {(!mounted || pathname !== '/auth/login') && (
            <Link href="/auth/login" className="nav-btn-link" onClick={() => setIsMenuOpen(false)}>
              Log In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}