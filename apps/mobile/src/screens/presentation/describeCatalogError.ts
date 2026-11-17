import type { CatalogErrorCode } from '@boardclimb/application';
import type { Guidance } from './Guidance';

/** Exhaustive over the catalog codes: adding a code without wording fails type-checking. */
const WORDING: Record<CatalogErrorCode, Guidance> = {
  provider_unverified: {
    title: 'Problems for this board are not connected yet',
    action: 'Your saved problems and history are still here.',
  },
  network_unavailable: {
    title: 'Could not reach the problem list',
    action: 'Showing saved problems. Pull down to try again when you are online.',
  },
  provider_rejected: {
    title: 'The problem list could not be loaded',
    action: 'Showing saved problems. Try again in a few minutes.',
  },
  schema_mismatch: {
    title: 'The problem list arrived in a format this version cannot read',
    action: 'Showing saved problems. Update the app to load new ones.',
  },
  not_found: {
    title: 'This problem is no longer in the list',
    action: 'Your history for it is kept. Go back and pick another problem.',
  },
};

export function describeCatalogError(code: CatalogErrorCode): Guidance {
  return WORDING[code];
}
