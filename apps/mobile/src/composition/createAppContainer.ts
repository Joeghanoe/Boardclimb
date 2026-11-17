import {
  BoardDirectory,
  BoardSession,
  ClimbingLog,
  InMemoryLogStore,
  InMemorySettingsStore,
  ProblemBrowser,
  RingDiagnosticsSink,
} from '@boardclimb/application';
import type { Clock, IdGenerator, LogStore, SettingsStore } from '@boardclimb/application';
import type { BleTransport } from '@boardclimb/bluetooth-core';
import { InMemoryProblemCache } from '@boardclimb/catalog-core';
import type { ProviderSource, ProblemCache } from '@boardclimb/catalog-core';
import { SqlLogStore, SqlProblemCache, SqlSettingsStore, migrate } from '@boardclimb/storage-local';
import type { SqlDatabase } from '@boardclimb/storage-local';
import type { Manufacturer } from '@boardclimb/domain';
import type { AppContainer } from './AppContainer';
import { controllerLookup, createCatalogs, createControllers, lookup } from './createRegistry';
import type { Mode } from './createRegistry';

export interface AppContainerDependencies {
  /** The SQLite database, or null to keep everything in memory (browser preview, quick demos). */
  database: SqlDatabase | null;
  transport: BleTransport;
  clock: Clock;
  ids: IdGenerator;
  mode: Mode;
  sources?: Record<Manufacturer, ProviderSource>;
  diagnostics?: RingDiagnosticsSink;
  pageSize?: number;
}

/**
 * The composition root (CODE.8): the only place that picks concrete adapters, drivers and stores and hands the
 * use cases their collaborators. Migrations run here, before any store is used.
 */
export async function createAppContainer(dependencies: AppContainerDependencies): Promise<AppContainer> {
  const { database, transport, clock, ids, mode } = dependencies;
  const diagnostics = dependencies.diagnostics ?? new RingDiagnosticsSink();

  let logStore: LogStore;
  let cache: ProblemCache;
  let settings: SettingsStore;
  if (database) {
    await migrate(database, diagnostics);
    logStore = new SqlLogStore(database);
    cache = new SqlProblemCache(database);
    settings = new SqlSettingsStore(database);
  } else {
    logStore = new InMemoryLogStore();
    cache = new InMemoryProblemCache();
    settings = new InMemorySettingsStore();
  }

  const catalogs = lookup(createCatalogs(mode, dependencies.sources));
  const controllers = controllerLookup(createControllers(mode, transport));

  return {
    mode,
    persistent: database !== null,
    log: new ClimbingLog(logStore, clock, ids),
    browser: new ProblemBrowser({
      catalogs,
      cache,
      clock,
      diagnostics,
      ...(dependencies.pageSize === undefined ? {} : { pageSize: dependencies.pageSize }),
    }),
    directory: new BoardDirectory(catalogs),
    session: new BoardSession(controllers, clock, diagnostics),
    settings,
    diagnostics,
    clock,
  };
}
