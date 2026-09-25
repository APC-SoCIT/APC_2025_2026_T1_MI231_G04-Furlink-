'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaRobot, FaTimes, FaPaperPlane, FaSpinner } from 'react-icons/fa';
import './ai_booking_assistant.css';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

const SAMPLE_QUESTIONS = [
  'What services do you offer for pet owners?',
  'What are your prices?',
  'How do I book a grooming service?',
  'How do I create an account?',
  'How do I become a service provider?',
];

let idCounter = 0;
const nextId = () => `msg-${Date.now()}-${idCounter++}`;

export default function AIBookingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: trimmed };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-booking-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error('Assistant request failed');

      const data = await res.json();
      const replyText: string = data.reply || "Sorry, I couldn't find an answer to that.";

      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content: replyText }]);
    } catch (err) {
      console.error('AI assistant error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          content: "Sorry, I'm having trouble responding right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

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
          <button
            type="button"
            className="ai-assistant-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close AI assistant"
          >
            <FaTimes />
          </button>
        </div>

        <div className="ai-assistant-body" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="ai-assistant-welcome">
              <p className="ai-assistant-welcome-text">What can I help you with today?</p>
              <div className="ai-assistant-sample-questions">
                {SAMPLE_QUESTIONS.map((q) => (
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
              {msg.content}
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