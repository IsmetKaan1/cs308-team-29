import { describe, test, expect } from 'vitest';
import { formatMaskedCardLast4, getOrderCardLast4 } from '../paymentDisplay';

describe('paymentDisplay', () => {
  test('formatMaskedCardLast4 returns masked label for four digits', () => {
    expect(formatMaskedCardLast4('4242')).toBe('•••• 4242');
  });

  test('formatMaskedCardLast4 rejects invalid values', () => {
    expect(formatMaskedCardLast4('')).toBeNull();
    expect(formatMaskedCardLast4('42')).toBeNull();
  });

  test('getOrderCardLast4 prefers paymentCardLast4', () => {
    expect(getOrderCardLast4({ paymentCardLast4: '1111', cardLast4: '4242' })).toBe('1111');
  });
});
