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


// 🌸 Таблица цветов
db.run(`
  CREATE TABLE IF NOT EXISTS flowers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    description TEXT
  )
`);

// 👤 Таблица клиентов
db.run(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL
  )
`);

// 📄 Таблица заявок
db.run(`
  CREATE TABLE IF NOT EXISTS application (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flower_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    date TEXT DEFAULT CURRENT_DATE,
    FOREIGN KEY (flower_id) REFERENCES flowers(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
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

app.post('/api/orders', (req, res) => {
  const { client_name, email, phone_number, flower_type, quantity } = req.body;

  if (!client_name || !email || !phone_number || !flower_type || !quantity) {
    return res.status(400).json({ message: 'Пожалуйста, заполните все поля.' });
  }

  // 1. Найти или добавить клиента
  const findClientSql = `SELECT id FROM clients WHERE email = ?`;
  db.get(findClientSql, [email], (err, client) => {
    if (err) return res.status(500).json({ message: 'Ошибка при поиске клиента' });

    const insertClientAndContinue = (clientId) => {
      // 2. Найти цветок по названию
      const findFlowerSql = `SELECT id FROM flowers WHERE name = ?`;
      db.get(findFlowerSql, [flower_type], (err, flower) => {
        if (err || !flower) return res.status(400).json({ message: 'Такой цветок не найден' });

        // 3. Вставка в таблицу заявок
        const insertAppSql = `
          INSERT INTO application (flower_id, client_id)
          VALUES (?, ?)
        `;
        db.run(insertAppSql, [flower.id, clientId], function (err) {
          if (err) {
            console.error('Ошибка при создании заявки:', err.message);
            return res.status(500).json({ message: 'Ошибка при создании заявки' });
          }

          res.status(201).json({ message: 'Заявка успешно создана', applicationId: this.lastID });
        });
      });
    };

    if (client) {
      insertClientAndContinue(client.id);
    } else {
      const insertClientSql = `
        INSERT INTO clients (full_name, phone, email)
        VALUES (?, ?, ?)
      `;
      db.run(insertClientSql, [client_name, phone_number, email], function (err) {
        if (err) return res.status(500).json({ message: 'Ошибка при добавлении клиента' });
        insertClientAndContinue(this.lastID);
      });
    }
  });
});

// 🔍 API: Получение статуса заказа по email (для order-status.js)
app.get('/api/order-status', (req, res) => {
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
      console.error('Ошибка при получении статуса заказа:', err.message);
      return res.status(500).json({ message: 'Ошибка сервера при получении статуса' });
    }

    if (row) {
      res.json(row);
    } else {
      res.status(404).json({ message: 'Заказ не найден' });
    }
  });
});

// 📦 Получение всех заявок для админки
app.get('/api/applications', (req, res) => {
  const sql = `
    SELECT 
      application.id AS application_id,
      application.date,
      flowers.name AS flower_name,
      flowers.description,
      flowers.quantity AS flower_quantity,
      clients.full_name,
      clients.phone,
      clients.email
    FROM application
    JOIN flowers ON application.flower_id = flowers.id
    JOIN clients ON application.client_id = clients.id
    ORDER BY application.date DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Ошибка при получении заявок:', err.message);
      return res.status(500).json({ message: 'Ошибка сервера при получении заявок' });
    }

    res.json(rows);
  });
});

app.get('/api/flowers', (req, res) => {
  const sql = `SELECT * FROM flowers`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Ошибка при получении цветов:', err.message);
      return res.status(500).json({ message: 'Ошибка сервера' });
    }
    res.json(rows);
  });
});

app.post('/api/flowers', (req, res) => {
  const { name, quantity, description } = req.body;

  if (!name || !quantity) {
    return res.status(400).json({ message: 'Название и количество обязательны' });
  }

  const sql = `
    INSERT INTO flowers (name, quantity, description)
    VALUES (?, ?, ?)
  `;

  db.run(sql, [name, quantity, description || null], function (err) {
    if (err) {
      console.error('Ошибка при добавлении цветка:', err.message);
      return res.status(500).json({ message: 'Ошибка сервера при добавлении цветка' });
    }

    res.status(201).json({ message: 'Цветок добавлен', flowerId: this.lastID });
  });
});


// 🚀 Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});
