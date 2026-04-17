import { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import CartIcon from '../components/CartIcon';
import ProfileIcon from '../components/ProfileIcon';
import CartSidebar from '../components/CartSidebar';
import { api } from '../api';

const HomePage = () => {
    const [products, setProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortOption, setSortOption] = useState('');

    useEffect(() => {
        api.get('/api/products')
            .then((data) => setProducts(data))
            .catch(() => setError('Dersler yüklenemedi.'))
            .finally(() => setLoading(false));
    }, []);

    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedProducts = [...filteredProducts];

    if (sortOption === 'price-asc') {
        sortedProducts.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price-desc') {
        sortedProducts.sort((a, b) => b.price - a.price);
    }

    return (
        <div style={styles.container}>
            <div style={styles.topBar}>
                <h1 style={styles.header}>CS Dersleri</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <CartIcon />
                    <ProfileIcon />
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="Ders ara (isim, kod veya içerik)..."
                    className="form-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div style={styles.sortBar}>
                <label htmlFor="sort" style={styles.sortLabel}>Sort by Price:</label>
                <select
                    id="sort"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    style={styles.select}
                >
                    <option value="">Default</option>
                    <option value="price-asc">Low to High</option>
                    <option value="price-desc">High to Low</option>
                </select>
            </div>

            {loading && <p style={styles.status}>Yükleniyor...</p>}
            {error && <p style={{ ...styles.status, color: '#fca5a5' }}>{error}</p>}

            <div style={styles.grid}>
                {sortedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>

            <CartSidebar />
        </div>
    );
};

const styles = {
    container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
    topBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
    },
    header: { color: 'white', margin: 0 },
    sortBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
    },
    sortLabel: {
        color: 'white',
        fontWeight: 'bold',
    },
    select: {
        padding: '8px 12px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        outline: 'none',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '24px',
    },
    status: { textAlign: 'center', color: 'white', marginBottom: '20px' },
};

export default HomePage;