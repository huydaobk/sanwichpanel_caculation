export {
  DEFAULT_REDISTRIBUTION_MODE,
  DEFAULT_WRINKLING_MODE,
  APP_SNAPSHOT_KIND,
  CAPACITY_CHECK_KEYS,
  CAPACITY_CHECK_LABELS,
  CAPACITY_GOVERNING_CASE_KEYS,
  CAPACITY_GOVERNING_CASE_LABELS,
  buildExportFileName
} from '../calc';

import {
  DEFAULT_REDISTRIBUTION_MODE,
  DEFAULT_WRINKLING_MODE,
  APP_SNAPSHOT_KIND,
  CAPACITY_CHECK_KEYS,
  CAPACITY_CHECK_LABELS,
  CAPACITY_GOVERNING_CASE_KEYS,
  CAPACITY_GOVERNING_CASE_LABELS,
  buildExportFileName
} from '../calc';

export const WRINKLING_MODE_LABELS = {
  declared: 'Khai báo trực tiếp',
  approx: 'Xấp xỉ kỹ thuật',
  'yield-only': 'Theo giới hạn chảy',
};

export const WRINKLING_SOURCE_LABELS = {
  declared: 'Khai báo trực tiếp',
  approx: 'Xấp xỉ kỹ thuật',
  'yield-only': 'Theo giới hạn chảy',
  'declared-missing': 'Thiếu dữ liệu khai báo',
};

export const REDISTRIBUTION_MODE_LABELS = {
  elastic: 'Đàn hồi',
  simplified: 'Đơn giản hóa',
};

export const WIND_DIRECTION_LABELS = {
  pressure: 'Gió đẩy',
  suction: 'Gió hút',
};

export const CAPACITY_REPORT_ROW_KEYS = [
  CAPACITY_CHECK_KEYS.BENDING_STRESS,
  'supportStress',
  CAPACITY_CHECK_KEYS.SHEAR_CAPACITY,
  CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING,
  CAPACITY_CHECK_KEYS.UPLIFT,
  CAPACITY_CHECK_KEYS.DEFLECTION,
];

export const CAPACITY_REPORT_ROW_LABELS = {
  [CAPACITY_CHECK_KEYS.BENDING_STRESS]: 'Ứng suất uốn (Nhịp)',
  supportStress: 'Ứng suất uốn (Gối)',
  [CAPACITY_CHECK_KEYS.SHEAR_CAPACITY]: CAPACITY_CHECK_LABELS[CAPACITY_CHECK_KEYS.SHEAR_CAPACITY],
  [CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING]: CAPACITY_CHECK_LABELS[CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING],
  [CAPACITY_CHECK_KEYS.UPLIFT]: CAPACITY_CHECK_LABELS[CAPACITY_CHECK_KEYS.UPLIFT],
  [CAPACITY_CHECK_KEYS.DEFLECTION]: CAPACITY_CHECK_LABELS[CAPACITY_CHECK_KEYS.DEFLECTION],
};

export const getModeLabel = (value, labels) => labels[value] || value || '—';
export const getCapacityLabel = (key, fallback = '—') => CAPACITY_CHECK_LABELS[key] || CAPACITY_GOVERNING_CASE_LABELS[key] || fallback;

export const COMPARE_VARIANT_LIMIT = 3;
export const COMPARE_VARIANT_LABELS = ['PA A', 'PA B', 'PA C'];
export const COMPARE_STATUS_LABELS = {
  pass: 'Đạt',
  fail: 'Không đạt',
};

export const REPORT_BADGE_TONE_CLASSNAMES = {
  pass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  fail: 'border-rose-200 bg-rose-50 text-rose-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  violet: 'border-violet-200 bg-violet-50 text-violet-800',
};

