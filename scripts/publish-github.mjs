import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('Set GITHUB_TOKEN before running this script.');

async function request(method, endpoint, body) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'backend-nodejs-capstone',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const error = new Error(`GitHub ${method} ${endpoint}: ${response.status} ${data?.message || response.statusText}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function allPages(endpoint) {
  const results = [];
  for (let page = 1; ; page++) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const items = await request('GET', `${endpoint}${separator}per_page=100&page=${page}`);
    results.push(...items);
    if (items.length < 100) return results;
  }
}

function storyBody(story) {
  return `**As a** ${story.asA}  \n**I need** ${story.iNeed}  \n**So that** ${story.soThat}.\n\n## Assumptions and details\n\n${story.assumptions.map(item => `- ${item}`).join('\n')}\n\n## Acceptance criteria\n\n\`\`\`gherkin\nGiven ${story.given}\nWhen ${story.when}\nThen ${story.then}\n\`\`\`\n`;
}

const user = await request('GET', '/user');
const requestedRepository = process.env.GH_REPOSITORY || `${user.login}/backend-nodejs-capstone`;
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(requestedRepository)) {
  throw new Error('GH_REPOSITORY must have the format owner/repository.');
}
const [owner, name] = requestedRepository.split('/');
const endpoint = `/repos/${owner}/${name}`;
let repository;
try {
  repository = await request('GET', endpoint);
} catch (error) {
  if (error.status !== 404) throw error;
  repository = await request('POST', owner.toLowerCase() === user.login.toLowerCase() ? '/user/repos' : `/orgs/${owner}/repos`, {
    name,
    description: 'A simple Second Chance marketplace capstone with MongoDB and Express.',
    private: false,
    has_issues: true,
    auto_init: false
  });
}
if (repository.private) throw new Error('The selected repository is private; this assignment requires a public repository.');
if (!repository.has_issues) await request('PATCH', endpoint, { has_issues: true });

const desiredLabels = [
  { name: 'new', color: '0e8a16', description: 'A new user story' },
  { name: 'icebox', color: 'c5def5', description: 'A story for later consideration' },
  { name: 'technical debt', color: 'd93f0b', description: 'Maintenance or reliability work' },
  { name: 'backlog', color: 'fbca04', description: 'A story ready for future work' }
];
const existingLabels = await allPages(`${endpoint}/labels`);
for (const label of desiredLabels) {
  if (!existingLabels.some(existing => existing.name.toLowerCase() === label.name)) {
    await request('POST', `${endpoint}/labels`, label);
  }
}

const stories = JSON.parse(await readFile(path.join(root, 'data', 'user-stories.json'), 'utf8'));
const existingIssues = (await allPages(`${endpoint}/issues?state=all`)).filter(issue => !issue.pull_request);
const publishedIssues = [];
for (const story of stories) {
  let issue = existingIssues.find(existing => existing.title === story.title);
  if (!issue) {
    issue = await request('POST', `${endpoint}/issues`, {
      title: story.title,
      body: storyBody(story),
      labels: [story.label]
    });
    existingIssues.push(issue);
  } else if (!issue.labels.some(label => (typeof label === 'string' ? label : label.name) === story.label)) {
    await request('POST', `${endpoint}/issues/${issue.number}/labels`, { labels: [story.label] });
  }
  publishedIssues.push({ title: story.title, label: story.label, url: issue.html_url });
}

const branch = repository.default_branch || 'main';
const repoUrl = repository.html_url;
const filePaths = {
  'user-story.md': '.github/ISSUE_TEMPLATE/user-story.md',
  'db.js': 'secondChance-backend/db.js',
  'secondChanceItemsRoutes.js': 'secondChance-backend/routes/secondChanceItemsRoutes.js',
  'searchRoutes.js': 'secondChance-backend/routes/searchRoutes.js',
  'app.js': 'secondChance-backend/app.js',
  'index.js': 'sentiment/index.js',
  'authRoutes.js': 'secondChance-backend/routes/authRoutes.js'
};
const files = Object.fromEntries(Object.entries(filePaths).map(([name, filePath]) => [name, `${repoUrl}/blob/${encodeURIComponent(branch)}/${filePath}`]));
const links = {
  repository: repoUrl,
  issues: `${repoUrl}/issues`,
  branch,
  files,
  userStories: publishedIssues
};
await mkdir(path.join(root, 'submission'), { recursive: true });
await writeFile(path.join(root, 'submission', 'github-links.json'), JSON.stringify(links, null, 2) + '\n');
console.log(`Prepared public repository: ${repoUrl}`);
console.log(`Ensured ${publishedIssues.length} labeled user stories: ${repoUrl}/issues`);
console.log('Saved submission/github-links.json. Push the project source separately.');
