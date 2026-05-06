/**
 * Pure logic for review status transitions. No DB, no I/O, no state.
 *
 * Rules:
 * - New reviews always start as 'pending' and must be moderated before
 *   becoming public, whether they contain only a rating or also a comment.
 * - When a user updates their existing review:
 *     * Any content/rating change resets the review to 'pending'.
 * - A rejected review can be restored with the 'reopen' action. This is the
 *   "cancel rejection" path: rejected -> pending, never delete/disappear.
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

function statusForNewReview() {
  return 'pending';
}

function statusForUpdatedReview({ existing, newComment, newRating }) {
  const nextComment = sanitizeComment(newComment);
  const prevComment = sanitizeComment(existing?.comment);
  const nextRating = Number(newRating);
  const prevRating = Number(existing?.rating);
  if (nextComment === prevComment && nextRating === prevRating) {
    return existing?.status || 'pending';
  }
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
