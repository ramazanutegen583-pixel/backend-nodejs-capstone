import express from 'express';
import { fileURLToPath } from 'node:url';
import secondChanceItemsRoutes from './routes/secondChanceItemsRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import authRoutes from './routes/authRoutes.js';

export function createApp(tokenizer) {
  const app = express();
  app.disable('x-powered-by');
  app.locals.tokenizer = tokenizer;
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/secondchance/items', secondChanceItemsRoutes);
  app.use('/api/secondchance/search', searchRoutes);
  app.use('/api/auth', authRoutes);
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/uploads', express.static(fileURLToPath(new URL('./uploads/', import.meta.url))));
  app.use(express.static(fileURLToPath(new URL('../dist/', import.meta.url))));
  app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
  app.use((error, req, res, next) => {
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Maximum image size is 5 MB.' });
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    res.status(status).json({ error: status >= 500 ? 'Internal server error.' : error.message });
  });
  return app;
}

export default createApp;
