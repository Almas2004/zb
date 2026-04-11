import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query } from './db.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, name: user.name }, config.jwtSecret, {
    expiresIn: '12h'
  });
}

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Требуется вход в систему' });

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: 'Сессия истекла' });
  }
}

export async function ensureDefaultAdmin() {
  const email = 'admin@crm.local';
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount > 0) return;
  const passwordHash = await bcrypt.hash('admin123', 10);
  await query('INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)', [
    'Администратор',
    email,
    passwordHash,
    'admin'
  ]);
}
