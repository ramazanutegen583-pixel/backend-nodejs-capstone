import 'dotenv/config';
import { MongoClient } from 'mongodb';

let client;
let database;

export async function connectToDatabase() {
  if (database) return database;
  client = new MongoClient(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017');
  await client.connect();
  database = client.db(process.env.MONGODB_DATABASE || 'secondChance');
  await database.collection('users').createIndex({ email: 1 }, { unique: true });
  return database;
}

export async function closeDatabase() {
  if (client) await client.close();
  client = undefined;
  database = undefined;
}
