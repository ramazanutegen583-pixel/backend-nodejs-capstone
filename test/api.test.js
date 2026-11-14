import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3060';
const request = async (path, options = {}) => {
  const response = await fetch(base + path, options);
  return { status: response.status, body: await response.json() };
};
const json = (body, token, method = 'POST') => ({
  method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body)
});

const listing = await request('/api/secondchance/items');
assert.equal(listing.status, 200);
assert.equal(listing.body.length, 16, 'The initial database should contain exactly 16 sample items.');
const sample = listing.body[0];
assert.equal((await request(`/api/secondchance/items/${sample._id}`)).body.name, sample.name);
assert.equal((await request('/api/secondchance/items/does-not-exist')).status, 404);
const category = await request(`/api/secondchance/search?category=${encodeURIComponent(sample.category)}`);
assert.ok(category.body.length > 0);
assert.ok(category.body.every(item => item.category.toLowerCase() === sample.category.toLowerCase()));
assert.deepEqual((await request('/api/secondchance/search?category=.*')).body, [], 'Category input must be treated as literal text.');
assert.equal((await request('/api/secondchance/items', { method: 'POST' })).status, 401);

const email = `integration-${Date.now()}@example.com`;
const registration = await request('/api/auth/register', json({ name: 'API Test', email, password: 'Testpass123!' }));
assert.equal(registration.status, 201);
assert.ok(registration.body.token);
assert.equal(registration.body.user.passwordHash, undefined);
assert.equal((await request('/api/auth/register', json({ name: 'Duplicate', email, password: 'Testpass123!' }))).status, 409);
assert.equal((await request('/api/auth/login', json({ email, password: 'wrong-password' }))).status, 401);
const login = await request('/api/auth/login', json({ email, password: 'Testpass123!' }));
assert.equal(login.status, 200);
const token = login.body.token;
const updated = await request('/api/auth/user', json({ name: 'Updated API Test' }, token, 'PUT'));
assert.equal(updated.status, 200);
assert.equal(updated.body.user.name, 'Updated API Test');
assert.equal((await request(`/api/secondchance/items/${sample._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })).status, 403);

const form = new FormData();
form.set('name', 'Integration test chair');
form.set('description', 'Temporary chair to verify multipart creation and deletion.');
form.set('category', 'Furniture');
form.set('file', new Blob([Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')], { type: 'image/gif' }), 'test.gif');
const created = await request('/api/secondchance/items', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
assert.equal(created.status, 201);
assert.ok(created.body.picture.startsWith('/uploads/'));
assert.equal((await fetch(base + created.body.picture)).status, 200);
assert.equal((await request(`/api/secondchance/items/${created.body._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })).status, 200);
assert.equal((await request(`/api/secondchance/items/${created.body._id}`)).status, 404);
assert.equal((await request('/api/secondchance/items')).body.length, 16);
console.log('PASS: 16 imported items, detail/404, category search, authentication, duplicate protection, profile update, ownership, multipart upload, and deletion.');
