// Commit and push. The site is not live until a deployment runs.
//
// `make publish MESSAGE="what changed"` calls this. It validates, commits and
// pushes, and it stops there: `make deploy` is the deliberate step that
// publishes, and `make watch` follows that run.
//
// It uses git the same way a person would, and it stops at the first failure,
// so a rejected push exits non-zero.

import { execFileSync } from 'node:child_process';

function parseArgs(argv) {
  const options = { repo: 'jacano/jacano.github.io', branch: 'main', message: '' };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    if (key in options) options[key] = argv[i + 1] ?? '';
  }
  return options;
}

/** Run a command and hand its output straight to the terminal. */
function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

/** True when the command succeeds, false when it exits non-zero. */
function succeeds(command, args) {
  try {
    execFileSync(command, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// `--repo` stays in the argument list because the Makefile passes it, but this
// step pushes to `origin`, so the name is not read here.
const { branch, message } = parseArgs(process.argv.slice(2));

if (!message) {
  console.error('A commit message is required: make publish MESSAGE="what changed"');
  process.exit(1);
}

const current = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
if (current !== branch) {
  console.error(`This is branch ${current}, and publish expects ${branch}. Switch first.`);
  process.exit(1);
}

run('git', ['add', '-A']);

// `git diff --cached --quiet` exits 1 as soon as something is staged.
if (succeeds('git', ['diff', '--cached', '--quiet'])) {
  console.log('nothing to commit, pushing what is already here');
} else {
  run('git', ['commit', '-m', message]);
}

run('git', ['push', 'origin', branch]);

// No waiting. The site is published when someone runs make deploy, so this ends
// with the push and leaves the deployment to whoever wants it.
console.log('pushed. make deploy publishes the site, make status shows the runs.');
