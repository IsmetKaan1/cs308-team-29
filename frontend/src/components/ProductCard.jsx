import React from 'react';

const ProductCard = ({ product }) => {
  const handleAddToCart = () => {
    console.log(`[Shopper Action] ${product.name} added to cart!`);
  };

  return (
    <div style={styles.card}>
      <div style={styles.imagePlaceholder}>Image</div>
      <h3 style={styles.title}>{product.name}</h3>
      <p style={styles.description}>{product.description}</p>
      <div style={styles.price}>{product.price} ₺</div>
      
      <button onClick={handleAddToCart} style={styles.button}>
        Add to Cart
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
    backgroundColor: '#fff'
  },
  imagePlaceholder: {
    width: '100%',
    height: '150px',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#aaa',
    marginBottom: '10px',
    borderRadius: '4px'
  },
  title: { fontSize: '1.1rem', margin: '10px 0 5px 0', textAlign: 'center' },
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
    fontWeight: 'bold'
  }
};

export default ProductCard;