import type { Manufacturer } from '../board/Manufacturer';

export interface ParsedProblemKey {
  manufacturer: Manufacturer;
  configurationId: string;
  providerProblemId: string;
}
