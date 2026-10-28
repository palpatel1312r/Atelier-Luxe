import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.dirname(fileURLToPath(import.meta.url));
const project = path.join(root, '..');

function run(name, cwd, cmd, args) {
  const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`[${name}] exited with ${code}`);
  });
  return child;
}

console.log('Starting Atelier Luxe backend + frontend...\n');
run('backend', path.join(project, 'backend'), 'npm', ['run', 'dev']);
run('frontend', path.join(project, 'frontend'), 'npm', ['run', 'dev']);
