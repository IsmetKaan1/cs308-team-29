const {
  findSensitivePaymentKeys,
  toPublicPaymentDenied,
  toPublicPaymentSuccess,
  sanitizeOrderJson,
} = require('../paymentExposure');
const { authorizePayment } = require('../mockBank');

const validInput = () => ({
  cardHolderName: 'Test User',
  cardNumber: '4242 4242 4242 4242',
  expiry: '12/30',
  cvv: '123',
});

describe('paymentExposure public payment payloads', () => {
  test('success payload shape snapshot omits sensitive keys', () => {
    const internal = authorizePayment(validInput());
    const payload = toPublicPaymentSuccess(internal);

    expect({
      keys: Object.keys(payload).sort(),
      sensitiveKeys: findSensitivePaymentKeys(payload),
      cardLast4: payload.cardLast4,
    }).toMatchSnapshot();
    expect(findSensitivePaymentKeys(payload)).toEqual([]);
    expect(payload).toEqual({
      approved: true,
      transactionId: internal.transactionId,
      approvedAt: internal.approvedAt,
      cardLast4: '4242',
    });
  });

  test('denied payload shape snapshot omits sensitive keys', () => {
    const internal = authorizePayment({ ...validInput(), cvv: 'x' });
    const payload = toPublicPaymentDenied(internal);

    expect({
      keys: Object.keys(payload).sort(),
      sensitiveKeys: findSensitivePaymentKeys(payload),
      reason: payload.reason,
    }).toMatchSnapshot();
    expect(findSensitivePaymentKeys(payload)).toEqual([]);
    expect(payload.cardNumber).toBeUndefined();
  });
});

describe('paymentExposure.sanitizeOrderJson', () => {
  test('strips cardNumber, cvv, and cardLast4 from order JSON', () => {
    const ret = {
      _id: '507f1f77bcf86cd799439011',
      __v: 0,
      userId: 'u1',
      paymentCardLast4: '4242',
      cardLast4: '4242',
      cardNumber: '4242424242424242',
      cvv: '123',
      totalPrice: 10,
    };

    const expectedId = ret._id;
    const json = sanitizeOrderJson(ret);

    expect(json.id).toBe(expectedId);
    expect(json._id).toBeUndefined();
    expect(json.__v).toBeUndefined();
    expect(json.paymentCardLast4).toBe('4242');
    expect(json.cardNumber).toBeUndefined();
    expect(json.cvv).toBeUndefined();
    expect(json.cardLast4).toBeUndefined();
    expect(findSensitivePaymentKeys(json)).toEqual([]);
  });
});
