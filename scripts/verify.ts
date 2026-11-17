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
const tool = (...parts: string[]) => [bun, '--bun', join(root, 'node_modules', ...parts)];

const staticSteps: Step[] = [
  { name: 'format', command: [...tool('prettier', 'bin', 'prettier.cjs'), '--check', '.'] },
  { name: 'lint', command: [...tool('eslint', 'bin', 'eslint.js'), '.'] },
  { name: 'types', command: [...tool('typescript', 'bin', 'tsc'), '--noEmit', '-p', 'tsconfig.json'] },
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
