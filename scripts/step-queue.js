#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEFAULT_STEPS_DIR = '.dev/steps';
const DEFAULT_PROGRESS_FILE = '.dev/progress.json';
const STEP_FILE_PATTERN = /^(\d+)-.*\.md$/;
const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'failed', 'skipped'];
const VALID_TRANSITIONS = {
  pending: ['in_progress', 'skipped'],
  in_progress: ['completed', 'failed', 'pending'],
  failed: ['in_progress', 'pending'],
  completed: ['pending'],
  skipped: ['pending'],
};

const DEFAULT_PROGRESS_ITEMS = [
  { id: 'preflight', label: 'Pre-flight: dev containers healthy', status: 'pending' },
  { id: 'exploration', label: 'Codebase exploration', status: 'pending' },
  { id: 'implementation', label: 'Implementation', status: 'pending' },
  { id: 'prettier', label: 'Prettier formatting', status: 'pending' },
  { id: 'test-maintenance', label: 'Test maintenance', status: 'pending' },
  { id: 'tests-task', label: 'Tests: task-specific', status: 'pending' },
  { id: 'tests-regression', label: 'Tests: regression', status: 'pending' },
  { id: 'verification', label: 'Verification', status: 'pending' },
  { id: 'docs', label: 'Documentation update', status: 'pending' },
  { id: 'postflight', label: 'Post-flight: cleanup & health check', status: 'pending' },
];

function reply(data) {
  process.stdout.write(JSON.stringify(data) + '\n');
  process.exit(data.ok ? 0 : 1);
}

function fail(error) {
  reply({ ok: false, error });
}

function resolveProgressPath(args) {
  const idx = args.indexOf('--progress');
  const rel = idx !== -1 && args[idx + 1] ? args[idx + 1] : DEFAULT_PROGRESS_FILE;
  return path.resolve(rel);
}

function resolveStepsDir(args) {
  const idx = args.indexOf('--dir');
  const rel = idx !== -1 && args[idx + 1] ? args[idx + 1] : DEFAULT_STEPS_DIR;
  return path.resolve(rel);
}

function atomicWrite(filePath, data) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  fs.renameSync(tmp, filePath);
}

function discoverSteps(stepsDir) {
  if (!fs.existsSync(stepsDir)) {
    fail(`Steps directory not found: ${stepsDir}`);
  }
  const files = fs.readdirSync(stepsDir).filter(f => STEP_FILE_PATTERN.test(f)).sort();
  return files.map(f => {
    const order = parseInt(f.match(STEP_FILE_PATTERN)[1], 10);
    return {
      order,
      file: f,
      status: 'pending',
      commitHash: null,
      startedAt: null,
      completedAt: null,
      error: null,
      retryCount: 0,
    };
  });
}

