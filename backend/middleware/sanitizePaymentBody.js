const REDACTED = '[REDACTED]';

function cloneBody(body) {
  if (body === undefined || body === null) {
    return body;
  }
  if (typeof body !== 'object') {
    return body;
  }
  return structuredClone(body);
}

function sanitizePaymentBody(req, res, next) {
  const safeBody = cloneBody(req.body);

  if (safeBody && typeof safeBody === 'object') {
    if (Object.prototype.hasOwnProperty.call(safeBody, 'cardNumber')) {
      safeBody.cardNumber = REDACTED;
    }
    if (Object.prototype.hasOwnProperty.call(safeBody, 'cvv')) {
      safeBody.cvv = REDACTED;
    }
  }

  req.safeBody = safeBody;
  next();
}

module.exports = sanitizePaymentBody;
