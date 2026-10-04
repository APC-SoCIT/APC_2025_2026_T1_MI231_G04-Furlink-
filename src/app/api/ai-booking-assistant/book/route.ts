import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  getAdminClient, checkPetOwner, manilaNow, weekdayOf, addDays, toMinutes, fmt12, slotLabel, norm, addressOf,
  fetchApprovedProviders, fetchApprovedProvider, filterByArea, buildDaySlots, tallyTaken, bestOption, displayableImageUrl,
  UUID_RE, ISO_DATE_RE, type HoursRow,
} from '@/lib/aiBookingServer';

// Guided booking endpoint for the AI assistant. Every action requires a
// verified, active pet-owner session; the user id is NEVER read from the body.

const MAX_PETS = 10;
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

const RPC_ERRORS: Record<string, [string, number]> = {
  SLOT_FULL: ['That time slot just filled up. Please pick another one.', 409],
  PROVIDER_CLOSED: ['That provider is closed on that day.', 409],
  PROVIDER_UNAVAILABLE: ['That provider is no longer available.', 409],
  PET_NOT_FOUND: ['One of the selected pets could not be found on your account.', 400],
  INVALID_SERVICE: ['One of the selected services is no longer available for your pet. Please start again.', 409],
  NO_SERVICES: ['Every pet needs at least one service.', 400],
  DUPLICATE_PET: ['A pet was selected twice.', 400],
  DUPLICATE_SERVICE: ['A service was selected twice for the same pet.', 400],
  INVALID_SLOT: ['That time slot is not valid.', 400],
  INVALID_PETS: ['No pets were selected.', 400],
};

export async function POST(req: NextRequest) {
  const check = await checkPetOwner(req);
  if (check.suspended) {
    return bad('ACCOUNT_SUSPENDED: Your account is suspended, so you cannot make new bookings through the assistant until the suspension ends.', 403);
  }
  if (!check.ok || !check.userId) return bad('Please log in as a pet owner to book.', 401);
  const admin = getAdminClient();
  if (!admin) return bad('Server is not configured.', 500);

  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== 'string') return bad('Invalid request.');

  try {
    switch (body.action) {
      case 'start': return await actionStart(admin, check.userId);
      case 'providers': return await actionProviders(admin);
      case 'availability': return await actionAvailability(admin, body);
      case 'find': return await actionFind(admin, body);
      case 'services': return await actionServices(admin, check.userId, body);
      case 'conflicts': return await actionConflicts(admin, check.userId, body);
      case 'create': return await actionCreate(admin, check.userId, body);
      default: return bad('Unknown action.');
    }
  } catch (err) {
    console.error('[ai-booking-assistant/book]', body.action, err);
    return bad('Something went wrong. Please try again.', 500);
  }
}

// ---------------------------------------------------------------------------
// 1) Does the caller have a registered pet?
// ---------------------------------------------------------------------------
async function actionStart(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from('po_registered_pet')
    .select('id, pet_name, pet_type, pet_breed, pet_weight')
    .eq('profiles_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return NextResponse.json({
    pets: (data ?? []).map((p: any) => ({ id: p.id, name: p.pet_name, type: p.pet_type, breed: p.pet_breed, weight: Number(p.pet_weight) })),
  });
}

// ---------------------------------------------------------------------------
// 2a) Provider list for the "I already have a provider" dropdown
// ---------------------------------------------------------------------------
async function actionProviders(admin: SupabaseClient) {
  const providers = await fetchApprovedProviders(admin);
  return NextResponse.json({
    providers: providers
      .map((p: any) => ({ id: p.id, name: p.business_name, address: addressOf(p) }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name)),
  });
}

