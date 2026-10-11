// Local development API server (npm run dev:api). Mirrors api/index.js.
import 'dotenv/config';
import './env.js';
import { createApp } from './app.js';
import { all } from './config/db.js';
import { seed } from './seed/seed.js';

if (all('SELECT id FROM departments LIMIT 1').length === 0) seed();

const app = createApp();
app.set('io', { emit() {}, to() { return this; }, in() { return this; } });
const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}  (health: /api/health)`));
