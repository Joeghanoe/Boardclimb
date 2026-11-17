import { describe, expect, it } from 'bun:test';
import { contrastRatio } from './contrastRatio';
import { darkTheme, lightTheme } from './themes';

/** UI-1 / NFR-007: text 4.5:1, perceivable control edges 3:1, in both themes. */
describe.each([lightTheme, darkTheme])('$name theme contrast', (theme) => {
  const c = theme.colors;
  const textPairs: [string, string, string][] = [
    ['text on background', c.text, c.background],
    ['text on surface', c.text, c.surface],
    ['text on muted surface', c.text, c.surfaceMuted],
    ['muted text on background', c.textMuted, c.background],
    ['muted text on surface', c.textMuted, c.surface],
    ['muted text on muted surface', c.textMuted, c.surfaceMuted],
    ['label on primary', c.onPrimary, c.primary],
    ['label on success', c.onSuccess, c.success],
    ['label on danger', c.onDanger, c.danger],
    ['notice text on notice', c.noticeText, c.noticeBackground],
    ['link on surface', c.link, c.surface],
    ['link on background', c.link, c.background],
    ['primary as text on surface', c.primary, c.surface],
    ['connected as text on surface', c.connected, c.surface],
    ['connecting as text on surface', c.connecting, c.surface],
    ['disconnected as text on surface', c.disconnected, c.surface],
    ['danger as text on surface', c.danger, c.surface],
  ];

  it.each(textPairs)('%s reaches 4.5:1', (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('control borders reach 3:1 against the surface and the background', () => {
    expect(contrastRatio(c.controlBorder, c.surface)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(c.controlBorder, c.background)).toBeGreaterThanOrEqual(3);
  });
});

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });
});