// ---------------------------------------------------------------------------
// 2b) A specific provider's open slots (one date, or the next N days)
// ---------------------------------------------------------------------------
async function actionAvailability(admin: SupabaseClient, body: any) {
  if (!isUuid(body.spId)) return bad('Pick a provider first.');
  const now = manilaNow();
  const start: string = body.date || now.date;
  if (!ISO_DATE_RE.test(start)) return bad('Invalid date.');
  if (start < now.date) return bad(`That date is in the past. Today is ${now.date}.`);
  const days = Math.min(Math.max(Number(body.days) || 1, 1), 7);
  const petCount = Math.min(Math.max(Number(body.petCount) || 1, 1), MAX_PETS);

  const provider = await fetchApprovedProvider(admin, body.spId);
  if (!provider) return bad('That provider is not available.', 404);

  const end = addDays(start, days - 1);
  const [hoursRes, bookRes] = await Promise.all([
    admin.from('sp_operating_hours').select('day_of_week, opening_time, closing_time, slot_interval, slot_capacity').eq('sp_id', provider.id),
    admin.from('booking_info').select('sp_id, booking_date, booking_timeslot, booking_status, booking_pet_info(id)')
      .eq('sp_id', provider.id).gte('booking_date', start).lte('booking_date', end),
  ]);
  if (hoursRes.error) throw new Error(hoursRes.error.message);
  if (bookRes.error) throw new Error(bookRes.error.message);

  const taken = tallyTaken(bookRes.data ?? []);
  const out = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const weekday = weekdayOf(date);
    const h = (hoursRes.data ?? []).find((x: any) => x.day_of_week === weekday) as HoursRow | undefined;
    const { open, slots } = buildDaySlots(h, date === now.date, now.minutes, taken.get(`${provider.id}|${date}`) ?? new Map());
    out.push({ date, weekday, open, slots: slots.filter((s) => s.spots_left >= petCount) });
  }
  return NextResponse.json({ provider: { id: provider.id, name: provider.business_name, address: addressOf(provider) }, days: out });
}

// ---------------------------------------------------------------------------
// 2c) No provider chosen: find providers with room on a date
// ---------------------------------------------------------------------------
async function actionFind(admin: SupabaseClient, body: any) {
  const now = manilaNow();
  const date: string = body.date;
  if (!ISO_DATE_RE.test(date || '')) return bad('Pick a date.');
  if (date < now.date) return bad(`That date is in the past. Today is ${now.date}.`);
  const petCount = Math.min(Math.max(Number(body.petCount) || 1, 1), MAX_PETS);
  const wanted = body.time ? toMinutes(String(body.time)) : null;
  if (body.time && wanted === null) return bad('Could not understand that time.');

  let providers: any[] = filterByArea(await fetchApprovedProviders(admin), body.area);

  // Narrow to providers that actually offer the requested service.
  const tokens = body.service ? norm(body.service).split(/\s+/).filter((t: string) => t.length > 2) : [];
  if (providers.length && tokens.length) {
    const { data, error } = await admin
      .from('sp_services')
      .select('sp_id, service_name, service_description, sp_service_options(option_status)')
      .in('sp_id', providers.map((p) => p.id))
      .eq('service_status', 'active');
    if (error) throw new Error(error.message);
    const ok = new Set<string>();
    for (const s of data ?? []) {
      const hasActive = (s.sp_service_options ?? []).some((o: any) => o.option_status === 'active');
      const hay = norm(`${s.service_name} ${s.service_description}`);
      if (hasActive && tokens.every((t: string) => hay.includes(t))) ok.add(s.sp_id);
    }
    providers = providers.filter((p) => ok.has(p.id));
  }
  if (!providers.length) return NextResponse.json({ date, providers: [] });

  const weekday = weekdayOf(date);
  const ids = providers.map((p) => p.id);
  const [hoursRes, bookRes] = await Promise.all([
    admin.from('sp_operating_hours').select('sp_id, day_of_week, opening_time, closing_time, slot_interval, slot_capacity').in('sp_id', ids).eq('day_of_week', weekday),
    admin.from('booking_info').select('sp_id, booking_date, booking_timeslot, booking_status, booking_pet_info(id)').in('sp_id', ids).eq('booking_date', date),
  ]);
  if (hoursRes.error) throw new Error(hoursRes.error.message);
  if (bookRes.error) throw new Error(bookRes.error.message);

  const hoursBySp = new Map<string, HoursRow>((hoursRes.data ?? []).map((h: any) => [h.sp_id, h]));
  const taken = tallyTaken(bookRes.data ?? []);

  const matches = [];
  for (const p of providers) {
    const h = hoursBySp.get(p.id);
    if (!h) continue;
    const { slots } = buildDaySlots(h, date === now.date, now.minutes, taken.get(`${p.id}|${date}`) ?? new Map());
    let q = slots.filter((s) => s.spots_left >= petCount);
    if (wanted !== null) q = q.filter((s) => wanted >= s.start && wanted < s.start + h.slot_interval);
    if (q.length) matches.push({ id: p.id, name: p.business_name, address: addressOf(p), slots: q.slice(0, 12) });
  }
  return NextResponse.json({ date, providers: matches.slice(0, 8) });
}

