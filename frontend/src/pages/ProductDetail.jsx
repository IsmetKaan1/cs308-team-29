import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';

const ProductDetail = () => {
  const { id } = useParams();
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

  if (loading) {
    return <div>Loading product...</div>;
  }

  if (!product) {
    return <div>Product not found.</div>;
  }

  return (
    <div className="product-detail-container">
      <h1>{product.name}</h1>
      <img src={product.images?.[0] || 'placeholder.jpg'} alt={product.name} style={{ maxWidth: '300px' }} />
      
      <div className="product-info">
        <p><strong>Price:</strong> ${product.price}</p>
        <p><strong>Description:</strong> {product.description}</p>
        <p><strong>Model / Serial No:</strong> {product.model} / {product.serialNumber}</p>
        <p>
          <strong>Stock Status:</strong> 
          {product.quantityInStocks > 0 ? ` In Stock (${product.quantityInStocks} available)` : ' Out of Stock'}
        </p>
        <p><strong>Warranty Info:</strong> {product.warrantyStatus}</p>
        <p><strong>Distributor:</strong> {product.distributorInfo}</p>
      </div>

      <button disabled={product.quantityInStocks === 0}>
        Add to Cart
      </button>
    </div>
  );
};

export default ProductDetail;