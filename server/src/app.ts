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

// Available LLM models
app.get('/api/models', async (_req, res) => {
  try {
    const { getAvailableProviders } = await import('./llm/minimaxClient.js');
    res.json({ models: getAvailableProviders() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load models' });
  }
});

// Test model connectivity
app.post('/api/models/test', async (req, res) => {
  try {
    const providerId = typeof req.body?.modelId === 'string' ? req.body.modelId : undefined;
    const { createChatCompletion } = await import('./llm/minimaxClient.js');
    await createChatCompletion(
      [{ role: 'user', content: '请回复"OK"' }],
      { providerId, maxTokens: 10, temperature: 0 }
    );
    res.json({ success: true, message: '连接成功' });
  } catch (err) {
    res.json({ success: false, message: err instanceof Error ? err.message : '连接失败' });
  }
});

// 小红书登录态检测
app.get('/api/xhs/check-auth', async (_req, res) => {
  try {
    const { ensureXhsAuth } = await import('./publish/xhsAuth.js');
    const result = await ensureXhsAuth();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : '检测失败' });
  }
});

// Initialize seed data
initSeedData(db);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
