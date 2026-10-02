import { useEffect, useState } from 'react';

const MAX_ATTEMPTS = 3;
const COOLDOWN_MS = 60 * 60 * 1000;

export function usePaymentCooldown() {
  const [paymentAttempts, setPaymentAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (!cooldownUntil) return;
    const interval = setInterval(() => {
      const diff = cooldownUntil - Date.now();
      if (diff <= 0) {
        setCooldownUntil(null);
        setPaymentAttempts(0);
        setTimeRemaining('');
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownUntil]);

  /** Call after a checkout session is successfully created. */
  const registerAttempt = () => {
    const next = paymentAttempts + 1;
    setPaymentAttempts(next);
    if (next >= MAX_ATTEMPTS) setCooldownUntil(Date.now() + COOLDOWN_MS);
  };

  return { paymentAttempts, cooldownUntil, timeRemaining, registerAttempt };
}