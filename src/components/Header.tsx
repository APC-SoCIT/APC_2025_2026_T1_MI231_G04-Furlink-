'use client';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import brandIcon from '../app/icon.png';

export default function Header() {
  const supabase = createClientComponentClient();
  const [role, setRole] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserContext = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        setRole(data?.role || null);
        
        // Read or initialize the preferred view mode local storage token state
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

  // View toggle function for hybrid user accounts
  const handleToggleView = (targetView: string) => {
    setActiveView(targetView);
    localStorage.setItem('furlink_preferred_view', targetView);
    window.dispatchEvent(new Event('furlink_view_changed')); // Dispatches cross-component updates
  };

  return (
    <header className="site-header">
      <div className="header-container">
        <Link href="/" className="logo-container" style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={brandIcon.src} 
            alt="furlink Logo" 
            style={{ width: '80px', height: '80px', objectFit: 'contain' }}
          />
        </Link>
        
        <nav className="nav-menu">
          {activeView && <Link href="/dashboard" className="nav-link">Home Dashboard</Link>}

          {/* Render contextual path elements based on active layout view */}
          {activeView === 'pet_owner' && <Link href="/pets" className="nav-link">My Pets</Link>}
          {activeView === 'service_provider' && <Link href="/services" className="nav-link">My Listings</Link>}
          {activeView === 'admin' && <Link href="/admin/users" className="nav-link admin-link">Moderate System</Link>}

          {/* Toggle Button for hybrid profiles */}
          {role === 'both' && (
            <div className="view-toggle-wrapper" style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '20px' }}>
              <button 
                onClick={() => handleToggleView('pet_owner')} 
                style={{ padding: '6px 14px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', background: activeView === 'pet_owner' ? '#0e2994' : 'transparent', color: activeView === 'pet_owner' ? '#fff' : '#0e2994' }}
              >
                Owner View
              </button>
              <button 
                onClick={() => handleToggleView('service_provider')} 
                style={{ padding: '6px 14px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', background: activeView === 'service_provider' ? '#0e2994' : 'transparent', color: activeView === 'service_provider' ? '#fff' : '#0e2994' }}
              >
                Provider View
              </button>
            </div>
          )}

          {!activeView && (
            <>
              <Link href="/about" className="nav-text-link">About furlink</Link>
              <Link href="/login" className="nav-btn-link">Log in or Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}