// ---------------------------------------------------------------------------
// 4) For each chosen pet: the provider's services that fit it, with price,
//    plus the pet's most recent AI haircut preview from a previous booking.
// ---------------------------------------------------------------------------
async function actionServices(admin: SupabaseClient, userId: string, body: any) {
  if (!isUuid(body.spId)) return bad('Pick a provider first.');
  const petIds: string[] = Array.isArray(body.petIds) ? [...new Set<string>(body.petIds.filter(isUuid))] : [];
  if (!petIds.length || petIds.length > MAX_PETS) return bad('Pick your pets first.');

  const [petsRes, svcRes, aiRes] = await Promise.all([
    admin.from('po_registered_pet').select('id, pet_name, pet_type, pet_breed, pet_weight').in('id', petIds).eq('profiles_id', userId),
    admin.from('sp_services')
      .select('id, service_name, service_description, service_type, service_haircut_included, sp_service_options(id, pet_type, pet_size, pet_min_weight_range, pet_max_weight_range, service_price, option_status)')
      .eq('sp_id', body.spId).eq('service_status', 'active'),
    // Newest first; first row per pet wins below. Rows are only used for pets
    // that the first query confirmed belong to this caller (ownedIds).
    admin.from('booking_pet_info').select('registered_pet_id, booking_ai_haircut_url, created_at')
      .in('registered_pet_id', petIds).not('booking_ai_haircut_url', 'is', null).order('created_at', { ascending: false }),
  ]);
  if (petsRes.error) throw new Error(petsRes.error.message);
  if (svcRes.error) throw new Error(svcRes.error.message);
  if (aiRes.error) throw new Error(aiRes.error.message);

  const ownedIds = new Set((petsRes.data ?? []).map((p: any) => p.id));
  const lastAi = new Map<string, string>();
  for (const r of aiRes.data ?? []) {
    if (r.registered_pet_id && ownedIds.has(r.registered_pet_id) && !lastAi.has(r.registered_pet_id)) lastAi.set(r.registered_pet_id, r.booking_ai_haircut_url);
  }

  const pets = [];
  for (const p of petsRes.data ?? []) {
    const weight = Number(p.pet_weight);
    const services = (svcRes.data ?? [])
      .map((s: any) => {
        const opt = bestOption(s.sp_service_options, p.pet_type, weight);
        return opt
          ? { optionId: opt.id, name: s.service_name, description: s.service_description, haircut: !!s.service_haircut_included, price: Number(opt.service_price) }
          : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
    pets.push({
      id: p.id, name: p.pet_name, type: p.pet_type, breed: p.pet_breed, weight,
      services,
      lastAiHaircutUrl: await displayableImageUrl(admin, lastAi.get(p.id)),
      hasLastAiHaircut: lastAi.has(p.id),
    });
  }
  // Keep the order the client sent.
  pets.sort((a, b) => petIds.indexOf(a.id) - petIds.indexOf(b.id));
  return NextResponse.json({ pets });
}

// ---------------------------------------------------------------------------
// 5) Reminder: does any chosen pet already have a booking? Deliberately NOT
//    filtered by date, time, service, provider or status -- the user is always
//    reminded of every booking those pets have, then decides what to do.
// ---------------------------------------------------------------------------
const MAX_REMINDERS = 10;

async function actionConflicts(admin: SupabaseClient, userId: string, body: any) {
  const petIds: string[] = Array.isArray(body.petIds) ? [...new Set<string>(body.petIds.filter(isUuid))] : [];
  if (!petIds.length || petIds.length > MAX_PETS) return bad('Invalid request.');

  const { data: ownPets, error: pErr } = await admin
    .from('po_registered_pet').select('id, pet_name').in('id', petIds).eq('profiles_id', userId); // ownership
  if (pErr) throw new Error(pErr.message);
  const petName = new Map((ownPets ?? []).map((p: any) => [p.id, p.pet_name]));
  if (!petName.size) return NextResponse.json({ conflicts: [], total: 0 });

  const { data, error } = await admin
    .from('booking_pet_info')
    .select('registered_pet_id, booking_service_info(booking_service_name), booking_info!inner(id, booking_date, booking_timeslot, booking_status, sp_general_info(business_name))')
    .in('registered_pet_id', [...petName.keys()])
    .limit(300);
  if (error) throw new Error(error.message);

  const all = (data ?? [])
    .map((row: any) => {
      const info: any = Array.isArray(row.booking_info) ? row.booking_info[0] : row.booking_info;
      const sp: any = Array.isArray(info?.sp_general_info) ? info.sp_general_info[0] : info?.sp_general_info;
      if (!info) return null;
      return {
        petName: petName.get(row.registered_pet_id),
        provider: sp?.business_name ?? 'a provider',
        date: info.booking_date,
        timeslot: info.booking_timeslot,
        status: info.booking_status,
        services: (row.booking_service_info ?? []).map((s: any) => s.booking_service_name),
      };
    })
    .filter(Boolean) as any[];

  // Newest first so the most relevant bookings are the ones shown.
  all.sort((a, b) => `${b.date} ${toMinutes(b.timeslot) ?? 0}`.localeCompare(`${a.date} ${toMinutes(a.timeslot) ?? 0}`, undefined, { numeric: true }));
  return NextResponse.json({ conflicts: all.slice(0, MAX_REMINDERS), total: all.length });
}

// ---------------------------------------------------------------------------
// 6) Create the booking (status = 'to pay') through the atomic SQL function
// ---------------------------------------------------------------------------
async function actionCreate(admin: SupabaseClient, userId: string, body: any) {
  if (!isUuid(body.spId)) return bad('Pick a provider first.');
  const now = manilaNow();
  const date: string = body.date;
  if (!ISO_DATE_RE.test(date || '')) return bad('Invalid date.');
  if (date < now.date) return bad('That date is in the past.');
  const slotStart = Number(body.slotStart);
  if (!Number.isInteger(slotStart)) return bad('Pick a time slot.');

  const pets: { petId: string; optionIds: string[]; useAiHaircut?: boolean }[] = Array.isArray(body.pets) ? body.pets : [];
  if (!pets.length || pets.length > MAX_PETS) return bad('Pick your pets first.');
  for (const p of pets) {
    if (!isUuid(p?.petId) || !Array.isArray(p.optionIds) || !p.optionIds.length || !p.optionIds.every(isUuid)) return bad('Invalid pet or service selection.');
  }

  const provider = await fetchApprovedProvider(admin, body.spId);
  if (!provider) return bad('That provider is not available.', 404);

  // The slot must be a real slot on that provider's grid, not in the past.
  const weekday = weekdayOf(date);
  const { data: h, error: hErr } = await admin
    .from('sp_operating_hours').select('opening_time, closing_time, slot_interval, slot_capacity')
    .eq('sp_id', provider.id).eq('day_of_week', weekday).maybeSingle();
  if (hErr) throw new Error(hErr.message);
  if (!h) return bad('That provider is closed on that day.', 409);
  const open = toMinutes(h.opening_time)!;
  const close = toMinutes(h.closing_time)!;
  const onGrid = slotStart >= open && slotStart + h.slot_interval <= close && (slotStart - open) % h.slot_interval === 0;
  if (!onGrid) return bad('That time slot is not valid.');
  if (date === now.date && slotStart <= now.minutes) return bad('That time slot has already passed.', 409);

  const petIds = pets.map((p) => p.petId);
  const { data: aiRows, error: aErr } = await admin
    .from('booking_pet_info').select('registered_pet_id, booking_ai_haircut_url, created_at')
    .in('registered_pet_id', petIds).not('booking_ai_haircut_url', 'is', null).order('created_at', { ascending: false });
  if (aErr) throw new Error(aErr.message);
  const lastAi = new Map<string, string>();
  for (const r of aiRows ?? []) if (r.registered_pet_id && !lastAi.has(r.registered_pet_id)) lastAi.set(r.registered_pet_id, r.booking_ai_haircut_url);

  // The AI haircut preview is optional: it's attached only when the caller
  // chose to reuse the pet's previous image (looked up here, never from the client).
  const payload = pets.map((p) => ({
    pet_id: p.petId,
    option_ids: p.optionIds,
    ai_haircut_url: p.useAiHaircut ? lastAi.get(p.petId) ?? null : null,
  }));

  const { data, error } = await admin.rpc('create_ai_assistant_booking', {
    p_user_id: userId,
    p_sp_id: provider.id,
    p_booking_date: date,
    p_timeslot: slotLabel(slotStart, h.slot_interval),
    p_pets: payload,
  });
  if (error) {
    const code = Object.keys(RPC_ERRORS).find((c) => error.message?.includes(c));
    if (code) return bad(RPC_ERRORS[code][0], RPC_ERRORS[code][1]);
    throw new Error(error.message);
  }

  return NextResponse.json({
    ok: true,
    bookingId: data?.booking_id,
    total: Number(data?.total ?? 0),
    status: 'to pay',
    provider: provider.business_name,
    date,
    timeslot: slotLabel(slotStart, h.slot_interval),
  });
}