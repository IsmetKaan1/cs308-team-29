import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/cartStore';

const CartSidebar = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useCart();

  function handleCheckout() {
    dispatch({ type: 'CLOSE_CART' });
    navigate('/checkout');
  }

  if (!state.isOpen) return null;

  return (
    <>
      <div
        className="cart-overlay"
        onClick={() => dispatch({ type: 'CLOSE_CART' })}
      />
      <div className="cart-sidebar">
        <div className="cart-header">
          <h2>Cart ({state.totalItems})</h2>
          <button
            className="cart-close-btn"
            onClick={() => dispatch({ type: 'CLOSE_CART' })}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        <div className="cart-items">
          {state.items.length === 0 ? (
            <p className="cart-empty">Your cart is empty.</p>
          ) : (
            state.items.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <span className="cart-item-code">{item.code}</span>
                  <span className="cart-item-name">{item.name}</span>
                  {(item.quantityInStock ?? item.stock) != null && (
                    <span className="cart-item-code">
                      Stock: {item.quantityInStock ?? item.stock}
                    </span>
                  )}
                  <span className="cart-item-price">{(item.price * item.quantity).toFixed(2)} ₺</span>
                </div>
                <div className="cart-item-controls">
                  <button
                    className="cart-qty-btn"
                    onClick={() => dispatch({ type: 'DECREMENT', id: item.id })}
                  >
                    −
                  </button>
                  <span className="cart-qty">{item.quantity}</span>
                  <button
                    className="cart-qty-btn"
                    onClick={() => dispatch({ type: 'INCREMENT', id: item.id })}
                    disabled={(item.quantityInStock ?? item.stock) != null && item.quantity >= (item.quantityInStock ?? item.stock)}
                  >
                    +
                  </button>
                  <button
                    className="cart-remove-btn"
                    onClick={() => dispatch({ type: 'REMOVE_ITEM', id: item.id })}
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {state.items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total</span>
              <span>{state.totalPrice.toFixed(2)} ₺</span>
            </div>
            <button className="cart-checkout-btn" onClick={handleCheckout}>Checkout</button>
            <button
              className="cart-clear-btn"
              onClick={() => dispatch({ type: 'CLEAR_CART' })}
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;
