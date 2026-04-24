import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/cartStore';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { dispatch } = useCart();
  const availableStock = product.quantityInStock ?? product.stock;
  const isOutOfStock = availableStock != null && availableStock <= 0;

  return (
    <article className="product-card">
      <div className="product-card-tags">
        <span className="product-card-badge">{product.code}</span>
        {product.category && (
          <span className="product-card-category">{product.category}</span>
        )}
      </div>
      <h3 className="product-card-title">{product.name}</h3>
      <p className="product-card-desc">{product.description}</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div className="product-card-price">{product.price.toFixed(2)} ₺</div>
        <span className={`product-stock-chip${isOutOfStock ? ' product-stock-chip--out' : ''}`}>
          {isOutOfStock ? 'Stokta yok' : 'Stokta'}
        </span>
      </div>

      <div className="product-card-actions">
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={isOutOfStock}
          onClick={() => dispatch({ type: 'ADD_ITEM', product })}
        >
          {isOutOfStock ? 'Stokta Yok' : 'Sepete Ekle'}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => navigate(`/product/${product.id}`)}
        >
          Detayları Gör
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
