const mongoose = require('mongoose');
const User = require('../User');
const bcrypt = require('bcryptjs');

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true)
}));

describe('User Model', () => {
  it('should be invalid if required fields are missing', () => {
    const user = new User({});
    const error = user.validateSync();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.username).toBeDefined();
    expect(error.errors.full_name).toBeDefined();
    expect(error.errors.gender).toBeDefined();
    expect(error.errors.password).toBeDefined();
  });

  it('should be valid with all required fields', () => {
    const user = new User({
      email: 'test@test.com',
      username: 'testuser',
      full_name: 'Test User',
      gender: 'Male',
      password: 'password123'
    });
    const error = user.validateSync();
    expect(error).toBeUndefined();
  });

  it('should have customer as default role', () => {
    const user = new User({
      email: 'a@a.com',
      username: 'a',
      full_name: 'A',
      gender: 'Male',
      password: '123'
    });
    expect(user.role).toBe('customer');
  });

  it('should accept valid roles', () => {
    const user = new User({
      email: 'b@b.com',
      username: 'b',
      full_name: 'B',
      gender: 'Female',
      password: '123',
      role: 'product_manager'
    });
    const error = user.validateSync();
    expect(error).toBeUndefined();
  });

  it('should reject invalid roles', () => {
    const user = new User({
      email: 'c@c.com',
      username: 'c',
      full_name: 'C',
      gender: 'Male',
      password: '123',
      role: 'admin' // invalid role
    });
    const error = user.validateSync();
    expect(error.errors.role).toBeDefined();
  });

  it('should use comparePassword properly', async () => {
    const user = new User({ password: 'hashed_password' });
    const result = await user.comparePassword('raw_password');
    expect(bcrypt.compare).toHaveBeenCalledWith('raw_password', 'hashed_password');
    expect(result).toBe(true);
  });
});
