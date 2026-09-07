import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-left">
          <span>© 2026 furlink</span>
          <Link href="/terms_and_conditions">Terms and Conditions</Link>
          <Link href="/privacy_policy">Privacy Policy</Link>
        </div>
        
        <div className="footer-right">
          {/* Facebook Icon */}
          <a href="https://www.facebook.com/people/Furbnb/61576298152992/" aria-label="Facebook" className="social-icon-link">
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="currentColor" 
            >
            {/* Manual Facebook Icon */}
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
            </svg>
          </a>

          {/* Instagram Icon */}
          <a href="https://www.instagram.com/furbnb_startup?fbclid=IwY2xjawTHCcJleHRuA2FlbQIxMABicmlkETE2VmlIMFlaVFdHUTl1eHROc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHgd_GJEGmgMhFm2tNxFqvIxBmYfypB9H9YykZFNQpdAuM4Jl1tbIrpi4X93Z_aem_WnbVkzjTUFar5M0Rq5ZO1w" aria-label="Instagram" className="social-icon-link">
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
            {/* Manual Instragm Icon */}
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect> {/* Rounded Box */}
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path> {/* Inner Circle */}
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line> {/* Camera Flash */}
            </svg>
          </a>

          {/* G-mail / Email Icon */}
          <a href="mailto:logiteh045@gmail.com" aria-label="Email" className="social-icon-link">
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
            {/* Manual G-mail Icon */}
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}