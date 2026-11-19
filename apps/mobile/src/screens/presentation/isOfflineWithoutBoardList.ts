import type { CatalogErrorCode } from '@boardclimb/application';

/** Downloaded problems replace the board's list only when that list came back empty because the phone is offline. */
export function isOfflineWithoutBoardList(list: {
  loading: boolean;
  itemCount: number;
  notice: CatalogErrorCode | null;
}): boolean {
  return !list.loading && list.itemCount === 0 && list.notice === 'network_unavailable';
}
