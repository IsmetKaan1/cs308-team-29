require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured');
}

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const productRoutes = require('./routes/products');
const usbRoutes = require('./routes/usb');
const cartRoutes = require('./routes/cart');
const connectMongoDB = require('./mongoDb');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

connectMongoDB();

app.use('/api', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/products', productRoutes);
app.use('/api/usb', usbRoutes);
app.use('/api/cart', cartRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
