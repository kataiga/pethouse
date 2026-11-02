import type { Setting } from './hooks/use-settings';
import {
  draftFrom, settingChanges,
} from './settings-form';

function setting (id: number, slug: string, overrides: Partial<Setting> = {}): Setting {
  return {
    definition: {
      id,
      slug,
      name: slug,
      unit: '',
      decimals: 1,
      isSystem: true,
    },
    enabled: true,
    displayOrder: id,
    minThreshold: 6.5,
    maxThreshold: 7.5,
    customised: false,
    ...overrides,
  };
}

describe('settings form', () => {
  const ph = setting(1, 'ph');
  const tds = setting(2, 'tds', {
    enabled: false,
    minThreshold: null,
    maxThreshold: null,
  });

  it('starts from the stored values, written in the person’s language', () => {
    expect(draftFrom(ph, 'fr')).toEqual({
      enabled: true,
      min: '6,5',
      max: '7,5',
    });
    expect(draftFrom(tds, 'fr')).toEqual({
      enabled: false,
      min: '',
      max: '',
    });
  });

  it('sends only the rows that changed, an emptied bound as null', () => {
    const drafts = new Map([
      [1, {
        enabled: true,
        min: '6,8',
        max: '',
      }],
      [2, draftFrom(tds, 'fr')],
    ]);

    expect(settingChanges([ph, tds], drafts)).toEqual({
      ok: true,
      inputs: [{
        parameterDefinitionId: 1,
        enabled: true,
        minThreshold: 6.8,
        maxThreshold: null,
      }],
    });
  });

  it('keeps the bounds of a row being switched off', () => {
    const drafts = new Map([[1, {
      enabled: false,
      min: 'garbage',
      max: '',
    }]]);

    expect(settingChanges([ph], drafts)).toEqual({
      ok: true,
      inputs: [{
        parameterDefinitionId: 1,
        enabled: false,
        minThreshold: 6.5,
        maxThreshold: 7.5,
      }],
    });
  });

  it('reports invalid rows by definition and sends nothing', () => {
    const drafts = new Map([
      [1, {
        enabled: true,
        min: '8',
        max: '7',
      }],
      [2, {
        enabled: true,
        min: '1.25',
        max: '',
      }],
    ]);

    expect(settingChanges([ph, tds], drafts)).toEqual({
      ok: false,
      errors: {
        1: { max: 'inverted' },
        2: { min: 'tooPrecise' },
      },
    });
  });
});
