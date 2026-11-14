import { Router } from 'express';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../db.js';
import { asyncRoute, requireAuth } from '../middleware/auth.js';

const router = Router();
const publicUser = user => ({ id: user._id.toString(), name: user.name, email: user.email });
const validEmail = email => typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const tokenFor = user => jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' });

router.post('/register', asyncRoute(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || !validEmail(email) || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Provide a name, valid email, and password of 8–128 characters.' });
  }
  const db = await connectToDatabase();
  const user = { name: name.trim(), email: email.trim().toLowerCase(), passwordHash: await bcrypt.hash(password, 10), createdAt: new Date() };
  try {
    const result = await db.collection('users').insertOne(user);
    user._id = result.insertedId;
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'This email is already registered.' });
    throw error;
  }
  res.status(201).json({ message: 'User registered successfully.', user: publicUser(user), token: tokenFor(user) });
}));

router.post('/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body || {};
  if (!validEmail(email) || typeof password !== 'string' || password.length > 128) return res.status(400).json({ error: 'Email and password are required.' });
  const db = await connectToDatabase();
  const user = await db.collection('users').findOne({ email: email.trim().toLowerCase() });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid email or password.' });
  res.json({ message: 'Login successful.', user: publicUser(user), token: tokenFor(user) });
}));

const updateUser = asyncRoute(async (req, res) => {
  req.body ||= {};
  const changes = {};
  if (req.body.name !== undefined) {
    if (typeof req.body.name !== 'string' || !req.body.name.trim()) return res.status(400).json({ error: 'Name must not be empty.' });
    changes.name = req.body.name.trim();
  }
  if (req.body.email !== undefined) {
    if (!validEmail(req.body.email)) return res.status(400).json({ error: 'Provide a valid email.' });
    changes.email = req.body.email.trim().toLowerCase();
  }
  if (req.body.password !== undefined) {
    if (typeof req.body.password !== 'string' || req.body.password.length < 8 || req.body.password.length > 128) return res.status(400).json({ error: 'Password must contain 8–128 characters.' });
    changes.passwordHash = await bcrypt.hash(req.body.password, 10);
  }
  if (!Object.keys(changes).length) return res.status(400).json({ error: 'Provide name, email, or password to update.' });
  const db = await connectToDatabase();
  try {
    await db.collection('users').updateOne({ _id: new ObjectId(req.user.id) }, { $set: changes });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'This email is already registered.' });
    throw error;
  }
  const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ message: 'User updated successfully.', user: publicUser(user) });
});
router.put('/user', requireAuth, updateUser);
router.patch('/user', requireAuth, updateUser);
router.put('/update', requireAuth, updateUser);

export default router;
