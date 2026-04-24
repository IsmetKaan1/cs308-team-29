const Product = require('../Product');

function baseProductData(overrides = {}) {
  return {
    code: 'CS 999',
    name: 'Test Product',
    description: 'A thing for testing',
    price: 99.99,
    category: 'Programming',
    serialNumber: 'SN-TEST-0001',
    quantityInStock: 10,
    model: 'TEST-2025',
    warrantyMonths: 12,
    distributorInfo: 'Test Distributor',
    ...overrides,
  };
}

describe('Product schema', () => {
  test('validates a fully populated product', () => {
    const p = new Product(baseProductData());
    const err = p.validateSync();
    expect(err).toBeUndefined();
  });

  test('rejects missing code', () => {
    const p = new Product(baseProductData({ code: undefined }));
    const err = p.validateSync();
    expect(err.errors.code).toBeDefined();
  });

  test('rejects missing name', () => {
    const p = new Product(baseProductData({ name: undefined }));
    expect(p.validateSync().errors.name).toBeDefined();
  });

  test('rejects missing description', () => {
    const p = new Product(baseProductData({ description: undefined }));
    expect(p.validateSync().errors.description).toBeDefined();
  });

  test('rejects missing price', () => {
    const p = new Product(baseProductData({ price: undefined }));
    expect(p.validateSync().errors.price).toBeDefined();
  });

  test('rejects missing serialNumber', () => {
    const p = new Product(baseProductData({ serialNumber: undefined }));
    expect(p.validateSync().errors.serialNumber).toBeDefined();
  });

  test('rejects missing quantityInStock', () => {
    const p = new Product(baseProductData({ quantityInStock: undefined }));
    expect(p.validateSync().errors.quantityInStock).toBeDefined();
  });

  test('rejects negative quantityInStock', () => {
    const p = new Product(baseProductData({ quantityInStock: -1 }));
    expect(p.validateSync().errors.quantityInStock).toBeDefined();
  });

  test('rejects negative warrantyMonths', () => {
    const p = new Product(baseProductData({ warrantyMonths: -5 }));
    expect(p.validateSync().errors.warrantyMonths).toBeDefined();
  });

  test('rejects missing model', () => {
    const p = new Product(baseProductData({ model: undefined }));
    expect(p.validateSync().errors.model).toBeDefined();
  });

  test('rejects empty-string model', () => {
    const p = new Product(baseProductData({ model: '   ' }));
    expect(p.validateSync().errors.model).toBeDefined();
  });

  test('rejects missing warrantyMonths', () => {
    const p = new Product(baseProductData({ warrantyMonths: undefined }));
    expect(p.validateSync().errors.warrantyMonths).toBeDefined();
  });

  test('accepts zero as a valid warrantyMonths (no warranty)', () => {
    const p = new Product(baseProductData({ warrantyMonths: 0 }));
    expect(p.validateSync()).toBeUndefined();
  });

  test('rejects missing distributorInfo', () => {
    const p = new Product(baseProductData({ distributorInfo: undefined }));
    expect(p.validateSync().errors.distributorInfo).toBeDefined();
  });

  test('rejects empty-string distributorInfo', () => {
    const p = new Product(baseProductData({ distributorInfo: '   ' }));
    expect(p.validateSync().errors.distributorInfo).toBeDefined();
  });

  test('toJSON renames _id to id and strips __v', () => {
    const p = new Product(baseProductData());
    const json = p.toJSON();
    expect(json.id).toBeDefined();
    expect(json._id).toBeUndefined();
    expect(json.__v).toBeUndefined();
    expect(json.serialNumber).toBe('SN-TEST-0001');
  });

  test('accepts zero as a valid quantityInStock', () => {
    const p = new Product(baseProductData({ quantityInStock: 0 }));
    expect(p.validateSync()).toBeUndefined();
  });

  test('rejects missing category', () => {
    const p = new Product(baseProductData({ category: undefined }));
    expect(p.validateSync().errors.category).toBeDefined();
  });

  test('rejects category value outside the allowed enum', () => {
    const p = new Product(baseProductData({ category: 'Totally Not A Category' }));
    expect(p.validateSync().errors.category).toBeDefined();
  });

  test('exposes the canonical category list on the model', () => {
    expect(Product.CATEGORIES).toEqual(expect.arrayContaining([
      'Programming',
      'Algorithms',
      'Systems',
      'Software Engineering',
      'AI & Data Science',
    ]));
  });
});
