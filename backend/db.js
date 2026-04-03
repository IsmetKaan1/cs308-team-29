const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'app.db');
const legacyDbPath = path.join(__dirname, 'app.db');

fs.mkdirSync(dbDir, { recursive: true });
if (!fs.existsSync(dbPath) && fs.existsSync(legacyDbPath)) {
  fs.copyFileSync(legacyDbPath, dbPath);
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    gender TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Products table — add missing code column without dropping existing rows
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const productCols = db.prepare('PRAGMA table_info(products)').all();
const hasCodeCol = productCols.some((c) => c.name === 'code');
if (!hasCodeCol) {
  db.exec('ALTER TABLE products ADD COLUMN code TEXT');
  db.prepare("UPDATE products SET code = printf('CS %d', id) WHERE code IS NULL OR code = ''").run();
}

const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (productCount.count === 0) {
  const insert = db.prepare('INSERT INTO products (code, name, description, price) VALUES (?, ?, ?, ?)');
  insert.run('CS 204', 'Advanced Programming', 'C++ ile gelişmiş programlama teknikleri: pointer, linked list, template, OOP, thread', 299.99);
  insert.run('CS 300', 'Data Structures', 'Algoritmik analiz, ağaç yapıları, hash table, heap, sorting, graph algoritmaları', 349.99);
  insert.run('CS 301', 'Algorithms', 'Dynamic programming, greedy, NP-completeness, amortized analysis, graph algoritmaları', 349.99);
  insert.run('CS 306', 'Database Systems', 'ER model, SQL, normalizasyon, transaction yönetimi, indexing, NoSQL', 299.99);
  insert.run('CS 308', 'Software Engineering', 'Yazılım geliştirme yaşam döngüsü, UML, OOP tasarım, test ve süreç yönetimi', 399.99);
  insert.run('CS 408', 'Computer Networks', 'TCP/IP, HTTP, DNS, routing, sliding window, socket programming', 329.99);
  insert.run('CS 412', 'Machine Learning', 'Karar ağaçları, Bayesian yaklaşım, regresyon, neural network, SVM, Python uygulamaları', 449.99);
}

// USB tokens table
db.exec(`
  CREATE TABLE IF NOT EXISTS usb_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    last_used_at DATETIME
  )
`);

module.exports = db;
