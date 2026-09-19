import { NextRequest, NextResponse } from 'next/server';

const OPENAI_FALLBACK_SIZE = '1024x1024';
const OPENAI_FALLBACK_MODEL = 'gpt-image-1.5';

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