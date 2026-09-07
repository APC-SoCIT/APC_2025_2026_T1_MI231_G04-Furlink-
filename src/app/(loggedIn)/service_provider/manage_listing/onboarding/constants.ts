/**
 * constants.ts
 * ---------------------------------------------------------------------------
 * Static, non-reactive values used across the Service Provider onboarding
 * flow (page.tsx, ConfirmationModal.tsx, hooks/*).
 *
 * Keeping these here (instead of inline in page.tsx) means:
 *  - page.tsx doesn't redeclare them on every render
 *  - the same regex/options are reused by validation + display without
 *    risk of the two copies drifting apart
 */

/** Employee position dropdown options. Value = stored in DB, label = shown in UI. */
export const POSITION_OPTIONS = [
  { value: "business_owner", label: "Business Owner" },
  { value: "pet_stylist", label: "Pet Stylist" },
  { value: "staff", label: "Staff" },
] as const;

/** Short + full day-of-week labels, used for the operating-hours day picker. */
export const DAYS_OF_WEEK_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
export const DAYS_OF_WEEK_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/* ---------------------------------------------------------------------- */
/* Validation regex — shared by useValidation and any inline field checks  */
/* ---------------------------------------------------------------------- */

/** Basic email format check (requires a domain with a 2+ letter TLD). */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/** PH mobile numbers: starts with 09, followed by exactly 9 more digits (11 digits total). */
export const PH_MOBILE_REGEX = /^09\d{9}$/;

/** Loose URL check — optional protocol, domain, path, and query string. */
export const URL_REGEX =
  /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?(\?.*)?$/;

/** PH postal codes are exactly 4 digits. */
export const POSTAL_CODE_REGEX = /^\d{4}$/;

/** Business description character limit (enforced on input + on submit). */
export const DESCRIPTION_MAX_LENGTH = 250;