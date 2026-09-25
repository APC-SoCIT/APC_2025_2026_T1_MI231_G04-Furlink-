import { NextRequest, NextResponse } from 'next/server';

const GEMINI_CHAT_MODEL = 'gemini-1.5-flash';
const OPENAI_CHAT_MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are the AI assistant for a pet grooming booking platform. You help pet owners with questions about the platform, grooming services, and the booking process.

Scope for now: you can only answer questions and provide information. You cannot yet perform booking actions on the user's behalf (e.g. you cannot create, modify, or cancel a booking). If a user asks you to book an appointment, explain that you can guide them through the booking form but can't submit it for them yet, and point them to the "Book Appointment" page.

Here are the actual facts about this platform — only use these, do not invent details beyond them:
- Services offered for pet owners: grooming services varying from full grooming, nail clipping, basic grooming, etc. depending on the available service providers
- How booking works: browse approved grooming shops → pick a shop → select date and time → fill out pet info → submit
- How to create an account: click sign up button, enter your information and choose whether to be a pet owner, service provider, or both.
- Pricing: pricing may vary per grooming shop, pet type, pet size, or pet breed.

Keep answers short, friendly, and specific to pet grooming and this platform. If something isn't covered by the facts above, say you're not sure rather than guessing.`;

type IncomingMessage = { role: 'user' | 'assistant'; content: string };

async function callGemini(messages: IncomingMessage[], apiKey: string) {
  // Map standard OpenAI-style roles to Gemini's expected roles
  const formattedMessages = messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CHAT_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: formattedMessages,
      }),
      signal: AbortSignal.timeout(15_000),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

async function callOpenAI(messages: IncomingMessage[], apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OPENAI_CHAT_MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  return json?.choices?.[0]?.message?.content?.trim();
}

export async function POST(req: NextRequest) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    return NextResponse.json({ error: 'Server is missing AI API keys.' }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const messages: IncomingMessage[] = body?.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });
  }

  let reply: string | undefined = undefined;

  // Primary: Gemini
  if (geminiKey) {
    try {
      reply = await callGemini(messages, geminiKey);
    } catch (err) {
      console.error('Gemini chat request failed, trying fallback:', err);
    }
  }

  // Fallback: OpenAI
  if (!reply && openaiKey) {
    try {
      reply = await callOpenAI(messages, openaiKey);
    } catch (err) {
      console.error('OpenAI chat fallback failed:', err);
    }
  }

  // If both fail or neither returns a valid response
  if (!reply) {
    return NextResponse.json({ error: 'AI service is currently unavailable.' }, { status: 502 });
  }

  return NextResponse.json({ reply: reply || "I'm not sure how to answer that." });
}