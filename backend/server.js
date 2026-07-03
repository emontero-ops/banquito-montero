const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // For JWT authentication
const bcrypt = require('bcryptjs');   // For password hashing
const db = require('./database');     // Our SQLite database connection
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001; // Backend will run on port 3001
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey'; // Use environment variable for secret

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json());

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // No token

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Token no longer valid
    req.user = user;
    next();
  });
};

// --- API Endpoints ---

// User Registration
app.post('/api/register', async (req, res) => {
  const { name, password, role } = req.body;

  if (!name || !password) {
    return res.status(400).json({ message: 'Nombre de usuario y contraseña son requeridos' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO profiles (name, role, password, saldo_ahorrado, deuda_total) VALUES (?, ?, ?, ?, ?)',
      [name, role || 'member', hashedPassword, 0, 0],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed: profiles.name')) {
            return res.status(409).json({ message: 'El nombre de usuario ya existe' });
          }
          console.error('Error al registrar usuario:', err.message);
          return res.status(500).json({ message: 'Error interno del servidor' });
        }
        res.status(201).json({ message: 'Usuario registrado exitosamente', userId: this.lastID });
      }
    );
  } catch (error) {
    console.error('Error al hashear contraseña:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// User Login
app.post('/api/login', (req, res) => {
  const { name, password } = req.body;

  db.get('SELECT * FROM profiles WHERE name = ?', [name], async (err, user) => {
    if (err) {
      console.error('Error al buscar usuario:', err.message);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
    if (!user) {
      return res.status(400).json({ message: 'Usuario o contraseña inválidos' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Usuario o contraseña inválidos' });
    }

    // Remove password before creating token
    const userForToken = { id: user.id, name: user.name, role: user.role };
    const token = jwt.sign(userForToken, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        saldo_ahorrado: user.saldo_ahorrado,
        deuda_total: user.deuda_total
      }
    });
  });
});

// Get all users (Protected - Admin only for now)
app.get('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: Solo administradores' });
  }
  db.all('SELECT id, name, role, saldo_ahorrado, deuda_total FROM profiles', (err, rows) => {
    if (err) {
      console.error('Error al obtener usuarios:', err.message);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
    res.json(rows);
  });
});

// Get user by ID (Protected)
app.get('/api/users/:id', authenticateToken, (req, res) => {
  const userId = req.params.id;
  db.get('SELECT id, name, role, saldo_ahorrado, deuda_total FROM profiles WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Error al obtener usuario:', err.message);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    // Ensure user can only view their own profile unless admin
    if (req.user.id !== user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    res.json(user);
  });
});

