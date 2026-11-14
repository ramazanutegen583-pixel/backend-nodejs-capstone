import 'dotenv/config';
import { tokenizer } from '../sentiment/index.js';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { connectToDatabase, closeDatabase } from './db.js';

export async function startServer() {
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') throw new Error('Set JWT_SECRET before starting in production.');
    process.env.JWT_SECRET = randomBytes(32).toString('hex');
  }
  await connectToDatabase();
  const app = createApp(tokenizer);
  const port = Number(process.env.PORT || 3060);
  const server = app.listen(port, '127.0.0.1', () => console.log(`Second Chance is running at http://localhost:${port}`));
  const stop = () => server.close(async () => { await closeDatabase(); process.exit(0); });
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase()) {
  startServer().catch(error => { console.error(error.message); process.exitCode = 1; });
}
