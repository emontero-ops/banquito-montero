const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs'); // For password hashing

const DB_PATH = path.join(__dirname, 'family_savings.db');

let db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`
      CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        role TEXT,
        password TEXT,
        saldo_ahorrado REAL DEFAULT 0,
        deuda_total REAL DEFAULT 0
      )
    `, (err) => {
      if (err) {
        console.error('Error creating profiles table:', err.message);
      } else {
        console.log('Profiles table checked/created.');
        // Seed initial users if none exist
        seedInitialUsers();
      }
    });
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      userId INTEGER,
      userName TEXT,
      amount REAL,
      description TEXT,
      date TEXT,
      type TEXT,
      FOREIGN KEY (userId) REFERENCES profiles(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating transactions table:', err.message);
    } else {
      console.log('Transactions table checked/created.');
    }
  });
});

const seedInitialUsers = async () => {
  // Check if profiles already exist (changed from users to profiles)
  db.get('SELECT COUNT(*) AS count FROM profiles', async (err, row) => {
    if (err) {
      console.error('Error checking profiles count:', err.message);
      return;
    }
    if (row.count === 0) {
      console.log('Seeding initial users...');
      const initialUsers = [
        { id: 1, name: 'Madre', role: 'admin', password: 'mom123' },
        { id: 2, name: 'Padre', role: 'member', password: 'dad123' },
        { id: 3, name: 'Hijo 1', role: 'member', password: 'kid1123' },
        { id: 4, name: 'Hijo 2', role: 'member', password: 'kid2123' },
        { id: 5, name: 'Hija 1', role: 'member', password: 'kid3123' },
        { id: 6, name: 'Hija 2', role: 'member', password: 'kid4123' },
      ];

      for (const user of initialUsers) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        db.run(
          'INSERT INTO profiles (id, name, role, password, saldo_ahorrado, deuda_total) VALUES (?, ?, ?, ?, ?, ?)',
          [user.id, user.name, user.role, hashedPassword, 0, 0],
          function (err) {
            if (err) {
              console.error(`Error seeding user ${user.name}:`, err.message);
            } else {
              console.log(`User ${user.name} seeded with ID: ${this.lastID}`);
            }
          }
        );
      }
    } else {
      console.log('Profiles already exist in the database.');
    }
  });
};

module.exports = db;