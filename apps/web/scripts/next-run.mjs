import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const command = process.argv[2];
const extraArgs = process.argv.slice(3);

if (!command || !['dev', 'build', 'start'].includes(command)) {
  console.error('Usage: node ./scripts/next-run.mjs <dev|build|start> [...args]');
  process.exit(1);
}

const env = { ...process.env };

if (command === 'build' || command === 'start') {
  env.NEXT_DIST_DIR = '.next-build';
}

const nextBin = path.join(webRoot, '..', '..', 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextBin, command, ...extraArgs], {
  cwd: webRoot,
  env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
