import React from 'react';
import styles from '../business-dashboard.module.css';

export default function ReviewsSidebarWidget() {
  const recentComments = [
    { id: 1, name: 'Reina Rei', text: '"The service is great!"', date: '8/18/2026', rating: 5 },
    { id: 2, name: 'furbnb', text: '"it was okay"', date: '8/17/2026', rating: 3 },
    { id: 3, name: 'furbnb', text: '"Great service!"', date: '8/16/2026', rating: 5 },
  ];

  const renderStars = (rating: number, size: string = '1rem') => {
    return (
      <div style={{ display: 'flex', gap: '2px', fontSize: size }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span 
            key={star} 
            style={{ color: star <= rating ? '#facc15' : '#e2e8f0' }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.sidebarSection} style={{ padding: '1.25rem' }}>
      
      <h3 style={{ 
        fontSize: '0.8rem', 
        fontWeight: 800, 
        color: '#1e3a8a', 
        textTransform: 'uppercase', 
        marginBottom: '1rem',
        letterSpacing: '0.5px'
      }}>
        Customer Review Summary
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
        {/* Reduced font size by two steps from 3.5rem to 2.5rem */}
        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1e3a8a', lineHeight: 1 }}>
          4.0
        </div>
        <div style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>
          {renderStars(4, '1.25rem')}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          8 reviews
        </div>
      </div>

      {/* Category Ratings (Pills) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
        
        {/* Overall Bar */}
        <div style={{ 
          background: '#f8fafc', 
          borderRadius: '16px', 
          padding: '10px 16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <span style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Overall</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#1e3a8a' }} />
            <span style={{ background: '#fef08a', padding: '3px 10px', borderRadius: '12px', fontWeight: 800, color: '#1e3a8a', fontSize: '0.85rem' }}>4.0</span>
          </div>
        </div>

        {/* Staff Bar */}
        <div style={{ 
          background: '#f8fafc', 
          borderRadius: '16px', 
          padding: '10px 16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}>
          <span style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Staff</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#1e3a8a' }} />
            <span style={{ background: '#fef08a', padding: '3px 10px', borderRadius: '12px', fontWeight: 800, color: '#1e3a8a', fontSize: '0.85rem' }}>4.0</span>
          </div>
        </div>

      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1.5rem 0' }} />

      <div>
        <h4 style={{ 
          fontSize: '0.75rem', 
          fontWeight: 700, 
          color: '#64748b', 
          textTransform: 'uppercase', 
          marginBottom: '1rem',
          letterSpacing: '0.5px'
        }}>
          Recent Comments
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {recentComments.map((review) => (
            <div key={review.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '0.95rem' }}>{review.name}</span>
                {renderStars(review.rating, '0.75rem')}
              </div>
              <div style={{ fontStyle: 'italic', fontSize: '0.9rem', color: '#334155', marginTop: '4px' }}>
                {review.text}
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                {review.date}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}