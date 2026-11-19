import type { BoardSelection, DirectoryEntry } from '@boardclimb/application';
import type { LayoutPreset } from './LayoutPreset';

/**
 * The layout a gym's listing points to, when it points to exactly one: the named board model (or the
 * manufacturer's only one) at the listed fixed angle. Otherwise the climber's current layout for that
 * manufacturer, or null. A guess is never made between several sizes or layouts; the controller's own report
 * and the climber decide those on the board screen.
 */
export function selectionForPreset(
  entries: readonly DirectoryEntry[],
  preset: LayoutPreset,
  current: BoardSelection | null,
): BoardSelection | null {
  const sameMaker = current?.configuration.manufacturer === preset.manufacturer ? current : null;
  const entry = entries.find((candidate) => candidate.manufacturer === preset.manufacturer);
  if (!entry?.ok) return sameMaker;
  const named = entry.boards.filter((item) => item.board.name === preset.boardName);
  const boards = named.length > 0 ? named : entry.boards.length === 1 ? entry.boards : [];
  const candidates = boards.flatMap((item) =>
    item.configurations
      .filter(
        (configuration) => preset.angleDegrees === null || configuration.angleDegrees === preset.angleDegrees,
      )
      .map((configuration) => ({ boardName: item.board.name, configuration })),
  );
  if (candidates.length === 1) return candidates[0] ?? null;
  const keep = candidates.find((candidate) => candidate.configuration.id === sameMaker?.configuration.id);
  return keep ?? sameMaker;
}
