import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoardSelection, BrowsePage, CatalogErrorCode, ProblemBrowser } from '@boardclimb/application';
import type { ProblemFilters, ProblemSummary } from '@boardclimb/domain';
import { catalogErrorCode } from './presentation/catalogErrorCode';

interface ListState {
  items: ProblemSummary[];
  next: string | null;
  hasMore: boolean;
  notice: CatalogErrorCode | null;
  loading: boolean;
  loadingMore: boolean;
}

const EMPTY: ListState = {
  items: [],
  next: null,
  hasMore: false,
  notice: null,
  loading: false,
  loadingMore: false,
};

function fromPage(page: BrowsePage): ListState {
  return {
    items: page.items,
    next: page.next,
    hasMore: page.hasMore,
    notice: page.notice,
    loading: false,
    loadingMore: false,
  };
}

/**
 * Stale-while-revalidate list (FR-006): the cached first page shows at once, then the provider is revalidated in
 * the background and the list is read again only if something new arrived. Paging and filter changes never
 * leave a stale page mixed into the list. Nothing here can reach a board (FR-008).
 */
export function useProblemList(
  browser: ProblemBrowser,
  selection: BoardSelection | null,
  filters: ProblemFilters,
  search = '',
) {
  const [state, setState] = useState<ListState>(EMPTY);
  const [reloads, setReloads] = useState(0);
  const generation = useRef(0);
  const skipRevalidate = useRef(false);
  const configuration = selection?.configuration ?? null;
  const { minDifficulty, maxDifficulty, minStars } = filters;

  useEffect(() => {
    generation.current += 1;
    const mine = generation.current;
    const current = { minDifficulty, maxDifficulty, minStars };
    const revalidate = !skipRevalidate.current;
    skipRevalidate.current = false;
    const alive = () => generation.current === mine;

    setState((previous) => ({ ...previous, loading: true }));
    (async () => {
      try {
        const page = configuration
          ? await browser.browse(configuration, current, null)
          : await browser.browseDownloaded(current, null, search);
        if (!alive()) return;
        setState(fromPage(page));
        if (!configuration || !revalidate || page.freshness !== 'cached') return;
        const result = await browser.refresh(configuration);
        if (!alive()) return;
        if (!result.ok) {
          setState((previous) => ({ ...previous, notice: result.code }));
        } else if (result.fetched > 0) {
          const again = await browser.browse(configuration, current, null);
          if (alive()) setState(fromPage(again));
        }
      } catch (error) {
        if (alive()) setState({ ...EMPTY, notice: catalogErrorCode(error) });
      }
    })();
    return () => {
      generation.current += 1;
    };
  }, [browser, configuration, minDifficulty, maxDifficulty, minStars, reloads, search]);

  const loadMore = useCallback(async () => {
    if (state.loading || state.loadingMore || !state.hasMore) return;
    const mine = generation.current;
    setState((previous) => ({ ...previous, loadingMore: true }));
    try {
      const current = { minDifficulty, maxDifficulty, minStars };
      const page = configuration
        ? await browser.browse(configuration, current, state.next)
        : await browser.browseDownloaded(current, state.next, search);
      if (generation.current !== mine) return;
      setState((previous) => {
        const known = new Set(previous.items.map((item) => item.key));
        return {
          ...previous,
          items: [...previous.items, ...page.items.filter((item) => !known.has(item.key))],
          next: page.next,
          hasMore: page.hasMore,
          notice: page.notice ?? previous.notice,
          loadingMore: false,
        };
      });
    } catch (error) {
      if (generation.current === mine)
        setState((previous) => ({ ...previous, loadingMore: false, notice: catalogErrorCode(error) }));
    }
  }, [browser, configuration, minDifficulty, maxDifficulty, minStars, state, search]);

  /** Pull to refresh: ask the provider again, then read the list once more without a second revalidation. */
  const refresh = useCallback(async () => {
    if (configuration) await browser.refresh(configuration);
    skipRevalidate.current = true;
    setReloads((count) => count + 1);
  }, [browser, configuration]);

  return { ...state, loadMore, refresh };
}
