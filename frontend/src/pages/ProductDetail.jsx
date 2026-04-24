import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { useCart } from '../context/CartContext'; 

const ProductDetail = () => {
  const { id } = useParams();
  const { dispatch } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const data = await api.get(`/products/${id}`); 
        setProduct(data);
      } catch (error) {
        console.error("Error fetching product data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  const handleAddToCart = () => {
    if (product) {
      dispatch({ 
        type: 'ADD_ITEM', 
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.images?.[0] || 'placeholder.jpg' 
        } 
      });
      alert('Product added to cart!'); 
    }
  };

  if (loading) {
    return <div>Loading product...</div>;
  }

  if (!product) {
    return <div>Product not found.</div>;
  }

  return (
    <div className="product-detail-container" style={{ padding: '20px' }}>
      <h1>{product.name}</h1>
      <img 
        src={product.images?.[0] || 'placeholder.jpg'} 
        alt={product.name} 
        style={{ maxWidth: '300px', borderRadius: '8px' }} 
      />
      
      <div className="product-info" style={{ marginTop: '20px' }}>
        <p><strong>Price:</strong> ${product.price}</p>
        <p><strong>Description:</strong> {product.description}</p>
        <p><strong>Model / Serial No:</strong> {product.model} / {product.serialNumber}</p>
        <p>
          <strong>Stock Status:</strong> 
          {product.quantityInStocks > 0 
            ? ` In Stock (${product.quantityInStocks} available)` 
            : ' Out of Stock'}
        </p>
        <p><strong>Warranty Info:</strong> {product.warrantyStatus}</p>
        <p><strong>Distributor:</strong> {product.distributorInfo}</p>
      </div>

      <button 
        onClick={handleAddToCart} 
        disabled={product.quantityInStocks === 0}
        style={{
          padding: '10px 20px',
          backgroundColor: product.quantityInStocks > 0 ? '#28a745' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: product.quantityInStocks > 0 ? 'pointer' : 'not-allowed',
          marginTop: '20px'
        }}
      >
        {product.quantityInStocks > 0 ? 'Add to Cart' : 'Out of Stock'}
      </button>
    </div>
  );
};

export default ProductDetail;