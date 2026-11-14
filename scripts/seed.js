import 'dotenv/config';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ObjectId } from 'mongodb';
import { connectToDatabase, closeDatabase } from '../secondChance-backend/db.js';

export async function seedItems() {
  const db = await connectToDatabase();
  const existing = await db.collection('items').countDocuments();
  if (existing) return { message: 'Seed skipped: the items collection already contains documents.', existingCount: existing };
  const items = JSON.parse(readFileSync(new URL('../data/items.json', import.meta.url), 'utf8')).map(item => {
    if (typeof item._id === 'string' && /^[a-f\d]{24}$/i.test(item._id)) return { ...item, _id: new ObjectId(item._id) };
    const { _id, ...rest } = item;
    return rest;
  });
  if (items.length !== 16) throw new Error('The sample data must contain exactly 16 items.');
  const result = await db.collection('items').insertMany(items);
  const output = { acknowledged: result.acknowledged, insertedCount: result.insertedCount, insertedIds: result.insertedIds };
  const submission = new URL('../submission/', import.meta.url);
  mkdirSync(submission, { recursive: true });
  writeFileSync(new URL('inserted_items', submission), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
  return output;
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase()) {
  seedItems().then(closeDatabase).catch(async error => { console.error(error.message); await closeDatabase(); process.exitCode = 1; });
}
