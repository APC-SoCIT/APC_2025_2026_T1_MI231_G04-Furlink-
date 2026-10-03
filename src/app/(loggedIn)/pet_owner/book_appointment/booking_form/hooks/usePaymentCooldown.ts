import { useCallback, useEffect, useState } from 'react';
import {
  getPaymentAttemptState,
  recordPaymentAttempt,
} from '@/lib/paymentAttempts';

export function usePaymentCooldown(bookingId: string | null) {
  const [paymentAttempts, setPaymentAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Load this booking's saved state whenever the booking changes
  useEffect(() => {
    const state = getPaymentAttemptState(bookingId);
    setPaymentAttempts(state.attempts);
    setCooldownUntil(state.cooldownUntil);
    setTimeRemaining('');
  }, [bookingId]);

  useEffect(() => {
    if (!cooldownUntil) return;
    const interval = setInterval(() => {
      const diff = cooldownUntil - Date.now();
      if (diff <= 0) {
        // Reads the store, which also clears the expired entry
        const state = getPaymentAttemptState(bookingId);
        setCooldownUntil(state.cooldownUntil);
        setPaymentAttempts(state.attempts);
        setTimeRemaining('');
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownUntil, bookingId]);

  /** Call after a checkout session is successfully created for `id`. */
  const registerAttempt = useCallback((id: string) => {
    const state = recordPaymentAttempt(id);
    // Only touch the UI state if it is the booking this form is showing
    if (id === bookingId) {
      setPaymentAttempts(state.attempts);
      setCooldownUntil(state.cooldownUntil);
    }
  }, [bookingId]);

  return { paymentAttempts, cooldownUntil, timeRemaining, registerAttempt };
}