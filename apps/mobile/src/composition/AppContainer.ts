import type {
  BoardDirectory,
  BoardSession,
  ClimbingLog,
  Clock,
  GymFinder,
  ProblemBrowser,
  RingDiagnosticsSink,
  SettingsStore,
} from '@boardclimb/application';

/** What screens receive: use cases and stores, never adapters, drivers or transports (ADR-0002 section 2.6). */
export interface AppContainer {
  /** `sample`: made-up catalogs and a scripted radio, shown as such. `unverified`: real vendors, not yet built. */
  mode: 'sample' | 'unverified' | 'live';
  log: ClimbingLog;
  browser: ProblemBrowser;
  directory: BoardDirectory;
  /** The combined gym map across all three manufacturers. */
  gyms: GymFinder;
  session: BoardSession;
  settings: SettingsStore;
  diagnostics: RingDiagnosticsSink;
  clock: Clock;
  /** False when records live in memory only (browser preview). */
  persistent: boolean;
}
