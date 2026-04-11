import bcrypt from 'bcryptjs';
import express from 'express';
import { signToken } from '../auth.js';
import { query } from '../db.js';
import { loginSchema } from '../validators.js';

export const authRouter = express.Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const result = await query('SELECT id, name, email, role, password_hash AS "passwordHash" FROM users WHERE email = $1', [
      payload.email
    ]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(payload.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }
    const token = signToken(user);
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    return next(error);
  }
});
