// Server-only helpers for the AI assistant's guided booking flow.
// (Same logic as the helpers inside /api/ai-booking-assistant/route.ts; kept in
// a lib file because Next route files can't export helpers. You can later point
// the old route at this file too and delete its copies.)
import type { NextRequest } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Verifies the caller is a logged-in, ACTIVE pet owner. userId comes only from the verified session. */
export async function checkPetOwner(req: NextRequest): Promise<{ ok: boolean; reason?: string; userId?: string; suspended?: boolean }> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return { ok: false, reason: 'no_token' };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { ok: false, reason: 'missing_supabase_env' };

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) return { ok: false, reason: 'invalid_session' };

  // Lift this user's suspension if it has already run out, so it never blocks them wrongly
  await userClient.rpc('lift_expired_suspensions', { p_user: userData.user.id });

  const { data: profile, error: profErr } = await userClient
    .from('profiles')
    .select('role, status')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (profErr || !profile) return { ok: false, reason: 'profile_not_found' };
  if (profile.status === 'suspended') return { ok: false, reason: 'account_status_suspended', suspended: true };
  if (profile.status !== 'active') return { ok: false, reason: `account_status_${profile.status}` };
  if (!['pet_owner', 'both_sp_po'].includes(profile.role ?? '')) return { ok: false, reason: 'not_pet_owner' };
  return { ok: true, userId: userData.user.id };
}

// ---------------------------------------------------------------------------
// Constants + time helpers
// ---------------------------------------------------------------------------
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Statuses that give a slot's capacity back; every other status still holds it.
export const SLOT_FREEING_STATUSES = ['rejected', 'cancelled', 'cancelled_by_po', 'to_refund', 'refunded'];
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function manilaNow() {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return { date, minutes: h * 60 + m };
}

export const weekdayOf = (iso: string) => DAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** "09:30", "9:30 AM", "09:30 AM - 10:30 AM" -> minutes since midnight (start time). */
export function toMinutes(t: string): number | null {
  const m = String(t).match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return h * 60 + min;
}

export function fmt12(minutes: number) {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ap = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

/** What gets stored in booking_info.booking_timeslot, e.g. "9:00 AM - 10:00 AM". */
export const slotLabel = (start: number, interval: number) => `${fmt12(start)} - ${fmt12(start + interval)}`;

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
export const PROVIDER_COLUMNS = 'id, business_name, business_street, business_barangay, business_city, business_province, business_region';

export const addressOf = (p: any) =>
  [p.business_street, p.business_barangay, p.business_city, p.business_province].filter(Boolean).join(', ');

/**
 * Owners of service providers whose account is currently suspended. Those shops are treated as
 * unavailable: the assistant must not list them, quote them or book with them.
 * Lifts any suspension that has already run out first.
 */
export async function suspendedProviderOwnerIds(admin: SupabaseClient): Promise<string[]> {
  await admin.rpc('lift_expired_suspensions');
  const { data } = await admin.from('profiles').select('id').eq('status', 'suspended');
  return (data ?? []).map((p: { id: string }) => p.id);
}

export async function fetchApprovedProviders(admin: SupabaseClient) {
  const suspended = await suspendedProviderOwnerIds(admin);
  let q = admin.from('sp_general_info').select(PROVIDER_COLUMNS).eq('registration_status', 'approved');
  if (suspended.length) q = q.not('profiles_id', 'in', `(${suspended.join(',')})`);
  const { data, error } = await q.limit(300);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchApprovedProvider(admin: SupabaseClient, spId: string) {
  const suspended = await suspendedProviderOwnerIds(admin);
  let q = admin
    .from('sp_general_info')
    .select(PROVIDER_COLUMNS)
    .eq('id', spId)
    .eq('registration_status', 'approved');
  if (suspended.length) q = q.not('profiles_id', 'in', `(${suspended.join(',')})`);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export function filterByArea(providers: any[], rawArea?: string) {
  const area = norm(rawArea).replace(/\b(city|municipality|province)\b/g, '').trim();
  if (!area) return providers;
  return providers.filter((p) =>
    norm([p.business_street, p.business_barangay, p.business_city, p.business_province, p.business_region].join(' ')).includes(area)
  );
}

// ---------------------------------------------------------------------------
// Slots (capacity counted in PETS, not bookings)
// ---------------------------------------------------------------------------
export type HoursRow = { sp_id?: string; day_of_week: string; opening_time: string; closing_time: string; slot_interval: number; slot_capacity: number };
export type Slot = { start: number; time: string; spots_left: number };

export function buildDaySlots(h: HoursRow | undefined, isToday: boolean, nowMinutes: number, taken: Map<number, number>) {
  if (!h) return { open: false, slots: [] as Slot[] };
  const open = toMinutes(h.opening_time)!;
  const close = toMinutes(h.closing_time)!;
  const slots: Slot[] = [];
  for (let t = open; t + h.slot_interval <= close; t += h.slot_interval) {
    if (isToday && t <= nowMinutes) continue;
    const left = h.slot_capacity - (taken.get(t) ?? 0);
    if (left > 0) slots.push({ start: t, time: fmt12(t), spots_left: left });
  }
  return { open: true, slots };
}

/** key = `${sp_id}|${booking_date}` -> (slot start minutes -> pets already holding it) */
export function tallyTaken(bookings: any[]) {
  const taken = new Map<string, Map<number, number>>();
  for (const b of bookings) {
    if (SLOT_FREEING_STATUSES.includes(b.booking_status)) continue;
    const mins = toMinutes(b.booking_timeslot);
    if (mins === null) continue;
    const pets = Array.isArray(b.booking_pet_info) ? Math.max(b.booking_pet_info.length, 1) : 1;
    const key = `${b.sp_id}|${b.booking_date}`;
    const m = taken.get(key) ?? new Map<number, number>();
    m.set(mins, (m.get(mins) ?? 0) + pets);
    taken.set(key, m);
  }
  return taken;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------
/**
 * The one sp_service_options row that applies to this pet for a service:
 * active, right species, weight inside the range. If several match (overlapping
 * ranges, or an 'all' row next to a size row) prefer a specific size, then the
 * narrowest weight range.
 */
export function bestOption(options: any[], petType: string, weight: number) {
  const cands = (options ?? []).filter(
    (o) =>
      o.option_status === 'active' &&
      (o.pet_type === petType || o.pet_type === 'both_dog_cat') &&
      weight >= Number(o.pet_min_weight_range) &&
      weight <= Number(o.pet_max_weight_range)
  );
  cands.sort((a, b) => {
    const allA = a.pet_size === 'all' ? 1 : 0;
    const allB = b.pet_size === 'all' ? 1 : 0;
    if (allA !== allB) return allA - allB;
    return Number(a.pet_max_weight_range) - Number(a.pet_min_weight_range) - (Number(b.pet_max_weight_range) - Number(b.pet_min_weight_range));
  });
  return cands[0];
}

/**
 * booking_ai_haircut_url may be in a private bucket. If it's a Supabase
 * storage URL, swap it for a short-lived signed URL so <img> can show it.
 * (The ORIGINAL url is what gets stored on the new booking.)
 */
export async function displayableImageUrl(admin: SupabaseClient, url: string | null | undefined) {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?]+)/);
  if (!m) return url;
  try {
    const { data } = await admin.storage.from(m[1]).createSignedUrl(decodeURIComponent(m[2]), 60 * 60);
    return data?.signedUrl ?? url;
  } catch {
    return url;
  }
}