export const createDefaultConfig = () => ({
  projectName: 'Nhà máy Greenpan - GĐ1',
  panelType: 'ceiling',
  internalWallType: 'normal',
  coreThickness: 50,
  skinOut: 0.45,
  skinIn: 0.45,
  panelWidth: 1000,
  steelYield: 280,
  coreShearStrength: 0.12,
  coreShearModulus: 3.5,
  compressiveModulus: 4.0,
  wrinklingMode: DEFAULT_WRINKLING_MODE,
  wrinklingStress: 120,
  wrinklingStressBasis: 'design-resistance',
  wrinklingStressSourceType: 'unknown',
  wrinklingStressUnit: 'MPa',
  wrinklingStressSourceRef: '',
  wrinklingStressSourceNote: '',
  wrinklingStressProductContext: '',
  redistributionMode: DEFAULT_REDISTRIBUTION_MODE,
  kappaShear: 1.0,
  coreDensity: 42,
  windPressure: 0.8,
  windDirection: 'pressure',
  tempOut: 65,
  tempIn: 25,
  gammaF_thermal: 1.5,
  screwStrength: 2.0,
  screwStrengthBasis: 'design-resistance-per-fastener',
  screwStrengthSourceType: 'unknown',
  screwStrengthUnit: 'kN',
  screwStrengthSourceRef: '',
  screwStrengthSourceNote: '',
  screwStrengthFastenerContext: '',
  screwStrengthSpacingMeaning: '',
  screwSpacing: 1000,
  deflectionLimit: 150,
  creepFactor: 2.4,
  creepFactorBending: 0,
  spans: [3.0, 3.0],
  supportWidths: [60, 60, 60],
  deadLoadMode: 'auto',
  deadLoadManual_kPa: 0,
  liveLoad_kPa: 0.25,
  gammaG: 1.35,
  gammaQ: 1.5,
  enableSpanDistributedLoads: false,
  deadLoadBySpan_kPa: [0, 0],
  liveLoadBySpan_kPa: [0.25, 0.25],
  pointLoads: [
    { x_m: 1.5, P_kN: 0.30, note: 'Đèn', type: 'permanent' },
    { x_m: 4.5, P_kN: 0.30, note: 'Máng cáp', type: 'permanent' },
  ],
});

export const safeJsonClone = (value, fallback = null) => {
  if (value === null || typeof value === 'undefined') return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to clone JSON-safe value', error);
    return fallback;
  }
};

export const cloneConfig = (source) => {
  const cloned = safeJsonClone(source, null);
  if (!cloned || typeof cloned !== 'object' || Array.isArray(cloned)) {
    return createDefaultConfig();
  }
  return cloned;
};

export const sanitizeText = (value, fallback = '') => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
};

export const normalizeIsoTimestamp = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      const ms = Date.parse(trimmed);
      if (!Number.isNaN(ms)) return new Date(ms).toISOString();
    }
  }
  return new Date().toISOString();
};

export const isPlainObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);

export const getSafeLocalStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage || null;
  } catch (error) {
    console.warn('localStorage is unavailable', error);
    return null;
  }
};

export const formatArtifactScopeLabel = (scope) => {
  switch (scope) {
    case 'snapshot-project':
      return 'Snapshot dự án';
    case 'snapshot-compare-set':
      return 'Snapshot compare set';
    case 'result-package-project':
      return 'Result package dự án';
    case 'result-package-compare-set':
      return 'Result package compare set';
    default:
      return scope || 'JSON package';
  }
};

export const summarizeVariantLabels = (variants = []) => {
  if (!Array.isArray(variants) || variants.length === 0) return 'Không có phương án compare.';
  return variants.map((variant, index) => variant?.label || variant?.name || `PA ${index + 1}`).join(', ');
};

export const buildImportSuccessMessage = ({
  packageLabel,
  projectName,
  variantCount,
  compareModeEnabled,
  activeVariantLabel,
  appVersion,
  schemaVersion,
} = {}) => {
  const parts = [
    `Đã nạp ${packageLabel || 'snapshot'}${projectName ? ` cho dự án “${projectName}”` : ''}.`,
    `Compare set: ${variantCount || 0} phương án${variantCount ? ` (${compareModeEnabled ? 'compare mode bật' : 'compare mode tắt'})` : ''}.`,
    activeVariantLabel ? `Phương án đang mở: ${activeVariantLabel}.` : null,
    appVersion ? `Version: ${appVersion}.` : null,
    schemaVersion ? `Schema: ${schemaVersion}.` : null,
  ].filter(Boolean);
  return parts.join(' ');
};

export const STORAGE_KEYS = {
  presetLibrary: 'greenpan:preset-library:v1',
};

export const PRESET_LIMIT = 8;

export const createSnapshotTemplate = () => ({
  projectName: 'Imported snapshot',
  configSnapshot: createDefaultConfig(),
  compareSnapshot: {
    variantCount: 1,
    variants: [createVariant('variant-a', COMPARE_VARIANT_LABELS[0], createDefaultConfig())],
  },
  appState: {
    compareModeEnabled: false,
    compareActiveVariantId: 'variant-a',
  },
});

export const normalizeSnapshotVariantLabel = (value, index) => {
  const text = String(value || '').trim();
  if (text) return text;
  return COMPARE_VARIANT_LABELS[index] || `PA ${index + 1}`;
};

