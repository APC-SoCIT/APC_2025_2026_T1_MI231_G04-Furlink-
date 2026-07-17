import Link from 'next/link';

export default function PublicLandingPage() {
  return (
    <div style={{ width: '100%' }}>
      
      {/* Container wraps your Hero components to isolate formatting width rules */}
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
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </section>

          <section className="image-section">
            <div className="hero-card">
              <img 
                src="/images/pet-img-homepage.png" 
                alt="Cat and dog getting clean grooming service treatment" 
                className="hero-image"
              />
            </div>
          </section>
        </div>
      </div>

      {/* Full-width block element sits out here completely fluid */}
      <section className="howto-section">
        {/* We use content-container here to keep the title and flip-cards centered on the background strip */}
        <div className="content-container" style={{ flexDirection: 'column' }}>
          <h2 className="howto-title">How to use furlink</h2>
          
          <div className="cards-container">
            {/* Card 1 */}
            <div className="flip-card">
              <div className="flip-card-inner">
                <div className="card-front">
                  <img src="/images/howto-petowner-front.png" alt="Pet Owner Front View" className="card-asset" />
                </div>
                <div className="card-back">
                  <img src="/images/howto-petowner-back.png" alt="Pet Owner Back View" className="card-asset" />
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="flip-card">
              <div className="flip-card-inner">
                <div className="card-front">
                  <img src="/images/howto-provider-front.png" alt="Service Provider Front View" className="card-asset" />
                </div>
                <div className="card-back">
                  <img src="/images/howto-provider-back.png" alt="Service Provider Back View" className="card-asset" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}