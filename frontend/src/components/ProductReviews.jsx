import { useEffect, useState } from 'react';
import { api } from '../api';
import Stars from './Stars';
import Spinner from './Spinner';

const STATUS_LABEL = {
  pending: 'Your comment is under review — it will be visible to everyone once approved. Your rating is already public.',
  approved: 'Your rating and comment are public.',
  rejected: 'Your comment was rejected; your rating remains public.',
};

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString('en-US', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return '';
  }
}

const ProductReviews = ({ productId, initialAverage = 0, initialCount = 0 }) => {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(initialAverage);
  const [reviewCount, setReviewCount] = useState(initialCount);
  const [loading, setLoading] = useState(true);

  const [myReview, setMyReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successNote, setSuccessNote] = useState('');
  const [eligible, setEligible] = useState(false);

  const isLoggedIn = !!localStorage.getItem('token');

  const loadReviews = async () => {
    setLoading(true);
    try {
      const list = await api.get(`/api/products/${productId}/reviews`);
      setReviews(list);
      if (list.length) {
        const sum = list.reduce((s, r) => s + (Number(r.rating) || 0), 0);
        setAverageRating(Math.round((sum / list.length) * 10) / 10);
        setReviewCount(list.length);
      } else {
        setAverageRating(0);
        setReviewCount(0);
      }
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false);
    }
  };

  const loadMine = async () => {
    if (!isLoggedIn) return;
    try {
      const mine = await api.get(`/api/products/${productId}/reviews/mine`);
      setMyReview(mine);
      setRating(mine.rating);
      setComment(mine.comment || '');
    } catch {
      setMyReview(null);
    }
  };

  const loadEligibility = async () => {
    if (!isLoggedIn) {
      setEligible(false);
      return;
    }
    try {
      const res = await api.get(`/api/products/${productId}/reviews/eligibility`);
      setEligible(!!res?.eligible);
    } catch {
      setEligible(false);
    }
  };

  useEffect(() => {
    loadReviews();
    loadMine();
    loadEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessNote('');
    if (rating < 1 || rating > 5) {
      setFormError('Please select a rating between 1 and 5.');
      return;
    }
    setSubmitting(true);
    try {
      const saved = await api.post(`/api/products/${productId}/reviews`, { rating, comment });
      setMyReview(saved);
      setSuccessNote(
        saved.status === 'pending'
          ? 'Your rating is public now. Your comment was sent for approval.'
          : 'Thanks! Your rating has been saved.'
      );
      await loadReviews();
    } catch (err) {
      setFormError(err.message || 'Could not submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const showForm = isLoggedIn && eligible;

  return (
    <section className="reviews-section" aria-label="Reviews and ratings">
      <h2>Reviews</h2>

      <div className="rating-summary">
        <Stars value={averageRating} size="lg" />
        {reviewCount > 0 ? (
          <>
            <span className="rating-summary-value">{averageRating.toFixed(1)}</span>
            <span className="rating-summary-count">({reviewCount} reviews)</span>
          </>
        ) : (
          <span className="rating-summary-count">No reviews yet</span>
        )}
      </div>

      {showForm && (
        <div className="review-form-card">
          <h3>{myReview ? 'Update your review' : 'Review this course'}</h3>

          {myReview && (
            <div className={`review-status-banner review-status-banner--${myReview.status}`}>
              <strong style={{ display: 'block', marginBottom: 2 }}>
                {myReview.status === 'pending'  && 'Under review'}
                {myReview.status === 'approved' && 'Published'}
                {myReview.status === 'rejected' && 'Rejected'}
              </strong>
              {STATUS_LABEL[myReview.status]}
              {myReview.status === 'rejected' && myReview.rejectionReason && (
                <div style={{ marginTop: 4, fontSize: 'var(--fs-12)' }}>
                  Reason: {myReview.rejectionReason}
                </div>
              )}
            </div>
          )}

          {successNote && <div className="success-message">{successNote}</div>}
          {formError && <div className="error-message">{formError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <label style={{ display: 'block', fontSize: 'var(--fs-13)', color: 'var(--color-ink-700)', fontWeight: 500, marginBottom: 4 }}>
              Rating
            </label>
            <div className="star-picker" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  className={rating >= n ? 'is-active' : ''}
                  onClick={() => setRating(n)}
                  aria-label={`${n} stars`}
                >
                  ★
                </button>
              ))}
            </div>

            <div className="form-group">
              <label htmlFor="review-comment">Comment (optional)</label>
              <textarea
                id="review-comment"
                className="form-input"
                rows={4}
                maxLength={1000}
                placeholder="Share your thoughts about this course..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{ resize: 'vertical', minHeight: 96 }}
              />
              <div style={{ fontSize: 'var(--fs-12)', color: 'var(--color-ink-500)', marginTop: 4 }}>
                Your rating is published immediately. Your comment becomes visible after the product manager approves it.
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting || rating < 1}>
              {submitting
                ? 'Submitting...'
                : myReview ? 'Update Review' : 'Submit Review'}
            </button>
          </form>
        </div>
      )}

      {!showForm && !isLoggedIn && (
        <div className="review-status-banner review-status-banner--pending">
          You need to log in to leave a review.
        </div>
      )}

      {!showForm && isLoggedIn && !eligible && (
        <div className="review-status-banner review-status-banner--pending">
          To review this product, your order must first be delivered.
        </div>
      )}

      {loading ? (
        <Spinner label="Loading reviews..." />
      ) : reviews.length === 0 ? (
        <div className="reviews-empty">Be the first to leave a review.</div>
      ) : (
        <div className="review-list">
          {reviews.map((r) => (
            <article key={r.id} className="review-card">
              <div className="review-card-head">
                <div>
                  <div className="review-card-author">{r.userName || 'Anonymous'}</div>
                  <div className="review-card-date">{formatDate(r.createdAt)}</div>
                </div>
                <Stars value={r.rating} />
              </div>
              {r.comment && <div className="review-card-body">{r.comment}</div>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductReviews;
