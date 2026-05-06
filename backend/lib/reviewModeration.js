/**
 * Pure logic for review status transitions. No DB, no I/O, no state.
 *
 * Rules:
 * - A rating without a comment is auto-approved (no moderator needed).
 * - A rating with a comment starts as 'pending' and must be moderated.
 * - When a user updates their existing review:
 *     * If the comment text changes (including going empty), the review
 *       must be re-approved — status resets to 'pending' (unless the new
 *       state is comment-less, in which case 'approved').
 *     * If only the rating changes, keep the existing status.
 */

const VALID_ACTIONS = ['approve', 'reject'];

function sanitizeComment(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim();
}

function validateRating(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
    return { ok: false, error: 'Rating must be an integer between 1 and 5.' };
  }
  return { ok: true, rating: value };
}

function statusForNewReview({ comment }) {
  return sanitizeComment(comment) ? 'pending' : 'approved';
}

function statusForUpdatedReview({ existing, newComment }) {
  const next = sanitizeComment(newComment);
  const prev = sanitizeComment(existing?.comment);
  if (next === prev) return existing?.status || (next ? 'pending' : 'approved');
  return next ? 'pending' : 'approved';
}

function applyModeration({ action, rejectionReason }) {
  if (!VALID_ACTIONS.includes(action)) {
    return { ok: false, error: `Action must be one of: ${VALID_ACTIONS.join(', ')}` };
  }
  if (action === 'approve') {
    return {
      ok: true,
      patch: {
        status: 'approved',
        moderatedAt: new Date(),
        rejectionReason: '',
      },
    };
  }
  return {
    ok: true,
    patch: {
      status: 'rejected',
      moderatedAt: new Date(),
      rejectionReason: (rejectionReason || '').toString().trim().slice(0, 500),
    },
  };
}

function computeAggregate(reviews) {
  const approved = (reviews || []).filter((r) => r.status === 'approved');
  const count = approved.length;
  if (count === 0) return { averageRating: 0, reviewCount: 0 };
  const sum = approved.reduce((s, r) => s + (Number(r.rating) || 0), 0);
  return {
    averageRating: Math.round((sum / count) * 10) / 10,
    reviewCount: count,
  };
}

module.exports = {
  VALID_ACTIONS,
  validateRating,
  sanitizeComment,
  statusForNewReview,
  statusForUpdatedReview,
  applyModeration,
  computeAggregate,
};
