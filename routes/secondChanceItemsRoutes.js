import { Router } from 'express';
import multer from 'multer';
import { ObjectId } from 'mongodb';
import { mkdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectToDatabase } from '../db.js';
import { asyncRoute, requireAuth } from '../middleware/auth.js';

const router = Router();
const uploads = fileURLToPath(new URL('../uploads/', import.meta.url));
mkdirSync(uploads, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploads,
    filename: (req, file, done) => done(null, `${new ObjectId()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, done) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype) && /\.(jpe?g|png|webp|gif)$/i.test(file.originalname)) done(null, true);
    else done(Object.assign(new Error('Upload a JPG, PNG, WebP, or GIF image.'), { status: 400 }));
  }
});

function itemQuery(id) {
  const alternatives = [{ id }];
  if (/^\d+$/.test(id)) alternatives.push({ id: Number(id) });
  if (ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id)) alternatives.push({ _id: new ObjectId(id) });
  return { $or: alternatives };
}

router.get('/', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  res.json(await db.collection('items').find({}).toArray());
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const item = await db.collection('items').findOne(itemQuery(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item not found.' });
  res.json(item);
}));

router.post('/', requireAuth, upload.single('file'), asyncRoute(async (req, res) => {
  const { name, description, category, condition, location } = req.body || {};
  if (![name, description, category].every(value => typeof value === 'string' && value.trim())) {
    if (req.file) unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Name, description, and category are required.' });
  }
  const db = await connectToDatabase();
  const item = {
    name: name.trim(), description: description.trim(), category: category.trim(),
    condition: typeof condition === 'string' ? condition.trim() : 'Good',
    location: typeof location === 'string' ? location.trim() : '',
    picture: req.file ? `/uploads/${req.file.filename}` : '',
    ownerId: req.user.id, createdAt: new Date()
  };
  const result = await db.collection('items').insertOne(item);
  res.status(201).json({ ...item, _id: result.insertedId });
}));

router.delete('/:id', requireAuth, asyncRoute(async (req, res) => {
  const db = await connectToDatabase();
  const item = await db.collection('items').findOne(itemQuery(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item not found.' });
  if (item.ownerId !== req.user.id) return res.status(403).json({ error: 'Only the owner can delete this item.' });
  await db.collection('items').deleteOne({ _id: item._id });
  if (item.picture?.startsWith('/uploads/')) {
    try { unlinkSync(path.join(uploads, path.basename(item.picture))); } catch { /* Already removed. */ }
  }
  res.json({ message: 'Item deleted.', deletedCount: 1 });
}));

export default router;
