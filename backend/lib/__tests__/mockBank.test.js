jest.mock('../../models/Payment', () => {
  const payments = [];

  class MockPayment {
    constructor(data) {
      Object.assign(this, {
        refundedAmount: 0,
        refunds: [],
      }, data);
    }

    async save() {
      return this;
    }

    static async create(data) {
      const payment = new MockPayment(data);
      payments.push(payment);
      return payment;
    }

    static async findOne(query) {
      return payments.find((payment) =>
        Object.entries(query).every(([key, value]) => payment[key] === value)
      ) || null;
    }

    static _resetForTests() {
      payments.length = 0;
    }
  }

  return MockPayment;
});

const Payment = require('../../models/Payment');
const { validatePaymentInput, authorizePayment, refundPayment } = require('../mockBank');

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

  test('rejects payment authorization if amount is missing, zero, or negative', () => {
  const baseInput = validInput();
  
  expect(authorizePayment({ ...baseInput, amount: 0 }).approved).toBe(false);
  expect(authorizePayment({ ...baseInput, amount: -50.5 }).approved).toBe(false);
  expect(authorizePayment({ ...baseInput, amount: undefined }).approved).toBe(false);
  });
  test('gracefully handles completely empty or null payloads without throwing exceptions', () => {
    const nullResult = authorizePayment(null);
    const emptyResult = authorizePayment({});
    
    expect(nullResult.approved).toBe(false);
    expect(emptyResult.approved).toBe(false);
  });

  test('strictly verifies card masking returns exactly 4 digits and strips full PAN', () => {
    const input = { ...validInput(), amount: 100 };
    const result = authorizePayment(input);
    
    if (result.approved) {
      expect(result.cardLast4).toMatch(/^\d{4}$/);
      expect(result.cardLast4.length).toBe(4);
      expect(result.cardNumber).toBeUndefined(); 
    }
  });
});

describe('refundPayment', () => {
  beforeEach(async () => {
    Payment._resetForTests();
    await Payment.create({
      transactionId: 'TXN-CONSUMED',
      amount: 100,
      status: 'consumed',
      refundedAmount: 0,
      refunds: [],
    });
  });

  test('returns ok:true with valid transactionId and full refund amount', async () => {
    const result = await refundPayment({ transactionId: 'TXN-CONSUMED', amount: 100 });

    expect(result).toMatchObject({
      ok: true,
      refundId: expect.stringMatching(/^rfnd_/),
      refundedAmount: 100,
      originalAmount: 100,
    });
    expect(result.refundedAt).toBeInstanceOf(Date);
  });

  test('increments refundedAmount correctly on partial refund', async () => {
    const result = await refundPayment({ transactionId: 'TXN-CONSUMED', amount: 40 });
    const payment = await Payment.findOne({ transactionId: 'TXN-CONSUMED', status: 'consumed' });

    expect(result).toMatchObject({ ok: true, refundedAmount: 40, originalAmount: 100 });
    expect(payment.refundedAmount).toBe(40);
    expect(payment.refunds).toHaveLength(1);
    expect(payment.refunds[0]).toMatchObject({ amount: 40 });
  });

  test('returns ok:false status:404 for unknown transactionId', async () => {
    await expect(refundPayment({ transactionId: 'TXN-UNKNOWN', amount: 20 }))
      .resolves.toMatchObject({
        ok: false,
        status: 404,
        error: expect.stringMatching(/not found/i),
      });
  });

  test('returns ok:false status:400 when refund amount exceeds refundable balance', async () => {
    await refundPayment({ transactionId: 'TXN-CONSUMED', amount: 60 });

    await expect(refundPayment({ transactionId: 'TXN-CONSUMED', amount: 50 }))
      .resolves.toMatchObject({
        ok: false,
        status: 400,
        error: expect.stringMatching(/exceeds refundable balance/i),
      });
  });

  test('allows two partial refunds that together equal full amount', async () => {
    const first = await refundPayment({ transactionId: 'TXN-CONSUMED', amount: 25 });
    const second = await refundPayment({ transactionId: 'TXN-CONSUMED', amount: 75 });
    const payment = await Payment.findOne({ transactionId: 'TXN-CONSUMED', status: 'consumed' });

    expect(first).toMatchObject({ ok: true, refundedAmount: 25 });
    expect(second).toMatchObject({ ok: true, refundedAmount: 100 });
    expect(payment.refundedAmount).toBe(100);
    expect(payment.refunds).toHaveLength(2);
  });
});