export const normalizeSnapshotVariantId = (value, index) => {
  const text = String(value || '').trim();
  if (text) return text;
  return index === 0 ? 'variant-a' : `variant-${index + 1}`;
};

export const normalizeCompareVariantsForSnapshot = (variants, fallbackConfig) => {
  const safeFallbackConfig = cloneConfig(fallbackConfig || createDefaultConfig());
  const source = Array.isArray(variants) && variants.length > 0
    ? variants.filter((variant) => isPlainObject(variant)).slice(0, COMPARE_VARIANT_LIMIT)
    : [createVariant('variant-a', COMPARE_VARIANT_LABELS[0], safeFallbackConfig)];

  const normalized = source.map((variant, index) => {
    const id = normalizeSnapshotVariantId(variant?.id, index);
    const label = normalizeSnapshotVariantLabel(variant?.label || variant?.name, index);
    const configSource = isPlainObject(variant?.config) ? variant.config : safeFallbackConfig;
    return {
      id,
      label,
      name: sanitizeText(variant?.name || label, label),
      config: cloneConfig(configSource),
    };
  });

  if (normalized.length === 0) {
    return [createVariant('variant-a', COMPARE_VARIANT_LABELS[0], safeFallbackConfig)];
  }

  const deduped = [];
  const usedIds = new Set();
  normalized.forEach((variant, index) => {
    let nextId = variant.id;
    while (usedIds.has(nextId)) {
      nextId = normalizeSnapshotVariantId(`${variant.id}-${index + 1}`, index + 1);
    }
    usedIds.add(nextId);
    deduped.push({ ...variant, id: nextId });
  });

  return deduped;
};

export const normalizeImportedSnapshot = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('File JSON không hợp lệ. Hãy chọn đúng file snapshot đã xuất từ app.');
  }

  const base = createSnapshotTemplate();
  const packageKind = String(payload.packageKind || '').trim();
  const artifactScope = payload.exportMeta?.artifactScope || payload.artifactMeta?.artifactScope || '';
  const packageLabel = payload.importSummary?.packageLabel || formatArtifactScopeLabel(artifactScope);

  if (packageKind && packageKind !== APP_SNAPSHOT_KIND) {
    throw new Error(`Bạn vừa chọn ${packageLabel}. File này chỉ để audit/kết quả, không dùng để nạp lại form. Hãy chọn file “Snapshot dự án” hoặc “Snapshot compare set”.`);
  }

  const rawConfig = payload.configSnapshot && typeof payload.configSnapshot === 'object'
    ? payload.configSnapshot
    : payload.config && typeof payload.config === 'object'
      ? payload.config
      : null;

  if (!rawConfig || typeof rawConfig !== 'object') {
    throw new Error('File snapshot thiếu khối configSnapshot nên app không biết nạp dữ liệu nào vào form. Hãy xuất lại snapshot rồi thử lại.');
  }

  const configSnapshot = { ...createDefaultConfig(), ...cloneConfig(rawConfig) };
  const rawVariants = payload.compareSnapshot?.variants || payload.variants;
  const compareVariants = normalizeCompareVariantsForSnapshot(rawVariants, configSnapshot);
  const compareModeEnabled = payload.appState?.compareModeEnabled === true
    || payload.compareModeEnabled === true
    || compareVariants.length >= 2;

  const activeVariantIdCandidate = payload.appState?.compareActiveVariantId || payload.compareActiveVariantId || payload.importSummary?.activeVariantId || compareVariants[0]?.id;
  const activeVariant = compareVariants.find((variant) => variant.id === activeVariantIdCandidate) || compareVariants[0];
  const nextConfig = compareModeEnabled && activeVariant?.config
    ? cloneConfig(activeVariant.config)
    : cloneConfig(configSnapshot);
  const projectName = payload.projectName || nextConfig.projectName || configSnapshot.projectName || base.projectName;
  const appVersion = String(payload?.appVersion || payload?.exportMeta?.appVersion || payload?.artifactMeta?.appVersion || '').trim() || null;
  const schemaVersion = String(payload?.schemaVersion || '').trim() || null;

  return {
    projectName,
    configSnapshot: nextConfig,
    compareVariants,
    appState: {
      compareModeEnabled,
      compareActiveVariantId: activeVariant?.id || compareVariants[0]?.id || 'variant-a',
    },
    importSummary: {
      packageLabel,
      artifactScope: artifactScope || (compareModeEnabled ? 'snapshot-compare-set' : 'snapshot-project'),
      projectName,
      compareModeEnabled,
      variantCount: compareVariants.length,
      activeVariantId: activeVariant?.id || null,
      activeVariantLabel: activeVariant?.label || null,
      variantLabelsText: summarizeVariantLabels(compareVariants),
      appVersion,
      schemaVersion,
    },
  };
};

