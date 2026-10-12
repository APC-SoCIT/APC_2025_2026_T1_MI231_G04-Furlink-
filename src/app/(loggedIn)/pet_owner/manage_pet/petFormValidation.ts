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

/** A pet can be at most this old, regardless of breed. Keep in sync with the DB trigger. */
export const MAX_PET_AGE_YEARS = 40;
export const DOB_FUTURE_MESSAGE = "Date of birth cannot be in the future.";
export const DOB_TOO_OLD_MESSAGE = `Date of birth cannot be more than ${MAX_PET_AGE_YEARS} years ago.`;

/** Earliest allowed date of birth (YYYY-MM-DD, local time) - for <input type="date" min=...>. */
export function getMinDobLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear() - MAX_PET_AGE_YEARS;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  // Feb 29 minus 40 years may not exist (e.g. 1986 isn't a leap year) - fall back to Feb 28
  const valid = new Date(y, d.getMonth(), d.getDate()).getMonth() === d.getMonth();
  return valid ? `${y}-${mm}-${dd}` : `${y}-02-28`;
}

export function isTooOldDate(value: string): boolean {
  return !!value && value < getMinDobLocalISO();
}

/** Returns an error message if the date of birth is out of range, otherwise null. */
export function getDobError(value: string): string | null {
  if (isFutureDate(value)) return DOB_FUTURE_MESSAGE;
  if (isTooOldDate(value)) return DOB_TOO_OLD_MESSAGE;
  return null;
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