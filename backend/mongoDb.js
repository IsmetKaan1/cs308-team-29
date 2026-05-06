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
        { code: 'CS 204', name: 'Advanced Programming', category: 'Programming',          description: 'C++ ile gelişmiş programlama teknikleri: pointer, linked list, template, OOP, thread', price: 299.99, serialNumber: 'SN-CS204-0001', warrantyMonths: 12, distributorInfo: 'SU Campus Store, Istanbul', model: 'CS204-2025', quantityInStock: 25 },
        { code: 'CS 300', name: 'Data Structures',     category: 'Algorithms',           description: 'Algoritmik analiz, ağaç yapıları, hash table, heap, sorting, graph algoritmaları', price: 349.99, serialNumber: 'SN-CS300-0001', warrantyMonths: 12, distributorInfo: 'SU Campus Store, Istanbul', model: 'CS300-2025', quantityInStock: 20 },
        { code: 'CS 301', name: 'Algorithms',          category: 'Algorithms',           description: 'Dynamic programming, greedy, NP-completeness, amortized analysis, graph algoritmaları', price: 349.99, serialNumber: 'SN-CS301-0001', warrantyMonths: 12, distributorInfo: 'SU Campus Store, Istanbul', model: 'CS301-2025', quantityInStock: 20 },
        { code: 'CS 306', name: 'Database Systems',    category: 'Systems',              description: 'ER model, SQL, normalizasyon, transaction yönetimi, indexing, NoSQL', price: 299.99, serialNumber: 'SN-CS306-0001', warrantyMonths: 12, distributorInfo: 'SU Campus Store, Istanbul', model: 'CS306-2025', quantityInStock: 30 },
        { code: 'CS 308', name: 'Software Engineering',category: 'Software Engineering', description: 'Yazılım geliştirme yaşam döngüsü, UML, OOP tasarım, test ve süreç yönetimi', price: 399.99, serialNumber: 'SN-CS308-0001', warrantyMonths: 24, distributorInfo: 'SU Campus Store, Istanbul', model: 'CS308-2025', quantityInStock: 15 },
        { code: 'CS 408', name: 'Computer Networks',   category: 'Systems',              description: 'TCP/IP, HTTP, DNS, routing, sliding window, socket programming', price: 329.99, serialNumber: 'SN-CS408-0001', warrantyMonths: 12, distributorInfo: 'SU Campus Store, Istanbul', model: 'CS408-2025', quantityInStock: 18 },
        { code: 'CS 412', name: 'Machine Learning',    category: 'AI & Data Science',    description: 'Karar ağaçları, Bayesian yaklaşım, regresyon, neural network, SVM, Python uygulamaları', price: 449.99, serialNumber: 'SN-CS412-0001', warrantyMonths: 24, distributorInfo: 'SU Campus Store, Istanbul', model: 'CS412-2025', quantityInStock: 10 }
      ]);
      console.log('Products seeded successfully.');
    }

    // Backfill: older docs created before the category field existed
    const categoryByCode = {
      'CS 204': 'Programming',
      'CS 300': 'Algorithms',
      'CS 301': 'Algorithms',
      'CS 306': 'Systems',
      'CS 308': 'Software Engineering',
      'CS 408': 'Systems',
      'CS 412': 'AI & Data Science',
    };
    const legacyDocs = await Product.find({ category: { $in: [null, ''] } }).lean();
    if (legacyDocs.length) {
      console.log(`Backfilling category on ${legacyDocs.length} legacy product(s)...`);
      await Promise.all(legacyDocs.map((doc) => {
        const category = categoryByCode[doc.code] || 'Programming';
        return Product.updateOne({ _id: doc._id }, { $set: { category } });
      }));
    }

    // Backfill: docs created before model/warrantyMonths/distributorInfo became required.
    const legacyMeta = await Product.find({
      $or: [
        { model: { $in: [null, ''] } },
        { distributorInfo: { $in: [null, ''] } },
        { warrantyMonths: { $in: [null, undefined] } },
      ],
    }).lean();
    if (legacyMeta.length) {
      console.log(`Backfilling model/warranty/distributor on ${legacyMeta.length} legacy product(s)...`);
      await Promise.all(legacyMeta.map((doc) => {
        const patch = {};
        if (!doc.model) patch.model = `${(doc.code || 'PRODUCT').replace(/\s+/g, '')}-2025`;
        if (!doc.distributorInfo) patch.distributorInfo = 'SU Campus Store, Istanbul';
        if (doc.warrantyMonths == null) patch.warrantyMonths = 12;
        return Product.updateOne({ _id: doc._id }, { $set: patch });
      }));
    }
  } catch (error) {
    console.error('MongoDB connection failed — check MONGODB_URI. Details:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
