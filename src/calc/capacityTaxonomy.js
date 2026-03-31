export const TRANSPARENCY_RELIABILITY = {
  USER_DECLARED: 'user-declared',
  ENGINEERING_APPROXIMATION: 'engineering-approximation',
  EXACT_LIMIT_STATE: 'exact-limit-state',
  ENGINEERING_CALCULATION: 'engineering-calculation',
  INPUT_DEPENDENT: 'input-dependent',
  UNSPECIFIED: 'unspecified',
};

export const TRANSPARENCY_CLASSIFICATION = {
  USER_DECLARED: 'user-declared',
  ENGINEERING_APPROXIMATION: 'engineering-approximation',
  YIELD_GOVERNED: 'yield-governed',
  MISSING_DECLARED_INPUT: 'missing-declared-input',
  FALLBACK_TO_EXACT_LIMIT_STATE: 'fallback-to-exact-limit-state',
  ENGINEERING_CALCULATION: 'engineering-calculation',
  INPUT_RESISTANCE_CHECK: 'input-resistance-check',
  LIMIT_STATE_RESPONSE: 'limit-state-response',
  UNSPECIFIED: 'unspecified',
};

export const CAPACITY_CHECK_KEYS = {
  SIGMA_LIMIT: 'sigmaLimit',
  BENDING_STRESS: 'bendingStress',
  SHEAR_CAPACITY: 'shearCapacity',
  SUPPORT_CRUSHING: 'supportCrushing',
  UPLIFT: 'uplift',
  DEFLECTION: 'deflection',
};

export const CAPACITY_CHECK_LABELS = {
  sigmaLimit: 'Giới hạn ứng suất nén / wrinkling',
  bendingStress: 'Ứng suất uốn',
  shearCapacity: 'Lực cắt lõi',
  supportCrushing: 'Ép dập gối tựa',
  uplift: 'Liên kết chống nhổ',
  deflection: 'Độ võng SLS',
};

export const CAPACITY_GOVERNING_CASE_KEYS = {
  MOMENT: 'moment',
  SHEAR: 'shear',
  CRUSHING: 'crushing',
  UPLIFT: 'uplift',
  DEFLECTION: 'deflection',
  OVERALL: 'overall',
};

export const CAPACITY_GOVERNING_CASE_LABELS = {
  support: 'Mô-men/ứng suất tại gối',
  span: 'Mô-men/ứng suất tại nhịp',
  shear: CAPACITY_CHECK_LABELS.shearCapacity,
  crushing: CAPACITY_CHECK_LABELS.supportCrushing,
  uplift: CAPACITY_CHECK_LABELS.uplift,
  deflection: CAPACITY_CHECK_LABELS.deflection,
  na: 'Không áp dụng uplift',
  none: 'Chưa xác định',
};

export const WRINKLING_INPUT_CLASSIFICATION = {
  declared: TRANSPARENCY_CLASSIFICATION.USER_DECLARED,
  approx: TRANSPARENCY_CLASSIFICATION.ENGINEERING_APPROXIMATION,
  'yield-only': TRANSPARENCY_CLASSIFICATION.YIELD_GOVERNED,
  'declared-missing': TRANSPARENCY_CLASSIFICATION.MISSING_DECLARED_INPUT,
};

export const WRINKLING_MODE_RELIABILITY = {
  declared: TRANSPARENCY_RELIABILITY.USER_DECLARED,
  approx: TRANSPARENCY_RELIABILITY.ENGINEERING_APPROXIMATION,
  'yield-only': TRANSPARENCY_RELIABILITY.EXACT_LIMIT_STATE,
};

export const createCheckTransparency = ({
  key,
  source,
  classification = TRANSPARENCY_CLASSIFICATION.UNSPECIFIED,
  reliability = TRANSPARENCY_RELIABILITY.UNSPECIFIED,
  label,
  title,
  enabled = true,
}) => ({
  key,
  label: label || CAPACITY_CHECK_LABELS[key] || key,
  title: title || label || CAPACITY_CHECK_LABELS[key] || key,
  source,
  classification,
  reliability,
  enabled,
});

