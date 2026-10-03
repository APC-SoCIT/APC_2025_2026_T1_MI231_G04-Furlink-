'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Guided "Book a Service" flow rendered inside the AI assistant chat.
//
//   pets? -> criteria -> slots -> pick pets -> pick services -> (haircut) ->
//   price summary -> confirm -> booking created with status "to pay"
//
// It is a deterministic UI (not LLM-driven) so pets, prices and totals can
// never be invented. All data comes from /api/ai-booking-assistant/book.
// ---------------------------------------------------------------------------

// If your booking page reads the provider from a different query param (or a
// route segment), change it HERE only.
const bookAppointmentPath = (spId: string) => `/pet_owner/book_appointment?sp_id=${encodeURIComponent(spId)}`;
const MANAGE_PET_PATH = '/pet_owner/manage_pet';
const MANAGE_BOOKINGS_PATH = '/pet_owner/manage_bookings';

type Pet = { id: string; name: string; type: string; breed: string; weight: number };
type ProviderOpt = { id: string; name: string; address: string };
type Slot = { start: number; time: string; spots_left: number };
type DayResult = { date: string; weekday: string; open: boolean; slots: Slot[] };
type FindResult = { id: string; name: string; address: string; slots: Slot[] };
type Svc = { optionId: string; name: string; description: string; haircut: boolean; price: number };
type PetServices = Pet & { services: Svc[]; lastAiHaircutUrl: string | null; hasLastAiHaircut: boolean };
type Chosen = { spId: string; spName: string; date: string; slot: Slot };
type Conflict = { petName: string; provider: string; date: string; timeslot: string; status: string; services: string[] };
type Done = { total: number; provider: string; date: string; timeslot: string };

type Step = 'loading' | 'no_pets' | 'criteria' | 'results' | 'pets' | 'services' | 'haircut' | 'conflict' | 'summary' | 'submitting' | 'done' | 'error';

const peso = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const prettyDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
// Bookings need 24h notice, so the earliest pickable date is the Manila date 24 hours from now.
const earliestDateISO = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));

async function api<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch('/api/ai-booking-assistant/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Something went wrong. Please try again.');
  return json as T;
}

type Props = {
  /** Navigate inside the app and close the assistant panel. */
  onNavigate: (path: string) => void;
  /** Called after each step renders so the chat can scroll to the newest content. */
  onLayout?: () => void;
};

