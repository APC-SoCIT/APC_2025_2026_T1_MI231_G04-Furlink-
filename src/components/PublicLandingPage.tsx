'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PublicLandingPage() {
  // Tracks which card index is flipped; null means no cards are flipped
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);

  const toggleFlip = (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); 
    setFlippedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Hero Section */}
      <div className="content-container">
        <div className="landing-grid">
          <section className="content-section">
            <h1 className="main-heading">
              Link with service providers <br />
              <span className="highlight-text">with just a few clicks</span>
            </h1>
            <p className="sub-paragraph">
              Connect with trusted pet grooming professionals in your area. 
              Safe, reliable, and convenient pet care at your fingertips.
            </p>
            <Link href="/login" className="cta-button">
              <span>Book now</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </section>

          <section className="image-section">
            <div className="hero-card">
              <img src="/images/pet-img-homepage.png" alt="Pet service" className="hero-image" />
            </div>
          </section>
        </div>
      </div>

      {/* How to Use Section */}
      <section className="howto-section">
        <div className="content-container" style={{ flexDirection: 'column' }}>
          <h2 className="howto-title">How to use furlink</h2>
          
          <div className="cards-container">
            {/* Card 1: Pet Owner*/}
            <div 
              className={`flip-card ${flippedIndex === 0 ? 'is-flipped' : ''}`}
              onClick={(e) => toggleFlip(e, 0)} 
            >
              <div className="flip-card-inner">
                <div className="card-front">
                  <img src="/images/howto-petowner-front.png" alt="Pet Owner Front" className="card-asset" />
                </div>
                <div className="card-back">
                  <img src="/images/howto-petowner-back.png" alt="Pet Owner Back" className="card-asset" />
                </div>
              </div>
            </div>

            {/* Card 2: Service Provider*/}
            <div 
              className={`flip-card ${flippedIndex === 1 ? 'is-flipped' : ''}`}
              onClick={(e) => toggleFlip(e, 1)}
            >
              <div className="flip-card-inner">
                <div className="card-front">
                  <img src="/images/howto-provider-front.png" alt="Provider Front" className="card-asset" />
                </div>
                <div className="card-back">
                  <img src="/images/howto-provider-back.png" alt="Provider Back" className="card-asset" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}