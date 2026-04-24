import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/cartStore';
import CartIcon from '../components/CartIcon';
import ProfileIcon from '../components/ProfileIcon';
import CartSidebar from '../components/CartSidebar';

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { dispatch } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get(`/api/products/${id}`);
        setProduct(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      dispatch({ type: 'ADD_ITEM', product });
      setMessage('Product added to cart.');
    }
  };

  if (loading) {
    return <div style={styles.center}>Loading product...</div>;
  }

  if (error || !product) {
    return (
      <div style={styles.container}>
        <button onClick={() => navigate('/')} style={styles.back}>← Shop</button>
        <div style={styles.emptyCard}>
          <h2>Product not available</h2>
          <p>{error || 'Product not found.'}</p>
          <button onClick={() => navigate('/')} style={styles.primaryButton}>Back to Shop</button>
        </div>
      </div>
    );
  }

  const availableStock = product.quantityInStock ?? product.stock;
  const isOutOfStock = availableStock != null && availableStock <= 0;

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button onClick={() => navigate('/')} style={styles.back}>← Shop</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <CartIcon />
          <ProfileIcon />
        </div>
      </div>

      <div style={styles.detailCard}>
        <div style={styles.codeBadge}>{product.code}</div>
        <h1 style={styles.title}>{product.name}</h1>
        <p style={styles.description}>{product.description}</p>

        <div style={styles.infoGrid}>
          <div>
            <span style={styles.label}>Price</span>
            <strong style={styles.price}>{product.price.toFixed(2)} ₺</strong>
          </div>
          <div>
            <span style={styles.label}>Stock</span>
            <strong style={isOutOfStock ? styles.outOfStock : styles.inStock}>
              {availableStock == null ? 'Available' : `${availableStock} available`}
            </strong>
          </div>
        </div>

        {message && <div className="success-message">{message}</div>}

        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          style={{ ...styles.primaryButton, ...(isOutOfStock ? styles.disabledButton : {}) }}
        >
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>

      <CartSidebar />
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '900px', margin: '0 auto' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  back: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#fff', padding: 0 },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#fff' },
  detailCard: { background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 24 },
  emptyCard: { background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: 24, textAlign: 'center' },
  codeBadge: { display: 'inline-block', backgroundColor: '#1e3c72', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 4, marginBottom: 12 },
  title: { margin: '0 0 12px 0', fontSize: 28, color: '#111827' },
  description: { color: '#4b5563', lineHeight: 1.5, marginBottom: 24 },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 },
  label: { display: 'block', color: '#6b7280', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 },
  price: { color: '#111827', fontSize: 22 },
  inStock: { color: '#16a34a', fontSize: 16 },
  outOfStock: { color: '#dc2626', fontSize: 16 },
  primaryButton: { padding: '10px 18px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 },
  disabledButton: { backgroundColor: '#9ca3af', cursor: 'not-allowed' },
};

export default ProductDetail;
