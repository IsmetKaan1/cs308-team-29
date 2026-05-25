const Payment = require('../Payment');

describe('Payment Model', () => {
  it('requires transactionId', () => {
    const doc = new Payment({ amount: 10 });
    const err = doc.validateSync();
    expect(err.errors.transactionId).toBeDefined();
  });

  it('requires amount', () => {
    const doc = new Payment({ transactionId: 'TXN-1' });
    const err = doc.validateSync();
    expect(err.errors.amount).toBeDefined();
  });

  it('passes validateSync with only required fields', () => {
    const doc = new Payment({ transactionId: 'TXN-2', amount: 50 });
    expect(doc.validateSync()).toBeUndefined();
  });

  it('defaults status to "approved"', () => {
    const doc = new Payment({ transactionId: 'TXN-3', amount: 10 });
    expect(doc.status).toBe('approved');
  });

  it('defaults currency to "TRY"', () => {
    const doc = new Payment({ transactionId: 'TXN-4', amount: 10 });
    expect(doc.currency).toBe('TRY');
  });

  it('rejects invalid status value', () => {
    const doc = new Payment({ transactionId: 'TXN-5', amount: 10, status: 'pending' });
    const err = doc.validateSync();
    expect(err.errors.status).toBeDefined();
  });

  it('rounds amount to 2 decimal places in pre-save hook', async () => {
    const doc = new Payment({ transactionId: 'TXN-round', amount: 99.999 });
    await Payment.schema.s.hooks.execPre('save', doc, []);
    expect(doc.amount).toBe(100);
  });

  // NOTE: TTL deletion is handled by MongoDB's background task (runs ~every 60s).
  // Integration test coverage (two Payment inserts with the same transactionId → E11000 → 409) is in SCRUM-54.
  it('has TTL index on expiresAt with expireAfterSeconds 900', () => {
    const indexes = Payment.schema.indexes();
    const ttlIndex = indexes.find(
      ([fields, opts]) => fields.expiresAt === 1 && opts.expireAfterSeconds === 900
    );
    expect(ttlIndex).toBeDefined();
  });

  it('has compound index { userId: 1, status: 1 }', () => {
    const indexes = Payment.schema.indexes();
    const compound = indexes.find(
      ([fields]) => fields.userId === 1 && fields.status === 1
    );
    expect(compound).toBeDefined();
  });

  it('has unique index on transactionId', () => {
    const txnPath = Payment.schema.path('transactionId');
    expect(txnPath.options.unique).toBe(true);
  });
});
