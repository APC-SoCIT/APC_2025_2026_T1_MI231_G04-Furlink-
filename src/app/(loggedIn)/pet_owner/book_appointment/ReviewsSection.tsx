"use client";

import React, { useMemo, useState } from "react";
import "./reviews_section.css";

export type Review = {
  id: string;
  booking_date: string;
  booking_overall_rating: number | null;
  booking_staff_rating: number | null;
  booking_review: string | null;
};

type Category = "average" | "overall" | "staff";
type StarFilter = "all" | 1 | 2 | 3 | 4 | 5;
type SortOrder = "newest" | "oldest";

const CATEGORY_LABELS: Record<Category, string> = {
  average: "Booking average",
  overall: "Overall",
  staff: "Staff",
};

const mean = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

/** Average of the ratings the customer gave for that one booking. */
const bookingAverage = (r: Review): number | null =>
  mean(
    [r.booking_overall_rating, r.booking_staff_rating].filter(
      (v): v is number => typeof v === "number"
    )
  );

/** Rating used by the chosen category (null when the customer left none). */
const ratingFor = (r: Review, category: Category): number | null =>
  category === "overall"
    ? r.booking_overall_rating
    : category === "staff"
    ? r.booking_staff_rating
    : bookingAverage(r);

function Stars({ value, size = 18 }: { value: number | null; size?: number }) {
  const v = value ?? 0;
  return (
    <span
      className="rv-stars"
      style={{ fontSize: size }}
      role="img"
      aria-label={value === null ? "No rating" : `${v.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        // 0 = empty, 100 = full, in between = partial fill (e.g. 4.5 -> half star)
        const fill = Math.max(0, Math.min(1, v - (star - 1))) * 100;
        return (
          <span key={star} className="rv-star">
            <span className="rv-star-empty">★</span>
            <span className="rv-star-fill" style={{ width: `${fill}%` }}>
              ★
            </span>
          </span>
        );
      })}
    </span>
  );
}

const formatDate = (dateStr: string) => {
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

export default function ReviewsSection({ reviews }: { reviews: Review[] }) {
  // Applied = what the list is actually filtered by. Draft = what the controls show
  // until the user presses "Apply filter".
  const [category, setCategory] = useState<Category>("average");
  const [starFilter, setStarFilter] = useState<StarFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [draftCategory, setDraftCategory] = useState<Category>("average");
  const [draftStar, setDraftStar] = useState<StarFilter>("all");
  const [draftSort, setDraftSort] = useState<SortOrder>("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Service provider averages across every rated booking
  const summary = useMemo(() => {
    const overall = mean(
      reviews.map((r) => r.booking_overall_rating).filter((v): v is number => v !== null)
    );
    const staff = mean(
      reviews.map((r) => r.booking_staff_rating).filter((v): v is number => v !== null)
    );
    const average = mean(
      reviews.map(bookingAverage).filter((v): v is number => v !== null)
    );
    return { overall, staff, average };
  }, [reviews]);

  // How many reviews fall under each whole-star bucket for the chosen category
  const starCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const v = ratingFor(r, draftCategory);
      if (v !== null) counts[Math.round(v)] += 1;
    });
    return counts;
  }, [reviews, draftCategory]);

  const filtered = useMemo(() => {
    const list = reviews.filter((r) => {
      if (starFilter === "all") return true;
      const v = ratingFor(r, category);
      return v !== null && Math.round(v) === starFilter;
    });
    const dir = sortOrder === "newest" ? -1 : 1;
    return [...list].sort(
      (a, b) =>
        dir * (a.booking_date.localeCompare(b.booking_date) || a.id.localeCompare(b.id))
    );
  }, [reviews, category, starFilter, sortOrder]);

  const isFiltered = starFilter !== "all" || category !== "average" || sortOrder !== "newest";
  const activeFilterCount =
    (starFilter !== "all" ? 1 : 0) + (category !== "average" ? 1 : 0) + (sortOrder !== "newest" ? 1 : 0);
  const hasPendingChanges =
    draftCategory !== category || draftStar !== starFilter || draftSort !== sortOrder;

  const applyFilters = () => {
    setCategory(draftCategory);
    setStarFilter(draftStar);
    setSortOrder(draftSort);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setDraftCategory("average");
    setDraftStar("all");
    setDraftSort("newest");
    setCategory("average");
    setStarFilter("all");
    setSortOrder("newest");
  };

  const toggleFilters = () => {
    // Re-open with the controls showing what is currently applied
    if (!showFilters) {
      setDraftCategory(category);
      setDraftStar(starFilter);
      setDraftSort(sortOrder);
    }
    setShowFilters((v) => !v);
  };

  return (
    <div id="reviews" className="section-block rv-section">
      <h2 className="section-title">Reviews</h2>

      {reviews.length === 0 ? (
        <p className="rv-empty">No reviews yet for this service provider.</p>
      ) : (
        <>
          {/* Service provider average */}
          <div className="rv-summary">
            <div className="rv-summary-main">
              <div className="rv-big-number">{summary.average?.toFixed(1) ?? "–"}</div>
              <Stars value={summary.average} size={24} />
              <div className="rv-count">
                {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className="rv-summary-cats">
              <div className="rv-cat-row">
                <span>Overall</span>
                <Stars value={summary.overall} />
                <strong>{summary.overall?.toFixed(1) ?? "–"}</strong>
              </div>
              <div className="rv-cat-row">
                <span>Staff</span>
                <Stars value={summary.staff} />
                <strong>{summary.staff?.toFixed(1) ?? "–"}</strong>
              </div>
            </div>
          </div>

          {/* Filter toggle + panel */}
          <div className="rv-toolbar">
            <button
              type="button"
              className={`rv-filter-toggle ${showFilters ? "open" : ""}`}
              onClick={toggleFilters}
              aria-expanded={showFilters}
            >
              <span className="rv-filter-icon" aria-hidden="true">⚲</span>
              Filter
              {activeFilterCount > 0 && <span className="rv-filter-badge">{activeFilterCount}</span>}
              <span className="rv-filter-caret" aria-hidden="true">{showFilters ? "▲" : "▼"}</span>
            </button>
            <span className="rv-result-text">
              Showing <strong>{filtered.length}</strong> of {reviews.length} review
              {reviews.length === 1 ? "" : "s"}
            </span>
          </div>

          {showFilters && (
            <div className="rv-filter-panel">
              <div className="rv-filter-group">
                <span className="rv-filter-title">Rating type</span>
                <select
                  className="rv-select"
                  value={draftCategory}
                  onChange={(e) => setDraftCategory(e.target.value as Category)}
                >
                  {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rv-filter-group">
                <span className="rv-filter-title">Sort by date</span>
                <select
                  className="rv-select"
                  value={draftSort}
                  onChange={(e) => setDraftSort(e.target.value as SortOrder)}
                >
                  <option value="newest">Newest to oldest</option>
                  <option value="oldest">Oldest to newest</option>
                </select>
              </div>

              <div className="rv-filter-group rv-filter-wide">
                <span className="rv-filter-title">Stars</span>
                <div className="rv-star-buttons" role="group" aria-label="Filter by stars">
                  <button
                    type="button"
                    className={`rv-chip ${draftStar === "all" ? "active" : ""}`}
                    onClick={() => setDraftStar("all")}
                  >
                    All <span className="rv-chip-count">{reviews.length}</span>
                  </button>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={starCounts[n] === 0}
                      className={`rv-chip ${draftStar === n ? "active" : ""}`}
                      onClick={() => setDraftStar(draftStar === n ? "all" : (n as StarFilter))}
                    >
                      {n} <span className="rv-chip-star">★</span>
                      <span className="rv-chip-count">{starCounts[n]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rv-filter-actions">
                <button
                  type="button"
                  className="rv-reset"
                  onClick={resetFilters}
                  disabled={!hasPendingChanges && activeFilterCount === 0}
                >
                  Reset filter
                </button>
                <button type="button" className="rv-apply" onClick={applyFilters}>
                  Apply filter
                </button>
              </div>
            </div>
          )}

          {/* Review list */}
          {filtered.length === 0 ? (
            <p className="rv-empty">No reviews match this filter.</p>
          ) : (
            <ul className="rv-list">
              {filtered.map((r) => (
                <li key={r.id} className="rv-card">
                  <div className="rv-card-top">
                    <span className="rv-author">Verified customer</span>
                    <span className="rv-date">{formatDate(r.booking_date)}</span>
                  </div>

                  <div className="rv-rating-rows">
                    <div className="rv-cat-row">
                      <span>Overall</span>
                      <Stars value={r.booking_overall_rating} />
                      <strong>{r.booking_overall_rating ?? "–"}</strong>
                    </div>
                    <div className="rv-cat-row">
                      <span>Staff</span>
                      <Stars value={r.booking_staff_rating} />
                      <strong>{r.booking_staff_rating ?? "–"}</strong>
                    </div>
                    <div className="rv-cat-row rv-cat-avg">
                      <span>Booking average</span>
                      <Stars value={bookingAverage(r)} />
                      <strong>{bookingAverage(r)?.toFixed(1) ?? "–"}</strong>
                    </div>
                  </div>

                  {r.booking_review ? (
                    <p className="rv-comment">&ldquo;{r.booking_review}&rdquo;</p>
                  ) : (
                    <p className="rv-comment rv-no-comment">No written review.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}