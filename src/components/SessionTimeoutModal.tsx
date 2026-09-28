'use client';

interface Props {
  secondsLeft: number;
  onStayLoggedIn: () => void;
}

export default function SessionTimeoutModal({ secondsLeft, onStayLoggedIn }: Props) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      aria-labelledby="session-timeout-title"
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)', // dark, low-opacity backdrop
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 12, padding: '28px 32px',
        maxWidth: 380, width: '90%', textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      }}>
        <h2 id="session-timeout-title" style={{ marginBottom: 8, color: '#0a217a' }}>
          Are you still there?
        </h2>
        <p style={{ marginBottom: 20, color: '#333' }}>
          For your account's security, you'll be signed out in{' '}
          <strong>{minutes}:{seconds.toString().padStart(2, '0')}</strong>.
        </p>
        <button
          onClick={onStayLoggedIn}
          style={{
            background: '#0a217a', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 24px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Yes, keep me signed in
        </button>
      </div>
    </div>
  );
}