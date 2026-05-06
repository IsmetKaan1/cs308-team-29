const { validatePaymentInput, authorizePayment } = require('../mockBank');

function futureExpiry() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear() % 100).padStart(2, '0');
  return `${mm}/${yy}`;
}

function pastExpiry() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear() % 100).padStart(2, '0');
  return `${mm}/${yy}`;
}

const validInput = () => ({
  cardHolderName: 'Test User',
  cardNumber: '4242 4242 4242 4242',
  expiry: futureExpiry(),
  cvv: '123',
});

describe('mockBank.validatePaymentInput', () => {
  test('accepts a well-formed payment input', () => {
    expect(validatePaymentInput(validInput())).toMatchObject({
      ok: true,
      normalized: { cardLast4: '4242', cardHolderName: 'Test User' },
    });
  });

  test('strips non-digit characters from the card number before length check', () => {
    const result = validatePaymentInput({ ...validInput(), cardNumber: '4242-4242-4242-4242' });
    expect(result.ok).toBe(true);
  });

  test('rejects an empty cardholder name', () => {
    expect(validatePaymentInput({ ...validInput(), cardHolderName: '   ' })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/cardholder/i),
    });
  });

  test('rejects a card number that is not 16 digits', () => {
    expect(validatePaymentInput({ ...validInput(), cardNumber: '4242 4242' })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/16 digits/i),
    });
  });

  test('rejects a CVV that is not 3 digits', () => {
    expect(validatePaymentInput({ ...validInput(), cvv: '12' })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/cvv/i),
    });
  });

  test('rejects an expiry not in MM/YY format', () => {
    expect(validatePaymentInput({ ...validInput(), expiry: '2099' })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/MM\/YY/i),
    });
  });

  test('rejects an invalid month', () => {
    expect(validatePaymentInput({ ...validInput(), expiry: '13/99' })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/month/i),
    });
  });

  test('rejects an expired card', () => {
    expect(validatePaymentInput({ ...validInput(), expiry: pastExpiry() })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/expired/i),
    });
  });
});

describe('mockBank.authorizePayment', () => {
  test('returns an invalid_input decline when validation fails', () => {
    const r = authorizePayment({ ...validInput(), cvv: 'xx' });
    expect(r).toMatchObject({ approved: false, reason: 'invalid_input' });
    expect(r.transactionId).toBeUndefined();
  });

  test('declines any card ending in 0000', () => {
    const r = authorizePayment({ ...validInput(), cardNumber: '4242 4242 4242 0000' });
    expect(r).toMatchObject({
      approved: false,
      reason: 'declined_by_bank',
      cardLast4: '0000',
    });
    expect(r.transactionId).toBeUndefined();
  });

  test('approves a valid card and returns a transactionId + ISO approvedAt', () => {
    const r = authorizePayment(validInput());
    expect(r.approved).toBe(true);
    expect(r.transactionId).toMatch(/^TXN-[0-9A-F]{16}$/);
    expect(new Date(r.approvedAt).toString()).not.toBe('Invalid Date');
    expect(r.cardLast4).toBe('4242');
  });

  test('generates distinct transactionIds across calls', () => {
    const a = authorizePayment(validInput()).transactionId;
    const b = authorizePayment(validInput()).transactionId;
    expect(a).not.toBe(b);
  });
});
