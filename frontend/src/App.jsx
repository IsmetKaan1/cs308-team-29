import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import HomePage from './pages/HomePage';
import CheckoutPage from './pages/CheckoutPage';

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/settings" element={<ProfileSettingsPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}
