import { useCart } from '../context/cartStore';

const CartIcon = () => {
  const { state, dispatch } = useCart();

  return (
    <button
      className="icon-btn"
      onClick={() => dispatch({ type: 'TOGGLE_CART' })}
      aria-label={`Sepeti aç (${state.totalItems} ürün)`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {state.totalItems > 0 && (
        <span className="icon-btn-badge" aria-hidden="true">{state.totalItems}</span>
      )}
    </button>
  );
};

export default CartIcon;
