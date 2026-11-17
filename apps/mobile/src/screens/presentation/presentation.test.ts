import { describe, expect, it } from 'bun:test';
import { BOARD_ERROR_CODES, CATALOG_ERROR_CODES } from '@boardclimb/application';
import type { BoardSessionSnapshot, CommandStatus } from '@boardclimb/application';
import { LOG_ERROR_CODES, defaultProblemFilters, makeGrade, makeProblemKey } from '@boardclimb/domain';
import { describeBoardError } from './describeBoardError';
import { describeCatalogError } from './describeCatalogError';
import { describeCommand } from './describeCommand';
import { describeConnection } from './describeConnection';
import { describeFilters } from './describeFilters';
import { describeGradeBound } from './describeGradeBound';
import { describeLogError } from './describeLogError';
import { describeMode } from './describeMode';
import { formatAttempts } from './formatAttempts';
import { formatGrade } from './formatGrade';
import { formatRating } from './formatRating';
import { formatSessionDay } from './formatSessionDay';
import { groupHoldsByRole } from './groupHoldsByRole';
import { stepGradeBound } from './stepGradeBound';

const key = makeProblemKey('kilter', 'config-1', 'p1');
const otherKey = makeProblemKey('kilter', 'config-1', 'p2');

/** Words an engineer would say and a climber would not (UI-1, UI-2). */
const JARGON = /\b(error|exception|code|null|undefined|sqlite|ble|gatt|payload|provider|schema|api|http)\b/i;

describe('every failure says what happened and what to do next (FR-016, UI-2)', () => {
  const cases = [
    ...CATALOG_ERROR_CODES.map((code) => [`catalog ${code}`, describeCatalogError(code)] as const),
    ...BOARD_ERROR_CODES.map((code) => [`board ${code}`, describeBoardError(code)] as const),
    ...LOG_ERROR_CODES.map((code) => [`log ${code}`, describeLogError(code)] as const),
  ];

  it.each(cases)('%s has a title and a next step in plain words', (_name, guidance) => {
    expect(guidance.title.length).toBeGreaterThan(5);
    expect(guidance.action.length).toBeGreaterThan(5);
    expect(JARGON.test(guidance.title)).toBe(false);
    expect(JARGON.test(guidance.action)).toBe(false);
  });
});

describe('FR-009: a sent command is never presented as confirmed', () => {
  const sent: CommandStatus = { state: 'sent', problemKey: key, at: '2026-11-16T18:00:00.000Z' };
  const confirmed: CommandStatus = { state: 'confirmed', problemKey: key, at: '2026-11-16T18:00:00.000Z' };

  it('says "sent from this phone" and that the board has not confirmed', () => {
    const line = describeCommand(sent, key);
    expect(line?.tone).toBe('sent');
    expect(line?.title).toContain('sent from this phone');
    expect(line?.message).toContain('not confirmed');
  });

  it('uses confirmed wording only for a confirmed status', () => {
    expect(describeCommand(confirmed, key)?.tone).toBe('confirmed');
    expect(describeCommand(sent, key)?.title.toLowerCase()).not.toContain('confirmed the');
  });

  it('does not claim the board shows this problem when another one was sent', () => {
    const line = describeCommand(sent, otherKey);
    expect(line?.tone).toBe('sent');
    expect(line?.title).toContain('Another problem');
  });

  it('shows progress and failures only for the problem they belong to', () => {
    expect(describeCommand({ state: 'pending', problemKey: key }, key)?.tone).toBe('progress');
    expect(describeCommand({ state: 'pending', problemKey: key }, otherKey)).toBeNull();
    const failed: CommandStatus = { state: 'failed', problemKey: key, code: 'not_connected', message: 'x' };
    expect(describeCommand(failed, key)?.tone).toBe('error');
    expect(describeCommand(failed, otherKey)).toBeNull();
    expect(describeCommand({ state: 'idle' }, key)).toBeNull();
  });
});

describe('connection wording', () => {
  const base: BoardSessionSnapshot = {
    connection: 'idle',
    board: null,
    configuration: null,
    capabilities: null,
    error: null,
    command: { state: 'idle' },
  };
  const board = { id: 'b', name: 'Wall A', manufacturer: 'kilter', detectedConfigurationId: null } as const;

  it('names the board when connected and calls a dropped link lost', () => {
    expect(describeConnection({ ...base, connection: 'connected', board }).label).toBe('Connected to Wall A');
    expect(describeConnection({ ...base, connection: 'lost', board }).label).toBe(
      'Lost connection to Wall A',
    );
    expect(describeConnection(base).tone).toBe('disconnected');
  });
});

