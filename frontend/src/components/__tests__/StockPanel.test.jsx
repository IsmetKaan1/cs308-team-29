import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import StockPanel from '../components/StockPanel';
import { expect, test, vi } from 'vitest';

vi.mock('../api', () => ({
  api: { managerGet: vi.fn().mockResolvedValue([]) }
}));

const LocationDisplay = () => {
  const [searchParams] = useSearchParams();
  return <div data-testid="location-search">{searchParams.toString()}</div>;
};

test('updates URL with search and sort filters without overriding each other', () => {
  render(
    <MemoryRouter initialEntries={['/manager']}>
      <Routes>
        <Route path="/manager" element={
          <>
            <StockPanel managerPass="123" />
            <LocationDisplay />
          </>
        } />
      </Routes>
    </MemoryRouter>
  );

  const searchInput = screen.getByPlaceholderText(/Search by product name or description/i);
  fireEvent.change(searchInput, { target: { value: 'shirt' } });
  fireEvent.submit(searchInput.closest('form'));

  expect(screen.getByTestId('location-search').textContent).toContain('q=shirt');

  const sortSelect = screen.getByRole('combobox', { name: '' });
  fireEvent.change(sortSelect, { target: { value: 'price_asc' } });

  const urlParams = screen.getByTestId('location-search').textContent;
  expect(urlParams).toContain('q=shirt');
  expect(urlParams).toContain('sort=price_asc');
});