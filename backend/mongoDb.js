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
        { code: 'CS 204', name: 'Advanced Programming', description: 'C++ ile gelişmiş programlama teknikleri: pointer, linked list, template, OOP, thread', price: 299.99 },
        { code: 'CS 300', name: 'Data Structures', description: 'Algoritmik analiz, ağaç yapıları, hash table, heap, sorting, graph algoritmaları', price: 349.99 },
        { code: 'CS 301', name: 'Algorithms', description: 'Dynamic programming, greedy, NP-completeness, amortized analysis, graph algoritmaları', price: 349.99 },
        { code: 'CS 306', name: 'Database Systems', description: 'ER model, SQL, normalizasyon, transaction yönetimi, indexing, NoSQL', price: 299.99 },
        { code: 'CS 308', name: 'Software Engineering', description: 'Yazılım geliştirme yaşam döngüsü, UML, OOP tasarım, test ve süreç yönetimi', price: 399.99 },
        { code: 'CS 408', name: 'Computer Networks', description: 'TCP/IP, HTTP, DNS, routing, sliding window, socket programming', price: 329.99 },
        { code: 'CS 412', name: 'Machine Learning', description: 'Karar ağaçları, Bayesian yaklaşım, regresyon, neural network, SVM, Python uygulamaları', price: 449.99 }
      ]);
      console.log('Products seeded successfully.');
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

module.exports = connectDB;
