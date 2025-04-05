const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Создание папки database, если не существует
const dbFolder = path.join(__dirname, 'database');
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder);
}

const app = express();
const PORT = 3000;

// Подключение базы данных
const dbPath = path.join(__dirname, 'database', 'flowers.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    return console.error('❌ Ошибка подключения к БД:', err.message);
  }
  console.log('✅ Подключено к базе данных SQLite');
});

// Создание таблицы заказов
db.run(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    flower_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    order_date TEXT DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'В обработке'
  )
`);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы (папка public и HTML-файлы)
app.use(express.static(path.join(__dirname, 'public')));

// 🔽 API: Создание заказа
app.post('/api/orders', (req, res) => {
  const { client_name, email, phone_number, flower_type, quantity } = req.body;

  if (!client_name || !email || !phone_number || !flower_type || !quantity) {
    return res.status(400).json({ message: 'Пожалуйста, заполните все поля.' });
  }

  const sql = `
    INSERT INTO orders (client_name, email, phone_number, flower_type, quantity)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(sql, [client_name, email, phone_number, flower_type, quantity], function (err) {
    if (err) {
      console.error('Ошибка при добавлении заказа:', err.message);
      return res.status(500).json({ message: 'Ошибка сервера при создании заказа' });
    }

    res.status(201).json({ message: 'Заказ успешно создан', orderId: this.lastID });
  });
});

// 🔍 API: Получение заказа по email
app.get('/api/orders', (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: 'Email обязателен' });
  }

  const sql = `
    SELECT * FROM orders
    WHERE email = ?
    ORDER BY id DESC
    LIMIT 1
  `;

  db.get(sql, [email], (err, row) => {
    if (err) {
      console.error('Ошибка при поиске заказа:', err.message);
      return res.status(500).json({ message: 'Ошибка сервера при получении заказа' });
    }

    if (row) {
      res.json(row);
    } else {
      res.status(404).json({ message: 'Заказ не найден' });
    }
  });
});

// 🚀 Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});
