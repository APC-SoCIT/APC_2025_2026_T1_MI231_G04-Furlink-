'use client';

import React, { useState } from 'react';
import { FaStar, FaTimes, FaCommentAlt } from 'react-icons/fa';

interface SubmitRatingModalProps {
  bookingId: string;
  onClose: () => void;
  onSubmitRating: (overallRating: number, staffRating: number, comment: string) => void;
}

export default function SubmitRatingModal({
  bookingId,
  onClose,
  onSubmitRating,
}: SubmitRatingModalProps) {
  const [overallRating, setOverallRating] = useState<number>(0);
  const [staffRating, setStaffRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overallRating === 0 || staffRating === 0) {
      alert('Please provide both an overall rating and a staff rating (1 to 5 stars).');
      return;
    }

    if (comment.length > 250) {
      alert('Feedback cannot exceed 250 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitRating(overallRating, staffRating, comment);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="rating-modal-card">
        <div className="summary-modal-header">
          <div className="modal-header-title">
            <FaStar className="header-doc-icon" style={{ color: '#f59e0b' }} />
            <h2>Rate Your Experience</h2>
          </div>
          <button className="modal-close-x" onClick={onClose} type="button">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="rating-modal-body">
            {/* Overall Rating */}
            <div className="rating-section">
              <label className="rating-label">Overall Experience Rating *</label>
              <p className="rating-subtext">How satisfied are you with the overall grooming service?</p>
              <div className="star-rating-group">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={`overall-${star}`}
                    className={`star-btn ${star <= overallRating ? 'active' : ''}`}
                    onClick={() => setOverallRating(star)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Staff Rating */}
            <div className="rating-section">
              <label className="rating-label">Staff / Groomer Rating *</label>
              <p className="rating-subtext">How would you rate the professionalism and handling by the groomer?</p>
              <div className="star-rating-group">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={`staff-${star}`}
                    className={`star-btn ${star <= staffRating ? 'active' : ''}`}
                    onClick={() => setStaffRating(star)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Feedback */}
            <div className="rating-section">
              <label className="rating-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaCommentAlt size={13} /> Optional Feedback
              </label>
              <textarea
                className="feedback-textarea"
                placeholder="Share your thoughts or comments about the service..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={250}
              />
              <div className="char-count">{comment.length}/250 characters</div>
            </div>
          </div>

          <div className="rating-modal-footer">
            <button
              type="button"
              className="row-action-btn secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-action"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}