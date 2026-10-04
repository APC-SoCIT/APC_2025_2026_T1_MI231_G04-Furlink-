import React, { useMemo } from 'react';
import styles from '../business-dashboard.module.css';

interface ReviewsSidebarWidgetProps {
  bookings: any[];
}

export default function ReviewsSidebarWidget({ bookings = [] }: ReviewsSidebarWidgetProps) {
  
  // Calculate dynamic review statistics based on live booking_info data
  const { totalReviews, avgOverall, avgStaff, recentComments } = useMemo(() => {
    // Filter bookings that actually have an overall rating
    const ratedBookings = bookings.filter(b => typeof b.booking_overall_rating === 'number' && b.booking_overall_rating > 0);
    
    let sumOverall = 0;
    let sumStaff = 0;
    let staffCount = 0;
    
    ratedBookings.forEach(b => {
      sumOverall += b.booking_overall_rating;
      
      if (typeof b.booking_staff_rating === 'number' && b.booking_staff_rating > 0) {
        sumStaff += b.booking_staff_rating;
        staffCount++;
      }
    });

    const calculatedTotal = ratedBookings.length;
    const calculatedOverall = calculatedTotal > 0 ? (sumOverall / calculatedTotal).toFixed(1) : '0.0';
    const calculatedStaff = staffCount > 0 ? (sumStaff / staffCount).toFixed(1) : '0.0';

    // Get the most recent 3 comments that have a review text
    const commentsList = ratedBookings
      .filter(b => b.booking_review || b.booking_comment)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
      .map((b) => {
        const p = b.profiles;
        const customerName = p?.username 
          || (p?.first_name && p?.last_name ? `${p.first_name} ${p.last_name}` : null) 
          || p?.first_name 
          || `Customer ${b.profiles_id?.substring(0, 4) || b.id?.substring(0, 4)}`;

        const dateObj = b.updated_at ? new Date(b.updated_at) : new Date(b.created_at);
        const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;

        return {
          id: b.id,
          name: customerName,
          text: `"${b.booking_review || b.booking_comment}"`,
          date: formattedDate,
          rating: b.booking_overall_rating
        };
      });

    return {
      totalReviews: calculatedTotal,
      avgOverall: calculatedOverall,
      avgStaff: calculatedStaff,
      recentComments: commentsList
    };
  }, [bookings]);

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
        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1e3a8a', lineHeight: 1 }}>
          {avgOverall}
        </div>
        <div style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>
          {renderStars(Math.round(Number(avgOverall)), '1.25rem')}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          {totalReviews} reviews
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
            <span style={{ background: '#fef08a', padding: '3px 10px', borderRadius: '12px', fontWeight: 800, color: '#1e3a8a', fontSize: '0.85rem' }}>{avgOverall}</span>
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
            <span style={{ background: '#fef08a', padding: '3px 10px', borderRadius: '12px', fontWeight: 800, color: '#1e3a8a', fontSize: '0.85rem' }}>{avgStaff}</span>
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

        {recentComments.length > 0 ? (
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
        ) : (
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
            No comments available yet.
          </div>
        )}
      </div>

    </div>
  );
}