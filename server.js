const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 📁 Создание папки базы данных
const dbFolder = path.join(__dirname, 'database');
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder);
}

// 📦 Подключение к SQLite
const dbPath = path.join(dbFolder, 'flowers.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error('❌ Ошибка подключения к БД:', err.message);
  console.log('✅ Подключено к базе данных SQLite');
});

// 📐 Создание таблиц
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS flowers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL,
      quantity INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS application (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flower_id INTEGER NOT NULL,
      client_id INTEGER NOT NULL,
      date TEXT DEFAULT CURRENT_DATE,
      quantity INTEGER DEFAULT 1,
      status TEXT DEFAULT 'Оформлен',
      FOREIGN KEY (flower_id) REFERENCES flowers(id),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  // 🔐 Уникальный индекс для защиты от дублей
  db.run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_application
    ON application (client_id, flower_id, date)
  `);
});

// ⚙️ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

////////////////////////////
// 🌸 Flowers API
////////////////////////////

app.get('/api/flowers', (req, res) => {
  db.all('SELECT * FROM flowers', (err, rows) => {
    if (err) return res.status(500).json({ message: 'Ошибка сервера' });
    res.json(rows);
  });
});

app.get('/api/flowers/:id', (req, res) => {
  db.get('SELECT * FROM flowers WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ message: 'Ошибка сервера' });
    if (!row) return res.status(404).json({ message: 'Цветок не найден' });
    res.json(row);
  });
});

app.post('/api/flowers', (req, res) => {
  const { name, description, price, quantity } = req.body;

  if (!name || quantity == null || price == null) {
    return res.status(400).json({ message: 'Укажите название, цену и количество' });
  }

  const sql = `
    INSERT INTO flowers (name, description, price, quantity)
    VALUES (?, ?, ?, ?)
  `;

  db.run(sql, [name, description || '', price, quantity], function (err) {
    if (err) {
      console.error('Ошибка при добавлении цветка:', err.message);
      return res.status(500).json({ message: 'Ошибка сервера' });
    }
    res.status(201).json({ message: 'Цветок добавлен', flowerId: this.lastID });
  });
});

app.put('/api/flowers/:id', (req, res) => {
  const { name, description, price, quantity } = req.body;
  const { id } = req.params;

  if (!name || quantity === undefined || price === undefined) {
    return res.status(400).json({ message: 'Все поля обязательны: name, price, quantity' });
  }

  const sql = `
    UPDATE flowers
    SET name = ?, description = ?, price = ?, quantity = ?
    WHERE id = ?
  `;

  db.run(sql, [name, description || '', price, quantity, id], function (err) {
    if (err) {
      console.error('❌ Ошибка при обновлении цветка:', err.message);
      return res.status(500).json({ message: 'Ошибка сервера при обновлении цветка' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Цветок не найден' });
    }
    res.json({ message: '✅ Цветок успешно обновлён' });
  });
});

app.delete('/api/flowers/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM flowers WHERE id = ?', [id], function (err) {
    if (err) {
      console.error('Ошибка удаления:', err.message);
      return res.status(500).json({ message: 'Ошибка сервера' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Цветок не найден' });
    }
    res.json({ message: 'Цветок удалён' });
  });
});

////////////////////////////
// 📄 Applications (заявки)
////////////////////////////

app.get('/api/applications', (req, res) => {
  const sql = `
    SELECT 
      application.id AS application_id,
      application.date,
      flowers.name AS flower_name,
      flowers.description,
      application.quantity AS flower_quantity,
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
      console.error('Ошибка получения заявок:', err.message);
      return res.status(500).json({ message: 'Ошибка сервера' });
    }
    res.json(rows);
  });
});

////////////////////////////
// 🧾 Заказы (создание заявки)
////////////////////////////

app.post('/api/orders', (req, res) => {
  const { client_name, email, phone_number, flower_type, quantity } = req.body;

  if (!client_name || !email || !phone_number || !flower_type || !quantity) {
    return res.status(400).json({ message: 'Пожалуйста, заполните все поля' });
  }

  const qty = parseInt(quantity);

  db.get(`SELECT id FROM clients WHERE email = ?`, [email], (err, client) => {
    if (err) return res.status(500).json({ message: 'Ошибка поиска клиента' });

    const handleCreateApplication = (clientId) => {
      db.get(`SELECT id, quantity FROM flowers WHERE name = ?`, [flower_type], (err, flower) => {
        if (err || !flower) {
          return res.status(400).json({ message: 'Цветок не найден' });
        }

        if (flower.quantity < qty) {
          return res.status(400).json({ message: `Недостаточно цветов. В наличии: ${flower.quantity}` });
        }

        // 1. Вычитаем количество
        const newQuantity = flower.quantity - qty;
        db.run(`UPDATE flowers SET quantity = ? WHERE id = ?`, [newQuantity, flower.id], function (err) {
          if (err) {
            console.error('❌ Ошибка обновления количества:', err.message);
            return res.status(500).json({ message: 'Ошибка при обновлении количества' });
          }

          // 2. Создаём заявку
          const insertAppSql = `
            INSERT INTO application (flower_id, client_id, quantity, status)
            VALUES (?, ?, ?, 'Оформлен')
          `;

          db.run(insertAppSql, [flower.id, clientId, qty], function (err) {
            if (err && err.message.includes('UNIQUE')) {
              return res.status(409).json({ message: 'Заявка уже существует на сегодня' });
            }
            if (err) {
              console.error('❌ Ошибка создания заявки:', err.message);
              return res.status(500).json({ message: 'Ошибка сервера при создании заявки' });
            }

            res.status(201).json({ message: '✅ Заявка успешно создана' });
          });
        });
      });
    };

    if (client) {
      handleCreateApplication(client.id);
    } else {
      db.run(
        `INSERT INTO clients (full_name, phone, email) VALUES (?, ?, ?)`,
        [client_name, phone_number, email],
        function (err) {
          if (err) return res.status(500).json({ message: 'Ошибка добавления клиента' });
          handleCreateApplication(this.lastID);
        }
      );
    }
  });
});

////////////////////////////
// 🔍 Проверка статуса заказа по email
////////////////////////////

app.get('/api/order-status', (req, res) => {
  const { email } = req.query;

  if (!email) return res.status(400).json({ message: 'Email обязателен' });

  const sql = `
    SELECT 
      clients.full_name AS client_name,
      clients.phone AS phone_number,
      flowers.name AS flower_type,
      application.quantity,
      application.date AS delivery_date,
      application.status
    FROM application
    JOIN clients ON application.client_id = clients.id
    JOIN flowers ON application.flower_id = flowers.id
    WHERE clients.email = ?
    ORDER BY application.id DESC
    LIMIT 1
  `;

  db.get(sql, [email], (err, row) => {
    if (err) {
      console.error('Ошибка при получении статуса:', err.message);
      return res.status(500).json({ message: 'Ошибка сервера' });
    }

    if (!row) return res.status(404).json({ message: 'Заявка не найдена' });

    res.json(row);
  });
});

////////////////////////////
// 👥 Получить всех клиентов
////////////////////////////

app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients', (err, rows) => {
    if (err) return res.status(500).json({ message: 'Ошибка сервера' });
    res.json(rows);
  });
});

////////////////////////////
// 🚀 Старт сервера
////////////////////////////

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});
