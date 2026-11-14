import { Router } from 'express';
import { connectToDatabase } from '../db.js';
import { asyncRoute } from '../middleware/auth.js';

const router = Router();
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const query = {};
  if (typeof req.query.category === 'string' && req.query.category.trim()) {
    query.category = { $regex: `^${escapeRegex(req.query.category.trim())}$`, $options: 'i' };
  }
  const text = req.query.q || req.query.name || req.query.search;
  if (typeof text === 'string' && text.trim()) {
    const tokenizer = req.app.locals.tokenizer;
    const tokens = (tokenizer ? tokenizer.tokenize(text) : text.trim().split(/\s+/)).slice(0, 10);
    query.$and = tokens.map(token => ({ $or: [
      { name: { $regex: escapeRegex(token), $options: 'i' } },
      { description: { $regex: escapeRegex(token), $options: 'i' } }
    ] }));
    if (!tokens.length) delete query.$and;
  }
  res.json(await db.collection('items').find(query).toArray());
}));

export default router;
