import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDefaultAdmin } from '../auth.js';
import { pool, query } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, '../../sql/schema.sql');
const schema = await fs.readFile(schemaPath, 'utf8');

await query(schema);
await ensureDefaultAdmin();
await pool.end();

console.log('Database schema initialized. Default login: admin@crm.local / admin123');
