import { useReducer, useEffect, useState } from 'react';
import { api } from '../api';
import { CartContext } from './cartStore';
import { cartReducer, initialCartState } from './cartReducer';

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    function loadCart() {
      if (localStorage.getItem('token')) {
        api.get('/api/cart')
          .then(cart => {
            dispatch({ type: 'SET_CART', items: cart.items || [] });
            setIsLoaded(true);
          })
          .catch(() => setIsLoaded(true));
      } else {
        dispatch({ type: 'CLEAR_CART' });
        setIsLoaded(true);
      }
    }
    loadCart();

    window.addEventListener('authChange', loadCart);
    return () => window.removeEventListener('authChange', loadCart);
  }, []);

  useEffect(() => {
    if (isLoaded && localStorage.getItem('token')) {
       api.post('/api/cart', { items: state.items }).catch(console.error);
    }
  }, [state.items, isLoaded]);

  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>;
}
