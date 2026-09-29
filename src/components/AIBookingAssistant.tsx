'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { FaRobot, FaTimes, FaPaperPlane, FaSpinner, FaPlus } from 'react-icons/fa';
import { supabase } from '@/lib/supabase'; // adjust if your export is named differently
import './ai_booking_assistant.css';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

// Existing questions (unchanged)
const SAMPLE_QUESTIONS = [
  'What services do you offer for pet owners?',
  'What are your prices?',
  'How do I book a grooming service?',
  'How do I create an account?',
  'How do I become a service provider?',
];

// NEW: shown only in the pet owner view, where live data is available
const PET_OWNER_SAMPLE_QUESTIONS = [
  'Who are the available service providers in Makati City?',
  'Who offers full grooming with haircut?',
  'Is there a slot open this Saturday at 2 PM for 2 pets?',
  'What services and prices does a shop offer?',
  'How do I contact a service provider?',
];

let idCounter = 0;
const nextId = () => `msg-${Date.now()}-${idCounter++}`;

// Turns any http(s) URL in assistant text into a clickable link (e.g. Google
// Maps pin, social media, email links returned by the AI). User messages are
// rendered as plain text as before.
const URL_SPLIT_RE = /(https?:\/\/[^\s]+)/g;
const isUrl = (s: string) => /^https?:\/\//.test(s);
function renderWithLinks(text: string) {
  const parts = text.split(URL_SPLIT_RE);
  return parts.map((part, i) =>
    isUrl(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="ai-assistant-link">
        {part}
      </a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

export default function AIBookingAssistant() {
  const pathname = usePathname();
  // Route group "(loggedIn)" is not part of the URL, so pet owner pages start with /pet_owner
  const isPetOwnerView = !!pathname?.startsWith('/pet_owner');

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Bumped on every new chat so a reply that arrives late is ignored
  const chatSessionRef = useRef(0);

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

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`ai-assistant-bubble ${
                msg.role === 'user' ? 'ai-assistant-bubble-user' : 'ai-assistant-bubble-assistant'
              }`}
            >
              {msg.role === 'assistant' ? renderWithLinks(msg.content) : msg.content}
            </div>
          ))}

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