export const downloadJsonFile = (filename, payload) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const buildSafeExportFileName = ({ projectName, packageKind, compareModeEnabled, exportedAt }) => buildExportFileName({
  projectName,
  packageKind,
  compareModeEnabled,
  exportedAt,
  extension: 'json',
});

export const buildDefaultPresetName = (config, compareModeEnabled, fallbackCount = 1) => {
  const projectLabel = String(config?.projectName || '').trim();
  if (projectLabel) return compareModeEnabled ? `${projectLabel} · Compare set` : projectLabel;
  return compareModeEnabled ? `Preset compare ${fallbackCount}` : `Preset ${fallbackCount}`;
};

export const buildPresetSummary = (config = {}, compareModeEnabled = false, compareVariants = []) => {
  const spans = Array.isArray(config?.spans) ? config.spans.filter((value) => Number(value) > 0) : [];
  const spanLabel = spans.length ? `${spans.length} nhịp` : 'chưa khai báo nhịp';
  const thicknessLabel = Number(config?.coreThickness) > 0 ? `${Number(config.coreThickness)} mm` : 'chưa rõ dày';
  const panelTypeLabel = config?.panelType === 'ceiling'
    ? 'Trần'
    : config?.panelType === 'internal'
      ? 'Vách trong'
      : 'Vách ngoài';
  const compareLabel = compareModeEnabled ? ` · ${compareVariants.length || 1} PA` : '';
  return `${panelTypeLabel} · ${thicknessLabel} · ${spanLabel}${compareLabel}`;
};

export const normalizePresetLibrary = (payload) => {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((item) => isPlainObject(item))
    .map((item, index) => {
      const rawConfig = isPlainObject(item.configSnapshot)
        ? item.configSnapshot
        : isPlainObject(item.config)
          ? item.config
          : createDefaultConfig();
      const configSnapshot = { ...createDefaultConfig(), ...cloneConfig(rawConfig) };
      const compareVariants = normalizeCompareVariantsForSnapshot(item.compareVariants || item.compareSnapshot?.variants, configSnapshot);
      const compareModeEnabled = item.compareModeEnabled === true || compareVariants.length >= 2;
      const fallbackName = buildDefaultPresetName(configSnapshot, compareModeEnabled, index + 1);
      const name = sanitizeText(item.name, '').trim() || fallbackName;
      const activeVariantIdCandidate = sanitizeText(item.compareActiveVariantId || item.compareSnapshot?.activeVariantId, '').trim();
      const activeVariantId = compareVariants.some((variant) => variant.id === activeVariantIdCandidate)
        ? activeVariantIdCandidate
        : compareVariants[0]?.id || 'variant-a';
      return {
        id: sanitizeText(item.id, `preset-${Date.now()}-${index + 1}`),
        name,
        note: sanitizeText(item.note, '').trim(),
        configSnapshot,
        compareModeEnabled,
        compareActiveVariantId: activeVariantId,
        compareVariants,
        savedAt: normalizeIsoTimestamp(item.savedAt),
      };
    })
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
};

export const loadPresetLibrary = () => {
  const storage = getSafeLocalStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEYS.presetLibrary);
    if (!raw) return [];
    return normalizePresetLibrary(JSON.parse(raw));
  } catch (error) {
    console.warn('Failed to load preset library', error);
    try {
      storage.removeItem(STORAGE_KEYS.presetLibrary);
    } catch (cleanupError) {
      console.warn('Failed to clear corrupted preset library', cleanupError);
    }
    return [];
  }
};

export const persistPresetLibrary = (presets) => {
  const storage = getSafeLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEYS.presetLibrary, JSON.stringify(normalizePresetLibrary(presets)));
  } catch (error) {
    console.warn('Failed to persist preset library', error);
  }
};

export const createVariant = (id, label, config) => ({
  id,
  label,
  name: label,
  config: cloneConfig(config),
});

export const normalizeVariantLabel = (value, fallback) => {
  const cleaned = String(value || '').trim();
  return cleaned || fallback;
};

export const formatRatioPercent = (ratio) => `${(Number(ratio || 0) * 100).toFixed(0)}%`;

