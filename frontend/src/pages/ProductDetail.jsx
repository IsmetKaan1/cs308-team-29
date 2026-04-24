import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // useNavigate eklendi
import { api } from '../api';
import { useCart } from '../context/CartContext';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate(); 
  const { dispatch } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false); 

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const data = await api.get(`/products/${id}`); 
        if (!data) {
          setError(true);
        } else {
          setProduct(data);
        }
      } catch (error) {
        console.error("Error fetching product data:", error);
        setError(true); 
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
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading product...</div>;
  }

  if (error || !product) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', padding: '20px' }}>
        <h2 style={{ fontSize: '2rem', color: '#dc3545' }}>404 - Product Not Found</h2>
        <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>The product you are looking for does not exist or has been removed.</p>
        <button 
          onClick={() => navigate('/')} 
          style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Return to Homepage
        </button>
      </div>
    );
  }

  return (
    <div className="product-detail-container" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto', 
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ textAlign: 'center' }}>{product.name}</h1>
      
      <img 
        src={product.images?.[0] || 'placeholder.jpg'} 
        alt={product.name} 
        style={{ width: '100%', maxWidth: '400px', borderRadius: '8px', objectFit: 'cover' }} 
      />
      
      <div className="product-info" style={{ width: '100%', marginTop: '30px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
        <p style={{ fontSize: '1.2rem' }}><strong>Price:</strong> ${product.price}</p>
        <p><strong>Description:</strong> {product.description}</p>
        <p><strong>Model / Serial No:</strong> {product.model} / {product.serialNumber}</p>
        <p>
          <strong>Stock Status:</strong> 
          <span style={{ color: product.quantityInStocks > 0 ? 'green' : 'red', fontWeight: 'bold' }}>
            {product.quantityInStocks > 0 ? ` In Stock (${product.quantityInStocks} available)` : ' Out of Stock'}
          </span>
        </p>
        <p><strong>Warranty Info:</strong> {product.warrantyStatus}</p>
        <p><strong>Distributor:</strong> {product.distributorInfo}</p>
      </div>

      <button 
        onClick={handleAddToCart}
        disabled={product.quantityInStocks === 0}
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '15px',
          backgroundColor: product.quantityInStocks > 0 ? '#28a745' : '#6c757d',
          color: 'white',
          fontSize: '1.1rem',
          border: 'none',
          borderRadius: '8px',
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