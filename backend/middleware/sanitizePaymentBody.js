const REDACTED = '[REDACTED]';

function cloneBody(body) {
  if (body == null || typeof body !== 'object') {
    return body;
  }
  try {
    return structuredClone(body);
  } catch {
    return JSON.parse(JSON.stringify(body));
  }
}

/**
 * Clone req.body and redact PAN/CVV for logging. Original req.body is untouched.
 * Mount on /api/payments before route handlers; use req.safeBody in logs/debug.
 */
function sanitizePaymentBody(req, res, next) {
  const body = req.body;

  if (body == null || typeof body !== 'object') {
    req.safeBody = body;
    return next();
  }

  const safe = cloneBody(body);

  if (Object.prototype.hasOwnProperty.call(safe, 'cardNumber')) {
    safe.cardNumber = REDACTED;
  }
  if (Object.prototype.hasOwnProperty.call(safe, 'cvv')) {
    safe.cvv = REDACTED;
  }

  req.safeBody = safe;
  next();
}

module.exports = sanitizePaymentBody;
