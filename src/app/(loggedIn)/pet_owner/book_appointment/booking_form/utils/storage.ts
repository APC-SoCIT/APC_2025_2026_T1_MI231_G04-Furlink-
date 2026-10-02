import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'ai-haircut-previews';

export async function uploadFileToBucket(
  supabase: SupabaseClient,
  file: File,
  path: string,
): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) {
    console.error('File upload error:', error.message, error);
    throw new Error(`Upload failed: ${error.message}`);
  }
  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return publicData.publicUrl;
}