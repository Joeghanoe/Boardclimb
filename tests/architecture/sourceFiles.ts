import { Glob } from 'bun';
import { join } from 'node:path';

export const ROOT = join(import.meta.dir, '..', '..');

export interface SourceFile {
  /** Path relative to the repo root, with forward slashes. */
  path: string;
  /** Workspace folder the file belongs to, for example `packages/domain` or `apps/mobile`. */
  workspace: string;
  text: string;
}

const PATTERNS = [
  'apps/*/*.{ts,tsx}',
  'apps/*/src/**/*.{ts,tsx}',
  'packages/*/src/**/*.{ts,tsx}',
  'packages/*/tests/**/*.{ts,tsx}',
];

/** Every TypeScript file of every workspace (apps and packages), read once through Bun's file APIs. */
async function loadSources(): Promise<SourceFile[]> {
  const paths = PATTERNS.flatMap((pattern) => [...new Glob(pattern).scanSync({ cwd: ROOT })])
    .map((path) => path.replaceAll('\\', '/'))
    .filter((path) => !path.includes('node_modules'))
    .sort();
  return Promise.all(
    paths.map(async (path) => {
      const [group, name] = path.split('/');
      return { path, workspace: `${group}/${name}`, text: await Bun.file(join(ROOT, path)).text() };
    }),
  );
}

export const sources: SourceFile[] = await loadSources();

export function readText(relativePath: string): Promise<string> {
  return Bun.file(join(ROOT, relativePath)).text();
}

export function readJson<T>(relativePath: string): Promise<T> {
  return Bun.file(join(ROOT, relativePath)).json() as Promise<T>;
}

export function exists(relativePath: string): Promise<boolean> {
  return Bun.file(join(ROOT, relativePath)).exists();
}

/** Folder names directly under `packages/`. */
export function packageFolders(): string[] {
  return [...new Glob('*/package.json').scanSync({ cwd: join(ROOT, 'packages') })].map(
    (path) => path.replaceAll('\\', '/').split('/')[0] as string,
  );
}

const IMPORT =
  /(?:import|export)\s[^'";]*?from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Module specifiers a file imports or re-exports. */
export function importsOf(text: string): string[] {
  return [...text.matchAll(IMPORT)].map((match) => match[1] ?? match[2] ?? match[3] ?? '');
}

export function isTestFile(path: string): boolean {
  return /\.test\.tsx?$/.test(path) || path.includes('/testing/') || path.includes('/tests/');
}
