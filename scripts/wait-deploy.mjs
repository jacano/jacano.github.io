// Wait for the newest Pages deployment to finish, and fail when it fails.
//
// The site is published by a workflow, so "done" is a run that reaches a
// conclusion. This is the local half of that: it asks gh, waits, and prints how
// the run ended. `make redeploy` and `make publish` call it.

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The run of the deploy workflow for one commit.
 *
 * The commit matters: right after a push GitHub has not registered the new run
 * yet, and "the newest run" is still the previous one. Asking for the commit
 * removes that race. Without a commit the newest run is the only thing to ask for.
 */
function runFor(repo, commit) {
  const args = [
    'run',
    'list',
    '--repo',
    repo,
    '--limit',
    '1',
    '--json',
    'databaseId,status,conclusion,displayTitle,headSha',
  ];
  if (commit) args.push('--commit', commit);
  const json = execFileSync('gh', args, { encoding: 'utf8' });
  const [run] = JSON.parse(json);
  return run ?? null;
}

export async function waitForDeployment({ repo, commit, timeoutMinutes = 30, quiet = false }) {
  const started = Date.now();
  let seen = null;

  while (Date.now() - started < timeoutMinutes * 60_000) {
    const run = runFor(repo, commit);

    if (!run) {
      if (!quiet) console.log(`no run for ${commit ?? 'this repository'} yet, waiting`);
    } else {
      if (run.databaseId !== seen) {
        seen = run.databaseId;
        if (!quiet) console.log(`watching run ${run.databaseId}: ${run.displayTitle}`);
      }

      if (run.status === 'completed') {
        const url = `https://github.com/${repo}/actions/runs/${run.databaseId}`;
        if (run.conclusion === 'success') {
          console.log(`deployment ${run.conclusion}: ${url}`);
          return run;
        }
        console.error(`deployment ${run.conclusion}: ${url}`);
        process.exitCode = 1;
        return run;
      }
    }

    await sleep(15_000);
  }

  console.error(`the deployment did not finish inside ${timeoutMinutes} minutes`);
  process.exitCode = 1;
  return null;
}

// Run on its own, as `make redeploy` does.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const index = process.argv.indexOf('--repo');
  const commitIndex = process.argv.indexOf('--commit');
  const repo = index === -1 ? 'jacano/jacano.github.io' : process.argv[index + 1];
  const commit = commitIndex === -1 ? undefined : process.argv[commitIndex + 1];
  await waitForDeployment({ repo, commit });
}
