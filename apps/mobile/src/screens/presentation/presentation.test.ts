import { describe, expect, it } from 'bun:test';
import { BOARD_ERROR_CODES, CATALOG_ERROR_CODES } from '@boardclimb/application';
import type { BoardSessionSnapshot, CommandStatus } from '@boardclimb/application';
import { LOG_ERROR_CODES, defaultProblemFilters, makeGrade, makeProblemKey } from '@boardclimb/domain';
import { describeBoardError } from './describeBoardError';
import { describeCatalogError } from './describeCatalogError';
import { describeCommand } from './describeCommand';
import { describeConnection } from './describeConnection';
import { describeFilters } from './describeFilters';
import { describeLogError } from './describeLogError';
import { describeMode } from './describeMode';
import { formatAttempts } from './formatAttempts';
import { formatGrade } from './formatGrade';
import { gradeBand } from './gradeBand';
import { displayGrade } from './displayGrade';
import { filtersToRange, rangeToFilters } from './gradeRange';
import { gradeStops } from './gradeStops';
import { formatRating } from './formatRating';
import { formatSessionDay } from './formatSessionDay';
import { groupHoldsByRole } from './groupHoldsByRole';

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

  it('shows the grade in the climber’s scale, keeping the published label when there is no reliable conversion', () => {
    expect(displayGrade(makeGrade('v', 'V3'), 'font')).toBe('6A');
    expect(displayGrade(makeGrade('v', 'V3'), 'v')).toBe('V3');
    expect(displayGrade(makeGrade('font', '7A'), 'v')).toBe('V6');
    expect(displayGrade(makeGrade('font', '6X'), 'v')).toBe('6X');
    expect(displayGrade(makeGrade('font', '6a/V2'), 'v')).toBe('V2');
    expect(displayGrade(makeGrade('font', '6a/V2'), 'font')).toBe('6a');
  });

  it('colours the grade tile by difficulty band, the same for Font and V, neutral when unknown', () => {
    expect(gradeBand(makeGrade('font', '5+'))).toBe('mint');
    expect(gradeBand(makeGrade('v', 'V3'))).toBe(gradeBand(makeGrade('font', '6A')));
    expect(gradeBand(makeGrade('font', '7A'))).toBe('coral');
    expect(gradeBand(makeGrade('font', '7B'))).toBe('rose');
    expect(gradeBand(makeGrade('font', '8A'))).toBe('violet');
    expect(gradeBand(makeGrade('font', '6X'))).toBe('stone');
  });

  it('reads a missing rating as not rated, never zero stars', () => {
    expect(formatRating(null)).toEqual({ text: 'Not rated', spoken: 'Not rated' });
    expect(formatRating(0).text).toBe('0.0 ★');
    expect(formatRating(3.84).spoken).toBe('Rated 3.8 out of 5');
  });
});

describe('FR-007: the grade slider covers the ladder in the climber’s scale', () => {
  it('has one stop per Font grade, and one per V grade with shared Font grades grouped', () => {
    const font = gradeStops('font');
    expect(font).toHaveLength(24);
    const v = gradeStops('v');
    expect(new Set(v.map((stop) => stop.label)).size).toBe(v.length);
    expect(v.find((stop) => stop.label === 'V3')).toEqual({ label: 'V3', from: 5, to: 6 });
  });

  it('treats a thumb at either end as no limit, so unknown grades are not filtered out', () => {
    const stops = gradeStops('font');
    expect(rangeToFilters(defaultProblemFilters, [0, stops.length - 1], stops)).toEqual(
      defaultProblemFilters,
    );
    expect(filtersToRange(defaultProblemFilters, stops)).toEqual([0, stops.length - 1]);
  });

  it('round-trips a V range to the widest matching difficulties and back', () => {
    const stops = gradeStops('v');
    const low = stops.findIndex((stop) => stop.label === 'V3');
    const high = stops.findIndex((stop) => stop.label === 'V5');
    const filters = rangeToFilters(defaultProblemFilters, [low, high], stops);
    expect(filters).toEqual({ ...defaultProblemFilters, minDifficulty: 5, maxDifficulty: 10 });
    expect(filtersToRange(filters, stops)).toEqual([low, high]);
  });

  it('keeps the rating filter when the grade range moves', () => {
    const stops = gradeStops('font');
    expect(rangeToFilters({ ...defaultProblemFilters, minStars: 4 }, [3, 8], stops).minStars).toBe(4);
  });

  it('summarises the active filters in a few words', () => {
    expect(describeFilters(defaultProblemFilters, 'font')).toBe('Any grade');
    expect(describeFilters({ minDifficulty: 5, maxDifficulty: 11, minStars: 4 }, 'font')).toBe(
      '6A to 7A · 4+ ★',
    );
    expect(describeFilters({ minDifficulty: 5, maxDifficulty: 11, minStars: 0 }, 'v')).toBe('V3 to V6');
    expect(describeFilters({ ...defaultProblemFilters, maxDifficulty: 5 }, 'font')).toBe('Up to 6A');
    expect(describeFilters({ ...defaultProblemFilters, minDifficulty: 5 }, 'v')).toBe('V3 and up');
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

it('FR-007 preserves the provider’s paired Font/V label instead of replacing its V grade', () => {
  const grade = makeGrade('font', '6a/V2');
  expect(grade.difficulty).toBe(makeGrade('font', '6A').difficulty);
  expect(formatGrade(grade)).toBe('6a/V2');
});
