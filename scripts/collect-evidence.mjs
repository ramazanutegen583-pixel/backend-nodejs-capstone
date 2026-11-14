import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const directory = new URL('../submission/', import.meta.url);
await mkdir(directory, { recursive: true });
const base = process.env.API_URL || 'http://localhost:3060';
const email = `student.${Date.now()}@example.com`;
const credentials = { name: 'Demo Student', email, password: 'SecondChance123!' };

async function capture(name, route, body, expectedStatus = 200) {
  const args = ['-sS', '-i', '--max-time', '20'];
  if (body) args.push('-X', 'POST', '-H', 'Content-Type: application/json', '--data-raw', JSON.stringify(body));
  args.push(base + route);
  const result = spawnSync('curl.exe', args, { encoding: 'utf8', shell: false });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr);
  const output = result.stdout.replaceAll('\r\n', '\n');
  if (!output.startsWith(`HTTP/1.1 ${expectedStatus}`)) throw new Error(`${name}: unexpected response ${output.slice(0, 200)}`);
  const response = JSON.parse(output.slice(output.indexOf('\n\n') + 2));
  const command = `curl${body ? ` -X POST -H 'Content-Type: application/json' --data-raw '${JSON.stringify(body)}'` : ''} -i '${base + route}'`;
  await writeFile(new URL(name, directory), `${command}\n\n${output}\n`);
  console.log(`${name}: HTTP ${expectedStatus}`);
  return response;
}

const items = await capture('mainpage', '/api/secondchance/items');
if (items.length !== 16) throw new Error('Expected exactly 16 imported items.');
await capture('register', '/api/auth/register', credentials, 201);
await capture('login', '/api/auth/login', { email, password: credentials.password });
await capture('item_detail', `/api/secondchance/items/${items[0]._id}`);
const matches = await capture('search_item', '/api/secondchance/search?category=Furniture');
if (!matches.length || matches.some(item => item.category !== 'Furniture')) throw new Error('Search filter did not work.');
console.log(`Saved five real cURL commands and responses to ${fileURLToPath(directory)}`);
