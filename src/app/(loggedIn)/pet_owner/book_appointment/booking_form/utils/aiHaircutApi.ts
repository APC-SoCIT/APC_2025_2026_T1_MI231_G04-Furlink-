import { buildHaircutPrompt } from './haircutPrompt';

const PREVIEW_ENDPOINT = '/api/generate-haircut-preview';
const AI_PREVIEW_DIMENSION = 768;

/** Errors the user caused (e.g. a bad photo). Not logged as console errors. */
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
  formData.append('model', 'kontext');
  formData.append('size', `${AI_PREVIEW_DIMENSION}x${AI_PREVIEW_DIMENSION}`);
  formData.append('seed', String(Math.floor(Math.random() * 1_000_000)));
  formData.append('petType', petType.toLowerCase()); // lets the server verify the photo

  const response = await fetch(PREVIEW_ENDPOINT, { method: 'POST', body: formData });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');

    if (response.status === 422) {
      throw new ExpectedPreviewError(
        extractServerMessage(bodyText) || 'This photo cannot be used for a preview.',
      );
    }

    console.error('AI preview error:', response.status, response.statusText, bodyText);

    if (response.status === 504) {
      throw new Error(
        'Too many requests. Please wait about 15 seconds before generating another preview.',
      );
    }
    if (response.status === 402) {
      throw new Error('Unable to process your request at this moment. Please try again later.');
    }

    throw new Error(
      extractServerMessage(bodyText) || `AI service error (${response.status})`,
    );
  }

  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) {
    console.error('Unexpected AI preview content type:', blob.type);
    throw new Error('The AI service returned an unexpected response. Please try again.');
  }
  return blob;
}