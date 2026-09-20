import { NextRequest, NextResponse } from 'next/server';

const OPENAI_FALLBACK_SIZE = '1024x1024';
const OPENAI_FALLBACK_MODEL = 'gpt-image-1.5';

// Pet detection runs before image generation. Pollinations first, OpenAI as fallback, same pattern as the generation step.
type DetectedAnimal = 'dog' | 'cat' | 'other' | 'none';

const POLLINATIONS_DETECT_MODEL = 'openai/gpt-5.4-nano';
const OPENAI_DETECT_MODEL = 'gpt-4o-mini';

const DETECT_PROMPT =
  'Look at this image and reply with JSON only, no other text: ' +
  '{"animal":"dog"|"cat"|"other"|"none"}. ' +
  '"other" = an animal that is not a dog or cat. "none" = no animal visible.';

function parseAnimal(text: string): DetectedAnimal | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const animal = JSON.parse(match?.[0] ?? '').animal;
    return ['dog', 'cat', 'other', 'none'].includes(animal) ? animal : null;
  } catch {
    return null;
  }
}

async function callVisionModel(
  url: string,
  apiKey: string,
  model: string,
  dataUri: string,
  timeoutMs: number,
): Promise<DetectedAnimal> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: DETECT_PROMPT },
            { type: 'image_url', image_url: { url: dataUri } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Vision API ${res.status}`);
  const json = await res.json();
  const animal = parseAnimal(json?.choices?.[0]?.message?.content ?? '');
  if (!animal) throw new Error('Unparseable detection response');
  return animal;
}

// Returns null if every AI fails.
async function detectPetType(
  file: File,
  pollinationsKey?: string,
  openaiKey?: string,
): Promise<DetectedAnimal | null> {
  const buf = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type || 'image/jpeg'};base64,${buf.toString('base64')}`;

  if (pollinationsKey) {
    try {
      return await callVisionModel(
        'https://gen.pollinations.ai/v1/chat/completions',
        pollinationsKey,
        POLLINATIONS_DETECT_MODEL,
        dataUri,
        10_000,
      );
    } catch (err) {
      console.error('Pollinations detection failed, trying fallback:', err);
    }
  }

  if (openaiKey) {
    try {
      return await callVisionModel(
        'https://api.openai.com/v1/chat/completions',
        openaiKey,
        OPENAI_DETECT_MODEL,
        dataUri,
        15_000,
      );
    } catch (err) {
      console.error('OpenAI detection failed:', err);
    }
  }

  return null;
}

// Image generation
async function generateWithPollinations(form: FormData, apiKey: string) {
  return fetch('https://gen.pollinations.ai/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(20_000),
  });
}

async function generateWithOpenAI(imageFile: File, prompt: string, apiKey: string) {
  const form = new FormData();
  form.append('image', imageFile, 'source.jpg');
  form.append('prompt', prompt);
  form.append('model', OPENAI_FALLBACK_MODEL);
  form.append('size', OPENAI_FALLBACK_SIZE);
  form.append('n', '1');

  return fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
}

export async function POST(req: NextRequest) {
  const pollinationsKey = process.env.POLLINATIONS_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!pollinationsKey && !openaiKey) {
    return NextResponse.json({ error: 'Server is missing image-generation API keys.' }, { status: 500 });
  }

  const incomingForm = await req.formData();
  const imageFile = incomingForm.get('image') as File | null;
  const prompt = (incomingForm.get('prompt') as string) || '';

  // Verify the photo if it contains the selected pet type before generation
  const expectedType = ((incomingForm.get('petType') as string) || '').toLowerCase();

  if (imageFile && (expectedType === 'dog' || expectedType === 'cat')) {
    const detected = await detectPetType(imageFile, pollinationsKey, openaiKey);

    if (detected === 'none' || detected === 'other') {
      return NextResponse.json(
        { error: 'We couldn’t find a dog or cat in this photo. Please upload a clear photo of your pet.' },
        { status: 422 },
      );
    }
    if (detected && detected !== expectedType) {
      return NextResponse.json(
        {
          error: `This looks like a ${detected}, but the form says ${expectedType}. Please check the pet type or upload a different photo.`,
        },
        { status: 422 },
      );
    }
    // detected === null means both detectors failed
  }

  incomingForm.delete('petType');

  let response: Response | null = null;
  let usedFallback = false;

  if (pollinationsKey) {
    try {
      response = await generateWithPollinations(incomingForm, pollinationsKey);
      if (!response.ok) {
        console.error('Pollinations returned an error, trying fallback:', response.status);
        response = null;
      }
    } catch (err) {
      console.error('Pollinations request failed, trying fallback:', err);
      response = null;
    }
  }

  if (!response && openaiKey && imageFile) {
    usedFallback = true;
    try {
      response = await generateWithOpenAI(imageFile, prompt, openaiKey);
    } catch (err) {
      console.error('OpenAI fallback request failed:', err);
      return NextResponse.json({ error: 'Both AI image services failed. Please try again shortly.' }, { status: 502 });
    }
  }

  if (!response) {
    return NextResponse.json({ error: 'AI service is currently unavailable.' }, { status: 502 });
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    console.error(`${usedFallback ? 'OpenAI' : 'Pollinations'} API error:`, response.status, response.statusText, bodyText);
    return NextResponse.json(
      { error: `AI service error (${response.status}): ${bodyText || response.statusText}` },
      { status: response.status },
    );
  }

  const responseContentType = response.headers.get('content-type') || '';
  if (responseContentType.includes('application/json')) {
    let payload: any;
    try {
      payload = await response.json();
    } catch (err) {
      console.error('Failed to parse JSON response:', err);
      return NextResponse.json({ error: 'Unexpected response from AI service.' }, { status: 502 });
    }

    const item = payload?.data?.[0] ?? payload;

    if (item?.b64_json) {
      const imageBuffer = Buffer.from(item.b64_json, 'base64');
      return new NextResponse(imageBuffer, {
        headers: { 'Content-Type': item.mime_type || 'image/png' },
      });
    }

    if (item?.url) {
      const imageRes = await fetch(item.url);
      if (!imageRes.ok) {
        console.error('Failed to fetch generated image URL:', item.url, imageRes.status);
        return NextResponse.json({ error: 'Failed to retrieve generated image.' }, { status: 502 });
      }
      const imageBuffer = await imageRes.arrayBuffer();
      const imageContentType = imageRes.headers.get('content-type') || 'image/jpeg';
      return new NextResponse(imageBuffer, {
        headers: { 'Content-Type': imageContentType },
      });
    }

    console.error('JSON response had no image data:', payload);
    return NextResponse.json({ error: 'AI service returned no image.' }, { status: 502 });
  }

  const arrayBuffer = await response.arrayBuffer();
  return new NextResponse(arrayBuffer, { headers: { 'Content-Type': responseContentType || 'image/jpeg' } });
}