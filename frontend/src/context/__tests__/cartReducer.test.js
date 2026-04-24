import { describe, test, expect } from 'vitest';
import { cartReducer, calcTotals, initialCartState } from '../cartReducer';

const prod = (overrides = {}) => ({
  id: 'p1',
  code: 'CS 308',
  name: 'SE',
  price: 100,
  ...overrides,
});

describe('calcTotals', () => {
  test('returns zero totals for empty cart', () => {
    expect(calcTotals([])).toEqual({ totalItems: 0, totalPrice: 0 });
  });

  test('sums quantities and price × quantity', () => {
    const items = [
      { id: 'a', price: 10, quantity: 2 },
      { id: 'b', price: 5, quantity: 3 },
    ];
    expect(calcTotals(items)).toEqual({ totalItems: 5, totalPrice: 35 });
  });
});

describe('cartReducer', () => {
  test('returns current state on unknown action', () => {
    const next = cartReducer(initialCartState, { type: '__UNKNOWN__' });
    expect(next).toBe(initialCartState);
  });

  test('ADD_ITEM adds a new product with quantity 1', () => {
    const next = cartReducer(initialCartState, { type: 'ADD_ITEM', product: prod() });
    expect(next.items).toHaveLength(1);
    expect(next.items[0]).toMatchObject({ id: 'p1', quantity: 1 });
    expect(next.totalItems).toBe(1);
    expect(next.totalPrice).toBe(100);
  });

  test('ADD_ITEM increments quantity when product already in cart', () => {
    const s1 = cartReducer(initialCartState, { type: 'ADD_ITEM', product: prod() });
    const s2 = cartReducer(s1, { type: 'ADD_ITEM', product: prod() });
    expect(s2.items).toHaveLength(1);
    expect(s2.items[0].quantity).toBe(2);
    expect(s2.totalItems).toBe(2);
    expect(s2.totalPrice).toBe(200);
  });

  test('REMOVE_ITEM removes a specific item by id', () => {
    const seeded = {
      ...initialCartState,
      items: [{ ...prod({ id: 'a' }), quantity: 1 }, { ...prod({ id: 'b', price: 50 }), quantity: 2 }],
      totalItems: 3,
      totalPrice: 200,
    };
    const next = cartReducer(seeded, { type: 'REMOVE_ITEM', id: 'a' });
    expect(next.items).toHaveLength(1);
    expect(next.items[0].id).toBe('b');
    expect(next.totalPrice).toBe(100);
  });

  test('INCREMENT increases quantity of target item only', () => {
    const seeded = {
      ...initialCartState,
      items: [{ ...prod({ id: 'a' }), quantity: 1 }, { ...prod({ id: 'b', price: 50 }), quantity: 1 }],
      totalItems: 2,
      totalPrice: 150,
    };
    const next = cartReducer(seeded, { type: 'INCREMENT', id: 'a' });
    expect(next.items.find((i) => i.id === 'a').quantity).toBe(2);
    expect(next.items.find((i) => i.id === 'b').quantity).toBe(1);
    expect(next.totalPrice).toBe(250);
  });

  test('DECREMENT decreases quantity of target item', () => {
    const seeded = {
      ...initialCartState,
      items: [{ ...prod(), quantity: 3 }],
      totalItems: 3,
      totalPrice: 300,
    };
    const next = cartReducer(seeded, { type: 'DECREMENT', id: 'p1' });
    expect(next.items[0].quantity).toBe(2);
    expect(next.totalPrice).toBe(200);
  });

  test('DECREMENT removes item when it would drop to 0', () => {
    const seeded = {
      ...initialCartState,
      items: [{ ...prod(), quantity: 1 }],
      totalItems: 1,
      totalPrice: 100,
    };
    const next = cartReducer(seeded, { type: 'DECREMENT', id: 'p1' });
    expect(next.items).toHaveLength(0);
    expect(next.totalItems).toBe(0);
    expect(next.totalPrice).toBe(0);
  });

  test('CLEAR_CART empties items and zeroes totals but keeps isOpen', () => {
    const seeded = {
      ...initialCartState,
      items: [{ ...prod(), quantity: 2 }],
      totalItems: 2,
      totalPrice: 200,
      isOpen: true,
    };
    const next = cartReducer(seeded, { type: 'CLEAR_CART' });
    expect(next.items).toEqual([]);
    expect(next.totalItems).toBe(0);
    expect(next.totalPrice).toBe(0);
    expect(next.isOpen).toBe(true);
  });

  test('TOGGLE_CART flips isOpen', () => {
    expect(cartReducer(initialCartState, { type: 'TOGGLE_CART' }).isOpen).toBe(true);
    const opened = { ...initialCartState, isOpen: true };
    expect(cartReducer(opened, { type: 'TOGGLE_CART' }).isOpen).toBe(false);
  });

  test('CLOSE_CART forces isOpen to false', () => {
    const opened = { ...initialCartState, isOpen: true };
    expect(cartReducer(opened, { type: 'CLOSE_CART' }).isOpen).toBe(false);
  });

  test('SET_CART replaces items and recomputes totals', () => {
    const next = cartReducer(initialCartState, {
      type: 'SET_CART',
      items: [{ id: 'x', price: 20, quantity: 4 }],
    });
    expect(next.items).toHaveLength(1);
    expect(next.totalItems).toBe(4);
    expect(next.totalPrice).toBe(80);
  });
});
