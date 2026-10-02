export const MAX_MEDICAL_FILE_BYTES = 1 * 1024 * 1024; // 1 MB
export const MEDICAL_FILE_ACCEPT = "image/png, image/jpeg";
const ALLOWED_TYPES = ["image/png", "image/jpeg"];

/** Today's date as YYYY-MM-DD in the user's local timezone (for <input type="date" max=...>). */
export function getTodayLocalISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function isFutureDate(value: string): boolean {
  return !!value && value > getTodayLocalISO();
}

/** Returns a warning message if the file is invalid, otherwise null. */
export function validateMedicalFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported file type. Please upload a PNG or JPG image.`;
  }
  if (file.size > MAX_MEDICAL_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(2);
    return `"${file.name}" is ${mb} MB, which exceeds the 1 MB limit. Please choose a smaller file.`;
  }
  return null;
}