export const buildCompareDeltaText = (baselineValue, currentValue, { inverse = false } = {}) => {
  if (!Number.isFinite(baselineValue) || !Number.isFinite(currentValue)) return null;
  const delta = currentValue - baselineValue;
  if (Math.abs(delta) < 0.005) return '≈ ngang PA gốc';

  const better = inverse ? delta < 0 : delta > 0;
  const prefix = better ? '↓ tốt hơn' : '↑ xấu hơn';
  return `${prefix} ${Math.abs(delta * 100).toFixed(1)}đ %`;
};

export const buildCompareMetricRows = (summary, config) => {
  const rows = [
    {
      key: 'status',
      label: 'Pass / fail',
      value: summary?.status === 'pass' ? 'Đạt' : 'Không đạt',
      tone: summary?.status === 'pass' ? 'pass' : 'fail',
    },
    {
      key: 'governing',
      label: 'Case chi phối',
      value: summary?.governingCases?.overall?.label || '—',
      tone: 'neutral',
    },
    {
      key: 'ratio',
      label: 'Max ratio',
      value: `${((summary?.governingCases?.overall?.ratio || 0) * 100).toFixed(0)}%`,
      tone: (summary?.governingCases?.overall?.ratio || 0) <= 1 ? 'pass' : 'fail',
    },
    {
      key: 'deflection',
      label: 'Độ võng',
      value: `${Number(summary?.maxDeflection || 0).toFixed(1)} / ${Number(summary?.w_limit || 0).toFixed(1)} mm`,
      tone: (summary?.ratios?.deflection || 0) <= 1 ? 'pass' : 'fail',
      subValue: `(${((summary?.ratios?.deflection || 0) * 100).toFixed(0)}%)`,
    },
    {
      key: 'crushing',
      label: 'Crushing',
      value: `${((summary?.ratios?.crushing || 0) * 100).toFixed(0)}%`,
      tone: (summary?.ratios?.crushing || 0) <= 1 ? 'pass' : 'fail',
    },
  ];

  if (config?.panelType !== 'ceiling') {
    rows.push({
      key: 'uplift',
      label: 'Uplift',
      value: summary?.upliftEnabled ? `${((summary?.ratios?.uplift || 0) * 100).toFixed(0)}%` : 'N/A',
      tone: !summary?.upliftEnabled ? 'muted' : (summary?.ratios?.uplift || 0) <= 1 ? 'pass' : 'fail',
    });
  }

  return rows;
};


export const TRANSPARENCY_RELIABILITY_LABELS = {
  'user-declared': 'Khai báo trực tiếp',
  'engineering-approximation': 'Xấp xỉ kỹ thuật',
  'exact-limit-state': 'Giới hạn trạng thái trực tiếp',
  'yield-governed': 'Theo giới hạn chảy',
  'fallback-to-exact-limit-state': 'Fallback sang giới hạn chảy',
  'missing-declared-input': 'Thiếu dữ liệu khai báo',
  'engineering-calculation': 'Tính toán kỹ thuật',
  'input-dependent': 'Phụ thuộc dữ liệu đầu vào',
  unspecified: 'Chưa phân loại',
};

export const TRANSPARENCY_CLASSIFICATION_LABELS = {
  'user-declared': 'Khai báo trực tiếp',
  'engineering-approximation': 'Xấp xỉ kỹ thuật',
  'yield-governed': 'Theo giới hạn chảy',
  'missing-declared-input': 'Thiếu dữ liệu khai báo',
  'fallback-to-exact-limit-state': 'Fallback sang giới hạn chảy',
  'engineering-calculation': 'Tính toán kỹ thuật',
  'input-resistance-check': 'Kiểm tra sức kháng phụ thuộc đầu vào',
  'limit-state-response': 'Đáp ứng trạng thái giới hạn',
  unspecified: 'Chưa phân loại',
};

export const getTransparencyLabel = (value, labels = TRANSPARENCY_RELIABILITY_LABELS) => labels[value] || value || '—';

export const getTransparencyTone = (value) => {
  if (['exact-limit-state', 'user-declared'].includes(value)) return 'emerald';
  if (['engineering-approximation', 'engineering-calculation', 'input-dependent', 'yield-governed'].includes(value)) return 'sky';
  if (['fallback-to-exact-limit-state', 'missing-declared-input'].includes(value)) return 'amber';
  return 'slate';
};

export const TRANSPARENCY_TONE_CLASSNAMES = {
  emerald: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  sky: 'bg-sky-50 text-sky-800 border border-sky-200',
  amber: 'bg-amber-50 text-amber-800 border border-amber-200',
  slate: 'bg-slate-100 text-slate-700 border border-slate-200',
};
