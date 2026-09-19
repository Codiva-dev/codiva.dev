import { spawnSync } from 'node:child_process';

const useTurbopack = process.env.TURBOPACK === '1';
const args = ['next', 'build'];
if (useTurbopack) args.push('--turbopack');

const result = spawnSync('npx', args, { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
