'use client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const syncActiveViewMode = () => {
    const view = localStorage.getItem('furlink_preferred_view');
    setCurrentView(view);
  };

  useEffect(() => {
    const checkSessionAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      setUserEmail(session.user.email || null);
      syncActiveViewMode();
      setLoading(false);
    };

    checkSessionAndRole();

    // Listen for cross-component role view toggles emitted from the header component
    window.addEventListener('furlink_view_changed', syncActiveViewMode);
    return () => window.removeEventListener('furlink_view_changed', syncActiveViewMode);
  }, [supabase, router]);

  if (loading) {
    return <div style={{ color: '#fff', padding: '40px' }}>Loading workspace session environment...</div>;
  }

  return (
    <div className="placeholder-card">
      <h2>Welcome Back, {userEmail}</h2>
      <p style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '4px', letterSpacing: '0.5px' }}>
        Active Dynamic View: {currentView}
      </p>
      
      <hr style={{ margin: '20px 0', borderColor: 'var(--border-color)' }} />

      {/* Dynamic Render Conditions */}
      {currentView === 'pet_owner' && (
        <div className="rbac-section">
          <h3> Pet Owner Dashboard View</h3>
          <p>Review active service listings, track application schedules, and request new bookings.</p>
        </div>
      )}

      {currentView === 'service_provider' && (
        <div className="rbac-section">
          <h3> Service Provider Workspace Hub</h3>
          <p>Update pricing tiers, define dynamic scheduling parameters, and evaluate inbound user bookings.</p>
        </div>
      )}

      {currentView === 'admin' && (
        <div className="rbac-section" style={{ borderLeft: '4px solid var(--admin-accent)', paddingLeft: '12px' }}>
          <h3> System Administrator Master Command</h3>
          <p>Moderate regional system infrastructure users, track data metrics logs, and audit profile statuses.</p>
        </div>
      )}
    </div>
  );
}