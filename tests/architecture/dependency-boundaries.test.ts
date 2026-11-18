import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { ROOT, importsOf, isTestFile, readJson, sources } from './sourceFiles';

/** The permitted dependency direction (AGENTS.md, ADR-0002 section 2.1, CODE.8). */
const ALLOWED: Record<string, string[]> = {
  'packages/protocol-aurora': ['domain', 'bluetooth-core'],
  'packages/provider-snapshots': ['domain', 'catalog-core'],
  'packages/domain': [],
  'packages/design-system': [],
  'packages/catalog-core': ['domain'],
  'packages/bluetooth-core': ['domain'],
  'packages/application': ['domain', 'catalog-core', 'bluetooth-core'],
  'packages/catalog-kilter': ['domain', 'catalog-core'],
  'packages/catalog-moonboard': ['domain', 'catalog-core'],
  'packages/catalog-tension': ['domain', 'catalog-core'],
  'packages/board-kilter': ['domain', 'bluetooth-core'],
  'packages/board-moonboard': ['domain', 'bluetooth-core'],
  'packages/board-tension': ['domain', 'bluetooth-core'],
  'packages/storage-local': ['domain', 'catalog-core', 'application'],
  /** Hosted snapshot mirror (ADR-0006): it shares the phones' manifest rules and nothing else. */
  'infra/snapshot-mirror': ['provider-snapshots'],
};

/** Composition may name any package, but never the hosted mirror. */
const EVERYTHING = Object.keys(ALLOWED)
  .filter((key) => key.startsWith('packages/'))
  .map((key) => key.replace('packages/', ''));
/** Screens and presentation: use cases, domain types and the design system, nothing else of ours. */
const SCREEN_ALLOWED = ['application', 'domain', 'design-system'];
const FORBIDDEN_IN_SCREENS = ['expo-sqlite', 'react-native-ble-plx', 'bun:sqlite', 'node:sqlite'];
/** Packages that render UI may import the React runtime. */
const UI_PACKAGES = ['packages/design-system'];

function ours(specifier: string): string | null {
  const match = /^@boardclimb\/([\w-]+)(?:\/testing|\/manifest)?$/.exec(specifier);
  return match?.[1] ?? null;
}

function allowedFor(path: string, workspace: string): string[] {
  if (workspace === 'apps/mobile')
    return path.startsWith('apps/mobile/src/composition/') ? EVERYTHING : SCREEN_ALLOWED;
  return ALLOWED[workspace] ?? [];
}

describe('package dependencies point inward (CODE.8, ADR-0002 section 2.6)', () => {
  it('knows every workspace it is judging', () => {
    const workspaces = new Set(sources.map((file) => file.workspace));
    for (const workspace of workspaces) {
      expect(workspace === 'apps/mobile' || workspace in ALLOWED, `${workspace} has no rule`).toBe(true);
    }
  });

  it('imports only what its layer may depend on', () => {
    const violations: string[] = [];
    for (const file of sources) {
      const allowed = allowedFor(file.path, file.workspace);
      for (const specifier of importsOf(file.text)) {
        const name = ours(specifier);
        if (name === null) continue;
        const own = file.workspace.split('/')[1];
        if (name !== own && !allowed.includes(name))
          violations.push(`${file.path} imports @boardclimb/${name}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('never reaches into another workspace by relative path', () => {
    const violations: string[] = [];
    for (const file of sources) {
      for (const specifier of importsOf(file.text)) {
        if (!specifier.startsWith('.')) continue;
        const target = resolve(ROOT, dirname(file.path), specifier);
        const inside = relative(join(ROOT, file.workspace), target);
        if (inside.startsWith('..')) violations.push(`${file.path} imports ${specifier}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps vendor and runtime libraries out of the core packages', () => {
    const violations: string[] = [];
    for (const file of sources) {
      if (!file.workspace.startsWith('packages/') || isTestFile(file.path)) continue;
      if (UI_PACKAGES.includes(file.workspace)) continue;
      for (const specifier of importsOf(file.text)) {
        if (!specifier.startsWith('.') && ours(specifier) === null)
          violations.push(`${file.path} imports ${specifier}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps SQLite and BLE libraries out of screens and presentation (ADR-0002 section 2.6)', () => {
    const violations: string[] = [];
    for (const file of sources) {
      if (file.workspace !== 'apps/mobile' || file.path.startsWith('apps/mobile/src/composition/')) continue;
      for (const specifier of importsOf(file.text)) {
        if (FORBIDDEN_IN_SCREENS.includes(specifier)) violations.push(`${file.path} imports ${specifier}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('declares in package.json exactly the workspace packages it imports, and no forbidden ones', async () => {
    const problems: string[] = [];
    for (const workspace of new Set(sources.map((file) => file.workspace))) {
      const manifest = await readJson<{ dependencies?: Record<string, string> }>(`${workspace}/package.json`);
      const declared = Object.keys(manifest.dependencies ?? {})
        .filter((name) => name.startsWith('@boardclimb/'))
        .map((name) => name.replace('@boardclimb/', ''));
      const imported = new Set<string>();
      for (const file of sources.filter((candidate) => candidate.workspace === workspace)) {
        for (const specifier of importsOf(file.text)) {
          const name = ours(specifier);
          if (name !== null && name !== workspace.split('/')[1]) imported.add(name);
        }
      }
      for (const name of imported)
        if (!declared.includes(name)) problems.push(`${workspace} imports ${name} but does not declare it`);
      const permitted = workspace === 'apps/mobile' ? EVERYTHING : (ALLOWED[workspace] ?? []);
      for (const name of declared)
        if (!permitted.includes(name)) problems.push(`${workspace} declares ${name}`);
    }
    expect(problems).toEqual([]);
  });
});
