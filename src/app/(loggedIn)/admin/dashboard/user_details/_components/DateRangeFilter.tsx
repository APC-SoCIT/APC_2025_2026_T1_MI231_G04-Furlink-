"use client";

import type { ChangeEvent } from "react";
import styles from "../page.module.css";

// Returns today's date as YYYY-MM-DD in Philippine Standard Time (UTC+8),
// regardless of the user's device timezone.
export const getTodayPST = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

// Keeps only items whose date (YYYY-MM-DD part) falls inside the selected range.
// With no range selected, every item is returned (including ones with no date).
export function filterByDateRange<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  dateFrom: string,
  dateTo: string
): T[] {
  if (!dateFrom && !dateTo) return items;
  return items.filter((item) => {
    const day = getDate(item)?.slice(0, 10);
    if (!day) return false;
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  });
}

type DateRangeFilterProps = {
  dateFrom: string;
  dateTo: string;
  onChangeFrom: (value: string) => void;
  onChangeTo: (value: string) => void;
  shownCount: number;
  totalCount: number;
  itemLabel: string;
};

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onChangeFrom,
  onChangeTo,
  shownCount,
  totalCount,
  itemLabel,
}: DateRangeFilterProps) {
  // Recomputed on every render so it stays correct if the page is left open past midnight.
  const today = getTodayPST();

  const hasFilter = !!dateFrom || !!dateTo;
  const invalidRange = !!dateFrom && !!dateTo && dateFrom > dateTo;

  // Blocks future dates even when typed manually, and resets the visible input too.
  const handleChange =
    (setter: (value: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value && value > today) {
        e.target.value = today;
        setter(today);
      } else {
        setter(value);
      }
    };

  return (
    <>
      <div className={styles["date-filter"]}>
        <label className={styles["date-filter-field"]}>
          <span>From</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || today}
            onChange={handleChange(onChangeFrom)}
          />
        </label>
        <label className={styles["date-filter-field"]}>
          <span>To</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            max={today}
            onChange={handleChange(onChangeTo)}
          />
        </label>
        {hasFilter && (
          <button
            type="button"
            className={styles["date-filter-clear"]}
            onClick={() => {
              onChangeFrom("");
              onChangeTo("");
            }}
          >
            Clear
          </button>
        )}
        <span className={styles["date-filter-count"]}>
          {shownCount} of {totalCount} {itemLabel}
        </span>
      </div>
      {invalidRange && (
        <div className={styles["action-error"]}>"From" date must be before "To" date.</div>
      )}
    </>
  );
}