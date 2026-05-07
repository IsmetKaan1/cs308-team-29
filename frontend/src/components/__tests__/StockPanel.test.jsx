import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { act } from 'react';
import StockPanel from '../StockPanel';
import { expect, test, vi } from 'vitest';

vi.mock('../../api', () => ({
  api: {
    get: vi.fn((path) => {
      if (path === '/api/products/categories') return Promise.resolve(['Programming']);
      return Promise.resolve([]);
    }),
    patch: vi.fn().mockResolvedValue({}),
  },
}));

const LocationDisplay = () => {
  const [searchParams] = useSearchParams();
  return <div data-testid="location-search">{searchParams.toString()}</div>;
};

test('updates URL with search and sort filters without overriding each other', async () => {
  render(
    <MemoryRouter initialEntries={['/manager']}>
      <Routes>
        <Route path="/manager" element={
          <>
            <StockPanel />
            <LocationDisplay />
          </>
        } />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(screen.getByText(/No products match these criteria/i)).toBeInTheDocument();
  });

  const searchInput = screen.getByPlaceholderText(/Search products/i);
  await act(async () => {
    fireEvent.change(searchInput, { target: { value: 'shirt' } });
    fireEvent.submit(searchInput.closest('form'));
  });

  expect(screen.getByTestId('location-search').textContent).toContain('q=shirt');

  const sortSelect = screen.getAllByRole('combobox')[0];
  await act(async () => {
    fireEvent.change(sortSelect, { target: { value: 'price_asc' } });
  });

  const urlParams = screen.getByTestId('location-search').textContent;
  expect(urlParams).toContain('q=shirt');
  expect(urlParams).toContain('sort=price_asc');
});
