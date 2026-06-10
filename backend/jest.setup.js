// Test-environment defaults so models/middleware that require secrets can load.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.FIELD_ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY || 'test-field-encryption-key';
