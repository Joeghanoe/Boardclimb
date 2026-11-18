import type { Manufacturer } from '@boardclimb/domain';
import { CatalogError } from '../catalog/CatalogError';
import type { CatalogCapabilities } from '../catalog/CatalogCapabilities';
import type { ProviderSource } from './ProviderSource';

/**
 * Stands in for a vendor source until its access is verified (ADR-0002 A2, section 7). Every call fails with
 * `provider_unverified`; nothing is invented or guessed, and the UI can say so truthfully.
 */
export class UnverifiedProviderSource implements ProviderSource {
  readonly capabilities: CatalogCapabilities = {
    pagination: 'none',
    ratings: false,
    supportedGradeSystems: [],
    deltaSync: false,
  };

  constructor(private readonly manufacturer: Manufacturer) {}

  private fail(): never {
    throw new CatalogError(
      'provider_unverified',
      `The ${this.manufacturer} catalog source has not been verified yet.`,
    );
  }

  fetchBoards(): Promise<never> {
    return this.fail();
  }

  fetchConfigurations(): Promise<never> {
    return this.fail();
  }

  fetchProblemPage(): Promise<never> {
    return this.fail();
  }

  fetchProblem(): Promise<never> {
    return this.fail();
  }
}
