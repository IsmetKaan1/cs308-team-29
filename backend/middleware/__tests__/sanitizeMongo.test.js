const sanitizeMongo = require('../sanitizeMongo');

function run(req) {
  let called = false;
  sanitizeMongo(req, {}, () => { called = true; });
  expect(called).toBe(true);
  return req;
}

describe('sanitizeMongo middleware', () => {
  test('strips $-prefixed operator keys from body', () => {
    const req = run({ body: { email: { $ne: null }, password: 'x' } });
    expect(req.body.email).toEqual({});
    expect(req.body.password).toBe('x');
  });

  test('strips dotted keys from body', () => {
    const req = run({ body: { 'a.b': 1, ok: 2 } });
    expect(req.body['a.b']).toBeUndefined();
    expect(req.body.ok).toBe(2);
  });

  test('sanitizes nested objects and arrays', () => {
    const req = run({ body: { list: [{ $gt: 1, keep: 3 }] } });
    expect(req.body.list[0].$gt).toBeUndefined();
    expect(req.body.list[0].keep).toBe(3);
  });

  test('sanitizes route params', () => {
    const req = run({ params: { $where: 'bad', id: '42' } });
    expect(req.params.$where).toBeUndefined();
    expect(req.params.id).toBe('42');
  });

  test('leaves clean payloads untouched and always calls next', () => {
    const req = run({ body: { a: 1, b: 'two' } });
    expect(req.body).toEqual({ a: 1, b: 'two' });
  });
});
