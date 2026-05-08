import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/cartStore';
import AppHeader from '../components/AppHeader';
import CartSidebar from '../components/CartSidebar';
import Spinner from '../components/Spinner';
import ProductReviews from '../components/ProductReviews';
import Stars from '../components/Stars';
import { productImage } from '../lib/productImage';

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { dispatch } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get(`/api/products/${id}`)
      .then((data) => { if (active) setProduct(data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    dispatch({ type: 'ADD_ITEM', product });
    setMessage('Item added to cart.');
    setTimeout(() => setMessage(''), 2500);
  };

  const renderBody = () => {
    if (loading) return <Spinner label="Loading product..." />;

    if (error || !product) {
      return (
        <div className="empty-state">
          <h2>Product not found</h2>
          <p>{error || 'The product you are looking for does not exist or has been removed.'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Back to home</button>
        </div>
      );
    }

    const availableStock = product.quantityInStock ?? product.stock;
    const isOutOfStock = availableStock != null && availableStock <= 0;
    const imageSrc = productImage(product.code);

    return (
      <div className="detail-card">
        {imageSrc && (
          <div className="detail-image">
            <img src={imageSrc} alt={product.name} />
          </div>
        )}
        <span className="product-card-badge">{product.code}</span>
        <h1 className="detail-title">{product.name}</h1>
        {product.reviewCount > 0 && (
          <div className="rating-summary" style={{ marginBottom: 'var(--space-3)' }}>
            <Stars value={product.averageRating} size="lg" />
            <span className="rating-summary-value">{product.averageRating.toFixed(1)}</span>
            <span className="rating-summary-count">({product.reviewCount} reviews)</span>
          </div>
        )}
        <p className="detail-desc">{product.description}</p>

        <div className="detail-info-grid">
          <div>
            <span className="detail-info-label">Price</span>
            <strong className="detail-info-value">{product.price.toFixed(2)} ₺</strong>
          </div>
          <div>
            <span className="detail-info-label">Stock</span>
            <strong className={`detail-info-value ${isOutOfStock ? 'detail-info-value--stock-out' : 'detail-info-value--stock-in'}`}>
              {availableStock == null ? 'Available' : isOutOfStock ? 'Out of stock' : `${availableStock} in stock`}
            </strong>
          </div>
        </div>

        <h2 style={{ fontSize: 'var(--fs-18)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-3)' }}>
          Product Details
        </h2>
        <div className="detail-info-grid">
          {product.model && (
            <div>
              <span className="detail-info-label">Model</span>
              <strong className="detail-info-value" style={{ fontSize: 'var(--fs-15)' }}>{product.model}</strong>
            </div>
          )}
          {product.serialNumber && (
            <div>
              <span className="detail-info-label">Serial No</span>
              <strong className="detail-info-value" style={{ fontSize: 'var(--fs-15)' }}>{product.serialNumber}</strong>
            </div>
          )}
          <div>
            <span className="detail-info-label">Warranty</span>
            <strong className="detail-info-value" style={{ fontSize: 'var(--fs-15)' }}>
              {product.warrantyMonths > 0 ? `${product.warrantyMonths} months` : 'No warranty'}
            </strong>
          </div>
          {product.distributorInfo && (
            <div>
              <span className="detail-info-label">Distributor</span>
              <strong className="detail-info-value" style={{ fontSize: 'var(--fs-15)' }}>{product.distributorInfo}</strong>
            </div>
          )}
        </div>

        {Array.isArray(product.packageContents) && product.packageContents.length > 0 && (
          <>
            <h2 style={{ fontSize: 'var(--fs-18)', marginTop: 'var(--space-6)', marginBottom: 'var(--space-3)' }}>
              Package Contents
            </h2>
            <ul className="detail-package-list">
              {product.packageContents.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </>
        )}

        {message && <div className="success-message" style={{ marginTop: 'var(--space-4)' }}>{message}</div>}

        <div className="detail-actions" style={{ marginTop: 'var(--space-5)' }}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
          >
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
          <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/')}>
            ← Back to Shop
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <AppHeader />
      <main className="page-body">
        <div className="container-md">
          {renderBody()}
          {!loading && !error && product && (
            <ProductReviews
              productId={product.id || id}
              initialAverage={product.averageRating || 0}
              initialCount={product.reviewCount || 0}
            />
          )}
        </div>
      </main>
      <CartSidebar />
    </div>
  );
};

export default ProductDetail;
