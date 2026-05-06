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
  test('auto-approves rating-only reviews', () => {
    expect(statusForNewReview({ comment: '' })).toBe('approved');
    expect(statusForNewReview({ comment: '   ' })).toBe('approved');
    expect(statusForNewReview({})).toBe('approved');
  });

  test('holds commented reviews for moderation', () => {
    expect(statusForNewReview({ comment: 'nice course' })).toBe('pending');
  });
});

describe('statusForUpdatedReview', () => {
  test('keeps existing approved status when comment is unchanged', () => {
    expect(
      statusForUpdatedReview({
        existing: { comment: 'great', status: 'approved' },
        newComment: 'great',
      })
    ).toBe('approved');
  });

  test('resets to pending when comment text changes', () => {
    expect(
      statusForUpdatedReview({
        existing: { comment: 'great', status: 'approved' },
        newComment: 'actually bad',
      })
    ).toBe('pending');
  });

  test('approves when a previously-pending comment is removed', () => {
    expect(
      statusForUpdatedReview({
        existing: { comment: 'meh', status: 'pending' },
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
});

describe('computeAggregate', () => {
  test('returns zeroes for empty input', () => {
    expect(computeAggregate([])).toEqual({ averageRating: 0, reviewCount: 0 });
    expect(computeAggregate(null)).toEqual({ averageRating: 0, reviewCount: 0 });
  });

  test('includes only approved reviews', () => {
    expect(
      computeAggregate([
        { status: 'approved', rating: 5 },
        { status: 'approved', rating: 3 },
        { status: 'pending',  rating: 1 },
        { status: 'rejected', rating: 1 },
      ])
    ).toEqual({ averageRating: 4, reviewCount: 2 });
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
