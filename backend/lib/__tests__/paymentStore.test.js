const { registerTransaction, consumeTransaction, _resetForTests } = require('../paymentStore');

beforeEach(() => {
  _resetForTests();
});

describe('paymentStore.consumeTransaction', () => {
  test('rejects a missing transactionId', () => {
    expect(consumeTransaction(undefined, { userId: 'u1' })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/payment transaction is required/i),
    });
  });

  test('rejects a transactionId that was never registered', () => {
    expect(consumeTransaction('TXN-UNKNOWN', { userId: 'u1' })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/invalid or has expired/i),
    });
  });

  test('consumes a registered transaction exactly once', () => {
    registerTransaction('TXN-1', { userId: 'u1', cardLast4: '4242' });
    const first = consumeTransaction('TXN-1', { userId: 'u1' });
    expect(first).toMatchObject({ ok: true, record: { cardLast4: '4242' } });

    const second = consumeTransaction('TXN-1', { userId: 'u1' });
    expect(second.ok).toBe(false);
  });

  test('rejects consumption by a different user than the registrant', () => {
    registerTransaction('TXN-2', { userId: 'owner' });
    const r = consumeTransaction('TXN-2', { userId: 'intruder' });
    expect(r).toMatchObject({
      ok: false,
      error: expect.stringMatching(/does not belong/i),
    });
  });
});
