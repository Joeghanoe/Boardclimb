import { describe, expect, it } from 'bun:test';
import { defaultProblemFilters } from './defaultProblemFilters';
import { convertedLabel, labelForDifficulty, makeGrade } from './gradeScales';
import { makeProblemKey } from './makeProblemKey';
import { matchesProblemFilters } from './matchesProblemFilters';
import { parseProblemKey } from './parseProblemKey';

describe('problem identity (FR-018)', () => {
  it('round-trips ids that contain separators', () => {
    const key = makeProblemKey('moonboard', '2016/40deg', 'a/b c');
    expect(parseProblemKey(key)).toEqual({
      manufacturer: 'moonboard',
      configurationId: '2016/40deg',
      providerProblemId: 'a/b c',
    });
  });

  it('refuses empty parts and rejects keys this app did not make', () => {
    expect(() => makeProblemKey('kilter', '', 'x')).toThrow();
    expect(parseProblemKey('nope')).toBeNull();
    expect(parseProblemKey('unknown/a/b')).toBeNull();
    expect(parseProblemKey('kilter/%E0%A4%A/b')).toBeNull();
  });
});

describe('grades keep the published label (FR-007)', () => {
  it('places V and Font grades on one ladder', () => {
    expect(makeGrade('font', '6B+').difficulty).toBe(makeGrade('font', '6b+').difficulty);
    expect(makeGrade('v', 'V4').difficulty).toBe(makeGrade('font', '6B').difficulty);
    expect(makeGrade('v', 'V4').label).toBe('V4');
  });

  it('converts both ways and returns null where there is no reliable conversion', () => {
    expect(convertedLabel(makeGrade('font', '7A'), 'v')).toBe('V6');
    expect(convertedLabel(makeGrade('v', 'V6'), 'font')).toBe('7A');
    expect(convertedLabel(makeGrade('v', 'V3/4'), 'font')).toBeNull();
    expect(makeGrade('v', 'V3/4')).toEqual({ system: 'v', label: 'V3/4', difficulty: null });
    expect(labelForDifficulty(999, 'font')).toBeNull();
  });
});

describe('global filters (FR-007)', () => {
  const rated = { grade: makeGrade('font', '6B'), rating: 3.5 };
  const unrated = { grade: makeGrade('font', '6B'), rating: null };
  const unknownGrade = { grade: makeGrade('v', 'V3/4'), rating: 4 };

  it('passes everything with the default filters', () => {
    for (const problem of [rated, unrated, unknownGrade]) {
      expect(matchesProblemFilters(problem, defaultProblemFilters, true)).toBe(true);
    }
  });

  it('applies the grade range inclusively and hides grades without a conversion', () => {
    const six = makeGrade('font', '6B').difficulty as number;
    const range = { ...defaultProblemFilters, minDifficulty: six, maxDifficulty: six };
    expect(matchesProblemFilters(rated, range, true)).toBe(true);
    expect(matchesProblemFilters({ ...rated, grade: makeGrade('font', '6C') }, range, true)).toBe(false);
    expect(matchesProblemFilters(unknownGrade, range, true)).toBe(false);
  });

  it('never treats a missing rating as zero stars', () => {
    const filters = { ...defaultProblemFilters, minStars: 3 };
    expect(matchesProblemFilters(rated, filters, true)).toBe(true);
    expect(matchesProblemFilters(unrated, filters, true)).toBe(false);
    expect(matchesProblemFilters({ ...rated, rating: 2.5 }, filters, true)).toBe(false);
  });

  it('does not apply the rating filter to providers that give no ratings at all', () => {
    expect(matchesProblemFilters(unrated, { ...defaultProblemFilters, minStars: 4 }, false)).toBe(true);
  });
});
