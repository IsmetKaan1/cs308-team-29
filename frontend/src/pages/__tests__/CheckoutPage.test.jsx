import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from '../CheckoutPage';
import { CartContext } from '../../context/cartStore';

const { navigateMock, apiMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  apiMock: { post: vi.fn() },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../../api', () => ({ api: apiMock }));

function renderCheckout({ items = [], totalPrice = 0, token = 'test-token' } = {}) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');

  const state = {
    items,
    totalItems: items.reduce((s, i) => s + i.quantity, 0),
    totalPrice,
    isOpen: false,
  };
  const dispatch = vi.fn();

  const utils = render(
    <MemoryRouter>
      <CartContext.Provider value={{ state, dispatch }}>
        <CheckoutPage />
      </CartContext.Provider>
    </MemoryRouter>
  );
  return { ...utils, dispatch };
}

function fillAddress() {
  fireEvent.change(screen.getByPlaceholderText('Ad Soyad'), { target: { value: 'Test User' } });
  fireEvent.change(screen.getByPlaceholderText('Sokak, apartman no'), { target: { value: '123 Demo' } });
  fireEvent.change(screen.getByPlaceholderText('İstanbul'), { target: { value: 'Istanbul' } });
  fireEvent.change(screen.getByPlaceholderText('34000'), { target: { value: '34000' } });
  fireEvent.change(screen.getByPlaceholderText('Türkiye'), { target: { value: 'Turkey' } });
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    apiMock.post.mockReset();
    localStorage.removeItem('token');
  });

  afterEach(() => {
    localStorage.removeItem('token');
  });

  test('shows guest gate with login button when no token present', () => {
    renderCheckout({ token: null });
    expect(screen.getByText(/Giriş Gerekli/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Giriş Yap/i })).toBeInTheDocument();
  });

  test('renders all five address inputs when authenticated', () => {
    renderCheckout({
      items: [{ id: 'p1', code: 'CS', name: 'SE', price: 100, quantity: 1 }],
      totalPrice: 100,
    });
    expect(screen.getByPlaceholderText('Ad Soyad')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Sokak, apartman no')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('İstanbul')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('34000')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Türkiye')).toBeInTheDocument();
  });

  test('submit button is disabled when cart is empty', () => {
    renderCheckout({ items: [], totalPrice: 0 });
    const btn = screen.getByRole('button', { name: /Siparişi Tamamla/i });
    expect(btn).toBeDisabled();
  });

  test('renders order summary line items and total when cart has items', () => {
    renderCheckout({
      items: [{ id: 'p1', code: 'CS 308', name: 'SE', price: 100, quantity: 2 }],
      totalPrice: 200,
    });
    expect(screen.getByText('CS 308')).toBeInTheDocument();
    expect(screen.getByText('x2')).toBeInTheDocument();
    expect(screen.getAllByText('200.00 ₺').length).toBeGreaterThan(0);
  });

  test('shows empty-cart message in summary when cart has no items', () => {
    renderCheckout({ items: [], totalPrice: 0 });
    expect(screen.getByText(/Sepetiniz boş/i)).toBeInTheDocument();
  });

  test('posts order and clears cart on successful submit', async () => {
    apiMock.post.mockResolvedValueOnce({ id: 'o1', status: 'Processing' });
    const items = [{ id: 'p1', code: 'CS 308', name: 'SE', price: 100, quantity: 1 }];
    const { dispatch } = renderCheckout({ items, totalPrice: 100 });

    fillAddress();
    fireEvent.click(screen.getByRole('button', { name: /Siparişi Tamamla/i }));

    await waitFor(() => {
      expect(apiMock.post).toHaveBeenCalledWith('/api/orders', expect.objectContaining({
        items,
        shippingAddress: {
          fullName: 'Test User',
          address: '123 Demo',
          city: 'Istanbul',
          postalCode: '34000',
          country: 'Turkey',
        },
      }));
    });

    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_CART' });
    expect(navigateMock).toHaveBeenCalledWith(
      '/order-confirmation',
      expect.objectContaining({ state: expect.any(Object) })
    );
  });

  test('surfaces API error message on failed submit', async () => {
    apiMock.post.mockRejectedValueOnce(new Error('Not enough stock for CS 308.'));
    const items = [{ id: 'p1', code: 'CS 308', name: 'SE', price: 100, quantity: 1 }];
    renderCheckout({ items, totalPrice: 100 });

    fillAddress();
    fireEvent.click(screen.getByRole('button', { name: /Siparişi Tamamla/i }));

    await waitFor(() => {
      expect(screen.getByText(/Not enough stock/i)).toBeInTheDocument();
    });
  });
});
