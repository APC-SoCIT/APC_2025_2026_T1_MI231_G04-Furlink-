/* /src/app/(loggedIn)/service_provider/manage_listing/onboarding/components/ApplicationStatusView.tsx */
import React from "react";
import Footer from "@/components/Footer";

interface ApplicationStatusViewProps {
  status: 'loading' | 'pending' | 'approved';
}

export default function ApplicationStatusView({ status }: ApplicationStatusViewProps) {
  if (status === 'loading') {
    return (
      <>
        <div className="loading-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#0E2679', fontWeight: 'bold' }}>
          Loading Application...
        </div>
        <Footer />
      </>
    );
  }

  if (status === 'pending') {
    return (
      <>
        <div className="apply-provider-wrapper" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 className="page-title">Application Under Review</h1>
          <div style={{ background: '#f8fafc', padding: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ color: '#0E2679', marginBottom: '16px' }}>Your application is currently pending admin approval.</h2>
            <p style={{ color: '#4b5563', lineHeight: '1.6' }}>
              We will notify you once your business has been reviewed. You cannot submit another application while one is actively under review. Please check back later.
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (status === 'approved') {
    return (
      <>
        <div className="apply-provider-wrapper" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#ecfdf5', padding: '40px', borderRadius: '12px', border: '1px solid #a7f3d0', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ color: '#059669', marginBottom: '16px' }}>You are already an approved Service Provider!</h2>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return null;
}