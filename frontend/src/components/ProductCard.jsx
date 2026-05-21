import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/cartStore';
import Stars from './Stars';
import WishlistButton from './WishlistButton';
import { productImage } from '../lib/productImage';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { dispatch } = useCart();
  const availableStock = product.quantityInStock ?? product.stock;
  const isOutOfStock = availableStock == null || availableStock <= 0;
  const hasReviews = (product.reviewCount || 0) > 0;
  const imageSrc = productImage(product.code);
  const discountRate = Number(product.discountRate) || 0;
  const hasDiscount = discountRate > 0 && product.discountedPrice != null && product.discountedPrice < product.price;
  const effectivePrice = hasDiscount ? Number(product.discountedPrice) : Number(product.price);

  return (
    <article className="product-card">
      {imageSrc && (
        <div className="product-card-image" style={{ position: 'relative' }}>
          <img src={imageSrc} alt={product.name} loading="lazy" />
          {hasDiscount && (
            <span style={{
              position: 'absolute', top: 8, left: 8,
              background: '#e0245e', color: '#fff',
              padding: '2px 8px', borderRadius: 999,
              fontSize: '0.75rem', fontWeight: 600,
            }}>
              -{discountRate}%
            </span>
          )}
          <div style={{ position: 'absolute', top: 6, right: 6 }}>
            <WishlistButton productId={product.id} />
          </div>
        </div>
      )}
      <div className="product-card-tags">
        <span className="product-card-badge">{product.code}</span>
        {product.category && (
          <span className="product-card-category">{product.category}</span>
        )}
      </div>
      <h3 className="product-card-title">{product.name}</h3>
      {hasReviews && (
        <div className="product-card-rating">
          <Stars value={product.averageRating} />
          <span>{product.averageRating.toFixed(1)}</span>
          <span style={{ color: 'var(--color-ink-500)' }}>({product.reviewCount})</span>
        </div>
      )}
      <p className="product-card-desc">{product.description}</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div className="product-card-price">
          {hasDiscount ? (
            <span>
              <span style={{ textDecoration: 'line-through', color: '#999', marginRight: 6, fontSize: '0.85em' }}>
                {Number(product.price).toFixed(2)} ₺
              </span>
              <span style={{ color: '#e0245e' }}>{effectivePrice.toFixed(2)} ₺</span>
            </span>
          ) : (
            <span>{effectivePrice.toFixed(2)} ₺</span>
          )}
        </div>
        <span className={`product-stock-chip${isOutOfStock ? ' product-stock-chip--out' : ''}`}>
          {isOutOfStock
            ? 'Out of stock'
            : `${availableStock} in stock`}
        </span>
      </div>

      <div className="product-card-actions">
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={isOutOfStock}
          onClick={() => dispatch({ type: 'ADD_ITEM', product: { ...product, price: effectivePrice } })}
        >
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => navigate(`/product/${product.id}`)}
        >
          View Details
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