export default function AIBookingFlow({ onNavigate, onLayout }: Props) {
  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [pets, setPets] = useState<Pet[]>([]);
  const [providers, setProviders] = useState<ProviderOpt[]>([]);

  // criteria
  const [petCount, setPetCount] = useState(1);
  const [providerId, setProviderId] = useState('');
  const [service, setService] = useState('');
  const [area, setArea] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // results
  const [dayResults, setDayResults] = useState<DayResult[]>([]);
  const [findResults, setFindResults] = useState<FindResult[]>([]);
  const [resultProviderName, setResultProviderName] = useState('');

  // selections
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [petServices, setPetServices] = useState<PetServices[]>([]);
  const [picks, setPicks] = useState<Record<string, string[]>>({}); // petId -> optionIds
  const [useAiImages, setUseAiImages] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [conflictTotal, setConflictTotal] = useState(0);

  useEffect(() => { onLayout?.(); }, [step, dayResults, findResults, busy, error]); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 1: does the caller have a registered pet?
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ pets: p }, { providers: pr }] = await Promise.all([
          api<{ pets: Pet[] }>('start'),
          api<{ providers: ProviderOpt[] }>('providers'),
        ]);
        if (cancelled) return;
        setPets(p);
        setProviders(pr);
        setStep(p.length ? 'criteria' : 'no_pets');
      } catch (e) {
        if (!cancelled) { setError((e as Error).message); setStep('error'); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const maxPets = Math.min(pets.length, 10);
  const providerChosen = !!providerId;

  // ---- Step 2: find slots ---------------------------------------------------
  const searchSlots = async () => {
    setError('');
    if (!providerChosen && !date) { setError('Please pick a date so I can look for providers.'); return; }
    if (date && date < earliestDateISO()) { setError('Bookings must be made at least 24 hours in advance. Please pick a later date.'); return; }
    setBusy(true);
    try {
      if (providerChosen) {
        const r = await api<{ provider: ProviderOpt; days: DayResult[] }>('availability', {
          spId: providerId, date: date || undefined, days: date ? 1 : 7, petCount,
        });
        setResultProviderName(r.provider.name);
        setDayResults(r.days);
        setFindResults([]);
      } else {
        const r = await api<{ providers: FindResult[] }>('find', { date, petCount, time: time || undefined, area: area || undefined, service: service || undefined });
        setFindResults(r.providers);
        setDayResults([]);
      }
      setStep('results');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const chooseSlot = (spId: string, spName: string, d: string, slot: Slot) => {
    setChosen({ spId, spName, date: d, slot });
    setSelectedPetIds([]);
    setStep('pets');
  };

  // ---- Step 3: pets -> services ---------------------------------------------
  const togglePet = (id: string) =>
    setSelectedPetIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < petCount ? [...cur, id] : cur));

  const loadServices = async () => {
    if (!chosen) return;
    setError('');
    setBusy(true);
    try {
      const r = await api<{ pets: PetServices[] }>('services', { spId: chosen.spId, petIds: selectedPetIds });
      setPetServices(r.pets);
      setPicks(Object.fromEntries(r.pets.map((p) => [p.id, []])));
      setStep('services');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // ---- Step 4: services -----------------------------------------------------
  const togglePick = (petId: string, optionId: string) =>
    setPicks((cur) => {
      const list = cur[petId] ?? [];
      return { ...cur, [petId]: list.includes(optionId) ? list.filter((x) => x !== optionId) : [...list, optionId] };
    });

  const petLines = useMemo(
    () =>
      petServices.map((p) => {
        const items = p.services.filter((s) => (picks[p.id] ?? []).includes(s.optionId));
        return { pet: p, items, subtotal: items.reduce((sum, s) => sum + s.price, 0) };
      }),
    [petServices, picks]
  );
  const grandTotal = petLines.reduce((sum, l) => sum + l.subtotal, 0);
  const everyPetHasService = petLines.length > 0 && petLines.every((l) => l.items.length > 0);
  const haircutLines = petLines.filter((l) => l.items.some((s) => s.haircut));

  // Before the summary: always remind the user of every existing booking the
  // chosen pets have (any date, time, service, provider or status). If the
  // lookup itself fails, don't block booking.
  const goToSummary = async () => {
    if (!chosen) return;
    setError('');
    setBusy(true);
    try {
      const r = await api<{ conflicts: Conflict[]; total: number }>('conflicts', { petIds: petLines.map((l) => l.pet.id) });
      setConflicts(r.conflicts);
      setConflictTotal(r.total);
      setStep(r.conflicts.length ? 'conflict' : 'summary');
    } catch {
      setConflicts([]);
      setConflictTotal(0);
      setStep('summary');
    } finally {
      setBusy(false);
    }
  };

  const afterServices = () => {
    setError('');
    setUseAiImages(false);
    if (haircutLines.length) setStep('haircut');
    else goToSummary();
  };

  // ---- Step 6: create the booking ------------------------------------------
  const confirmBooking = async () => {
    if (!chosen) return;
    setError('');
    setBusy(true);
    setStep('submitting');
    try {
      const r = await api<{ total: number; provider: string; date: string; timeslot: string }>('create', {
        spId: chosen.spId,
        date: chosen.date,
        slotStart: chosen.slot.start,
        pets: petLines.map((l) => ({
          petId: l.pet.id,
          optionIds: l.items.map((s) => s.optionId),
          useAiHaircut: l.items.some((s) => s.haircut) && l.pet.hasLastAiHaircut ? useAiImages : false,
        })),
      });
      setDone(r);
      setStep('done');
    } catch (e) {
      setError((e as Error).message);
      setStep('summary');
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    setChosen(null); setSelectedPetIds([]); setPetServices([]); setPicks({}); setDone(null); setError('');
    setDayResults([]); setFindResults([]); setStep('criteria');
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const Err = () => (error ? <p className="ai-flow-error" role="alert">{error}</p> : null);

  if (step === 'loading') return <div className="ai-flow ai-assistant-typing"><FaSpinner className="ai-spin-icon" /> Checking your pets...</div>;

  if (step === 'error') {
    return (
      <div className="ai-flow">
        <p>I couldn&apos;t start the booking just now. {error}</p>
      </div>
    );
  }

  if (step === 'no_pets') {
    return (
      <div className="ai-flow">
        <p>You don&apos;t have a registered pet yet. Please register a pet first, then come back and I&apos;ll help you book.</p>
        <div className="ai-assistant-buttons">
          <button type="button" className="ai-assistant-action-btn" onClick={() => onNavigate(MANAGE_PET_PATH)}>Manage Pet</button>
        </div>
      </div>
    );
  }

  if (step === 'criteria') {
    return (
      <div className="ai-flow">
        <p>Let&apos;s book a service. Tell me what you have in mind. Leave the provider empty and I&apos;ll find one with room.</p>

        <label className="ai-flow-label">How many pets?
          <select className="ai-flow-field" value={petCount} onChange={(e) => setPetCount(Number(e.target.value))}>
            {Array.from({ length: maxPets }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        <label className="ai-flow-label">Service provider
          <select className="ai-flow-field" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            <option value="">Help me find one</option>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        {!providerChosen && (
          <>
            <label className="ai-flow-label">Service (optional)
              <input className="ai-flow-field" type="text" placeholder="e.g. full grooming" value={service} onChange={(e) => setService(e.target.value)} />
            </label>
            <label className="ai-flow-label">Area (optional)
              <input className="ai-flow-field" type="text" placeholder="e.g. Makati" value={area} onChange={(e) => setArea(e.target.value)} />
            </label>
          </>
        )}

        <label className="ai-flow-label">{providerChosen ? 'Date (leave empty to see the next 7 days)' : 'Date'}
          <input className="ai-flow-field" type="date" min={earliestDateISO()} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        {!providerChosen && (
          <label className="ai-flow-label">Preferred time (optional)
            <input className="ai-flow-field" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        )}

        <Err />
        <div className="ai-assistant-buttons">
          <button type="button" className="ai-assistant-action-btn" disabled={busy} onClick={searchSlots}>
            {busy ? 'Searching...' : 'Show available slots'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'results') {
    const nothing = providerChosen ? dayResults.every((d) => !d.slots.length) : findResults.length === 0;
    return (
      <div className="ai-flow">
        {providerChosen ? (
          <p>Open slots at <strong>{resultProviderName}</strong> for {petCount} pet{petCount > 1 ? 's' : ''}. Tap a time to pick it.</p>
        ) : (
          <p>Providers with room for {petCount} pet{petCount > 1 ? 's' : ''} on <strong>{prettyDate(date)}</strong>. Tap a time to pick it.</p>
        )}

        {providerChosen && dayResults.map((d) => (
          <div key={d.date} className="ai-flow-group">
            <div className="ai-flow-group-title">{d.weekday}, {prettyDate(d.date)}</div>
            {!d.open ? <span className="ai-flow-muted">Closed</span> : d.slots.length === 0 ? <span className="ai-flow-muted">No open slots</span> : (
              <div className="ai-flow-chips">
                {d.slots.map((s) => (
                  <button key={s.start} type="button" className="ai-flow-chip" onClick={() => chooseSlot(providerId, resultProviderName, d.date, s)}>{s.time}</button>
                ))}
              </div>
            )}
          </div>
        ))}

        {!providerChosen && findResults.map((p) => (
          <div key={p.id} className="ai-flow-group">
            <div className="ai-flow-group-title">{p.name}</div>
            <div className="ai-flow-muted">{p.address}</div>
            <div className="ai-flow-chips">
              {p.slots.map((s) => (
                <button key={s.start} type="button" className="ai-flow-chip" onClick={() => chooseSlot(p.id, p.name, date, s)}>{s.time}</button>
              ))}
            </div>
          </div>
        ))}

        {nothing && <p>Nothing is open that matches. Try another date or time, or a different provider.</p>}
        <div className="ai-assistant-buttons">
          <button type="button" className="ai-assistant-link-btn" onClick={() => setStep('criteria')}>Change search</button>
        </div>
      </div>
    );
  }

  if (step === 'pets' && chosen) {
    return (
      <div className="ai-flow">
        <p><strong>{chosen.spName}</strong>, {prettyDate(chosen.date)} at <strong>{chosen.slot.time}</strong>.</p>
        <p>Which pet{petCount > 1 ? 's' : ''} would you like to book? Choose {petCount} ({selectedPetIds.length} selected).</p>
        <div className="ai-flow-list">
          {pets.map((p) => {
            const on = selectedPetIds.includes(p.id);
            const locked = !on && selectedPetIds.length >= petCount;
            return (
              <label key={p.id} className={`ai-flow-option ${on ? 'ai-flow-option-on' : ''} ${locked ? 'ai-flow-option-locked' : ''}`}>
                <input type="checkbox" checked={on} disabled={locked} onChange={() => togglePet(p.id)} />
                <span><strong>{p.name}</strong><br /><span className="ai-flow-muted">{p.type === 'dog' ? 'Dog' : 'Cat'}, {p.breed}, {p.weight} kg</span></span>
              </label>
            );
          })}
        </div>
        <Err />
        <div className="ai-assistant-buttons">
          <button type="button" className="ai-assistant-action-btn" disabled={busy || selectedPetIds.length !== petCount} onClick={loadServices}>
            {busy ? 'Loading...' : 'Continue'}
          </button>
          <button type="button" className="ai-assistant-link-btn" onClick={() => setStep('results')}>Back</button>
        </div>
      </div>
    );
  }

  if (step === 'services' && chosen) {
    return (
      <div className="ai-flow">
        <p>What services would you like for each pet? Pick at least one per pet.</p>
        {petLines.map(({ pet, subtotal }) => (
          <div key={pet.id} className="ai-flow-group">
            <div className="ai-flow-group-title">{pet.name} <span className="ai-flow-muted">({pet.type === 'dog' ? 'Dog' : 'Cat'}, {pet.weight} kg)</span></div>
            {pet.services.length === 0 ? (
              <span className="ai-flow-muted">{chosen.spName} has no service that fits {pet.name}. Go back and choose another provider.</span>
            ) : (
              <div className="ai-flow-list">
                {pet.services.map((s) => {
                  const on = (picks[pet.id] ?? []).includes(s.optionId);
                  return (
                    <label key={s.optionId} className={`ai-flow-option ${on ? 'ai-flow-option-on' : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => togglePick(pet.id, s.optionId)} />
                      <span>
                        <strong>{s.name}</strong> <span className="ai-flow-price">{peso(s.price)}</span>
                        {s.haircut && <span className="ai-flow-tag">Haircut included</span>}
                        <br /><span className="ai-flow-muted">{s.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            {subtotal > 0 && <div className="ai-flow-subtotal">{pet.name} subtotal: {peso(subtotal)}</div>}
          </div>
        ))}
        <Err />
        <div className="ai-assistant-buttons">
          <button type="button" className="ai-assistant-action-btn" disabled={!everyPetHasService || busy} onClick={afterServices}>{busy ? 'Checking...' : 'Continue'}</button>
          <button type="button" className="ai-assistant-link-btn" onClick={() => setStep('pets')}>Back</button>
        </div>
      </div>
    );
  }

  if (step === 'haircut' && chosen) {
    const withImage = haircutLines.filter((l) => l.pet.hasLastAiHaircut && l.pet.lastAiHaircutUrl);
    const withoutImage = haircutLines.filter((l) => !l.pet.hasLastAiHaircut);
    return (
      <div className="ai-flow">
        <p>
          {haircutLines.length > 1 ? 'Some of the services you picked include' : 'A service you picked includes'} a haircut. An AI haircut preview is
          optional. You can book right here without one.
        </p>

        {withImage.map((l) => (
          <div key={l.pet.id} className="ai-flow-group">
            <div className="ai-flow-group-title">{l.pet.name}&apos;s last AI haircut</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ai-flow-image" src={l.pet.lastAiHaircutUrl as string} alt={`${l.pet.name}'s last AI-generated haircut`} />
          </div>
        ))}

        {withImage.length > 0 && withoutImage.length > 0 && (
          <p className="ai-flow-muted">{withoutImage.map((l) => l.pet.name).join(', ')} {withoutImage.length > 1 ? "don't" : "doesn't"} have a previous AI haircut image.</p>
        )}

        <p>
          {withImage.length > 0
            ? `Would you like to use the previous image${withImage.length > 1 ? 's' : ''}, continue without a preview, or generate a new one in the booking form for ${chosen.spName}?`
            : `Would you like to continue without a preview, or generate one in the booking form for ${chosen.spName}?`}
        </p>

        <div className="ai-assistant-buttons">
          {withImage.length > 0 && (
            <button type="button" className="ai-assistant-action-btn" disabled={busy} onClick={() => { setUseAiImages(true); goToSummary(); }}>
              Use previous image{withImage.length > 1 ? 's' : ''}
            </button>
          )}
          <button
            type="button"
            className={withImage.length > 0 ? 'ai-assistant-link-btn' : 'ai-assistant-action-btn'}
            disabled={busy} onClick={() => { setUseAiImages(false); goToSummary(); }}
          >
            Continue without preview
          </button>
          <button type="button" className="ai-assistant-link-btn" onClick={() => onNavigate(bookAppointmentPath(chosen.spId))}>
            Generate a new one in booking form
          </button>
          <button type="button" className="ai-assistant-link-btn" onClick={() => setStep('services')}>Back</button>
        </div>
      </div>
    );
  }

  if (step === 'conflict' && chosen) {
    const statusText: Record<string, string> = {
      pending_sp_response: 'Pending provider response',
      'to pay': 'To Pay',
      approved: 'Approved',
      rejected: 'Rejected',
      paid: 'Paid',
      cancelled: 'Cancelled',
      cancelled_by_po: 'Cancelled by you',
      processing: 'Processing',
      to_refund: 'To refund',
      refunded: 'Refunded',
      to_rate: 'To rate',
      rated: 'Rated',
      completed: 'Completed',
    };
    const petNames = [...new Set(petLines.map((l) => l.pet.name))].join(', ');
    return (
      <div className="ai-flow">
        <p><strong>Just a reminder:</strong> {petNames} already {petLines.length > 1 ? 'have' : 'has'} {conflictTotal === 1 ? 'a booking' : 'bookings'} on record.</p>
        {conflicts.map((c, i) => (
          <div key={i} className="ai-flow-group">
            <div className="ai-flow-group-title">{c.petName}</div>
            <div className="ai-flow-row"><span>{c.services.join(', ') || 'Service not listed'}</span><span>{statusText[c.status] ?? c.status}</span></div>
            <div className="ai-flow-muted">{c.provider}, {prettyDate(c.date)}, {c.timeslot}</div>
          </div>
        ))}
        {conflictTotal > conflicts.length && <p className="ai-flow-muted">...and {conflictTotal - conflicts.length} more. See all of them in Manage Bookings.</p>}
        <p>Would you like to review {conflictTotal === 1 ? 'it' : 'them'} first, or go ahead with this new booking?</p>
        <div className="ai-assistant-buttons">
          <button type="button" className="ai-assistant-action-btn" onClick={() => onNavigate(MANAGE_BOOKINGS_PATH)}>Manage Bookings</button>
          <button type="button" className="ai-assistant-link-btn" onClick={() => setStep('summary')}>Proceed with booking</button>
          <button type="button" className="ai-assistant-link-btn" onClick={() => setStep(haircutLines.length ? 'haircut' : 'services')}>Back</button>
        </div>
      </div>
    );
  }

  if ((step === 'summary' || step === 'submitting') && chosen) {
    return (
      <div className="ai-flow">
        <p>Here&apos;s your booking summary:</p>
        <div className="ai-flow-group">
          <div className="ai-flow-group-title">{chosen.spName}</div>
          <div className="ai-flow-muted">{prettyDate(chosen.date)}, {chosen.slot.time}</div>
        </div>

        {petLines.map(({ pet, items, subtotal }) => (
          <div key={pet.id} className="ai-flow-group">
            <div className="ai-flow-group-title">{pet.name}</div>
            {items.map((s) => (
              <div key={s.optionId} className="ai-flow-row"><span>{s.name}</span><span>{peso(s.price)}</span></div>
            ))}
            <div className="ai-flow-row ai-flow-row-total"><span>Total for {pet.name}</span><span>{peso(subtotal)}</span></div>
          </div>
        ))}

        <div className="ai-flow-row ai-flow-grand"><span>Total to pay</span><span>{peso(grandTotal)}</span></div>
        <p>Are you sure you want to proceed? The booking will be created with the status <strong>To Pay</strong>.</p>

        <Err />
        <div className="ai-assistant-buttons">
          <button type="button" className="ai-assistant-action-btn" disabled={step === 'submitting'} onClick={confirmBooking}>
            {step === 'submitting' ? 'Booking...' : 'Yes, book it'}
          </button>
          <button type="button" className="ai-assistant-link-btn" disabled={step === 'submitting'} onClick={() => setStep(haircutLines.length ? 'haircut' : 'services')}>Back</button>
          {error && step === 'summary' && (
            <button type="button" className="ai-assistant-link-btn" onClick={() => { setError(''); setStep('criteria'); }}>Pick another time</button>
          )}
        </div>
      </div>
    );
  }

  if (step === 'done' && done) {
    return (
      <div className="ai-flow">
        <p><strong>Your booking is created.</strong></p>
        <p>
          {done.provider}, {prettyDate(done.date)}, {done.timeslot}.<br />
          Total: <strong>{peso(done.total)}</strong>. Status: <strong>To Pay</strong>.
        </p>
        <p>You can pay for it from the Manage Bookings page.</p>
        <div className="ai-assistant-buttons">
          <button type="button" className="ai-assistant-action-btn" onClick={() => onNavigate(MANAGE_BOOKINGS_PATH)}>Manage Bookings</button>
          <button type="button" className="ai-assistant-link-btn" onClick={restart}>Book another</button>
        </div>
      </div>
    );
  }

  return null;
}