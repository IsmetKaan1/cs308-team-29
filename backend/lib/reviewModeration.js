/**
 * Pure logic for review status transitions. No DB, no I/O, no state.
 *
 * Rules:
 * - The rating is always public immediately. Only the comment text goes
 *   through moderation, so a review's `status` reflects its comment.
 * - A new review with no comment goes straight to 'approved'.
 * - A new review with a comment starts as 'pending'.
 * - When a user updates their review:
 *     * Rating-only changes do not affect status.
 *     * Clearing the comment moves status to 'approved' (nothing to moderate).
 *     * Changing the comment text resets status to 'pending'.
 * - A rejected review can be restored with the 'reopen' action. The rating
 *   stays public throughout; the comment text is hidden until 'approved'.
 */

const VALID_ACTIONS = ['approve', 'reject', 'reopen'];

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

function statusForNewReview({ comment } = {}) {
  return sanitizeComment(comment) ? 'pending' : 'approved';
}

function statusForUpdatedReview({ existing, newComment }) {
  const nextComment = sanitizeComment(newComment);
  const prevComment = sanitizeComment(existing?.comment);
  if (!nextComment) return 'approved';
  if (nextComment === prevComment) return existing?.status || 'pending';
  return 'pending';
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
  if (action === 'reopen') {
    return {
      ok: true,
      patch: {
        status: 'pending',
        moderatedAt: null,
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
  const list = (reviews || []).filter((r) => Number(r?.rating) > 0);
  const count = list.length;
  if (count === 0) return { averageRating: 0, reviewCount: 0 };
  const sum = list.reduce((s, r) => s + (Number(r.rating) || 0), 0);
  return {
    averageRating: Math.round((sum / count) * 10) / 10,
    reviewCount: count,
  };
}

function isCommentVisible(review) {
  return !!review && sanitizeComment(review.comment) !== '' && review.status === 'approved';
}

module.exports = {
  VALID_ACTIONS,
  validateRating,
  sanitizeComment,
  statusForNewReview,
  statusForUpdatedReview,
  applyModeration,
  computeAggregate,
  isCommentVisible,
};
