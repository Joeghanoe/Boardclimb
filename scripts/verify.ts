/**
 * `bun run verify`: the one command CI and the project verify run (AGENTS.md, ADR-0004).
 * Static checks (format, lint, types) run in parallel; tests run afterwards on their own, because the scale
 * tests assert time budgets and must not compete with the linters for the CPU.
 * `--fast` skips the scale tests.
 */
import { join } from 'node:path';

interface Step {
  name: string;
  command: string[];
}

interface Outcome {
  step: Step;
  exitCode: number;
  seconds: number;
  output: string;
}

const root = join(import.meta.dir, '..');
const fast = Bun.argv.includes('--fast');
const bun = process.execPath;

// Bun's built-in formatter, linter and type checker, configured in bunfig.toml and tsconfig.json (ADR-0004).
// `--no-script` keeps them from running a package.json script of the same name instead.
const staticSteps: Step[] = [
  { name: 'format', command: [bun, 'fmt', '--check', '--no-script'] },
  { name: 'lint', command: [bun, 'lint', '--max-warnings', '0', '--no-script'] },
  { name: 'types', command: [bun, 'check', '--no-script'] },
];

const testStep: Step = {
  name: fast ? 'test (fast)' : 'test',
  command: [bun, 'test', ...(fast ? ['--path-ignore-patterns', '**/*.scale.test.ts'] : [])],
};

async function run(step: Step): Promise<Outcome> {
  const started = Bun.nanoseconds();
  const process = Bun.spawn(step.command, { cwd: root, stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  return {
    step,
    exitCode,
    seconds: (Bun.nanoseconds() - started) / 1e9,
    output: `${stdout}${stderr}`.trim(),
  };
}

function report(outcome: Outcome): void {
  const status = outcome.exitCode === 0 ? 'pass' : 'FAIL';
  console.log(`${status.padEnd(5)} ${outcome.step.name.padEnd(12)} ${outcome.seconds.toFixed(1)}s`);
  if (outcome.exitCode !== 0) console.log(outcome.output);
}

const outcomes = await Promise.all(staticSteps.map(run));
outcomes.push(await run(testStep));
for (const outcome of outcomes) report(outcome);

const failed = outcomes.filter((outcome) => outcome.exitCode !== 0);
console.log(
  failed.length === 0
    ? 'verify: all steps passed'
    : `verify: ${failed.map((o) => o.step.name).join(', ')} failed`,
);
process.exit(failed.length === 0 ? 0 : 1);