describe('FR-007: grades and ratings are shown as published', () => {
  it('keeps the published label and adds the other scale only when the conversion is reliable', () => {
    expect(formatGrade(makeGrade('font', '6A'))).toBe('6A (V3)');
    expect(formatGrade(makeGrade('v', 'V3'))).toBe('V3 (6A)');
    expect(formatGrade(makeGrade('font', '6X'))).toBe('6X');
  });

  it('reads a missing rating as not rated, never zero stars', () => {
    expect(formatRating(null)).toEqual({ text: 'Not rated', spoken: 'Not rated' });
    expect(formatRating(0).text).toBe('0.0 ★');
    expect(formatRating(3.84).spoken).toBe('Rated 3.8 out of 5');
  });
});

describe('FR-007: grade limits step through the ladder without crossing', () => {
  it('starts from no limit and walks up from the easiest grade', () => {
    const first = stepGradeBound(defaultProblemFilters, 'min', 1);
    expect(first.minDifficulty).toBe(0);
    expect(describeGradeBound(first.minDifficulty)).toBe('3 (VB)');
  });

  it('clears a limit by stepping past either end', () => {
    expect(
      stepGradeBound({ ...defaultProblemFilters, minDifficulty: 0 }, 'min', -1).minDifficulty,
    ).toBeNull();
    expect(
      stepGradeBound({ ...defaultProblemFilters, maxDifficulty: 23 }, 'max', 1).maxDifficulty,
    ).toBeNull();
    expect(stepGradeBound(defaultProblemFilters, 'max', -1).maxDifficulty).toBe(23);
  });

  it('never lets the lower limit pass the upper one, or the reverse', () => {
    const filters = { ...defaultProblemFilters, minDifficulty: 5, maxDifficulty: 5 };
    expect(stepGradeBound(filters, 'min', 1).minDifficulty).toBe(5);
    expect(stepGradeBound(filters, 'max', -1).maxDifficulty).toBe(5);
  });

  it('summarises the active filters in a few words', () => {
    expect(describeFilters(defaultProblemFilters)).toBe('Any grade');
    expect(describeFilters({ minDifficulty: 5, maxDifficulty: 11, minStars: 4 })).toBe(
      '6A (V3) to 7A (V6) · 4+ ★',
    );
    expect(describeFilters({ ...defaultProblemFilters, maxDifficulty: 5 })).toBe('Up to 6A (V3)');
    expect(describeFilters({ ...defaultProblemFilters, minDifficulty: 5 })).toBe('6A (V3) and up');
  });

  it('keeps the rating filter untouched', () => {
    const filters = { ...defaultProblemFilters, minStars: 4 };
    expect(stepGradeBound(filters, 'min', 1).minStars).toBe(4);
  });
});

describe('FR-014: history wording', () => {
  it('labels the current session day and dates the rest', () => {
    expect(formatSessionDay('2026-11-16', '2026-11-16')).toBe('Today');
    expect(formatSessionDay('2026-11-09', '2026-11-16')).toBe('9 Nov 2026');
  });

  it('pluralises attempts', () => {
    expect(formatAttempts(0)).toBe('0 attempts');
    expect(formatAttempts(1)).toBe('1 attempt');
    expect(formatAttempts(3)).toBe('3 attempts');
  });
});

describe('problem detail helpers', () => {
  it('lists holds in climbing order and leaves out empty roles', () => {
    const groups = groupHoldsByRole([
      { holdId: 'f1', role: 'foot' },
      { holdId: 's1', role: 'start' },
      { holdId: 'h1', role: 'hand' },
      { holdId: 'h2', role: 'hand' },
    ]);
    expect(groups.map((group) => group.label)).toEqual(['Start', 'Hands', 'Feet']);
    expect(groups[1]?.holdIds).toEqual(['h1', 'h2']);
  });

  it('labels sample data as sample and says nothing in unverified mode', () => {
    expect(describeMode('sample')?.action).toContain('Nothing reaches a real board');
    expect(describeMode('unverified')).toBeNull();
  });
});
