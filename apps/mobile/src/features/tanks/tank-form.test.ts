import type { Schemas } from '@pethouse/api-client';
import {
  createBody, EMPTY_TANK_FORM, formatDecimal, parseDecimal, suggestedVolume, validateTankForm, valuesFromTank,
} from './tank-form';

describe('parseDecimal', () => {
  it.each([
    ['', { value: null }],
    ['  ', { value: null }],
    ['120', { value: 120 }],
    ['12,5', { value: 12.5 }],
    ['12.5', { value: 12.5 }],
    ['-3', { error: 'invalid' }],
    ['1e3', { error: 'invalid' }],
    ['abc', { error: 'invalid' }],
    ['2001', { error: 'tooLarge' }],
  ])('reads %p', (text, expected) => {
    expect(parseDecimal(text, 2000)).toEqual(expected);
  });
});

describe('suggestedVolume', () => {
  it('turns inner dimensions in centimetres into litres, to one decimal', () => {
    expect(suggestedVolume('100', '40', '30')).toBe(120);
    expect(suggestedVolume('45,5', '30', '30')).toBe(41);
    expect(suggestedVolume('33', '17', '21')).toBe(11.8);
  });

  it('waits for all three sides, and ignores invalid or zero ones', () => {
    expect(suggestedVolume('100', '40', '')).toBeNull();
    expect(suggestedVolume('100', 'x', '30')).toBeNull();
    expect(suggestedVolume('100', '0', '30')).toBeNull();
  });
});

describe('formatDecimal', () => {
  it('writes the decimal separator of the language, without grouping', () => {
    expect(formatDecimal(1200.5, 'fr')).toBe('1200,5');
    expect(formatDecimal(1200.5, 'en')).toBe('1200.5');
  });
});

describe('validateTankForm', () => {
  it('requires a name and flags each invalid field', () => {
    const result = validateTankForm({
      ...EMPTY_TANK_FORM,
      name: '   ',
      volumeLiters: '200000',
      widthCm: 'large',
      substrate: 'x'.repeat(121),
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        name: 'required',
        volumeLiters: 'tooLarge',
        widthCm: 'invalid',
        substrate: 'tooLong',
      },
    });
  });

  it('trims text and turns empty optional fields into null', () => {
    const result = validateTankForm({
      ...EMPTY_TANK_FORM,
      name: '  Nano  ',
      volumeLiters: '30,5',
      substrate: ' ',
      startedAt: '2026-01-15',
    });

    expect(result).toEqual({
      ok: true,
      fields: {
        name: 'Nano',
        subtypeId: null,
        volumeLiters: 30.5,
        widthCm: null,
        heightCm: null,
        depthCm: null,
        substrate: null,
        startedAt: '2026-01-15',
        description: null,
      },
    });
  });
});

describe('createBody', () => {
  it('sends only the fields that were filled in', () => {
    const result = validateTankForm({
      ...EMPTY_TANK_FORM,
      name: 'Nano',
      subtypeId: 3,
      widthCm: '30',
    });

    expect(result.ok && createBody('AQUARIUM', result.fields)).toEqual({
      name: 'Nano',
      tankType: 'AQUARIUM',
      subtypeId: 3,
      widthCm: 30,
    });
  });
});

describe('valuesFromTank', () => {
  it('pre-fills the form in the language of the person', () => {
    const tank: Schemas['TankResponseDto'] = {
      id: 1,
      householdId: 2,
      name: 'Salon',
      tankType: 'AQUARIUM',
      subtype: {
        id: 3,
        tankType: 'AQUARIUM',
        slug: 'planted',
        name: 'Planted',
        isSystem: true,
      },
      volumeLiters: 120.5,
      widthCm: 100,
      heightCm: null,
      depthCm: null,
      substrate: null,
      startedAt: '2026-01-15',
      description: 'Plants',
      coverPhoto: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    expect(valuesFromTank(tank, 'fr')).toEqual({
      name: 'Salon',
      subtypeId: 3,
      volumeLiters: '120,5',
      widthCm: '100',
      heightCm: '',
      depthCm: '',
      substrate: '',
      startedAt: '2026-01-15',
      description: 'Plants',
    });
  });
});
