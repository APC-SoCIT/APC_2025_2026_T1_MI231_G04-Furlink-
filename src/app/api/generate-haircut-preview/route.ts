import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.POLLINATIONS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Server is missing POLLINATIONS_API_KEY.' }, { status: 500 });
  }

  const incomingForm = await req.formData();

  const response = await fetch('https://gen.pollinations.ai/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: incomingForm,
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    console.error('Pollinations API error:', response.status, response.statusText, bodyText);
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
      console.error('Failed to parse Pollinations JSON response:', err);
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

    console.error('Pollinations JSON response had no image data:', payload);
    return NextResponse.json({ error: 'AI service returned no image.' }, { status: 502 });
  }

  // Already raw image bytes.
  const arrayBuffer = await response.arrayBuffer();
  return new NextResponse(arrayBuffer, { headers: { 'Content-Type': responseContentType || 'image/jpeg' } });
}