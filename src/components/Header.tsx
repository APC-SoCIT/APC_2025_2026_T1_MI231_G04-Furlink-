'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import brandIcon from '../app/icon.png';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

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
          {pathname !== '/about' && (
            <Link href="/about" className="nav-text-link" onClick={() => setIsMenuOpen(false)}>
              About furlink
            </Link>
          )}
          {pathname !== '/signup' && (
            <Link href="/signup" className="nav-text-link signup-mobile-text" onClick={() => setIsMenuOpen(false)}>
              Sign Up
            </Link>
          )}
          {pathname !== '/login' && (
            <Link href="/login" className="nav-btn-link" onClick={() => setIsMenuOpen(false)}>
              Log In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}