import { contrastRatio } from './contrast';
import {
  type Palette, palettes,
} from './tokens';

/** Every pairing the primitives draw text with. */
const TEXT_PAIRS: [keyof Palette, keyof Palette][] = [
  ['ink', 'background'],
  ['ink', 'surface'],
  ['inkSoft', 'background'],
  ['inkSoft', 'surface'],
  ['onLagon', 'lagon'],
  ['lagon', 'background'],
  ['lagon', 'surface'],
  ['lagon', 'lagonVeil'],
  ['mousse', 'mousseVeil'],
  ['ambre', 'ambreVeil'],
  ['ambre', 'surface'],
];

describe('palettes', () => {
  it.each(Object.entries(palettes))('reach WCAG AA for text in %s mode', (_scheme, palette) => {
    for (const [foreground, background] of TEXT_PAIRS) {
      expect([foreground, background, contrastRatio(palette[foreground], palette[background]) >= 4.5])
        .toEqual([foreground, background, true]);
    }
  });

  it('computes known ratios', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
    expect(() => contrastRatio('teal', '#FFFFFF')).toThrow();
  });
});
