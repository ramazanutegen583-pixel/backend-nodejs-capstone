import 'dotenv/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { randomBytes } from 'node:crypto';

let mongo;
if (!process.env.MONGODB_URI) {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  console.log('Started a real local MongoDB instance for this demonstration.');
}
process.env.JWT_SECRET ||= randomBytes(32).toString('hex');
const { seedItems } = await import('./seed.js');
await seedItems();
const { startServer } = await import('../index.js');
const server = await startServer();
if (mongo) server.once('close', () => mongo.stop());
