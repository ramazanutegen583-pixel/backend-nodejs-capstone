import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const repository = 'ramazanutegen583-pixel/backend-nodejs-capstone';
let token = process.env.GITHUB_TOKEN;
if (!token) {
  const credential = spawnSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8',
    env: { ...process.env, GCM_INTERACTIVE: 'never' }
  });
  if (credential.status !== 0) throw new Error('Sign in to GitHub with Git Credential Manager first.');
  token = credential.stdout.match(/^password=(.+)$/m)?.[1].trim();
}
if (!token) throw new Error('A GitHub credential is required.');

async function api(endpoint, method = 'GET', body, raw = false) {
  const response = await fetch(`https://api.github.com/repos/${repository}${endpoint}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'backend-nodejs-capstone',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (!response.ok) {
    const error = new Error(`GitHub ${method} ${endpoint}: ${response.status} ${await response.text()}`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return raw ? response.text() : response.json();
}

const [command, argument] = process.argv.slice(2);
if (command === 'enable-pages') {
  let pages;
  try { pages = await api('/pages'); }
  catch (error) {
    if (error.status !== 404) throw error;
    pages = await api('/pages', 'POST', { build_type: 'workflow' });
  }
  if (pages.build_type !== 'workflow') throw new Error('Existing Pages site uses a different build source.');
  console.log(`GitHub Pages configured for Actions: ${pages.html_url}`);
} else if (command === 'status') {
  const result = await api('/actions/workflows/cicd.yml/runs?per_page=10');
  const run = argument ? result.workflow_runs.find(item => item.head_sha === argument) : result.workflow_runs[0];
  if (!run) console.log(JSON.stringify({ status: 'not_started' }));
  else {
    const jobs = await api(`/actions/runs/${run.id}/jobs?per_page=100`);
    console.log(JSON.stringify({ id: run.id, status: run.status, conclusion: run.conclusion, url: run.html_url,
      jobs: jobs.jobs.map(job => ({ name: job.name, status: job.status, conclusion: job.conclusion,
        steps: job.steps.map(step => ({ name: step.name, status: step.status, conclusion: step.conclusion })) }))
    }, null, 2));
  }
} else if (command === 'logs' || command === 'report') {
  if (!/^\d+$/.test(argument || '')) throw new Error('Supply a numeric workflow run ID.');
  const run = await api(`/actions/runs/${argument}`);
  if (run.conclusion !== 'success') throw new Error(`Workflow is not successful: ${run.status}/${run.conclusion}`);
  const result = await api(`/actions/runs/${argument}/jobs?per_page=100`);
  let output = `$ node scripts/github-actions.mjs ${command} ${argument}\n\n`;
  output += `Workflow: ${run.name}\nRepository: ${repository}\nRun: ${run.html_url}\nCommit: ${run.head_sha}\nStatus: ${run.status}\nConclusion: ${run.conclusion}\n\n`;
  for (const job of result.jobs) {
    output += `=== ${job.name}: ${job.conclusion} ===\n`;
    for (const step of job.steps) output += `${step.number}. ${step.name}: ${step.conclusion}\n`;
    const log = await api(`/actions/jobs/${job.id}/logs`, 'GET', undefined, true);
    if (command === 'logs') {
      output += `\n--- Complete GitHub Actions terminal log: ${job.name} ---\n${log}`;
    } else {
      const selectedLines = log.split(/\r?\n/).filter(line => {
        const message = line.replace(/^\d{4}-\d{2}-\d{2}T\S+\s+/, '').replace(/\x1b\[[0-9;]*m/g, '').trim();
        return /^(?:"insertedCount"\s*:|PASS:|Second Chance is running at |Deployment verified:|Done in .* using pnpm v|Packages: \+|Progress: .*done$|added \d+ packages? in )/.test(message);
      });
      if (selectedLines.length) output += `\n--- Selected original terminal output ---\n${selectedLines.join('\n')}`;
    }
    output += '\n\n';
  }
  await mkdir(new URL('../submission/', import.meta.url), { recursive: true });
  if (command === 'logs') {
    await Promise.all([
      writeFile(new URL('../submission/CICD', import.meta.url), output),
      writeFile(new URL('../submission/CICD-full.log', import.meta.url), output)
    ]);
  } else {
    await writeFile(new URL('../submission/CICD-copy.txt', import.meta.url), output);
  }
  console.log(output);
} else throw new Error('Usage: node scripts/github-actions.mjs enable-pages | status [commit] | logs RUN_ID | report RUN_ID');
