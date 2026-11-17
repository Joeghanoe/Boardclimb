import type { Manufacturer } from './Manufacturer';

export interface ParsedProblemKey {
  manufacturer: Manufacturer;
  configurationId: string;
  providerProblemId: string;
}
