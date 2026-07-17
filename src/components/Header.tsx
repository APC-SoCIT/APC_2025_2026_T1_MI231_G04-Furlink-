'use client';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import brandIcon from '../app/icon.png';

export default function Header() {
  const supabase = createClientComponentClient();
  const [role, setRole] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Tracks responsive menu dropdown state

  useEffect(() => {
    const fetchUserContext = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        setRole(data?.role || null);
        
        const preservedView = localStorage.getItem('furlink_preferred_view');
        if (preservedView) {
          setActiveView(preservedView);
        } else {
          const defaultView = data?.role === 'both' ? 'pet_owner' : data?.role;
          setActiveView(defaultView);
          localStorage.setItem('furlink_preferred_view', defaultView);
        }
      }
    };
    fetchUserContext();
  }, [supabase]);

  const handleToggleView = (targetView: string) => {
    setActiveView(targetView);
    localStorage.setItem('furlink_preferred_view', targetView);
    window.dispatchEvent(new Event('furlink_view_changed'));
  };

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

        {/* Navigation Menu Wrapper - Toggles active visibility state */}
        <nav className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          {activeView && <Link href="/dashboard" className="nav-link" onClick={() => setIsMenuOpen(false)}>Home Dashboard</Link>}

          {activeView === 'pet_owner' && <Link href="/pets" className="nav-link" onClick={() => setIsMenuOpen(false)}>My Pets</Link>}
          {activeView === 'service_provider' && <Link href="/services" className="nav-link" onClick={() => setIsMenuOpen(false)}>My Listings</Link>}
          {activeView === 'admin' && <Link href="/admin/users" className="nav-link admin-link" onClick={() => setIsMenuOpen(false)}>Moderate System</Link>}

          {role === 'both' && (
            <div className="view-toggle-wrapper">
              <button 
                onClick={() => { handleToggleView('pet_owner'); setIsMenuOpen(false); }} 
                className={`toggle-btn ${activeView === 'pet_owner' ? 'active-toggle' : ''}`}
              >
                Owner View
              </button>
              <button 
                onClick={() => { handleToggleView('service_provider'); setIsMenuOpen(false); }} 
                className={`toggle-btn ${activeView === 'service_provider' ? 'active-toggle' : ''}`}
              >
                Provider View
              </button>
            </div>
          )}

          {!activeView && (
            <>
              <Link href="/about" className="nav-text-link">About furlink</Link>
              <Link href="/auth/signup" className="nav-text-link signup-mobile-text">Sign Up</Link>
              <Link href="/login" className="nav-btn-link">Log In</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}