import type {
  Setting, SettingInput,
} from './hooks/use-settings';
import {
  formatValue, parseThresholds, type ThresholdError,
} from './range';

export interface SettingDraft {
  enabled: boolean;
  min: string;
  max: string;
}

export type SettingErrors = Record<number, { min?: ThresholdError;
  max?: ThresholdError }>;

/** A threshold as the person edits it: the parameter's decimals, the language's separator. */
export function thresholdText (value: number | null, decimals: number, language: string): string {
  return value === null ? '' : formatValue(value, decimals, language);
}

export function draftFrom (setting: Setting, language: string): SettingDraft {
  return {
    enabled: setting.enabled,
    min: thresholdText(setting.minThreshold, setting.definition.decimals, language),
    max: thresholdText(setting.maxThreshold, setting.definition.decimals, language),
  };
}

export type SettingChanges = { ok: true;
  inputs: SettingInput[] } | { ok: false;
    errors: SettingErrors };

/**
 * The rows that differ from what is stored, ready for the upsert; untouched rows are left out so
 * a seeded default stays a default. The bounds of a disabled row are kept as they were.
 */
export function settingChanges (
  settings: readonly Setting[],
  drafts: ReadonlyMap<number, SettingDraft>,
): SettingChanges {
  const errors: SettingErrors = {};
  const inputs: SettingInput[] = [];

  for (const setting of settings) {
    const id = setting.definition.id;
    const draft = drafts.get(id);

    if (!draft) {
      continue;
    }

    const parsed = draft.enabled
      ? parseThresholds(draft.min, draft.max, setting.definition.decimals)
      : {
        ok: true as const,
        value: {
          min: setting.minThreshold,
          max: setting.maxThreshold,
        },
      };

    if (!parsed.ok) {
      errors[id] = {
        ...(parsed.minError ? { min: parsed.minError } : {}),
        ...(parsed.maxError ? { max: parsed.maxError } : {}),
      };
      continue;
    }

    const changed = draft.enabled !== setting.enabled
      || parsed.value.min !== setting.minThreshold
      || parsed.value.max !== setting.maxThreshold;

    if (changed) {
      inputs.push({
        parameterDefinitionId: id,
        enabled: draft.enabled,
        minThreshold: parsed.value.min,
        maxThreshold: parsed.value.max,
      });
    }
  }

  return Object.keys(errors).length > 0
    ? {
      ok: false,
      errors,
    }
    : {
      ok: true,
      inputs,
    };
}
