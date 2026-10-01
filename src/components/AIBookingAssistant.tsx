'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FaRobot, FaTimes, FaPaperPlane, FaSpinner, FaPlus } from 'react-icons/fa';
import { supabase } from '@/lib/supabase'; // adjust if your export is named differently
import './ai_booking_assistant.css';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

// Shown on public/logged-out pages (landing, signup, login, etc.) — static facts only, no live data.
const SAMPLE_QUESTIONS = [
  'What services do you offer for pet owners?',
  'What are your prices?',
  'How do I book a grooming service?',
  'How do I create an account?',
  'How do I become a service provider?',
];

// Shown only on /pet_owner pages, once the logged-in account is confirmed pet_owner/both_sp_po.
const PET_OWNER_SAMPLE_QUESTIONS = [
  'Who are the available service providers in Makati City?',
  'Who offers grooming with haircut?',
  'Is there a slot open this Saturdays at 2 PM for 2 pets?',
  'What services and prices does a shop offer?',
  'How do I contact a service provider?',
];

let idCounter = 0;
const nextId = () => `msg-${Date.now()}-${idCounter++}`;

// ---------------------------------------------------------------------------
// Assistant reply rendering.
//
// The AI is instructed (in route.ts) to use light markdown ("- " lists,
// **bold**) plus two button tokens instead of ever pasting a raw link:
//   [[ACTION:KEY]]       — a button that navigates INSIDE this app.
//   [[LINK:url|Label]]   — a button that opens an EXTERNAL link in a new tab.
// Everything below turns that text into real React elements. KEY is matched
// against a fixed whitelist, so the model can never point an in-app button
// anywhere we haven't explicitly listed.
// ---------------------------------------------------------------------------

const IN_APP_ACTIONS: Record<string, { path: string; label: string }> = {
  BOOK: { path: '/pet_owner/book_appointment', label: 'Book a Service' },
  ADD_PET: { path: '/pet_owner/manage_pet/add_pet', label: 'Register a Pet' },
  MANAGE_PET: { path: '/pet_owner/manage_pet', label: 'Manage Pet' },
  MANAGE_BOOKINGS: { path: '/pet_owner/manage_bookings', label: 'Manage Bookings' },
};

const ACTION_TOKEN_RE = /\[\[ACTION:([A-Z_]+)\]\]/g;
const LINK_TOKEN_RE = /\[\[LINK:([^|\]]+)\|([^\]]+)\]\]/g;
// Headers are explicitly disallowed in the prompt, but strip any that slip
// through anyway rather than showing a raw "### Heading" line to the user.
const HEADER_LINE_RE = /^#{1,6}\s*/;

type ExternalLink = { url: string; label: string };

/** Pulls the [[ACTION:...]] / [[LINK:...]] tokens out of assistant text, leaving plain prose behind. */
function extractButtons(raw: string): { text: string; action?: { path: string; label: string }; links: ExternalLink[] } {
  let action: { path: string; label: string } | undefined;
  const links: ExternalLink[] = [];

  let text = raw.replace(ACTION_TOKEN_RE, (_match, key: string) => {
    if (!action && IN_APP_ACTIONS[key]) action = IN_APP_ACTIONS[key];
    return '';
  });

  text = text.replace(LINK_TOKEN_RE, (_match, url: string, label: string) => {
    const trimmedUrl = url.trim();
    if (/^(https?:|mailto:)/i.test(trimmedUrl)) links.push({ url: trimmedUrl, label: label.trim() });
    return '';
  });

  return { text: text.trim(), action, links };
}

