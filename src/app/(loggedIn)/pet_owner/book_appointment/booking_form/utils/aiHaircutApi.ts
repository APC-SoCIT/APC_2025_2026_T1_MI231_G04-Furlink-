import { buildHaircutPrompt } from './haircutPrompt';

const PREVIEW_ENDPOINT = '/api/generate-haircut-preview';

/** Errors the user caused or can fix (e.g. a bad photo). Not logged as console errors. */
export class ExpectedPreviewError extends Error {
  expected = true;
}

function extractServerMessage(bodyText: string): string {
  try {
    return JSON.parse(bodyText)?.error || bodyText;
  } catch {
    return bodyText; // not JSON, keep the raw text
  }
}

interface PreviewRequest {
  sourcePhoto: File;
  petType: string;
  style: string;
}

export async function requestHaircutPreview({
  sourcePhoto,
  petType,
  style,
}: PreviewRequest): Promise<Blob> {
  const formData = new FormData();
  formData.append('image', sourcePhoto, 'source.jpg');
  formData.append('prompt', buildHaircutPrompt(petType, style));
  formData.append('seed', String(Math.floor(Math.random() * 1_000_000)));
  formData.append('petType', petType.toLowerCase()); // lets the server verify the photo

  const response = await fetch(PREVIEW_ENDPOINT, { method: 'POST', body: formData });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    const serverMessage = extractServerMessage(bodyText);

    if (response.status === 422) {
      throw new ExpectedPreviewError(serverMessage || 'This photo cannot be used for a preview.');
    }
    if (response.status === 413) {
      throw new ExpectedPreviewError('This photo is too large. Please upload one under 4 MB.');
    }

    if (response.status === 429) {
      throw new ExpectedPreviewError(
        serverMessage || 'The AI service is busy right now. Please try again in a minute.',
      );
    }

    console.error('AI preview error:', response.status, response.statusText, bodyText);

    if (response.status === 504) {
      throw new Error('The preview took too long to generate. Please try again.');
    }

    throw new Error(serverMessage || `AI service error (${response.status})`);
  }

  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) {
    console.error('Unexpected AI preview content type:', blob.type);
    throw new Error('The AI service returned an unexpected response. Please try again.');
  }
  return blob;
}