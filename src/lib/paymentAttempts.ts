export const MAX_PAYMENT_ATTEMPTS = 3;
export const PAYMENT_COOLDOWN_MS = 60 * 60 * 1000;

const STORAGE_KEY = 'payment_attempts_by_booking';

export interface PaymentAttemptState {
  attempts: number;
  cooldownUntil: number | null;
}

type Store = Record<string, PaymentAttemptState>;

const EMPTY: PaymentAttemptState = { attempts: 0, cooldownUntil: null };

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable: attempts just won't persist */
  }
}

/** Current state for one booking. An expired cooldown resets that booking's attempts. */
export function getPaymentAttemptState(bookingId: string | null | undefined): PaymentAttemptState {
  if (!bookingId) return EMPTY;
  const store = readStore();
  const entry = store[bookingId];
  if (!entry) return EMPTY;

  if (entry.cooldownUntil && Date.now() >= entry.cooldownUntil) {
    delete store[bookingId];
    writeStore(store);
    return EMPTY;
  }
  return { attempts: entry.attempts || 0, cooldownUntil: entry.cooldownUntil || null };
}

/** Counts one attempt for this booking and starts its cooldown when the limit is hit. */
export function recordPaymentAttempt(bookingId: string): PaymentAttemptState {
  const current = getPaymentAttemptState(bookingId);
  const attempts = current.attempts + 1;
  const next: PaymentAttemptState = {
    attempts,
    cooldownUntil: attempts >= MAX_PAYMENT_ATTEMPTS ? Date.now() + PAYMENT_COOLDOWN_MS : null,
  };
  const store = readStore();
  store[bookingId] = next;
  writeStore(store);
  return next;
}

/** Forget a booking's attempts (after it is paid). */
export function clearPaymentAttempts(bookingId: string | null | undefined) {
  if (!bookingId) return;
  const store = readStore();
  if (store[bookingId]) {
    delete store[bookingId];
    writeStore(store);
  }
}