function createProgress(stepsDir, progressPath) {
  const steps = discoverSteps(stepsDir);
  if (steps.length === 0) {
    fail(`No step files found in ${stepsDir} (expected NN-*.md pattern)`);
  }
  const now = new Date().toISOString();
  const data = {
    version: 1,
    stepsDirectory: path.relative(process.cwd(), stepsDir),
    createdAt: now,
    updatedAt: now,
    steps,
  };
  const dir = path.dirname(progressPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  atomicWrite(progressPath, data);
  return data;
}

function loadProgress(progressPath, args) {
  if (!fs.existsSync(progressPath)) {
    const stepsDir = resolveStepsDir(args);
    return createProgress(stepsDir, progressPath);
  }
  const raw = fs.readFileSync(progressPath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    fail(`Corrupted progress file (invalid JSON): ${progressPath}`);
  }
}

function saveProgress(progressPath, data) {
  data.updatedAt = new Date().toISOString();
  atomicWrite(progressPath, data);
}

function findStep(data, order) {
  return data.steps.find(s => s.order === order);
}

function gitLogHashes() {
  try {
    const out = execSync('git log --oneline --all', { encoding: 'utf-8', timeout: 10000 });
    return out.trim().split('\n').filter(Boolean);
  } catch {
    return null;
  }
}

function gitCommitExists(hash) {
  try {
    execSync(`git cat-file -t ${hash}`, { encoding: 'utf-8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

function findCommitForStep(logLines, stepFile) {
  const line = logLines.find(l => l.includes(stepFile));
  if (!line) return null;
  return line.split(/\s+/)[0];
}

function counters(data) {
  const c = { completed: 0, failed: 0, skipped: 0, pending: 0, in_progress: 0 };
  for (const s of data.steps) c[s.status] = (c[s.status] || 0) + 1;
  return {
    remaining: c.pending + c.in_progress,
    completed: c.completed,
    failed: c.failed,
    skipped: c.skipped,
  };
}

// --- Commands ---

function cmdInit(args) {
  const progressPath = resolveProgressPath(args);
  const stepsDir = resolveStepsDir(args);

  if (fs.existsSync(progressPath)) {
    fail(`Progress file already exists: ${progressPath}. Delete it or use 'validate'.`);
  }

  const data = createProgress(stepsDir, progressPath);
  reply({ ok: true, totalSteps: data.steps.length, progressFile: progressPath });
}

function cmdNext(args) {
  const progressPath = resolveProgressPath(args);
  const data = loadProgress(progressPath, args);
  const stepsDir = path.resolve(data.stepsDirectory);

  const inProgress = data.steps.find(s => s.status === 'in_progress');
  if (inProgress) {
    reply({
      ok: true,
      step: {
        order: inProgress.order,
        file: inProgress.file,
        absolutePath: path.join(stepsDir, inProgress.file),
        status: inProgress.status,
      },
      ...counters(data),
    });
    return;
  }

  const pending = data.steps.find(s => s.status === 'pending');
  if (pending) {
    reply({
      ok: true,
      step: {
        order: pending.order,
        file: pending.file,
        absolutePath: path.join(stepsDir, pending.file),
        status: pending.status,
      },
      ...counters(data),
    });
    return;
  }

  reply({ ok: true, step: null, ...counters(data) });
}

function cmdStart(args) {
  const progressPath = resolveProgressPath(args);
  const data = loadProgress(progressPath, args);
  const order = parseInt(args[0], 10);

  if (isNaN(order)) fail('Usage: start <order>');
  const step = findStep(data, order);
  if (!step) fail(`Step ${order} not found`);

  const allowed = VALID_TRANSITIONS[step.status];
  if (!allowed || !allowed.includes('in_progress')) {
    fail(`Cannot start step ${order}: current status is '${step.status}', transition to 'in_progress' not allowed`);
  }

  step.status = 'in_progress';
  step.startedAt = new Date().toISOString();
  step.error = null;
  step.retryCount = 0;
  saveProgress(progressPath, data);
  reply({ ok: true, order: step.order, status: step.status });
}

function cmdComplete(args) {
  const progressPath = resolveProgressPath(args);
  const data = loadProgress(progressPath, args);
  const order = parseInt(args[0], 10);

  if (isNaN(order)) fail('Usage: complete <order> --commit <hash>');
  const step = findStep(data, order);
  if (!step) fail(`Step ${order} not found`);

  if (step.status !== 'in_progress') {
    fail(`Cannot complete step ${order}: current status is '${step.status}', expected 'in_progress'`);
  }

  const commitIdx = args.indexOf('--commit');
  const commitHash = commitIdx !== -1 ? args[commitIdx + 1] : null;
  if (!commitHash) fail('Usage: complete <order> --commit <hash>');

  step.status = 'completed';
  step.completedAt = new Date().toISOString();
  step.commitHash = commitHash;
  step.error = null;
  saveProgress(progressPath, data);
  reply({ ok: true, order: step.order, status: step.status, commitHash: step.commitHash });
}

function cmdFail(args) {
  const progressPath = resolveProgressPath(args);
  const data = loadProgress(progressPath, args);
  const order = parseInt(args[0], 10);

  if (isNaN(order)) fail('Usage: fail <order> --error "<message>"');
  const step = findStep(data, order);
  if (!step) fail(`Step ${order} not found`);

  if (step.status !== 'in_progress') {
    fail(`Cannot fail step ${order}: current status is '${step.status}', expected 'in_progress'`);
  }

  const errorIdx = args.indexOf('--error');
  const errorMsg = errorIdx !== -1 ? args[errorIdx + 1] : null;
  if (!errorMsg) fail('Usage: fail <order> --error "<message>"');

  step.status = 'failed';
  step.error = errorMsg;
  saveProgress(progressPath, data);
  reply({ ok: true, order: step.order, status: step.status, error: step.error });
}

function cmdSkip(args) {
  const progressPath = resolveProgressPath(args);
  const data = loadProgress(progressPath, args);
  const order = parseInt(args[0], 10);

  if (isNaN(order)) fail('Usage: skip <order>');
  const step = findStep(data, order);
  if (!step) fail(`Step ${order} not found`);

  if (step.status !== 'pending') {
    fail(`Cannot skip step ${order}: current status is '${step.status}', expected 'pending'`);
  }

  step.status = 'skipped';
  saveProgress(progressPath, data);
  reply({ ok: true, order: step.order, status: step.status });
}

function cmdStatus(args) {
  const progressPath = resolveProgressPath(args);
  const data = loadProgress(progressPath, args);

  const steps = data.steps.map(s => ({
    order: s.order,
    file: s.file,
    status: s.status,
    commitHash: s.commitHash,
    error: s.error,
  }));

  reply({ ok: true, steps, ...counters(data) });
}

function cmdRetryMark(args) {
  const progressPath = resolveProgressPath(args);
  const data = loadProgress(progressPath, args);
  const order = parseInt(args[0], 10);

  if (isNaN(order)) fail('Usage: retry-mark <order> [--max <N>]');
  const step = findStep(data, order);
  if (!step) fail(`Step ${order} not found`);

  if (step.status !== 'in_progress') {
    fail(`Cannot mark retry for step ${order}: current status is '${step.status}', expected 'in_progress'`);
  }

  const maxIdx = args.indexOf('--max');
  const maxRetries = maxIdx !== -1 && args[maxIdx + 1] ? parseInt(args[maxIdx + 1], 10) : 2;

  const currentCount = step.retryCount || (step.retryUsed ? 1 : 0);

  if (currentCount >= maxRetries) {
    reply({ ok: true, order: step.order, retryCount: currentCount, maxRetries, exhausted: true });
    return;
  }

  step.retryCount = currentCount + 1;
  delete step.retryUsed;
  saveProgress(progressPath, data);
  reply({ ok: true, order: step.order, retryCount: step.retryCount, maxRetries, exhausted: false });
}

function cmdValidate(args) {
  const progressPath = resolveProgressPath(args);
  const data = loadProgress(progressPath, args);
  const stepsDir = path.resolve(data.stepsDirectory);
  const recovered = [];
  const warnings = [];

  for (const step of data.steps) {
    const filePath = path.join(stepsDir, step.file);
    if (!fs.existsSync(filePath)) {
      warnings.push(`Step file missing: ${step.file}`);
    }
    if (!VALID_STATUSES.includes(step.status)) {
      warnings.push(`Step ${step.order} has invalid status: ${step.status}`);
    }
  }

  const logLines = gitLogHashes();

  if (logLines) {
    for (const step of data.steps) {
      if (step.status === 'in_progress') {
        const hash = findCommitForStep(logLines, step.file);
        if (hash) {
          const from = step.status;
          step.status = 'completed';
          step.completedAt = new Date().toISOString();
          step.commitHash = hash;
          step.error = null;
          recovered.push({ order: step.order, from, to: 'completed', commitHash: hash });
        }
      }

      if (step.status === 'completed' && step.commitHash) {
        if (!gitCommitExists(step.commitHash)) {
          warnings.push(`Step ${step.order} (${step.file}): commitHash '${step.commitHash}' not found in git`);
        }
      }
    }
  } else {
    warnings.push('Git not available or not a git repository — skipped git verification');
  }

  if (recovered.length > 0) {
    saveProgress(progressPath, data);
  }

  reply({ ok: true, valid: warnings.length === 0, recovered, warnings });
}

function cmdReset(args) {
  const progressPath = resolveProgressPath(args);
  const data = loadProgress(progressPath, args);
  const order = parseInt(args[0], 10);

  if (isNaN(order)) fail('Usage: reset <order>');
  const step = findStep(data, order);
  if (!step) fail(`Step ${order} not found`);

  const allowed = VALID_TRANSITIONS[step.status];
  if (!allowed || !allowed.includes('pending')) {
    fail(`Cannot reset step ${order}: current status is '${step.status}', transition to 'pending' not allowed`);
  }

  step.status = 'pending';
  step.commitHash = null;
  step.startedAt = null;
  step.completedAt = null;
  step.error = null;
  step.retryCount = 0;
  delete step.progress;
  delete step.resolverLogs;

  saveProgress(progressPath, data);
  reply({ ok: true, order: step.order, status: step.status });
}

function cmdProgressInit(args) {
  const progressPath = resolveProgressPath(args);
  const data = loadProgress(progressPath, args);
  const order = parseInt(args[0], 10);

  if (isNaN(order)) fail('Usage: progress-init <order> [--ac "label" ...]');
  const step = findStep(data, order);
  if (!step) fail(`Step ${order} not found`);
  if (step.status !== 'in_progress') {
    fail(`Cannot init progress for step ${order}: status is '${step.status}', expected 'in_progress'`);
  }

  const acItems = [];
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--ac' && args[i + 1] && !args[i + 1].startsWith('--')) {
      acItems.push(args[++i]);
    }
  }

  step.progress = [
    ...DEFAULT_PROGRESS_ITEMS.map(item => ({ ...item })),
    ...acItems.map((label, idx) => ({
      id: `ac-${idx + 1}`,
      label,
      status: 'pending',
    })),
  ];

  saveProgress(progressPath, data);
  reply({ ok: true, order, itemCount: step.progress.length });
}

function cmdProgressUpdate(args) {
  const progressPath = resolveProgressPath(args);
  const data = loadProgress(progressPath, args);
  const order = parseInt(args[0], 10);
  const itemId = args[1];

  if (isNaN(order) || !itemId) fail('Usage: progress-update <order> <item-id> --status <status> [--note "text"]');
  const step = findStep(data, order);
  if (!step) fail(`Step ${order} not found`);
  if (!step.progress) fail(`Step ${order} has no progress initialized`);

  const item = step.progress.find(i => i.id === itemId);
  if (!item) fail(`Progress item '${itemId}' not found in step ${order}`);

  const statusIdx = args.indexOf('--status');
  const newStatus = statusIdx !== -1 ? args[statusIdx + 1] : null;
  if (!newStatus) fail('--status is required');

  item.status = newStatus;

  const noteIdx = args.indexOf('--note');
  if (noteIdx !== -1 && args[noteIdx + 1] !== undefined) {
    item.note = args[noteIdx + 1];
  } else if (['completed', 'cancelled'].includes(newStatus)) {
    delete item.note;
  }

  saveProgress(progressPath, data);
  reply({ ok: true, order, itemId, status: newStatus });
}

function cmdProgressGet(args) {
  const progressPath = resolveProgressPath(args);
  const data = loadProgress(progressPath, args);
  const order = parseInt(args[0], 10);

  if (isNaN(order)) fail('Usage: progress-get <order>');
  const step = findStep(data, order);
  if (!step) fail(`Step ${order} not found`);

  reply({ ok: true, order, progress: step.progress || [] });
}

// --- Main ---

function main() {
  const args = process.argv.slice(2);
  const command = args.shift();

  try {
    switch (command) {
      case 'init': return cmdInit(args);
      case 'next': return cmdNext(args);
      case 'start': return cmdStart(args);
      case 'complete': return cmdComplete(args);
      case 'fail': return cmdFail(args);
      case 'skip': return cmdSkip(args);
      case 'status': return cmdStatus(args);
      case 'validate': return cmdValidate(args);
      case 'retry-mark': return cmdRetryMark(args);
      case 'reset': return cmdReset(args);
      case 'progress-init': return cmdProgressInit(args);
      case 'progress-update': return cmdProgressUpdate(args);
      case 'progress-get': return cmdProgressGet(args);
      default:
        fail(`Unknown command: '${command}'. Available: init, next, start, complete, fail, skip, status, validate, retry-mark, reset, progress-init, progress-update, progress-get`);
    }
  } catch (e) {
    if (e.message && !e._handled) {
      fail(`Unexpected error: ${e.message}`);
    }
  }
}

main();