// Get transactions for a user (Protected)
app.get('/api/transactions/:userId', authenticateToken, (req, res) => {
  const userId = req.params.userId;
  // Users can only view their own transactions unless admin
  if (req.user.id != userId && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  db.all('SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC, id DESC', [userId], (err, rows) => {
    if (err) {
      console.error('Error al obtener transacciones:', err.message);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
    res.json(rows);
  });
});

// Get all transactions (Protected - Admin only)
app.get('/api/transactions', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: Solo administradores' });
  }
  db.all('SELECT * FROM transactions ORDER BY date DESC, id DESC', (err, rows) => {
    if (err) {
      console.error('Error al obtener todas las transacciones:', err.message);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
    res.json(rows);
  });
});

// Add a new transaction (Protected)
app.post('/api/transactions', authenticateToken, (req, res) => {
  // newTransactions can be a single object or an array for loan-related transactions
  const newTransactions = Array.isArray(req.body) ? req.body : [req.body];

  // Calculate total family savings first for new validations
  db.all('SELECT SUM(saldo_ahorrado) as totalSavings FROM profiles', async (err, rows) => {
    if (err) {
      console.error('Error getting total savings for validation:', err.message);
      return res.status(500).json({ message: 'Error interno del servidor al validar fondos' });
    }
    const totalFamilySavings = rows[0].totalSavings || 0;

    // --- New Validation Logic ---
    let totalWithdrawalOrLoanAmount = 0;
    let isLoanRequest = false;

    newTransactions.forEach(t => {
      if (t.type === 'withdrawal') {
        totalWithdrawalOrLoanAmount += Math.abs(t.amount);
      } else if (t.type === 'loan_received') {
        totalWithdrawalOrLoanAmount += t.amount;
        isLoanRequest = true;
      }
    });

    if (totalWithdrawalOrLoanAmount > totalFamilySavings) {
      let message = 'Fondos insuficientes en el ahorro familiar total para cubrir la transacción.';
      if (isLoanRequest) {
        message = 'Fondos insuficientes en el ahorro familiar total para cubrir el préstamo o los préstamos solicitados.';
      }
      return res.status(400).json({ message });
    }
    // --- End New Validation Logic ---

    db.serialize(() => {
      db.run('BEGIN TRANSACTION;');
      const stmt = db.prepare('INSERT INTO transactions (id, userId, userName, amount, description, date, type) VALUES (?, ?, ?, ?, ?, ?, ?)');

      let transactionErrors = [];
      newTransactions.forEach(t => {
        const transactionId = uuidv4();
        stmt.run(transactionId, t.userId, t.userName, t.amount, t.description, t.date, t.type, function(err) {
          if (err) {
            transactionErrors.push(`Error adding transaction for user ${t.userName}: ${err.message}`);
            console.error(`Error adding transaction for user ${t.userName}:`, err.message);
          } else {
            // Update user's saldo_ahorrado and deuda_total
            db.get('SELECT saldo_ahorrado, deuda_total FROM profiles WHERE id = ?', [t.userId], (err, user) => {
              if (err) {
                console.error(`Error getting user ${t.userId} for balance update:`, err.message);
                return;
              }
              let newSaldoAhorrado = user.saldo_ahorrado;
              let newDeudaTotal = user.deuda_total;

              if (t.type === 'deposit') {
                if (newDeudaTotal > 0) {
                  const amountToPayDebt = Math.min(t.amount, newDeudaTotal);
                  newDeudaTotal -= amountToPayDebt;
                  const remainingDeposit = t.amount - amountToPayDebt;
                  newSaldoAhorrado += remainingDeposit; // Only add remaining to savings
                } else {
                  newSaldoAhorrado += t.amount; // No debt, all goes to savings
                }
              } else if (t.type === 'loan_given') {
                // When a loan is given, the lender's savings decrease (negative amount)
                // and their 'deuda_total' (what others owe them) increases (negative amount).
                newSaldoAhorrado += t.amount;
                newDeudaTotal += t.amount; // loan_given is negative, so it adds to negative debt (others owe less)
              } else if (t.type === 'withdrawal') {
                newSaldoAhorrado += t.amount; // withdrawal is negative, so it subtracts
              } else if (t.type === 'loan_received') {
                newDeudaTotal += t.amount; // loan_received is positive, so it adds to debt
              } else if (t.type === 'loan_repayment') {
                // Loan repayment decreases debt (negative amount)
                newDeudaTotal += t.amount; // t.amount is negative for repayment
              } else if (t.type === 'loan_repayment_received') {
                // When you receive a loan repayment, what others owe you decreases (your credit decreases)
                newDeudaTotal += t.amount; // t.amount is positive for repayment received, so it increases deuda_total (making it less negative or more positive)
              }

              db.run('UPDATE profiles SET saldo_ahorrado = ?, deuda_total = ? WHERE id = ?',
                [newSaldoAhorrado, newDeudaTotal, t.userId],
                (err) => {
                  if (err) {
                    console.error(`Error updating balance for user ${t.userId}:`, err.message);
                  }
                }
              );
            });
          }
        });
      });
      stmt.finalize();

      if (transactionErrors.length > 0) {
        db.run('ROLLBACK;', (err) => {
          if (err) console.error('Error rolling back transaction:', err.message);
          return res.status(500).json({ message: 'Errores al añadir transacciones', errors: transactionErrors });
        });
      } else {
        db.run('COMMIT;', (err) => {
          if (err) {
            console.error('Error committing transaction:', err.message);
            return res.status(500).json({ message: 'Error interno del servidor al confirmar transacciones' });
          }
          res.status(201).json({ message: 'Transacciones añadidas exitosamente', transactions: newTransactions });
        });
      }
    });
  });
});

// Update a transaction (Protected)
app.put('/api/transactions/:id', authenticateToken, (req, res) => {
  const transactionId = req.params.id;
  const { userId, userName, amount, description, date, type } = req.body;

  // First, get the old transaction to revert its impact on user balances
  db.get('SELECT * FROM transactions WHERE id = ?', [transactionId], (err, oldTransaction) => {
    if (err) {
      console.error('Error fetching old transaction for update:', err.message);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
    if (!oldTransaction) {
      return res.status(404).json({ message: 'Transacción no encontrada' });
    }

    // Authorization: User can only update their own transactions unless admin
    if (req.user.id !== oldTransaction.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION;');

      // Revert old transaction's impact
      db.get('SELECT saldo_ahorrado, deuda_total FROM profiles WHERE id = ?', [oldTransaction.userId], (err, user) => {
        if (err) {
          console.error(`Error getting user ${oldTransaction.userId} for balance revert:`, err.message);
          db.run('ROLLBACK;');
          return res.status(500).json({ message: 'Error interno del servidor' });
        }
        let revertedSaldoAhorrado = user.saldo_ahorrado;
        let revertedDeudaTotal = user.deuda_total;

        if (oldTransaction.type === 'deposit' || oldTransaction.type === 'loan_given') {
          revertedSaldoAhorrado -= oldTransaction.amount; // Remove previous amount
        } else if (oldTransaction.type === 'withdrawal') {
          revertedSaldoAhorrado -= oldTransaction.amount; // Remove previous amount
        } else if (oldTransaction.type === 'loan_received') {
          revertedDeudaTotal -= oldTransaction.amount; // Remove previous debt
        } else if (oldTransaction.type === 'loan_repayment') {
          // Reverting a loan repayment means increasing debt (removing the negative)
          revertedDeudaTotal -= oldTransaction.amount; // oldTransaction.amount is negative
        } else if (oldTransaction.type === 'loan_repayment_received') {
          // Reverting a received loan repayment means increasing what others owe you (removing the negative)
          revertedDeudaTotal += oldTransaction.amount; // oldTransaction.amount is positive
        }

        db.run('UPDATE profiles SET saldo_ahorrado = ?, deuda_total = ? WHERE id = ?',
          [revertedSaldoAhorrado, revertedDeudaTotal, oldTransaction.userId],
          (err) => {
            if (err) {
              console.error(`Error reverting balance for user ${oldTransaction.userId}:`, err.message);
              db.run('ROLLBACK;');
              return res.status(500).json({ message: 'Error interno del servidor' });
            }

            // Now update the transaction itself
            db.run(
              'UPDATE transactions SET userId = ?, userName = ?, amount = ?, description = ?, date = ?, type = ? WHERE id = ?',
              [userId, userName, amount, description, date, type, transactionId],
              function (err) {
                if (err) {
                  console.error('Error updating transaction:', err.message);
                  db.run('ROLLBACK;');
                  return res.status(500).json({ message: 'Error interno del servidor' });
                }

                // Apply new transaction's impact
                db.get('SELECT saldo_ahorrado, deuda_total FROM profiles WHERE id = ?', [userId], (err, updatedUser) => {
                  if (err) {
                    console.error(`Error getting user ${userId} for new balance update:`, err.message);
                    db.run('ROLLBACK;');
                    return res.status(500).json({ message: 'Error interno del servidor' });
                  }
                  let newSaldoAhorrado = updatedUser.saldo_ahorrado;
                  let newDeudaTotal = updatedUser.deuda_total;

                  if (type === 'deposit' || type === 'loan_given') {
                    newSaldoAhorrado += amount; // loan_given is negative, so it subtracts
                  } else if (type === 'withdrawal') {
                    newSaldoAhorrado += amount; // withdrawal is negative, so it subtracts
                  } else if (type === 'loan_received') {
                    newDeudaTotal += amount; // loan_received is positive, so it adds to debt
                  } else if (type === 'loan_repayment') {
                    // Loan repayment decreases debt (negative amount)
                    newDeudaTotal += amount; // amount is negative for repayment
                  } else if (type === 'loan_repayment_received') {
                    // When you receive a loan repayment, what others owe you decreases
                    newDeudaTotal -= amount; // amount is positive for repayment received
                  }

                  db.run('UPDATE profiles SET saldo_ahorrado = ?, deuda_total = ? WHERE id = ?',
                    [newSaldoAhorrado, newDeudaTotal, userId],
                    (err) => {
                      if (err) {
                        console.error(`Error applying new balance for user ${userId}:`, err.message);
                        db.run('ROLLBACK;');
                        return res.status(500).json({ message: 'Error interno del servidor' });
                      }
                      db.run('COMMIT;', (err) => {
                        if (err) {
                          console.error('Error committing transaction update:', err.message);
                          return res.status(500).json({ message: 'Error interno del servidor' });
                        }
                        res.json({ message: 'Transacción actualizada exitosamente' });
                      });
                    });
                });
              }
            );
          });
      });
    });
  });
});

// Delete a transaction (Protected)
app.delete('/api/transactions/:id', authenticateToken, (req, res) => {
  const transactionId = req.params.id;

  db.get('SELECT * FROM transactions WHERE id = ?', [transactionId], (err, transaction) => {
    if (err) {
      console.error('Error fetching transaction for deletion:', err.message);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
    if (!transaction) {
      return res.status(404).json({ message: 'Transacción no encontrada' });
    }

    // Authorization: User can only delete their own transactions unless admin
    if (req.user.id !== transaction.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION;');

      // Revert transaction's impact on user balances
      db.get('SELECT saldo_ahorrado, deuda_total FROM profiles WHERE id = ?', [transaction.userId], (err, user) => {
        if (err) {
          console.error(`Error getting user ${transaction.userId} for balance revert (deletion):`, err.message);
          db.run('ROLLBACK;');
          return res.status(500).json({ message: 'Error interno del servidor' });
        }
        let revertedSaldoAhorrado = user.saldo_ahorrado;
        let revertedDeudaTotal = user.deuda_total;

        if (transaction.type === 'deposit' || transaction.type === 'loan_given') {
          revertedSaldoAhorrado -= transaction.amount;
        } else if (transaction.type === 'withdrawal') {
          revertedSaldoAhorrado -= transaction.amount;
        } else if (transaction.type === 'loan_received') {
          revertedDeudaTotal -= transaction.amount;
        } else if (transaction.type === 'loan_repayment') {
          // Reverting a loan repayment means increasing debt (removing the negative)
          revertedDeudaTotal -= transaction.amount; // transaction.amount is negative
        } else if (transaction.type === 'loan_repayment_received') {
          // Reverting a received loan repayment means increasing what others owe you (removing the negative)
          revertedDeudaTotal += transaction.amount; // transaction.amount is positive
        }

        db.run('UPDATE profiles SET saldo_ahorrado = ?, deuda_total = ? WHERE id = ?',
          [revertedSaldoAhorrado, revertedDeudaTotal, transaction.userId],
          (err) => {
            if (err) {
              console.error(`Error reverting balance for user ${transaction.userId} (deletion):`, err.message);
              db.run('ROLLBACK;');
              return res.status(500).json({ message: 'Error interno del servidor' });
            }

            // Delete the transaction
            db.run('DELETE FROM transactions WHERE id = ?', [transactionId], function (err) {
              if (err) {
                console.error('Error deleting transaction:', err.message);
                db.run('ROLLBACK;');
                return res.status(500).json({ message: 'Error interno del servidor' });
              }
              db.run('COMMIT;', (err) => {
                if (err) {
                  console.error('Error committing transaction deletion:', err.message);
                  return res.status(500).json({ message: 'Error interno del servidor' });
                }
                res.json({ message: 'Transacción eliminada exitosamente' });
              });
            });
          }
        );
      });
    });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});