import { getCapacitySourceMeta } from './capacitySources.js';

export const buildCapacityCheckTransparency = ({
  wrinklingMeta,
  wrinklingDeclaredMissing = false,
  sigma_w_source,
  upliftEnabled = false,
}) => {
  const sigmaLimitSource = getCapacitySourceMeta(CAPACITY_CHECK_KEYS.SIGMA_LIMIT);
  const supportCrushingSource = getCapacitySourceMeta(CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING);
  const upliftSource = getCapacitySourceMeta(CAPACITY_CHECK_KEYS.UPLIFT);

  return {
    [CAPACITY_CHECK_KEYS.SIGMA_LIMIT]: {
      ...createCheckTransparency({
        key: CAPACITY_CHECK_KEYS.SIGMA_LIMIT,
        source: wrinklingDeclaredMissing ? 'yield-only-fallback' : sigma_w_source,
        classification: wrinklingDeclaredMissing
          ? TRANSPARENCY_CLASSIFICATION.FALLBACK_TO_EXACT_LIMIT_STATE
          : (wrinklingMeta?.sourceClassification || sigmaLimitSource?.classification || TRANSPARENCY_CLASSIFICATION.UNSPECIFIED),
        reliability: wrinklingMeta?.effectiveModeReliability || sigmaLimitSource?.reliability || TRANSPARENCY_RELIABILITY.UNSPECIFIED,
      }),
      sourceMeta: sigmaLimitSource,
    },
    [CAPACITY_CHECK_KEYS.BENDING_STRESS]: createCheckTransparency({
      key: CAPACITY_CHECK_KEYS.BENDING_STRESS,
      source: 'section-analysis',
      classification: TRANSPARENCY_CLASSIFICATION.ENGINEERING_CALCULATION,
      reliability: TRANSPARENCY_RELIABILITY.ENGINEERING_CALCULATION,
    }),
    [CAPACITY_CHECK_KEYS.SHEAR_CAPACITY]: createCheckTransparency({
      key: CAPACITY_CHECK_KEYS.SHEAR_CAPACITY,
      source: 'core-shear-strength-input',
      classification: TRANSPARENCY_CLASSIFICATION.INPUT_RESISTANCE_CHECK,
      reliability: TRANSPARENCY_RELIABILITY.INPUT_DEPENDENT,
    }),
    [CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING]: {
      ...createCheckTransparency({
        key: CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING,
        source: 'support-width-and-core-bearing-record',
        classification: supportCrushingSource?.classification || TRANSPARENCY_CLASSIFICATION.INPUT_RESISTANCE_CHECK,
        reliability: supportCrushingSource?.reliability || TRANSPARENCY_RELIABILITY.INPUT_DEPENDENT,
      }),
      sourceMeta: supportCrushingSource,
    },
    [CAPACITY_CHECK_KEYS.UPLIFT]: {
      ...createCheckTransparency({
        key: CAPACITY_CHECK_KEYS.UPLIFT,
        source: upliftEnabled ? 'fastener-capacity-input' : 'not-applicable',
        classification: upliftEnabled
          ? (upliftSource?.classification || TRANSPARENCY_CLASSIFICATION.INPUT_RESISTANCE_CHECK)
          : TRANSPARENCY_CLASSIFICATION.UNSPECIFIED,
        reliability: upliftEnabled
          ? (upliftSource?.reliability || TRANSPARENCY_RELIABILITY.INPUT_DEPENDENT)
          : TRANSPARENCY_RELIABILITY.UNSPECIFIED,
        enabled: upliftEnabled,
      }),
      sourceMeta: upliftEnabled ? upliftSource : null,
    },
    [CAPACITY_CHECK_KEYS.DEFLECTION]: createCheckTransparency({
      key: CAPACITY_CHECK_KEYS.DEFLECTION,
      source: 'solver-response',
      classification: TRANSPARENCY_CLASSIFICATION.LIMIT_STATE_RESPONSE,
      reliability: TRANSPARENCY_RELIABILITY.ENGINEERING_CALCULATION,
    }),
  };
};
