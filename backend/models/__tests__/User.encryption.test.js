const User = require('../User');
const { encrypt, isEncrypted } = require('../../lib/encryption');

// Verifies the encryptedFields plugin is wired onto the User model: documents
// hydrated from DB-shaped data (as Mongoose does after a query) get their
// sensitive fields decrypted via the post('init') hook.
describe('User sensitive-field encryption wiring', () => {
  it('decrypts taxId and homeAddress when hydrated from stored (encrypted) data', () => {
    const stored = {
      _id: '507f1f77bcf86cd799439011',
      email: 'a@a.com',
      username: 'a',
      full_name: 'A',
      gender: 'Male',
      password: 'hashed',
      taxId: encrypt('12345678901'),
      homeAddress: {
        fullName: encrypt('Jane Doe'),
        address: encrypt('1 Main St'),
        city: encrypt('Istanbul'),
        postalCode: encrypt('34000'),
        country: encrypt('Turkey'),
      },
    };

    // Sanity: the stored shape is actually ciphertext.
    expect(isEncrypted(stored.taxId)).toBe(true);
    expect(isEncrypted(stored.homeAddress.city)).toBe(true);

    const doc = User.hydrate(stored);

    expect(doc.taxId).toBe('12345678901');
    expect(doc.homeAddress.fullName).toBe('Jane Doe');
    expect(doc.homeAddress.city).toBe('Istanbul');
    expect(doc.homeAddress.country).toBe('Turkey');
  });
});