// Inline formatting within one line: **bold** and bare http(s) URLs (in case
// one slips through outside a [[LINK:...]] token).
const INLINE_RE = /\*\*(.+?)\*\*|https?:\/\/[^\s]+/g;
function renderInline(line: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(line))) {
    if (match.index > lastIndex) nodes.push(line.slice(lastIndex, match.index));
    if (match[0].startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b-${i}`}>{match[1]}</strong>);
    } else {
      nodes.push(
        <a key={`${keyPrefix}-u-${i}`} href={match[0]} target="_blank" rel="noopener noreferrer" className="ai-assistant-link">
          {match[0]}
        </a>
      );
    }
    lastIndex = INLINE_RE.lastIndex;
    i++;
  }
  if (lastIndex < line.length) nodes.push(line.slice(lastIndex));
  return nodes;
}

// Block-level: groups consecutive "- " lines into a real <ul>, consecutive
// "1. " lines into a real <ol> (kept as a fallback only — the model is told
// never to use numbered lists for data, but this still renders sanely if one
// slips through), everything else into paragraphs. Stray markdown header
// lines ("#", "##", "###") are stripped down to plain paragraph text instead
// of being shown as literal hash marks.
function renderBlocks(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (!listItems.length) return;
    const items = listItems.map((item, idx) => <li key={idx}>{renderInline(item, `li-${blocks.length}-${idx}`)}</li>);
    blocks.push(
      listType === 'ol' ? (
        <ol className="ai-assistant-list" key={`list-${blocks.length}`}>
          {items}
        </ol>
      ) : (
        <ul className="ai-assistant-list" key={`list-${blocks.length}`}>
          {items}
        </ul>
      )
    );
    listItems = [];
    listType = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.trim().replace(HEADER_LINE_RE, '');
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+\.\s+(.*)$/.exec(line);

    if (bullet) {
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(bullet[1]);
    } else if (numbered) {
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(numbered[1]);
    } else {
      flushList();
      if (line.length > 0) blocks.push(<p key={`p-${idx}`}>{renderInline(line, `p-${idx}`)}</p>);
    }
  });
  flushList();
  return blocks;
}

// The other (loggedIn) route groups besides pet_owner — the widget never
// shows here, logged in or not, regardless of role.
const OTHER_LOGGED_IN_PREFIXES = ['/admin', '/service_provider', '/both_sp_po'];

export default function AIBookingAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  // Route group "(loggedIn)" is not part of the URL, so pet owner pages start with /pet_owner
  const isPetOwnerPath = !!pathname?.startsWith('/pet_owner');
  const isOtherLoggedInPath = OTHER_LOGGED_IN_PREFIXES.some((p) => pathname?.startsWith(p));

  // Only a /pet_owner path needs an async check (is this actually a logged-in
  // pet_owner/both_sp_po account?). Public pages need no check at all, so they
  // render the generic widget immediately with no loading flash.
  const [petOwnerAllowed, setPetOwnerAllowed] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Bumped on every new chat so a reply that arrives late is ignored
  const chatSessionRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    if (!isPetOwnerPath) {
      setPetOwnerAllowed(false);
      return;
    }

    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        if (!cancelled) setPetOwnerAllowed(false);
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', user.id).maybeSingle();
      const allowed = !!profile && profile.status === 'active' && ['pet_owner', 'both_sp_po'].includes(profile.role ?? '');
      if (!cancelled) setPetOwnerAllowed(allowed);
    })();

    return () => {
      cancelled = true;
    };
  }, [isPetOwnerPath]);

  // Confirmed live mode only once the /pet_owner role check above has actually passed.
  const isPetOwnerView = isPetOwnerPath && petOwnerAllowed;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const sessionId = chatSessionRef.current;
    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: trimmed };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setIsLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // NEW: send the session token so the server can verify the user is a pet owner
      if (isPetOwnerView) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch('/api/ai-booking-assistant', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({ role: m.role, content: m.content })),
          petOwnerView: isPetOwnerView,
        }),
      });

      if (!res.ok) throw new Error('Assistant request failed');

      const data = await res.json();
      if (data.debug) console.warn('[AI assistant debug]', data.debug); // dev only
      if (sessionId !== chatSessionRef.current) return; // chat was reset while waiting
      const replyText: string = data.reply || "Sorry, I couldn't find an answer to that.";

      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content: replyText }]);
    } catch (err) {
      console.error('AI assistant error:', err);
      if (sessionId !== chatSessionRef.current) return;
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          content: "Sorry, I'm having trouble responding right now. Please try again in a moment.",
        },
      ]);
    } finally {
      if (sessionId === chatSessionRef.current) setIsLoading(false);
    }
  };

  // Used by an [[ACTION:...]] button: navigate and close the panel behind it
  const goTo = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  // End the current chat and start a fresh one
  const handleNewChat = () => {
    chatSessionRef.current += 1;
    setMessages([]);
    setInput('');
    setIsLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Hide entirely on admin/service_provider/both_sp_po pages, and on a
  // /pet_owner page until the role check above has actually confirmed access
  // (never show the live widget to an unconfirmed or disallowed account).
  if (isOtherLoggedInPath) return null;
  if (isPetOwnerPath && !petOwnerAllowed) return null;

  const sampleQuestions = isPetOwnerView ? PET_OWNER_SAMPLE_QUESTIONS : SAMPLE_QUESTIONS;

  return (
    <>
      {/* Floating circle icon */}
      <button
        type="button"
        className={`ai-assistant-fab ${isOpen ? 'ai-assistant-fab-hidden' : ''}`}
        onClick={() => setIsOpen(true)}
        aria-label="Open AI booking assistant"
      >
        <FaRobot />
      </button>

      {/* Backdrop (click outside to close) */}
      {isOpen && <div className="ai-assistant-backdrop" onClick={() => setIsOpen(false)} />}

      {/* Slide-in chat panel */}
      <div className={`ai-assistant-panel ${isOpen ? 'ai-assistant-panel-open' : ''}`}>
        <div className="ai-assistant-header">
          <span className="ai-assistant-header-title">
            <FaRobot style={{ marginRight: 8 }} />
            AI Assistant
          </span>
          <div className="ai-assistant-header-actions">
            <button
              type="button"
              className="ai-assistant-new-chat-btn"
              onClick={handleNewChat}
              disabled={messages.length === 0 && !isLoading}
              aria-label="End chat and start a new one"
              title="End chat and start a new one"
            >
              <FaPlus /> New chat
            </button>
            <button
              type="button"
              className="ai-assistant-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI assistant"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="ai-assistant-body" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="ai-assistant-welcome">
              <p className="ai-assistant-welcome-text">What can I help you with today?</p>
              <div className="ai-assistant-sample-questions">
                {sampleQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="ai-assistant-sample-chip"
                    onClick={() => sendMessage(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="ai-assistant-bubble ai-assistant-bubble-user">
                  {msg.content}
                </div>
              );
            }

            const { text, action, links } = extractButtons(msg.content);
            return (
              <div key={msg.id} className="ai-assistant-bubble ai-assistant-bubble-assistant">
                {renderBlocks(text)}
                {(action || links.length > 0) && (
                  <div className="ai-assistant-buttons">
                    {links.map((link, i) => (
                      <a
                        key={`link-${i}`}
                        href={link.url}
                        target={link.url.startsWith('mailto:') ? undefined : '_blank'}
                        rel="noopener noreferrer"
                        className="ai-assistant-link-btn"
                      >
                        {link.label}
                      </a>
                    ))}
                    {action && (
                      <button type="button" className="ai-assistant-action-btn" onClick={() => goTo(action.path)}>
                        {action.label}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="ai-assistant-bubble ai-assistant-bubble-assistant ai-assistant-typing">
              <FaSpinner className="ai-spin-icon" /> Thinking...
            </div>
          )}
        </div>

        <form className="ai-assistant-input-row" onSubmit={handleSubmit}>
          <input
            type="text"
            className="ai-assistant-input"
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="ai-assistant-send-btn"
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            <FaPaperPlane />
          </button>
        </form>
      </div>
    </>
  );
}