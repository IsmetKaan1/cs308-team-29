const mongoose = require('mongoose');
const Product = require('./models/Product');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not configured in environment variables');
    await mongoose.connect(uri);
    console.log('MongoDB Connected');

    // Seed products if empty
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log('Seeding initial products into MongoDB...');
      await Product.insertMany([
        { code: 'CS 204', name: 'Advanced Programming', description: 'C++ ile gelişmiş programlama teknikleri: pointer, linked list, template, OOP, thread', price: 299.99, serialNumber: 'SN-CS204-0001', warrantyMonths: 12, distributorInfo: 'SU Campus Store, Istanbul', model: 'CS204-2025', quantityInStock: 25 },
        { code: 'CS 300', name: 'Data Structures', description: 'Algoritmik analiz, ağaç yapıları, hash table, heap, sorting, graph algoritmaları', price: 349.99, serialNumber: 'SN-CS300-0001', warrantyMonths: 12, distributorInfo: 'SU Campus Store, Istanbul', model: 'CS300-2025', quantityInStock: 20 },
        { code: 'CS 301', name: 'Algorithms', description: 'Dynamic programming, greedy, NP-completeness, amortized analysis, graph algoritmaları', price: 349.99, serialNumber: 'SN-CS301-0001', warrantyMonths: 12, distributorInfo: 'SU Campus Store, Istanbul', model: 'CS301-2025', quantityInStock: 20 },
        { code: 'CS 306', name: 'Database Systems', description: 'ER model, SQL, normalizasyon, transaction yönetimi, indexing, NoSQL', price: 299.99, serialNumber: 'SN-CS306-0001', warrantyMonths: 12, distributorInfo: 'SU Campus Store, Istanbul', model: 'CS306-2025', quantityInStock: 30 },
        { code: 'CS 308', name: 'Software Engineering', description: 'Yazılım geliştirme yaşam döngüsü, UML, OOP tasarım, test ve süreç yönetimi', price: 399.99, serialNumber: 'SN-CS308-0001', warrantyMonths: 24, distributorInfo: 'SU Campus Store, Istanbul', model: 'CS308-2025', quantityInStock: 15 },
        { code: 'CS 408', name: 'Computer Networks', description: 'TCP/IP, HTTP, DNS, routing, sliding window, socket programming', price: 329.99, serialNumber: 'SN-CS408-0001', warrantyMonths: 12, distributorInfo: 'SU Campus Store, Istanbul', model: 'CS408-2025', quantityInStock: 18 },
        { code: 'CS 412', name: 'Machine Learning', description: 'Karar ağaçları, Bayesian yaklaşım, regresyon, neural network, SVM, Python uygulamaları', price: 449.99, serialNumber: 'SN-CS412-0001', warrantyMonths: 24, distributorInfo: 'SU Campus Store, Istanbul', model: 'CS412-2025', quantityInStock: 10 }
      ]);
      console.log('Products seeded successfully.');
    }
  } catch (error) {
    console.error('MongoDB connection failed — check MONGODB_URI. Details:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
