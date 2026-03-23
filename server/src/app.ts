import './utils/loadEnv.js';
import express from 'express';
import { db, initSeedData } from './db/index.js';
import jobsRouter from './routes/jobs.js';

const app = express();
const PORT = parseInt(process.env.SERVER_PORT ?? '3001', 10);

// Middleware: attach db to every request
app.use((_req, res, next) => {
  res.locals.db = db;
  next();
});

app.use(express.json());

// CORS for local development
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  next();
});

// Routes
app.use('/api/jobs', jobsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Initialize seed data
initSeedData(db);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
