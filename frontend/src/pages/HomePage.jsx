import React, { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';

const HomePage = () => {
  const [products, setProducts] = useState([]);

  const mockProducts = [
    { 
      id: 1, 
      name: "CS 301", 
      price: 1000, 
      description: "Algorithms" 
    },
    { 
      id: 2, 
      name: "CS 306", 
      price: 1500, 
      description: "Database Systems" 
    },
    { 
      id: 3, 
      name: "CS 308", 
      price: 2000, 
      description: "Software Engineering" 
    },
    { 
      id: 4, 
      name: "CS 307", 
      price: 2500, 
      description: "Operating Systems" 
    }
  ];

  useEffect(() => {
    setProducts(mockProducts);
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Featured Products</h1>
      <div style={styles.grid}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
  header: { textAlign: 'center', marginBottom: '30px', color: 'white' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '24px'
  }
};

export default HomePage;