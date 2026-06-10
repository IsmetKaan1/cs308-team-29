/**
 * Lightweight NoSQL-injection guard (REQ 16).
 *
 * Recursively strips keys that start with "$" or contain "." from request
 * bodies and route params, so a client can't smuggle Mongo operators like
 * { "$ne": null } into queries such as User.findOne({ email }).
 *
 * Express 5 makes req.query a read-only getter, so (unlike express-mongo-
 * sanitize) we only mutate req.body and req.params in place.
 */

function sanitize(value) {
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key];
      } else {
        value[key] = sanitize(value[key]);
      }
    }
  }
  return value;
}

function sanitizeMongo(req, _res, next) {
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  next();
}

module.exports = sanitizeMongo;
module.exports.sanitize = sanitize;
