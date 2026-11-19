import type { GymBoard } from '@boardclimb/domain';
import { describeManufacturer } from './describeManufacturer';

/**
 * One board at a gym in the climber's words: the gym's name for the wall, then the model and angle.
 * Only what the listing says; a board without lights is said plainly, because it cannot be lit.
 */
export function describeGymBoard(board: GymBoard): { title: string; detail: string | null } {
  const title = board.name ?? board.boardName ?? describeManufacturer(board.manufacturer);
  const facts: string[] = [];
  if (board.boardName && board.boardName !== title) facts.push(board.boardName);
  if (board.angleDegrees !== null) facts.push(`${board.angleDegrees}°`);
  else if (board.adjustable === true) facts.push('Adjustable');
  if (board.lights === false) facts.push('No lights');
  return { title, detail: facts.length > 0 ? facts.join(' · ') : null };
}
