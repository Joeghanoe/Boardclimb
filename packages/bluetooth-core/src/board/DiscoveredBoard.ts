import type { Manufacturer } from '@boardclimb/domain';

/** A nearby controller the climber can choose. Never selected or connected automatically (FR-002). */
export interface DiscoveredBoard {
  /** Opaque transport id, used only to connect. Not shown beyond a short alias. */
  id: string;
  name: string | null;
  /** Signal strength observed during discovery, in dBm. */
  rssi?: number;
  manufacturer: Manufacturer;
  /** Null when the advertisement does not say; the climber then picks the configuration manually (FR-003). */
  detectedConfigurationId: string | null;
}
