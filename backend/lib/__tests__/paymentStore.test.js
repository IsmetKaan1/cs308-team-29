jest.mock('../../models/Payment');
const Payment = require('../../models/Payment');
const { registerTransaction, consumeTransaction, _resetForTests } = require('../paymentStore');

function makePayment(overrides = {}) {
  return {
    transactionId: 'TXN-1',
    userId: 'u1',
    amount: 100,
    status: 'approved',
    cardLast4: '4242',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  Payment.deleteMany = jest.fn().mockResolvedValue({});
});

describe('paymentStore.registerTransaction', () => {
  test('calls Payment.create with correct fields including expiresAt ~15min from now', async () => {
    Payment.create = jest.fn().mockResolvedValue({});
    const before = Date.now();
    await registerTransaction('TXN-NEW', { userId: 'u1', amount: 99.99, cardLast4: '1234', approvedAt: new Date() });
    const after = Date.now();

    expect(Payment.create).toHaveBeenCalledTimes(1);
    const args = Payment.create.mock.calls[0][0];
    expect(args.transactionId).toBe('TXN-NEW');
    expect(args.status).toBe('approved');
    expect(args.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 14 * 60 * 1000);
    expect(args.expiresAt.getTime()).toBeLessThanOrEqual(after + 16 * 60 * 1000);
  });

  test('propagates E11000 error (duplicate transactionId) to the caller', async () => {
    const err = new Error('duplicate key');
    err.code = 11000;
    Payment.create = jest.fn().mockRejectedValue(err);
    await expect(registerTransaction('TXN-DUP', {})).rejects.toMatchObject({ code: 11000 });
  });
});

describe('paymentStore.consumeTransaction', () => {
  test('rejects a missing transactionId', async () => {
    const r = await consumeTransaction(undefined, { userId: 'u1' });
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/payment transaction is required/i) });
  });

  test('rejects a transactionId that was never registered', async () => {
    Payment.findOne = jest.fn().mockResolvedValue(null);
    const r = await consumeTransaction('TXN-UNKNOWN', { userId: 'u1' });
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/invalid or has expired/i) });
  });

  test('consumes an approved transaction and returns the record', async () => {
    const doc = makePayment();
    Payment.findOne = jest.fn().mockResolvedValue(doc);
    Payment.findOneAndUpdate = jest.fn().mockResolvedValue({ ...doc, status: 'consumed' });

    const r = await consumeTransaction('TXN-1', { userId: 'u1' });
    expect(r.ok).toBe(true);
    expect(r.record.status).toBe('consumed');
    expect(Payment.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: 'TXN-1', status: 'approved' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'consumed' }) }),
      expect.any(Object)
    );
  });

  test('rejects consumption by a different user', async () => {
    Payment.findOne = jest.fn().mockResolvedValue(makePayment({ userId: 'owner' }));
    Payment.findOneAndUpdate = jest.fn();
    const r = await consumeTransaction('TXN-1', { userId: 'intruder' });
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/does not belong/i) });
    expect(Payment.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('rejects when expectedAmount mismatches', async () => {
    Payment.findOne = jest.fn().mockResolvedValue(makePayment({ amount: 100 }));
    const r = await consumeTransaction('TXN-1', { userId: 'u1', expectedAmount: 150 });
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/amount does not match/i) });
  });

  test('rejects double consume (findOneAndUpdate returns null, existing.status is consumed)', async () => {
    Payment.findOne = jest.fn().mockResolvedValue(makePayment({ status: 'consumed' }));
    Payment.findOneAndUpdate = jest.fn().mockResolvedValue(null);

    const r = await consumeTransaction('TXN-1', { userId: 'u1' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/already been used/i);
  });

  test('rejects expired transaction (findOneAndUpdate returns null, status was approved)', async () => {
    const expiredDoc = makePayment({ expiresAt: new Date(Date.now() - 1000) });
    Payment.findOne = jest.fn().mockResolvedValue(expiredDoc);
    Payment.findOneAndUpdate = jest.fn().mockResolvedValue(null);

    const r = await consumeTransaction('TXN-1', { userId: 'u1' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/invalid or has expired/i);
  });

  test('concurrent double consume: only one findOneAndUpdate succeeds', async () => {
    Payment.findOne = jest.fn().mockResolvedValue(makePayment());
    let callCount = 0;
    Payment.findOneAndUpdate = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ...makePayment(), status: 'consumed' });
      return Promise.resolve(null);
    });

    const [r1, r2] = await Promise.all([
      consumeTransaction('TXN-1', { userId: 'u1' }),
      consumeTransaction('TXN-1', { userId: 'u1' }),
    ]);

    const successes = [r1, r2].filter((r) => r.ok);
    const failures = [r1, r2].filter((r) => !r.ok);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
  });
});

describe('paymentStore._resetForTests', () => {
  test('calls Payment.deleteMany in test env', async () => {
    await _resetForTests();
    expect(Payment.deleteMany).toHaveBeenCalledWith({});
  });
});
