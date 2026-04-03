import { useCart } from '../context/CartContext';

const ProductCard = ({ product }) => {
  const { dispatch } = useCart();

  return (
    <div style={styles.card}>
      <div style={styles.codeBadge}>{product.code}</div>
      <h3 style={styles.title}>{product.name}</h3>
      <p style={styles.description}>{product.description}</p>
      <div style={styles.price}>{product.price.toFixed(2)} ₺</div>
      <button
        style={styles.button}
        onClick={() => dispatch({ type: 'ADD_ITEM', product })}
      >
        Sepete Ekle
      </button>
    </div>
  );
};

const styles = {
  card: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  codeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e3c72',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '4px',
    marginBottom: '10px',
  },
  title: { fontSize: '1.1rem', margin: '0 0 5px 0', textAlign: 'center' },
  description: { fontSize: '0.85rem', color: '#666', textAlign: 'center', marginBottom: '10px' },
  price: { fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px' },
  button: {
    padding: '10px 16px',
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
    fontWeight: 'bold',
  },
};

export default ProductCard;
