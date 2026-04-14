import bcrypt from 'bcryptjs';
import express from 'express';
import { signToken } from '../auth.js';
import { query } from '../db.js';
import { loginSchema, registerSchema } from '../validators.js';

export const authRouter = express.Router();

function buildAuthResponse(user) {
  const token = signToken(user);
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role
    }
  };
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const existing = await query('SELECT id FROM users WHERE username = $1', [payload.username]);

    if (existing.rowCount > 0) {
      return res.status(409).json({ message: 'Такой логин уже занят' });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const email = `${payload.username}@crm.local`;

    const result = await query(
      `INSERT INTO users (name, email, username, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, username, role`,
      [payload.name, email, payload.username, passwordHash, 'user']
    );

    return res.status(201).json(buildAuthResponse(result.rows[0]));
  } catch (error) {
    return next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const result = await query(
      'SELECT id, name, username, role, password_hash AS "passwordHash" FROM users WHERE username = $1',
      [payload.username]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(payload.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }

    return res.json(buildAuthResponse(user));
  } catch (error) {
    return next(error);
  }
});
