#!/usr/bin/env bun
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');

function run(name: string, cmd: string, args: string[], cwd: string) {
  const proc = spawn(cmd, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  const prefix = `\x1b[36m[${name}]\x1b[0m`;
  proc.stdout?.on('data', (b: Buffer) => {
    for (const line of b.toString().split('\n')) {
      if (line) console.log(`${prefix} ${line}`);
    }
  });
  proc.stderr?.on('data', (b: Buffer) => {
    for (const line of b.toString().split('\n')) {
      if (line) console.error(`${prefix} ${line}`);
    }
  });
  proc.on('exit', (code) => {
    console.log(`${prefix} exited with code ${code}`);
    process.exit(code ?? 1);
  });
  return proc;
}

const api = run(
  'api',
  'bun',
  ['--env-file=../../.env', '--hot', 'run', 'src/index.ts'],
  resolve(root, 'apps/api'),
);
const web = run(
  'web',
  'bun',
  ['x', 'vite', 'dev', '--host', '0.0.0.0', '--port', '5173', '--strictPort'],
  resolve(root, 'apps/web'),
);

function shutdown() {
  api.kill('SIGTERM');
  web.kill('SIGTERM');
  setTimeout(() => process.exit(0), 200);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(
  '\x1b[32m✓\x1b[0m kolezka-cards dev: api :3001, web :5173 (preview at http://localhost:5173/dev)',
);
