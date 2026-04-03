import { useCart } from '../context/CartContext';

const CartIcon = () => {
  const { state, dispatch } = useCart();

  return (
    <button
      style={styles.button}
      onClick={() => dispatch({ type: 'TOGGLE_CART' })}
      aria-label="Open cart"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {state.totalItems > 0 && (
        <span style={styles.badge}>{state.totalItems}</span>
      )}
    </button>
  );
};

const styles = {
  button: {
    position: 'relative',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    backgroundColor: '#ef4444',
    color: 'white',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: '700',
  },
};

export default CartIcon;
