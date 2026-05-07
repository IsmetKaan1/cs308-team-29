const {
  validateRating,
  sanitizeComment,
  statusForNewReview,
  statusForUpdatedReview,
  applyModeration,
  computeAggregate,
} = require('../reviewModeration');

describe('validateRating', () => {
  test.each([1, 2, 3, 4, 5])('accepts %i', (n) => {
    expect(validateRating(n)).toEqual({ ok: true, rating: n });
  });

  test.each([[0], [6], [-1], [3.5], ['4'], [null], [undefined], [NaN]])(
    'rejects %p',
    (v) => {
      expect(validateRating(v).ok).toBe(false);
    }
  );
});

describe('sanitizeComment', () => {
  test('trims whitespace', () => {
    expect(sanitizeComment('  hello  ')).toBe('hello');
  });

  test('returns empty string for non-string input', () => {
    expect(sanitizeComment(null)).toBe('');
    expect(sanitizeComment(undefined)).toBe('');
    expect(sanitizeComment(42)).toBe('');
  });
});

describe('statusForNewReview', () => {
  test('rating-only reviews are auto-approved (no comment to moderate)', () => {
    expect(statusForNewReview({ comment: '' })).toBe('approved');
    expect(statusForNewReview({ comment: '   ' })).toBe('approved');
    expect(statusForNewReview({})).toBe('approved');
  });

  test('reviews with a comment start as pending', () => {
    expect(statusForNewReview({ comment: 'nice course' })).toBe('pending');
  });
});

describe('statusForUpdatedReview', () => {
  test('rating-only changes do not affect comment status', () => {
    expect(
      statusForUpdatedReview({
        existing: { comment: 'great', rating: 5, status: 'approved' },
        newComment: 'great',
      })
    ).toBe('approved');
  });

  test('changing the comment text resets to pending', () => {
    expect(
      statusForUpdatedReview({
        existing: { comment: 'great', rating: 5, status: 'approved' },
        newComment: 'actually bad',
      })
    ).toBe('pending');
  });

  test('clearing the comment moves status to approved', () => {
    expect(
      statusForUpdatedReview({
        existing: { comment: 'meh', rating: 2, status: 'rejected' },
        newComment: '',
      })
    ).toBe('approved');
  });
});

describe('applyModeration', () => {
  test('rejects unknown actions', () => {
    expect(applyModeration({ action: 'delete' })).toMatchObject({ ok: false });
  });

  test('approve sets status=approved and clears rejectionReason', () => {
    const r = applyModeration({ action: 'approve' });
    expect(r.ok).toBe(true);
    expect(r.patch.status).toBe('approved');
    expect(r.patch.rejectionReason).toBe('');
    expect(r.patch.moderatedAt).toBeInstanceOf(Date);
  });

  test('reject stores trimmed rejectionReason capped at 500 chars', () => {
    const r = applyModeration({ action: 'reject', rejectionReason: '  spam  ' });
    expect(r.patch).toMatchObject({ status: 'rejected', rejectionReason: 'spam' });

    const long = 'x'.repeat(600);
    const r2 = applyModeration({ action: 'reject', rejectionReason: long });
    expect(r2.patch.rejectionReason.length).toBe(500);
  });

  test('reopen restores a rejected review to pending without deleting it', () => {
    const r = applyModeration({ action: 'reopen' });
    expect(r.ok).toBe(true);
    expect(r.patch).toMatchObject({
      status: 'pending',
      moderatedAt: null,
      rejectionReason: '',
    });
  });
});

describe('computeAggregate', () => {
  test('returns zeroes for empty input', () => {
    expect(computeAggregate([])).toEqual({ averageRating: 0, reviewCount: 0 });
    expect(computeAggregate(null)).toEqual({ averageRating: 0, reviewCount: 0 });
  });

  test('counts every rating regardless of comment moderation status', () => {
    expect(
      computeAggregate([
        { status: 'approved', rating: 5 },
        { status: 'approved', rating: 3 },
        { status: 'pending',  rating: 1 },
        { status: 'rejected', rating: 1 },
      ])
    ).toEqual({ averageRating: 2.5, reviewCount: 4 });
  });

  test('rounds to one decimal place', () => {
    expect(
      computeAggregate([
        { status: 'approved', rating: 4 },
        { status: 'approved', rating: 3 },
        { status: 'approved', rating: 3 },
      ])
    ).toEqual({ averageRating: 3.3, reviewCount: 3 });
  });
});
