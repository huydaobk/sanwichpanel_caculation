import React, { useMemo, useRef, useState } from 'react';
import { APP_DISPLAY_NAME, APP_VERSION, buildReleaseStamp, resolveReleaseChannel, resolveRuntimeAppVersion } from './releaseMeta';
import {
  SECTION_CONSTANTS,
  DEFAULT_REDISTRIBUTION_MODE,
  DEFAULT_WRINKLING_MODE,
  runPanelAnalysis,
  buildCompareExecutiveSummary,
  buildResultPackage,
  buildAppSnapshotPackage,
  buildExportFileName,
  APP_SNAPSHOT_KIND,
  CAPACITY_CHECK_KEYS,
  CAPACITY_CHECK_LABELS,
  CAPACITY_GOVERNING_CASE_KEYS,
  CAPACITY_GOVERNING_CASE_LABELS,
} from './calc';
import {
  ComposedChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell
} from 'recharts';
import {
  Settings, Thermometer, TrendingUp, AlertCircle, Printer, BookOpen, Activity, Info, FileJson
} from 'lucide-react';

const WRINKLING_MODE_LABELS = {
  declared: 'Khai báo trực tiếp',
  approx: 'Xấp xỉ kỹ thuật',
  'yield-only': 'Theo giới hạn chảy',
};

const WRINKLING_SOURCE_LABELS = {
  declared: 'Khai báo trực tiếp',
  approx: 'Xấp xỉ kỹ thuật',
  'yield-only': 'Theo giới hạn chảy',
  'declared-missing': 'Thiếu dữ liệu khai báo',
};

const REDISTRIBUTION_MODE_LABELS = {
  elastic: 'Đàn hồi',
  simplified: 'Đơn giản hóa',
};

const WIND_DIRECTION_LABELS = {
  pressure: 'Gió đẩy',
  suction: 'Gió hút',
};

const CAPACITY_REPORT_ROW_KEYS = [
  CAPACITY_CHECK_KEYS.BENDING_STRESS,
  'supportStress',
  CAPACITY_CHECK_KEYS.SHEAR_CAPACITY,
  CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING,
  CAPACITY_CHECK_KEYS.UPLIFT,
  CAPACITY_CHECK_KEYS.DEFLECTION,
];

const CAPACITY_REPORT_ROW_LABELS = {
  [CAPACITY_CHECK_KEYS.BENDING_STRESS]: 'Ứng suất uốn (Nhịp)',
  supportStress: 'Ứng suất uốn (Gối)',
  [CAPACITY_CHECK_KEYS.SHEAR_CAPACITY]: CAPACITY_CHECK_LABELS[CAPACITY_CHECK_KEYS.SHEAR_CAPACITY],
  [CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING]: CAPACITY_CHECK_LABELS[CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING],
  [CAPACITY_CHECK_KEYS.UPLIFT]: CAPACITY_CHECK_LABELS[CAPACITY_CHECK_KEYS.UPLIFT],
  [CAPACITY_CHECK_KEYS.DEFLECTION]: CAPACITY_CHECK_LABELS[CAPACITY_CHECK_KEYS.DEFLECTION],
};

const getModeLabel = (value, labels) => labels[value] || value || '—';
const getCapacityLabel = (key, fallback = '—') => CAPACITY_CHECK_LABELS[key] || CAPACITY_GOVERNING_CASE_LABELS[key] || fallback;

const COMPARE_VARIANT_LIMIT = 3;
const COMPARE_VARIANT_LABELS = ['PA A', 'PA B', 'PA C'];
const COMPARE_STATUS_LABELS = {
  pass: 'Đạt',
  fail: 'Không đạt',
};

const REPORT_BADGE_TONE_CLASSNAMES = {
  pass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  fail: 'border-rose-200 bg-rose-50 text-rose-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  violet: 'border-violet-200 bg-violet-50 text-violet-800',
};

const createDefaultConfig = () => ({
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

const safeJsonClone = (value, fallback = null) => {
  if (value === null || typeof value === 'undefined') return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to clone JSON-safe value', error);
    return fallback;
  }
};

const cloneConfig = (source) => {
  const cloned = safeJsonClone(source, null);
  if (!cloned || typeof cloned !== 'object' || Array.isArray(cloned)) {
    return createDefaultConfig();
  }
  return cloned;
};

const sanitizeText = (value, fallback = '') => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
};

const normalizeIsoTimestamp = (value) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      const ms = Date.parse(trimmed);
      if (!Number.isNaN(ms)) return new Date(ms).toISOString();
    }
  }
  return new Date().toISOString();
};

const isPlainObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);

const getSafeLocalStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage || null;
  } catch (error) {
    console.warn('localStorage is unavailable', error);
    return null;
  }
};

const formatArtifactScopeLabel = (scope) => {
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

const summarizeVariantLabels = (variants = []) => {
  if (!Array.isArray(variants) || variants.length === 0) return 'Không có phương án compare.';
  return variants.map((variant, index) => variant?.label || variant?.name || `PA ${index + 1}`).join(', ');
};

const buildImportSuccessMessage = ({
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

const STORAGE_KEYS = {
  presetLibrary: 'greenpan:preset-library:v1',
};

const PRESET_LIMIT = 8;

const createSnapshotTemplate = () => ({
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

const normalizeSnapshotVariantLabel = (value, index) => {
  const text = String(value || '').trim();
  if (text) return text;
  return COMPARE_VARIANT_LABELS[index] || `PA ${index + 1}`;
};

const normalizeSnapshotVariantId = (value, index) => {
  const text = String(value || '').trim();
  if (text) return text;
  return index === 0 ? 'variant-a' : `variant-${index + 1}`;
};

const normalizeCompareVariantsForSnapshot = (variants, fallbackConfig) => {
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

const normalizeImportedSnapshot = (payload) => {
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

const downloadJsonFile = (filename, payload) => {
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

const buildSafeExportFileName = ({ projectName, packageKind, compareModeEnabled, exportedAt }) => buildExportFileName({
  projectName,
  packageKind,
  compareModeEnabled,
  exportedAt,
  extension: 'json',
});

const buildDefaultPresetName = (config, compareModeEnabled, fallbackCount = 1) => {
  const projectLabel = String(config?.projectName || '').trim();
  if (projectLabel) return compareModeEnabled ? `${projectLabel} · Compare set` : projectLabel;
  return compareModeEnabled ? `Preset compare ${fallbackCount}` : `Preset ${fallbackCount}`;
};

const buildPresetSummary = (config = {}, compareModeEnabled = false, compareVariants = []) => {
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

const normalizePresetLibrary = (payload) => {
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

const loadPresetLibrary = () => {
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

const persistPresetLibrary = (presets) => {
  const storage = getSafeLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEYS.presetLibrary, JSON.stringify(normalizePresetLibrary(presets)));
  } catch (error) {
    console.warn('Failed to persist preset library', error);
  }
};

const createVariant = (id, label, config) => ({
  id,
  label,
  name: label,
  config: cloneConfig(config),
});

const normalizeVariantLabel = (value, fallback) => {
  const cleaned = String(value || '').trim();
  return cleaned || fallback;
};

const formatRatioPercent = (ratio) => `${(Number(ratio || 0) * 100).toFixed(0)}%`;

const buildCompareDeltaText = (baselineValue, currentValue, { inverse = false } = {}) => {
  if (!Number.isFinite(baselineValue) || !Number.isFinite(currentValue)) return null;
  const delta = currentValue - baselineValue;
  if (Math.abs(delta) < 0.005) return '≈ ngang PA gốc';

  const better = inverse ? delta < 0 : delta > 0;
  const prefix = better ? '↓ tốt hơn' : '↑ xấu hơn';
  return `${prefix} ${Math.abs(delta * 100).toFixed(1)}đ %`;
};

const buildCompareMetricRows = (summary, config) => {
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


const TRANSPARENCY_RELIABILITY_LABELS = {
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

const TRANSPARENCY_CLASSIFICATION_LABELS = {
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

const getTransparencyLabel = (value, labels = TRANSPARENCY_RELIABILITY_LABELS) => labels[value] || value || '—';

const getTransparencyTone = (value) => {
  if (['exact-limit-state', 'user-declared'].includes(value)) return 'emerald';
  if (['engineering-approximation', 'engineering-calculation', 'input-dependent', 'yield-governed'].includes(value)) return 'sky';
  if (['fallback-to-exact-limit-state', 'missing-declared-input'].includes(value)) return 'amber';
  return 'slate';
};

const TRANSPARENCY_TONE_CLASSNAMES = {
  emerald: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  sky: 'bg-sky-50 text-sky-800 border border-sky-200',
  amber: 'bg-amber-50 text-amber-800 border border-amber-200',
  slate: 'bg-slate-100 text-slate-700 border border-slate-200',
};

const TransparencyBadge = ({ children, tone = 'slate', className = '' }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${TRANSPARENCY_TONE_CLASSNAMES[tone] || TRANSPARENCY_TONE_CLASSNAMES.slate} ${className}`.trim()}>
    {children}
  </span>
);

const ReportBadge = ({ label, detail, tone = 'neutral' }) => (
  <div className={`rounded-xl border px-3 py-2 ${REPORT_BADGE_TONE_CLASSNAMES[tone] || REPORT_BADGE_TONE_CLASSNAMES.neutral}`}>
    <div className="text-[10px] font-bold uppercase tracking-wide">{label}</div>
    {detail && <div className="mt-1 text-[11px] font-medium normal-case tracking-normal">{detail}</div>}
  </div>
);

const ExecutiveSummaryPanel = ({ results, compareSummary }) => {
  const badges = results?.reportPresentation?.badges || {};
  const statusTone = badges?.status?.key === 'pass' ? 'pass' : 'fail';
  const validationTone = badges?.validation?.headlineClass === 'external-captured'
    ? 'info'
    : badges?.validation?.headlineClass === 'internal-captured'
      ? 'violet'
      : 'warning';
  const transparencyTone = badges?.transparency?.key === 'high'
    ? 'pass'
    : badges?.transparency?.key === 'medium'
      ? 'info'
      : 'warning';

  return (
    <div className="mb-6 report-section rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Executive technical snapshot</div>
          <h3 className="mt-1 text-lg font-bold text-slate-900">Tóm tắt điều kiện kiểm tra & mức độ tin cậy</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600">
            Khối này gom trạng thái pass/fail, benchmark class, transparency level và case chi phối để người đọc nhìn 30 giây là hiểu mức tin cậy của bản tính.
          </p>
        </div>
        <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${statusTone === 'pass' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {badges?.status?.label || (results?.status === 'pass' ? 'PASS' : 'FAIL')}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <ReportBadge label={badges?.status?.label || 'Status'} detail={badges?.status?.detail || '—'} tone={statusTone} />
        <ReportBadge label={badges?.validation?.headlineLabel || 'Validation'} detail={badges?.validation?.capturedCount != null ? `${badges.validation.capturedCount}/${badges.validation.totalCases} cases captured` : '—'} tone={validationTone} />
        <ReportBadge label={badges?.benchmarkClass?.label || 'Benchmark class'} detail={badges?.benchmarkClass?.detail || '—'} tone={validationTone} />
        <ReportBadge label={badges?.transparency?.label || 'Transparency'} detail={badges?.transparency?.detail || '—'} tone={transparencyTone} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Check highlights</div>
          <div className="mt-3 space-y-2">
            {(results?.reportPresentation?.checkHighlights || []).map((item) => {
              const toneClass = item.tone === 'fail'
                ? 'text-rose-700'
                : item.tone === 'warning'
                  ? 'text-amber-700'
                  : item.tone === 'pass'
                    ? 'text-emerald-700'
                    : 'text-slate-700';
              return (
                <div key={item.key} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500">{item.label}</div>
                    <div className={`text-sm font-semibold ${toneClass}`}>{item.value}</div>
                  </div>
                  {item.ratio != null && (
                    <div className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${item.tone === 'fail' ? 'bg-rose-100 text-rose-800' : item.tone === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {(item.ratio * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Validation coverage</div>
          <div className="mt-3 space-y-2 text-xs text-slate-600">
            {(badges?.validation?.keyCases || []).length > 0 ? (
              (badges.validation.keyCases || []).map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="font-semibold text-slate-800">{item.id} — {item.title}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{item.benchmarkLabel}{item.referenceType ? ` · ${item.referenceType}` : ''}</div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                Chưa có captured benchmark case surfaced cho report snapshot hiện tại.
              </div>
            )}
          </div>
        </div>
      </div>

      {compareSummary?.available && (
        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-violet-700">Compare executive summary</div>
          <div className="mt-2 grid gap-2 md:grid-cols-3 text-xs">
            <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
              <div className="text-violet-500">Phương án ưu tiên</div>
              <div className="mt-1 font-bold text-violet-900">{compareSummary.bestVariantLabel || '—'}</div>
              <div className="text-[11px] text-slate-500">{compareSummary.bestStatus === 'pass' ? 'Đạt' : 'Không đạt'} · {compareSummary.bestRatio != null ? formatRatioPercent(compareSummary.bestRatio) : '—'}{compareSummary.bestMarginPercent != null ? ` · margin ${compareSummary.bestMarginPercent.toFixed(1)}%` : ''}</div>
            </div>
            <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
              <div className="text-violet-500">Tình trạng chung</div>
              <div className="mt-1 font-bold text-violet-900">{compareSummary.allPass ? 'Tất cả đạt' : compareSummary.mixedStatus ? 'Lẫn đạt / không đạt' : 'Chưa có PA nào đạt'}</div>
              <div className="text-[11px] text-slate-500">{compareSummary.passCount}/{compareSummary.variantCount} phương án đạt</div>
            </div>
            <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
              <div className="text-violet-500">Case chi phối PA tốt nhất</div>
              <div className="mt-1 font-bold text-violet-900">{compareSummary.bestGoverningLabel || '—'}</div>
              <div className="text-[11px] text-slate-500">{compareSummary.rationale || 'Dùng để chốt lựa chọn nhanh trước khi đọc sâu từng bảng.'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AssumptionsAndLimitationsPanel = ({ results }) => {
  const assumptions = results?.reportPresentation?.assumptions || [];
  const limitations = results?.reportPresentation?.limitations || [];

  return (
    <div className="mb-6 report-section grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <div className="text-sm font-bold uppercase text-sky-900">Design assumptions</div>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-sky-900">
          {assumptions.map((item, idx) => (
            <li key={`assumption-${idx}`} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-600 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-sm font-bold uppercase text-amber-900">Limitations / caution</div>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-amber-900">
          {limitations.map((item, idx) => (
            <li key={`limitation-${idx}`} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const formatSpanLoadSummary = (values = [], digits = 3, unit = 'kPa') => (
  (values || []).map((v, idx) => `Nhịp ${idx + 1}: ${Number(v || 0).toFixed(digits)} ${unit}`)
);

const buildPerSpanLoadRows = (results) => {
  const dead = results?.qDeadBySpan_kPa || [];
  const live = results?.qLiveBySpan_kPa || [];
  const spanCount = Math.max(dead.length, live.length);
  const rows = Array.from({ length: spanCount }, (_, idx) => {
    const qG = Number(dead[idx] || 0);
    const qQ = Number(live[idx] || 0);
    return {
      spanIndex: idx,
      spanLabel: `Nhịp ${idx + 1}`,
      qG,
      qQ,
      qSLS: qG + qQ,
      qULS: (Number(results?.gammaG) || 0) * qG + (Number(results?.gammaQ) || 0) * qQ,
    };
  });

  const nonZeroSls = rows.map((row) => row.qSLS).filter((value) => value > 0);
  const nonZeroUls = rows.map((row) => row.qULS).filter((value) => value > 0);
  const maxSls = rows.length ? Math.max(...rows.map((row) => row.qSLS)) : 0;
  const maxUls = rows.length ? Math.max(...rows.map((row) => row.qULS)) : 0;
  const minNonZeroSls = nonZeroSls.length ? Math.min(...nonZeroSls) : 0;
  const minNonZeroUls = nonZeroUls.length ? Math.min(...nonZeroUls) : 0;

  return rows.map((row) => {
    const flags = [];
    if (row.qG < 0 || row.qQ < 0) flags.push('negative-load');
    if (row.qG === 0) flags.push('zero-dead');
    if (row.qG === 0 && row.qQ === 0) flags.push('empty-span');
    if (maxSls > 0 && row.qSLS === maxSls) flags.push('max-sls');
    if (maxUls > 0 && row.qULS === maxUls) flags.push('max-uls');
    if (minNonZeroSls > 0 && row.qSLS > 0 && row.qSLS === minNonZeroSls && maxSls >= minNonZeroSls * 1.5) flags.push('min-sls');
    if (minNonZeroUls > 0 && row.qULS > 0 && row.qULS === minNonZeroUls && maxUls >= minNonZeroUls * 1.5) flags.push('min-uls');

    const tone = flags.includes('negative-load')
      ? 'danger'
      : flags.includes('empty-span') || flags.includes('zero-dead')
        ? 'warning'
        : flags.includes('max-uls') || flags.includes('max-sls')
          ? 'info'
          : 'neutral';

    const badges = [];
    if (flags.includes('negative-load')) badges.push({ label: 'Tải âm', tone: 'danger' });
    if (flags.includes('empty-span')) badges.push({ label: 'Đang rơi về 0', tone: 'warning' });
    else if (flags.includes('zero-dead')) badges.push({ label: 'qG = 0', tone: 'warning' });
    if (flags.includes('max-uls')) badges.push({ label: 'ULS lớn nhất', tone: 'info' });
    else if (flags.includes('max-sls')) badges.push({ label: 'SLS lớn nhất', tone: 'info' });
    if (flags.includes('min-uls') || flags.includes('min-sls')) badges.push({ label: 'Đầu thấp', tone: 'neutral' });

    return {
      ...row,
      flags,
      tone,
      badges,
    };
  });
};

const PER_SPAN_ROW_TONE = {
  neutral: {
    row: 'bg-white',
    cell: 'text-slate-700',
    emphasis: 'text-slate-900',
    badge: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  info: {
    row: 'bg-sky-50/70',
    cell: 'text-sky-800',
    emphasis: 'text-sky-900',
    badge: 'border-sky-200 bg-sky-100 text-sky-800',
  },
  warning: {
    row: 'bg-amber-50/80',
    cell: 'text-amber-800',
    emphasis: 'text-amber-900',
    badge: 'border-amber-200 bg-amber-100 text-amber-800',
  },
  danger: {
    row: 'bg-rose-50/90',
    cell: 'text-rose-800',
    emphasis: 'text-rose-900',
    badge: 'border-rose-200 bg-rose-100 text-rose-800',
  },
};

const buildPerSpanLoadSummary = (rows = []) => {
  if (!rows.length) return [];

  const notes = [];
  const negativeRows = rows.filter((row) => row.flags.includes('negative-load'));
  const emptyRows = rows.filter((row) => row.flags.includes('empty-span'));
  const zeroDeadRows = rows.filter((row) => row.flags.includes('zero-dead') && !row.flags.includes('empty-span'));
  const maxUlsRows = rows.filter((row) => row.flags.includes('max-uls'));
  const minUlsRows = rows.filter((row) => row.flags.includes('min-uls'));

  if (negativeRows.length) {
    notes.push({
      tone: 'danger',
      text: `${negativeRows.map((row) => row.spanLabel).join(', ')} có qG/qQ âm → nên kiểm tra lại dấu nhập trước khi tin kết quả.`,
    });
  }

  if (emptyRows.length) {
    notes.push({
      tone: 'warning',
      text: `${emptyRows.map((row) => row.spanLabel).join(', ')} đang rơi cả qG và qQ về 0. Nếu đây không phải chủ ý, nên nhập lại để tránh thiếu tải.`,
    });
  } else if (zeroDeadRows.length) {
    notes.push({
      tone: 'warning',
      text: `${zeroDeadRows.map((row) => row.spanLabel).join(', ')} có qG = 0. Chỉ giữ vậy nếu bạn thực sự muốn bỏ tĩnh tải ở các nhịp này.`,
    });
  }

  if (maxUlsRows.length) {
    const maxValue = Math.max(...maxUlsRows.map((row) => row.qULS));
    notes.push({
      tone: 'info',
      text: `${maxUlsRows.map((row) => row.spanLabel).join(', ')} đang chi phối tải ULS (${maxValue.toFixed(3)} kPa) — đây là nhịp nên nhìn đầu tiên khi rà workflow per-span.`,
    });
  }

  if (maxUlsRows.length && minUlsRows.length) {
    const maxValue = Math.max(...maxUlsRows.map((row) => row.qULS));
    const minValue = Math.min(...minUlsRows.map((row) => row.qULS));
    if (minValue > 0 && maxValue >= minValue * 1.5) {
      notes.push({
        tone: 'neutral',
        text: `Biên độ đang khá lệch: ${maxUlsRows.map((row) => row.spanLabel).join(', ')} cao hơn khoảng ${(maxValue / minValue).toFixed(1)}× so với ${minUlsRows.map((row) => row.spanLabel).join(', ')}. Nếu lệch này không có chủ ý, nên rà lại input từng nhịp.`,
      });
    }
  }

  if (!notes.length) {
    notes.push({
      tone: 'neutral',
      text: 'Các nhịp đang cùng mặt bằng tải tương đối gọn; chưa thấy nhịp nào nổi bật cần soi lại ngay.',
    });
  }

  return notes.slice(0, 3);
};

const LOAD_WARNING_TONE = {
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-rose-200 bg-rose-50 text-rose-800',
};

const buildLoadWorkflowGuardrails = (config = {}, results = {}) => {
  if (config.panelType !== 'ceiling') return [];

  const mode = results?.distributedLoadMode === 'per-span' ? 'per-span' : 'uniform';
  const deadBySpan = (results?.qDeadBySpan_kPa || []).map((v) => Number(v) || 0);
  const liveBySpan = (results?.qLiveBySpan_kPa || []).map((v) => Number(v) || 0);
  const warnings = [];

  warnings.push({
    id: `mode-${mode}`,
    tone: 'info',
    title: mode === 'per-span' ? 'Đang tính theo từng nhịp' : 'Đang dùng 1 bộ tải chung cho mọi nhịp',
    message: mode === 'per-span'
      ? 'Mỗi nhịp đang có bộ qG/qQ riêng. Hãy rà lại từng dòng trong bảng để chắc rằng không bỏ sót nhịp nào.'
      : 'App đang copy cùng một qG/qQ cho tất cả các nhịp. Nếu mỗi nhịp thực tế nhận tải khác nhau, hãy bật chế độ “Nhập tải phân bố riêng cho từng nhịp”.',
  });

  if (mode !== 'per-span') return warnings;

  const missingDead = [];
  const missingLive = [];
  const zeroDead = [];
  const negativeDead = [];
  const negativeLive = [];

  deadBySpan.forEach((value, idx) => {
    const raw = config?.deadLoadBySpan_kPa?.[idx];
    if (raw === '' || raw === null || typeof raw === 'undefined') missingDead.push(idx + 1);
    if (value === 0) zeroDead.push(idx + 1);
    if (value < 0) negativeDead.push(idx + 1);
  });

  liveBySpan.forEach((value, idx) => {
    const raw = config?.liveLoadBySpan_kPa?.[idx];
    if (raw === '' || raw === null || typeof raw === 'undefined') missingLive.push(idx + 1);
    if (value < 0) negativeLive.push(idx + 1);
  });

  if (missingDead.length || missingLive.length) {
    warnings.push({
      id: 'per-span-missing',
      tone: 'warning',
      title: 'Per-span đang bật nhưng còn ô chưa nhập rõ ràng',
      message: `Hãy nhập đủ qG${missingDead.length ? ` cho nhịp ${missingDead.join(', ')}` : ''}${missingDead.length && missingLive.length ? ' và ' : ''}${missingLive.length ? `qQ cho nhịp ${missingLive.join(', ')}` : ''}. Để trống hiện đang bị hiểu như 0, dễ làm kết quả thấp giả tạo.`,
    });
  }

  if (zeroDead.length) {
    warnings.push({
      id: 'dead-zero',
      tone: 'warning',
      title: 'Có nhịp đang có qG = 0',
      message: `Nhịp ${zeroDead.join(', ')} đang có tĩnh tải bằng 0. Chỉ giữ nguyên nếu bạn thực sự muốn bỏ toàn bộ tải thường xuyên trên các nhịp này; nếu không, hãy nhập lại qG hoặc tắt per-span để dùng giá trị chung.`,
    });
  }

  if (negativeDead.length || negativeLive.length) {
    warnings.push({
      id: 'negative-load',
      tone: 'danger',
      title: 'Có tải âm trong qG/qQ cần kiểm tra lại',
      message: `${negativeDead.length ? `qG âm tại nhịp ${negativeDead.join(', ')}` : ''}${negativeDead.length && negativeLive.length ? '; ' : ''}${negativeLive.length ? `qQ âm tại nhịp ${negativeLive.join(', ')}` : ''}. Với workflow này, tải âm thường là nhập sai dấu. Hãy trả qG/qQ về giá trị không âm và dùng trường gió/hút cho tác động đổi dấu.`,
    });
  }

  const compareSpread = (values = [], label) => {
    const positives = values.filter((v) => Number.isFinite(v) && v > 0);
    if (positives.length < 2) return null;
    const min = Math.min(...positives);
    const max = Math.max(...positives);
    if (!(min > 0)) return null;
    const ratio = max / min;
    if (ratio < 3) return null;
    const maxIdx = values.findIndex((v) => v === max) + 1;
    const minIdx = values.findIndex((v) => v === min) + 1;
    return { label, ratio, maxIdx, minIdx, min, max };
  };

  const deadSpread = compareSpread(deadBySpan, 'qG');
  const liveSpread = compareSpread(liveBySpan, 'qQ');
  [deadSpread, liveSpread].filter(Boolean).forEach((spread, idx) => {
    warnings.push({
      id: `spread-${spread.label}-${idx}`,
      tone: 'warning',
      title: `${spread.label} chênh lệch khá lớn giữa các nhịp`,
      message: `${spread.label} lớn nhất ở nhịp ${spread.maxIdx} (${spread.max.toFixed(2)} kPa) đang cao khoảng ${spread.ratio.toFixed(1)} lần so với nhịp ${spread.minIdx} (${spread.min.toFixed(2)} kPa). Đây là warning mềm: hãy kiểm tra lại xem chênh lệch này là chủ ý theo công năng từng nhịp hay do nhập lệch số.`,
    });
  });

  return warnings;
};

const TransparencyPanel = ({ results }) => {
  const wrinklingMeta = results?.technicalTransparency?.wrinkling || results?.wrinklingMeta || {};
  const sigmaLimitMeta = results?.technicalTransparency?.checks?.sigmaLimit || {};
  const declaredInput = wrinklingMeta?.declaredInput || {};
  const upliftMeta = results?.technicalTransparency?.uplift || {};
  const upliftDeclaredInput = upliftMeta?.declaredInput || {};
  const requestedTone = getTransparencyTone(wrinklingMeta.requestedModeReliability);
  const effectiveTone = getTransparencyTone(wrinklingMeta.effectiveModeReliability || sigmaLimitMeta.reliability);
  const classificationTone = getTransparencyTone(sigmaLimitMeta.classification || wrinklingMeta.sourceClassification);
  const upliftCheckMeta = results?.technicalTransparency?.checks?.uplift || {};
  const upliftTone = getTransparencyTone(upliftCheckMeta?.reliability);

  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Info size={14} /> Minh bạch kỹ thuật</h4>
          <p className="text-xs text-slate-600 mt-1">Hiển thị rõ giá trị nào là khai báo trực tiếp, giá trị nào là xấp xỉ kỹ thuật và khi nào hệ thống phải fallback.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <TransparencyBadge tone={requestedTone}>Yêu cầu: {getModeLabel(results?.wrinklingMode, WRINKLING_MODE_LABELS)}</TransparencyBadge>
          <TransparencyBadge tone={effectiveTone}>Đang dùng: {getModeLabel(results?.effectiveWrinklingMode, WRINKLING_MODE_LABELS)}</TransparencyBadge>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-xs">
        <div className="bg-white rounded border border-slate-200 p-3 space-y-2">
          <div className="font-semibold text-slate-700">Kiểm tra wrinkling / giới hạn nén</div>
          <div className="flex flex-wrap gap-2">
            <TransparencyBadge tone={requestedTone}>{getTransparencyLabel(wrinklingMeta.requestedModeReliability)}</TransparencyBadge>
            <TransparencyBadge tone={effectiveTone}>Độ tin cậy: {getTransparencyLabel(wrinklingMeta.effectiveModeReliability || sigmaLimitMeta.reliability)}</TransparencyBadge>
            <TransparencyBadge tone={classificationTone}>{getTransparencyLabel(wrinklingMeta.sourceClassification, TRANSPARENCY_CLASSIFICATION_LABELS)}</TransparencyBadge>
          </div>
          <div className="space-y-1 text-slate-600">
            <div>σw đang dùng: <b className="text-slate-800">{Number(results?.sigma_w || 0).toFixed(1)} MPa</b></div>
            <div>σw khai báo: <b className="text-slate-800">{Number(results?.sigma_w_declared || 0).toFixed(1)} MPa</b></div>
            <div>σw xấp xỉ: <b className="text-slate-800">{Number(results?.sigma_w_approx || 0).toFixed(1)} MPa</b></div>
          </div>
          {results?.wrinklingDeclaredMissing ? (
            <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              Đã chọn <b>Khai báo trực tiếp</b> nhưng thiếu giá trị hợp lệ, nên hệ thống <b>fallback sang {getModeLabel(results?.wrinklingFallbackMode, WRINKLING_MODE_LABELS)}</b> để tránh hiểu nhầm mức tin cậy.
            </div>
          ) : (
            <div className="text-slate-600 space-y-1">
              <div>
                {results?.sigma_w_source === 'declared'
                  ? 'Giới hạn wrinkling đang bám theo giá trị người dùng khai báo trực tiếp.'
                  : results?.sigma_w_source === 'approx'
                    ? 'Giới hạn wrinkling đang dùng xấp xỉ kỹ thuật từ mô đun vật liệu.'
                    : 'Giới hạn nén đang bám trực tiếp theo giới hạn chảy thiết kế.'}
              </div>
              {results?.sigma_w_source === 'declared' && (
                <div className="text-[11px] text-slate-500 space-y-1">
                  <div>Semantic khai báo: <b>{declaredInput?.basis || 'design-resistance'}</b> · Đơn vị hiển thị: <b>{declaredInput?.unit || 'MPa'}</b></div>
                  <div>Nguồn: <b>{declaredInput?.sourceType || 'unknown'}</b>{declaredInput?.sourceRef ? ` · ref: ${declaredInput.sourceRef}` : ''}</div>
                  {declaredInput?.productContext && <div>Context sản phẩm: <b>{declaredInput.productContext}</b></div>}
                  {declaredInput?.sourceNote && <div>Note: {declaredInput.sourceNote}</div>}
                  {!declaredInput?.isSourceDocumented && <div>Repo đã có schema semantic cho input này, nhưng nếu chưa kèm ref/note thì vẫn chỉ được coi là user-declared chứ chưa nâng độ authority.</div>}
                </div>
              )}
              {results?.sigma_w_source === 'approx' && (
                <div className="text-[11px] text-slate-500">Hệ số <b>0.5</b> trong công thức xấp xỉ hiện mới là công thức nội bộ được externalize minh bạch; repo chưa gắn citation cho hệ số này và bộ biến <b>Ef/Ec/Gc</b>.</div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded border border-slate-200 p-3 space-y-2">
          <div className="font-semibold text-slate-700">Liên kết chống nhổ / screwStrength</div>
          <div className="flex flex-wrap gap-2">
            <TransparencyBadge tone={upliftTone}>Độ tin cậy: {getTransparencyLabel(upliftCheckMeta?.reliability)}</TransparencyBadge>
            <TransparencyBadge tone={getTransparencyTone(upliftCheckMeta?.classification)}>{getTransparencyLabel(upliftCheckMeta?.classification, TRANSPARENCY_CLASSIFICATION_LABELS)}</TransparencyBadge>
          </div>
          <div className="space-y-1 text-slate-600">
            <div>screwStrength khai báo: <b className="text-slate-800">{Number(upliftDeclaredInput?.value || 0).toFixed(2)} {upliftDeclaredInput?.unit || 'kN'}</b></div>
            <div>Semantic: <b>{upliftDeclaredInput?.basis || 'design-resistance-per-fastener'}</b> · Nguồn: <b>{upliftDeclaredInput?.sourceType || 'unknown'}</b></div>
            <div>Diễn giải spacing: <b>{upliftDeclaredInput?.spacingMeaning || upliftMeta?.inputSchema?.spacingMeaning || 'spacing across panel width for simplified count estimate'}</b></div>
            {upliftDeclaredInput?.sourceRef && <div>Ref: <b>{upliftDeclaredInput.sourceRef}</b></div>}
            {upliftDeclaredInput?.fastenerContext && <div>Context vít/liên kết: <b>{upliftDeclaredInput.fastenerContext}</b></div>}
            {upliftDeclaredInput?.sourceNote && <div>Note: {upliftDeclaredInput.sourceNote}</div>}
            {!upliftDeclaredInput?.isSourceDocumented && (
              <div className="text-[11px] text-slate-500">Hiện chưa có documented source gắn vào numeric path này; repo chỉ biết đây là per-fastener resistance input do người dùng/project artifact khai báo, không tự nâng thành source-backed capacity. Artifact hunt T3 chỉ xác nhận được acquisition path ở mức vendor installation guidance: fastening phải chốt theo fastener-manufacturer data / approved project schedule, chứ chưa tìm thấy dòng kN/vít đủ mạnh để attach trực tiếp.</div>
            )}
          </div>
          <div className="text-[11px] text-slate-500 space-y-1">
            <div>Quy tắc đếm vít hiện hành: <b>round(panelWidth / screwSpacing)</b>, tối thiểu 1 — đang được giữ ở trạng thái <b>provisional</b>.</div>
            <div>γM,screw = <b>{upliftMeta?.factor?.value || 1.33}</b> hiện đã externalize minh bạch, nhưng repo vẫn <b>chưa có documented clause / vendor worksheet</b> để source-link giá trị này.</div>
          </div>
        </div>

        <div className="bg-white rounded border border-slate-200 p-3 space-y-2">
          <div className="font-semibold text-slate-700">Độ tin cậy các kiểm tra chính</div>
          <div className="space-y-2">
            {[
              CAPACITY_CHECK_KEYS.SIGMA_LIMIT,
              CAPACITY_CHECK_KEYS.BENDING_STRESS,
              CAPACITY_CHECK_KEYS.SHEAR_CAPACITY,
              CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING,
              CAPACITY_CHECK_KEYS.UPLIFT,
              CAPACITY_CHECK_KEYS.DEFLECTION,
            ].map((checkKey) => {
              const meta = results?.technicalTransparency?.checks?.[checkKey];
              if (!meta?.enabled) return null;
              const label = meta?.label || CAPACITY_CHECK_LABELS[checkKey] || checkKey;
              return (
                <div key={checkKey} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                  <div>
                    <div className="font-medium text-slate-700">{label}</div>
                    <div className="text-[11px] text-slate-500">Phân loại: {getTransparencyLabel(meta?.classification, TRANSPARENCY_CLASSIFICATION_LABELS)}</div>
                  </div>
                  <TransparencyBadge tone={getTransparencyTone(meta?.reliability)} className="shrink-0">Độ tin cậy: {getTransparencyLabel(meta?.reliability)}</TransparencyBadge>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===============================
// ✅ SƠ ĐỒ TÍNH (SVG) - TRẦN: X toàn dầm
// - KHÔNG dùng marker => in PDF/tab Báo cáo chắc chắn hiện mũi tên
// - Dimension đẩy xa gối + né ký hiệu gối
// - Mũi tên nhỏ + bỏ mũi tên đen
// ===============================
const CeilingSchematic = ({ config, results }) => {
  const spans = (config?.spans || []).map(s => Number(s) || 0);
  const supportLocs = (results?.supportLocs && results.supportLocs.length > 0)
    ? results.supportLocs
    : (() => {
      let acc = 0;
      const arr = [0];
      spans.forEach(L => { acc += L; arr.push(Number(acc.toFixed(3))); });
      return arr;
    })();

  const totalM = supportLocs[supportLocs.length - 1] || spans.reduce((a, b) => a + b, 0);
  const windDir = config?.windDirection || 'pressure';

  const qDead = Number(results?.qDead_kPa) || 0;
  const qLive = Number(results?.qLive_kPa) || 0;
  const qWindRaw = Number(results?.qWind_kPa);

  const windSign = windDir === 'suction' ? -1 : 1;
  const qWindFallback = (Number(config?.windPressure) || 0) * windSign;
  const qWind = Number.isFinite(qWindRaw) ? qWindRaw : qWindFallback;

  // Point loads (nếu có): {x_m, P_kN, note}
  const pls = (config?.pointLoads || [])
    .map(p => ({
      x_m: Number(p?.x_m) || 0,
      P_kN: Number(p?.P_kN) || 0, // (+) xuống
      note: p?.note || ''
    }))
    .filter(p => p.x_m >= 0 && p.x_m <= totalM);

  // SVG geometry
  const W = 900, H = 260;
  const marginL = 40, marginR = 40;
  const beamY = 70;

  const supTopY = beamY + 6;
  const supBottomY = 112;

  const dimY = 180;      // ✅ đẩy xuống xa gối
  const loadTopY = 46;

  const xMap = (xm) => {
    if (totalM <= 0) return marginL;
    return marginL + (xm / totalM) * (W - marginL - marginR);
  };

  const supports = supportLocs.map((xm, i) => ({ xm, i, x: xMap(xm) }));

  const nArrows = 14;

  // ✅ helper: arrow head polygon (không marker)
  const ArrowHead = ({ x, y, dir = 'down', w = 6, h = 6, fill = '#64748b' }) => {
    let pts = '';
    if (dir === 'down') pts = `${x},${y} ${x - w / 2},${y - h} ${x + w / 2},${y - h}`;
    if (dir === 'up') pts = `${x},${y} ${x - w / 2},${y + h} ${x + w / 2},${y + h}`;
    if (dir === 'left') pts = `${x},${y} ${x + h},${y - w / 2} ${x + h},${y + w / 2}`;
    if (dir === 'right') pts = `${x},${y} ${x - h},${y - w / 2} ${x - h},${y + w / 2}`;
    return <polygon points={pts} fill={fill} />;
  };

  const LoadArrow = ({ x, y1, y2, up, color }) => {
    const stroke = color;
    return (
      <g>
        <line x1={x} y1={y1} x2={x} y2={y2} stroke={stroke} strokeWidth="1.4" />
        <ArrowHead x={x} y={y2} dir={up ? 'up' : 'down'} w={6} h={6} fill={stroke} />
      </g>
    );
  };

  const DimLine = ({ x1, x2, y }) => {
    const stroke = '#64748b';
    return (
      <g>
        <line x1={x1} y1={y} x2={x2} y2={y} stroke={stroke} strokeWidth="1.4" />
        <ArrowHead x={x1} y={y} dir="right" w={6} h={6} fill={stroke} />
        <ArrowHead x={x2} y={y} dir="left" w={6} h={6} fill={stroke} />
      </g>
    );
  };

  const loadBands = [
    {
      key: 'dead',
      label: 'Tĩnh tải',
      value: qDead,
      color: '#64748b',
      up: false,
      y1: loadTopY,
      y2: beamY - 8,
      labelY: loadTopY - 6,
    },
    {
      key: 'live',
      label: 'Hoạt tải',
      value: qLive,
      color: '#3b82f6',
      up: false,
      y1: loadTopY + 14,
      y2: beamY - 18,
      labelY: loadTopY + 8,
    },
    {
      key: 'wind',
      label: 'Tải gió',
      value: qWind,
      color: '#16a34a',
      up: qWind < 0,
      y1: qWind < 0 ? (beamY + 48) : (loadTopY + 28),
      y2: qWind < 0 ? (beamY + 18) : (beamY - 28),
      labelY: qWind < 0 ? (beamY + 58) : (loadTopY + 22),
    },
  ].filter(item => Number(item.value) !== 0);

  const legendItems = loadBands.length > 0
    ? loadBands
    : [{ key: 'none', label: 'Không có tải phân bố', value: 0, color: '#94a3b8', up: false, y1: 0, y2: 0 }];

  const legendHeight = Math.max(1, legendItems.length) * 14 + 12;

  return (
    <div className="w-full" style={{ overflow: 'visible' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="220" style={{ overflow: 'visible' }}>
        <text x={marginL} y={14} fontSize="12" fill="#0f172a" fontWeight="700">
          Sơ đồ tính (X toàn dầm) — Tấm trần
        </text>

        {/* Beam */}
        <line x1={marginL} y1={beamY} x2={W - marginR} y2={beamY} stroke="#0f172a" strokeWidth="4" />

        {/* Supports */}
        {supports.map(s => (
          <g key={s.i}>
            <polygon
              points={`${s.x},${supTopY} ${s.x - 14},${supBottomY} ${s.x + 14},${supBottomY}`}
              fill="#e2e8f0"
              stroke="#64748b"
              strokeWidth="1"
            />
            <line x1={s.x - 22} y1={supBottomY} x2={s.x + 22} y2={supBottomY} stroke="#64748b" strokeWidth="2" />
            <text x={s.x} y={supBottomY + 16} fontSize="10" fill="#334155" textAnchor="middle" fontWeight="700">
              Gối {s.i}
            </text>
          </g>
        ))}

        {/* Dimension lines per span */}
        {supports.slice(0, -1).map((s, idx) => {
          const s2 = supports[idx + 1];
          const x1 = s.x;
          const x2 = s2.x;
          const Lm = spans[idx] || (supportLocs[idx + 1] - supportLocs[idx]) || 0;
          const mid = (x1 + x2) / 2;

          return (
            <g key={`dim-${idx}`}>
              <DimLine x1={x1} x2={x2} y={dimY} />
              <text x={mid} y={dimY - 7} fontSize="10" fill="#334155" textAnchor="middle" fontWeight="700">
                L{idx + 1} = {Lm.toFixed(2)} m
              </text>
            </g>
          );
        })}

        {/* UDL arrows */}
        {(() => {
          const xs = [];
          for (let i = 0; i < nArrows; i++) {
            const t = (i + 0.5) / nArrows;
            xs.push(marginL + t * (W - marginL - marginR));
          }

          const legendX = W - marginR - 280;
          const legendY = dimY + 12;

          return (
            <g>
              {loadBands.map(item => (
                <g key={`band-${item.key}`}>
                  <text
                    x={marginL - 6}
                    y={item.labelY}
                    fontSize="10"
                    fill={item.color}
                    textAnchor="end"
                    fontWeight="600"
                  >
                    {item.label}
                  </text>
                  {xs.map((x, i) => (
                    <LoadArrow
                      key={`${item.key}-${i}`}
                      x={x}
                      y1={item.y1}
                      y2={item.y2}
                      up={item.up}
                      color={item.color}
                    />
                  ))}
                </g>
              ))}

              {/* legend box */}
              <rect
                x={legendX}
                y={legendY}
                width={260}
                height={legendHeight}
                rx={8}
                fill="#f8fafc"
                stroke="#e2e8f0"
              />
              {legendItems.map((item, idx) => (
                <g key={`legend-${item.key}`} transform={`translate(${legendX + 12}, ${legendY + 18 + idx * 14})`}>
                  <rect x={0} y={-8} width={16} height={6} rx={2} fill={item.color} />
                  <text x={22} y={-2} fontSize="10" fill="#0f172a" fontWeight="600">
                    {item.label}{item.key === 'none' ? '' : `: ${Math.abs(Number(item.value)).toFixed(3)} kPa`}
                  </text>
                </g>
              ))}
            </g>
          );
        })()}

        {/* Point loads */}
        {pls.map((pl, idx) => {
          const x = xMap(pl.x_m);
          const down = pl.P_kN >= 0;
          const stroke = '#ef4444';

          const yFrom = down ? (loadTopY + 8) : (beamY + 38);
          const yTo = down ? (beamY - 8) : (beamY + 8);

          const nearestSupport = supports.reduce((best, s) => {
            const dist = Math.abs(s.x - x);
            if (!best || dist < best.dist) return { x: s.x, xm: s.xm, dist };
            return best;
          }, null);

          const dimX1 = nearestSupport ? nearestSupport.x : marginL;
          const dimX2 = x;
          const pointDimY = dimY - 20;
          const dimStart = Math.min(dimX1, dimX2);
          const dimEnd = Math.max(dimX1, dimX2);
          const dimLabelX = (dimStart + dimEnd) / 2;
          const dimLabelValue = Math.abs((pl.x_m || 0) - (nearestSupport?.xm || 0));

          return (
            <g key={`pl-${idx}`}>
              <line x1={x} y1={yFrom} x2={x} y2={yTo} stroke={stroke} strokeWidth="2.2" />
              <ArrowHead x={x} y={yTo} dir={down ? 'down' : 'up'} w={11} h={11} fill={stroke} />
              <circle cx={x} cy={yTo} r="4.5" fill={stroke} />
              <text x={x + 10} y={Math.min(yFrom, yTo) - 2} fontSize="11" fill="#7f1d1d" fontWeight="700">
                P = {Math.abs(pl.P_kN).toFixed(2)} kN
              </text>
              {pl.note ? (
                <text x={x + 10} y={Math.min(yFrom, yTo) + 12} fontSize="10" fill="#7f1d1d">
                  {pl.note}
                </text>
              ) : null}

              <line
                x1={x}
                y1={beamY}
                x2={x}
                y2={pointDimY}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <line
                x1={dimX1}
                y1={beamY}
                x2={dimX1}
                y2={pointDimY}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <DimLine x1={dimStart} x2={dimEnd} y={pointDimY} />
              <text x={dimLabelX} y={pointDimY - 6} fontSize="9" fill="#334155" textAnchor="middle" fontWeight="600">
                X = {dimLabelValue.toFixed(2)} m
              </text>
            </g>
          );
        })}

        <text x={marginL} y={H - 10} fontSize="10" fill="#64748b">
          Trục X: 0 → {totalM.toFixed(2)} m (toàn dầm)
        </text>
      </svg>
    </div>
  );
};

const BeamDiagram = ({ spansM = [], windDirection = 'pressure', windPressure = 0 }) => {
  const spans = (spansM || []).map((s) => Number(s) || 0).filter((s) => s > 0);
  const supportLocs = (() => {
    let acc = 0;
    const arr = [0];
    spans.forEach((L) => {
      acc += L;
      arr.push(Number(acc.toFixed(3)));
    });
    return arr;
  })();

  const totalM = supportLocs[supportLocs.length - 1] || 0;
  const W = 900;
  const H = 220;
  const marginL = 40;
  const marginR = 40;
  const beamY = 80;
  const supTopY = beamY + 6;
  const supBottomY = 120;
  const dimY = 176;
  const loadTopY = 34;
  const loadBottomY = beamY - 10;
  const nArrows = 14;
  const isSuction = windDirection === 'suction';
  const qWind = Number(windPressure) || 0;

  const xMap = (xm) => {
    if (totalM <= 0) return marginL;
    return marginL + (xm / totalM) * (W - marginL - marginR);
  };

  const supports = supportLocs.map((xm, i) => ({ xm, i, x: xMap(xm) }));

  const ArrowHead = ({ x, y, dir = 'down', w = 6, h = 6, fill = '#64748b' }) => {
    let pts = '';
    if (dir === 'down') pts = `${x},${y} ${x - w / 2},${y - h} ${x + w / 2},${y - h}`;
    if (dir === 'up') pts = `${x},${y} ${x - w / 2},${y + h} ${x + w / 2},${y + h}`;
    if (dir === 'left') pts = `${x},${y} ${x + h},${y - w / 2} ${x + h},${y + w / 2}`;
    if (dir === 'right') pts = `${x},${y} ${x - h},${y - w / 2} ${x - h},${y + w / 2}`;
    return <polygon points={pts} fill={fill} />;
  };

  const DimLine = ({ x1, x2, y }) => {
    const stroke = '#64748b';
    return (
      <g>
        <line x1={x1} y1={y} x2={x2} y2={y} stroke={stroke} strokeWidth="1.4" />
        <ArrowHead x={x1} y={y} dir="right" w={6} h={6} fill={stroke} />
        <ArrowHead x={x2} y={y} dir="left" w={6} h={6} fill={stroke} />
      </g>
    );
  };

  const LoadArrow = ({ x }) => (
    <g>
      <line x1={x} y1={isSuction ? beamY + 34 : loadTopY} x2={x} y2={isSuction ? beamY + 10 : loadBottomY} stroke="#16a34a" strokeWidth="1.4" />
      <ArrowHead x={x} y={isSuction ? beamY + 10 : loadBottomY} dir={isSuction ? 'up' : 'down'} w={6} h={6} fill="#16a34a" />
    </g>
  );

  const arrowXs = Array.from({ length: nArrows }, (_, i) => {
    const t = (i + 0.5) / nArrows;
    return marginL + t * (W - marginL - marginR);
  });

  return (
    <div className="w-full" style={{ overflow: 'visible' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="210" style={{ overflow: 'visible' }}>
        <text x={marginL} y={14} fontSize="12" fill="#0f172a" fontWeight="700">
          Sơ đồ tính — Tấm vách
        </text>

        <line x1={marginL} y1={beamY} x2={W - marginR} y2={beamY} stroke="#0f172a" strokeWidth="4" />

        {supports.map((s) => (
          <g key={s.i}>
            <polygon
              points={`${s.x},${supTopY} ${s.x - 14},${supBottomY} ${s.x + 14},${supBottomY}`}
              fill="#e2e8f0"
              stroke="#64748b"
              strokeWidth="1"
            />
            <line x1={s.x - 22} y1={supBottomY} x2={s.x + 22} y2={supBottomY} stroke="#64748b" strokeWidth="2" />
            <text x={s.x} y={supBottomY + 16} fontSize="10" fill="#334155" textAnchor="middle" fontWeight="700">
              Gối {s.i}
            </text>
          </g>
        ))}

        {supports.slice(0, -1).map((s, idx) => {
          const s2 = supports[idx + 1];
          const mid = (s.x + s2.x) / 2;
          return (
            <g key={`dim-${idx}`}>
              <DimLine x1={s.x} x2={s2.x} y={dimY} />
              <text x={mid} y={dimY - 7} fontSize="10" fill="#334155" textAnchor="middle" fontWeight="700">
                L{idx + 1} = {spans[idx].toFixed(2)} m
              </text>
            </g>
          );
        })}

        {qWind !== 0 && (
          <g>
            <text x={marginL - 6} y={isSuction ? beamY + 52 : loadTopY - 6} fontSize="10" fill="#16a34a" textAnchor="end" fontWeight="600">
              {isSuction ? 'Gió hút' : 'Gió đẩy'}
            </text>
            {arrowXs.map((x, i) => <LoadArrow key={`load-${i}`} x={x} />)}
          </g>
        )}

        <rect x={W - marginR - 190} y={dimY + 10} width={170} height={34} rx={8} fill="#f8fafc" stroke="#e2e8f0" />
        <rect x={W - marginR - 178} y={dimY + 22} width={16} height={6} rx={2} fill="#16a34a" />
        <text x={W - marginR - 154} y={dimY + 28} fontSize="10" fill="#0f172a" fontWeight="600">
          Gió: {qWind.toFixed(3)} kPa
        </text>

        <text x={marginL} y={H - 10} fontSize="10" fill="#64748b">
          Trục X: 0 → {totalM.toFixed(2)} m
        </text>
      </svg>
    </div>
  );
};

export default function GreenpanDesign_Final() {
  const [config, setConfig] = useState(() => createDefaultConfig());
  const [compareVariants, setCompareVariants] = useState(() => [
    createVariant('variant-a', COMPARE_VARIANT_LABELS[0], createDefaultConfig()),
  ]);
  const [compareModeEnabled, setCompareModeEnabled] = useState(false);
  const [compareActiveVariantId, setCompareActiveVariantId] = useState('variant-a');
  const [snapshotWorkflowMessage, setSnapshotWorkflowMessage] = useState('');
  const [presetLibraryWarning, setPresetLibraryWarning] = useState('');
  const [presetLibrary, setPresetLibrary] = useState(() => {
    const storage = getSafeLocalStorage();
    if (!storage) return [];
    try {
      const raw = storage.getItem(STORAGE_KEYS.presetLibrary);
      if (!raw) return [];
      return normalizePresetLibrary(JSON.parse(raw));
    } catch (error) {
      console.warn('Failed to hydrate preset library state', error);
      try {
        storage.removeItem(STORAGE_KEYS.presetLibrary);
      } catch (cleanupError) {
        console.warn('Failed to clear corrupted preset library during state init', cleanupError);
      }
      return [];
    }
  });
  const [presetDraftName, setPresetDraftName] = useState('');
  const [presetDraftNote, setPresetDraftNote] = useState('');
  const [activeTab, setActiveTab] = useState('input');
  const [printMode, setPrintMode] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [appVersion, setAppVersion] = useState('');
  const fallbackAppVersion = typeof window !== 'undefined'
    ? resolveRuntimeAppVersion(window?.electronAPI?.appVersion, window?.appVersion, APP_VERSION)
    : APP_VERSION;
  const resolvedAppVersion = resolveRuntimeAppVersion(updateStatus?.appVersion, appVersion, fallbackAppVersion);
  const resolvedReleaseChannel = resolveReleaseChannel(resolvedAppVersion);
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    setCompareVariants((prev) => prev.map((variant) => (
      variant.id === compareActiveVariantId
        ? { ...variant, config: cloneConfig(config) }
        : variant
    )));
  }, [compareActiveVariantId, config]);

  React.useEffect(() => {
    persistPresetLibrary(presetLibrary);
  }, [presetLibrary]);

  React.useEffect(() => {
    const storage = getSafeLocalStorage();
    if (!storage) return;
    const raw = storage.getItem(STORAGE_KEYS.presetLibrary);
    if (!raw) return;
    try {
      normalizePresetLibrary(JSON.parse(raw));
    } catch (error) {
      console.warn('Preset library recovery warning', error);
      try {
        storage.removeItem(STORAGE_KEYS.presetLibrary);
      } catch (cleanupError) {
        console.warn('Failed to clear corrupted preset library after warning', cleanupError);
      }
      setPresetLibrary([]);
      setPresetLibraryWarning('Đã bỏ qua preset cục bộ bị lỗi/legacy để app khởi động an toàn. Có thể lưu lại preset mới từ trạng thái hiện tại.');
    }
  }, []);

  const compareResults = useMemo(() => (
    compareVariants.map((variant) => ({
      ...variant,
      summary: runPanelAnalysis(variant.config, { defaultRedistributionMode: DEFAULT_REDISTRIBUTION_MODE }).summary,
    }))
  ), [compareVariants]);

  const compareMetricRows = useMemo(() => {
    if (!compareModeEnabled || compareResults.length < 2) return [];
    const firstConfig = compareResults[0]?.config || config;
    const baseline = compareResults[0]?.summary;
    const rowMap = new Map();

    compareResults.forEach((variant) => {
      buildCompareMetricRows(variant.summary, variant.config || firstConfig).forEach((row) => {
        if (!rowMap.has(row.key)) {
          rowMap.set(row.key, { key: row.key, label: row.label, values: [] });
        }

        let diffHint = null;
        if (baseline && variant.id !== compareResults[0]?.id) {
          if (row.key === 'ratio') {
            diffHint = buildCompareDeltaText(
              Number(baseline?.governingCases?.overall?.ratio || 0),
              Number(variant.summary?.governingCases?.overall?.ratio || 0),
              { inverse: true },
            );
          }
          if (row.key === 'deflection') {
            diffHint = buildCompareDeltaText(
              Number(baseline?.ratios?.deflection || 0),
              Number(variant.summary?.ratios?.deflection || 0),
              { inverse: true },
            );
          }
          if (row.key === 'crushing') {
            diffHint = buildCompareDeltaText(
              Number(baseline?.ratios?.crushing || 0),
              Number(variant.summary?.ratios?.crushing || 0),
              { inverse: true },
            );
          }
          if (row.key === 'uplift') {
            diffHint = buildCompareDeltaText(
              Number(baseline?.ratios?.uplift || 0),
              Number(variant.summary?.ratios?.uplift || 0),
              { inverse: true },
            );
          }
        }

        rowMap.get(row.key).values.push({
          variantId: variant.id,
          value: row.value,
          tone: row.tone,
          subValue: row.subValue,
          diffHint,
          isBest: compareExecutiveSummary.bestVariantId === variant.id && ['status', 'ratio', 'deflection', 'crushing', 'uplift'].includes(row.key),
        });
      });
    });

    return Array.from(rowMap.values());
  }, [compareModeEnabled, compareResults, config, compareExecutiveSummary.bestVariantId]);

  const compareExecutiveSummary = useMemo(() => (
    compareModeEnabled && compareResults.length >= 2
      ? buildCompareExecutiveSummary(compareResults)
      : buildCompareExecutiveSummary([])
  ), [compareModeEnabled, compareResults]);

  const handleRenameCompareVariant = (variantId, rawLabel) => {
    const fallback = compareVariants.find((variant) => variant.id === variantId)?.name
      || compareVariants.find((variant) => variant.id === variantId)?.label
      || 'Phương án';
    const nextLabel = normalizeVariantLabel(rawLabel, fallback);
    setCompareVariants((prev) => prev.map((variant) => (
      variant.id === variantId
        ? { ...variant, label: nextLabel, name: nextLabel }
        : variant
    )));
  };

  const handleSelectCompareVariant = (variantId) => {
    const target = compareVariants.find((variant) => variant.id === variantId);
    if (!target) return;
    setCompareActiveVariantId(variantId);
    setConfig(cloneConfig(target.config));
  };

  const handleAddCompareVariant = () => {
    setCompareVariants((prev) => {
      if (prev.length >= COMPARE_VARIANT_LIMIT) return prev;
      const nextIndex = prev.length;
      const nextVariant = createVariant(`variant-${nextIndex + 1}`, COMPARE_VARIANT_LABELS[nextIndex], config);
      return [...prev, nextVariant];
    });
    setCompareModeEnabled(true);
  };

  const handleCloneCompareVariant = (variantId) => {
    setCompareVariants((prev) => {
      if (prev.length >= COMPARE_VARIANT_LIMIT) return prev;
      const source = prev.find((variant) => variant.id === variantId) || prev[0];
      const nextIndex = prev.length;
      const nextVariant = createVariant(`variant-${nextIndex + 1}`, COMPARE_VARIANT_LABELS[nextIndex], source?.config || config);
      return [...prev, nextVariant];
    });
    setCompareModeEnabled(true);
  };

  const handleResetCompareVariant = (variantId) => {
    const nextConfig = cloneConfig(config);
    setCompareVariants((prev) => prev.map((variant) => (
      variant.id === variantId
        ? { ...variant, config: nextConfig }
        : variant
    )));
  };

  const handleRemoveCompareVariant = (variantId) => {
    setCompareVariants((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((variant) => variant.id !== variantId);
      const fallback = next[0];
      if (compareActiveVariantId === variantId && fallback) {
        setCompareActiveVariantId(fallback.id);
        setConfig(cloneConfig(fallback.config));
      }
      if (next.length < 2) setCompareModeEnabled(false);
      return next;
    });
  };

  const applyPresetToWorkflow = (preset) => {
    if (!preset) return;
    const nextVariants = normalizeCompareVariantsForSnapshot(preset.compareVariants, preset.configSnapshot);
    const nextActiveId = nextVariants.find((variant) => variant.id === preset.compareActiveVariantId)?.id || nextVariants[0]?.id || 'variant-a';
    const activeVariant = nextVariants.find((variant) => variant.id === nextActiveId) || nextVariants[0];
    setCompareVariants(nextVariants);
    setCompareModeEnabled(preset.compareModeEnabled === true || nextVariants.length >= 2);
    setCompareActiveVariantId(nextActiveId);
    setConfig(cloneConfig(activeVariant?.config || preset.configSnapshot || createDefaultConfig()));
    setActiveTab('input');
    setSnapshotWorkflowMessage(`Đã nạp preset “${preset.name}”. ${buildPresetSummary(activeVariant?.config || preset.configSnapshot, preset.compareModeEnabled, nextVariants)}.`);
  };

  const handleSaveCurrentAsPreset = () => {
    const savedAt = new Date().toISOString();
    const nextName = String(presetDraftName || '').trim() || buildDefaultPresetName(config, compareModeEnabled, presetLibrary.length + 1);
    const nextNote = String(presetDraftNote || '').trim();
    const nextPreset = {
      id: `preset-${Date.now()}`,
      name: nextName,
      note: nextNote,
      configSnapshot: cloneConfig(config),
      compareModeEnabled,
      compareActiveVariantId,
      compareVariants: compareVariants.map((variant) => ({
        id: variant.id,
        label: variant.label,
        name: variant.name || variant.label,
        config: cloneConfig(variant.config),
      })),
      savedAt,
    };

    setPresetLibrary((prev) => [nextPreset, ...prev].slice(0, PRESET_LIMIT));
    setPresetDraftName(nextName);
    setSnapshotWorkflowMessage(`Đã lưu preset “${nextName}”. Có thể quick-load lại ngay trong app.`);
  };

  const handleDeletePreset = (presetId) => {
    setPresetLibrary((prev) => prev.filter((preset) => preset.id !== presetId));
    setSnapshotWorkflowMessage('Đã xoá preset khỏi thư viện cục bộ của app.');
  };

  React.useEffect(() => {
    const ipcRenderer = window?.require?.('electron')?.ipcRenderer;
    if (!ipcRenderer) return;

    const handler = (_event, payload) => {
      setUpdateStatus({
        event: payload?.event,
        version: payload?.version,
        percent: payload?.percent,
        message: payload?.message,
        appVersion: payload?.appVersion,
        ts: Date.now(),
      });
    };

    const loadVersion = async () => {
      try {
        const [version, releaseMeta] = await Promise.all([
          ipcRenderer.invoke('app-version'),
          ipcRenderer.invoke('release-meta').catch(() => null),
        ]);
        const resolvedVersion = resolveRuntimeAppVersion(releaseMeta?.appVersion, version);
        if (resolvedVersion) setAppVersion(resolvedVersion);
      } catch (err) {
        console.warn('Failed to load app version', err);
      }
    };

    ipcRenderer.on('auto-update', handler);
    loadVersion();
    return () => ipcRenderer.removeListener('auto-update', handler);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (['panelType', 'windDirection', 'internalWallType', 'projectName', 'deadLoadMode', 'wrinklingMode', 'redistributionMode'].includes(name)) {
      if (name === 'panelType') {
        const recommendedLimit =
          value === 'external' ? 150 :
            value === 'internal' ? 200 :
              200;
        setConfig(prev => ({
          ...prev,
          [name]: value,
          deflectionLimit: recommendedLimit,
          internalWallType: value === 'external' ? 'normal' : prev.internalWallType,
          pointLoads: value === 'ceiling' ? prev.pointLoads : []
        }));
      } else {
        setConfig(prev => ({ ...prev, [name]: value }));
      }
    } else {
      const parsed = parseFloat(value);
      const newValue = Number.isNaN(parsed) ? '' : parsed;
      setConfig(prev => ({ ...prev, [name]: newValue }));
    }
  };

  const handlePanelWidthChange = (e) => {
    const parsed = parseFloat(e.target.value);
    const newValue = Number.isNaN(parsed) ? '' : parsed;
    setConfig(prev => ({
      ...prev,
      panelWidth: newValue,
      ...(Number.isFinite(newValue) ? { screwSpacing: newValue } : {})
    }));
  };

  const handleSpanChange = (index, value) => {
    const newSpans = [...config.spans];
    const parsed = parseFloat(value);
    newSpans[index] = Number.isNaN(parsed) ? '' : parsed;
    setConfig(prev => ({ ...prev, spans: newSpans }));
  };

  const handleDistributedLoadSpanChange = (kind, index, value) => {
    const key = kind === 'dead' ? 'deadLoadBySpan_kPa' : 'liveLoadBySpan_kPa';
    const nextValues = [...(config[key] || [])];
    const parsed = parseFloat(value);
    nextValues[index] = Number.isNaN(parsed) ? '' : parsed;
    setConfig(prev => ({ ...prev, [key]: nextValues }));
  };

  const handleSupportWidthChange = (index, value) => {
    const newSupportWidths = [...config.supportWidths];
    const parsed = parseFloat(value);
    newSupportWidths[index] = Number.isNaN(parsed) ? '' : parsed;
    setConfig(prev => ({ ...prev, supportWidths: newSupportWidths }));
  };

  const addSpan = () => {
    if (config.spans.length < 5) {
      setConfig(prev => ({
        ...prev,
        spans: [...prev.spans, 3.0],
        supportWidths: [...prev.supportWidths, 60],
        deadLoadBySpan_kPa: [...(prev.deadLoadBySpan_kPa || []), prev.deadLoadMode === 'manual' ? (Number(prev.deadLoadManual_kPa) || 0) : 0],
        liveLoadBySpan_kPa: [...(prev.liveLoadBySpan_kPa || []), Number(prev.liveLoad_kPa) || 0],
      }));
    }
  };

  const removeSpan = () => {
    if (config.spans.length > 1) {
      const newSpans = [...config.spans]; newSpans.pop();
      const newSupportWidths = [...config.supportWidths]; newSupportWidths.pop();
      const newDeadLoadBySpan = [...(config.deadLoadBySpan_kPa || [])]; newDeadLoadBySpan.pop();
      const newLiveLoadBySpan = [...(config.liveLoadBySpan_kPa || [])]; newLiveLoadBySpan.pop();
      setConfig(prev => ({
        ...prev,
        spans: newSpans,
        supportWidths: newSupportWidths,
        deadLoadBySpan_kPa: newDeadLoadBySpan,
        liveLoadBySpan_kPa: newLiveLoadBySpan,
      }));
    }
  };

  const setCoreThickness = (val) => setConfig(prev => ({ ...prev, coreThickness: val }));

  const handlePrint = () => {
    setActiveTab('report');
    setPrintMode(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        setPrintMode(false);
      });
    });
  };

  const handleExportPackage = () => {
    const exportedAt = new Date().toISOString();
    const packagePayload = buildResultPackage({
      config,
      summary: results,
      compareModeEnabled,
      compareVariants,
      compareResults,
      compareSummary: compareExecutiveSummary,
      appVersion,
      fallbackAppVersion,
      exportedAt,
    });
    const filename = packagePayload.exportMeta?.fileName || buildSafeExportFileName({
      projectName: config.projectName,
      packageKind: packagePayload.packageKind,
      compareModeEnabled,
      exportedAt,
    });
    downloadJsonFile(filename, packagePayload);
    setSnapshotWorkflowMessage(`Đã xuất ${formatArtifactScopeLabel(packagePayload.exportMeta?.artifactScope)} để audit/kết quả. File này không dùng để nạp lại form.`);
  };

  const handleExportSnapshot = () => {
    const exportedAt = new Date().toISOString();
    const snapshotPayload = buildAppSnapshotPackage({
      config,
      compareModeEnabled,
      compareVariants,
      compareActiveVariantId,
      appVersion,
      fallbackAppVersion,
      exportedAt,
    });
    const filename = snapshotPayload.exportMeta?.fileName || buildSafeExportFileName({
      projectName: config.projectName,
      packageKind: snapshotPayload.packageKind,
      compareModeEnabled,
      exportedAt,
    });
    downloadJsonFile(filename, snapshotPayload);
    setSnapshotWorkflowMessage(`Đã xuất ${snapshotPayload.importSummary?.packageLabel || formatArtifactScopeLabel(snapshotPayload.exportMeta?.artifactScope)}. Có thể nạp lại form sau này${snapshotPayload.importSummary?.variantCount ? ` · ${snapshotPayload.importSummary.variantCount} phương án` : ''}.`);
  };

  const handleTriggerSnapshotImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportSnapshot = async (event) => {
    const [file] = Array.from(event.target?.files || []);
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const imported = normalizeImportedSnapshot(parsed);
      const inferredVersion = imported.importSummary?.appVersion || String(parsed?.appVersion || parsed?.exportMeta?.appVersion || '').trim();
      if (inferredVersion) setAppVersion(inferredVersion);
      setCompareVariants(imported.compareVariants);
      setCompareModeEnabled(imported.appState.compareModeEnabled);
      setCompareActiveVariantId(imported.appState.compareActiveVariantId);
      setConfig(imported.configSnapshot);
      setActiveTab('input');
      setSnapshotWorkflowMessage(buildImportSuccessMessage(imported.importSummary));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không đọc được file snapshot.';
      setSnapshotWorkflowMessage(message);
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(message);
      } else {
        console.error(message);
      }
    } finally {
      if (event.target) event.target.value = '';
    }
  };

  const results = useMemo(() => {
    const { summary } = runPanelAnalysis(config, {
      defaultRedistributionMode: DEFAULT_REDISTRIBUTION_MODE,
      compareSummary: compareExecutiveSummary,
    });
    return summary;
  }, [config, compareExecutiveSummary]);

  const distributedLoadRows = useMemo(() => buildPerSpanLoadRows(results), [results]);
  const perSpanSummaryItems = useMemo(() => buildPerSpanLoadSummary(distributedLoadRows), [distributedLoadRows]);

  const loadWorkflowGuardrails = useMemo(() => buildLoadWorkflowGuardrails(config, results), [config, results]);

  const governingCaseRows = [
    CAPACITY_GOVERNING_CASE_KEYS.MOMENT,
    CAPACITY_GOVERNING_CASE_KEYS.SHEAR,
    CAPACITY_GOVERNING_CASE_KEYS.CRUSHING,
    CAPACITY_GOVERNING_CASE_KEYS.DEFLECTION,
    CAPACITY_GOVERNING_CASE_KEYS.UPLIFT,
    CAPACITY_GOVERNING_CASE_KEYS.OVERALL,
  ]
    .map((caseKey) => ({ caseKey, item: results.governingCases?.[caseKey] }))
    .filter(({ caseKey, item }) => item && (caseKey !== CAPACITY_GOVERNING_CASE_KEYS.UPLIFT || item.key !== 'na'));

  const capacityReportRows = CAPACITY_REPORT_ROW_KEYS
    .filter((rowKey) => rowKey !== CAPACITY_CHECK_KEYS.UPLIFT || config.panelType !== 'ceiling')
    .map((rowKey) => {
      switch (rowKey) {
        case CAPACITY_CHECK_KEYS.BENDING_STRESS:
          return {
            key: rowKey,
            label: CAPACITY_REPORT_ROW_LABELS[rowKey],
            demand: `${results.stress_span.toFixed(1)} MPa`,
            resistance: `${results.sigma_limit.toFixed(1)} MPa`,
            ratio: results.ratios.bending,
          };
        case 'supportStress':
          return {
            key: rowKey,
            label: CAPACITY_REPORT_ROW_LABELS[rowKey],
            demand: `${results.stress_support.toFixed(1)} MPa`,
            resistance: `${results.sigma_limit.toFixed(1)} MPa`,
            ratio: results.ratios.support,
          };
        case CAPACITY_CHECK_KEYS.SHEAR_CAPACITY:
          return {
            key: rowKey,
            label: CAPACITY_REPORT_ROW_LABELS[rowKey],
            demand: `${(results.maxShear / 1000).toFixed(2)} kN`,
            resistance: `${(results.V_Rd / 1000).toFixed(2)} kN`,
            ratio: results.ratios.shear,
          };
        case CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING:
          return {
            key: rowKey,
            label: CAPACITY_REPORT_ROW_LABELS[rowKey],
            demand: `${(results.maxReaction / 1000).toFixed(2)} kN`,
            resistance: `${(results.F_Rd_Worst / 1000).toFixed(2)} kN`,
            ratio: results.ratios.crushing,
          };
        case CAPACITY_CHECK_KEYS.UPLIFT:
          return {
            key: rowKey,
            label: CAPACITY_REPORT_ROW_LABELS[rowKey],
            demand: `${(results.maxUplift / 1000).toFixed(2)} kN`,
            resistance: `${(results.T_Rd_Worst / 1000).toFixed(2)} kN`,
            ratio: results.ratios.uplift,
          };
        case CAPACITY_CHECK_KEYS.DEFLECTION:
          return {
            key: rowKey,
            label: CAPACITY_REPORT_ROW_LABELS[rowKey],
            demand: `${results.maxDeflection.toFixed(1)} mm`,
            resistance: `${results.w_limit.toFixed(1)} mm (L/${results.limitDenom})`,
            ratio: results.ratios.deflection,
          };
        default:
          return null;
      }
    })
    .filter(Boolean);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded text-xs">
          <p className="font-bold mb-1">{typeof label === 'number' ? `Vị trí: ${label} m` : label}</p>
          {payload.map((entry, index) => {
            let unit = '';
            if (entry.dataKey === 'moment') unit = 'kNm';
            else if (entry.dataKey.includes('deflection')) unit = 'mm';
            else if (entry.dataKey.includes('limit')) unit = 'mm';
            else if (entry.dataKey === 'shear') unit = 'kN';
            else if (entry.dataKey === 'R_Ed' || entry.dataKey === 'F_Rd') unit = 'kN';

            return (
              <div key={index} className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span>{entry.name}: <b>{entry.value}</b> {unit}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const REACTION_PASS_COLOR = '#22c55e';
  const REACTION_FAIL_COLOR = '#ef4444';
  const REACTION_LIMIT_COLOR = '#e5e7eb';
  const REACTION_LIMIT_BORDER = '#9ca3af';

  const ReactionLegend = () => (
    <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: REACTION_PASS_COLOR }} />
        Phản lực đạt
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: REACTION_FAIL_COLOR }} />
        Phản lực không đạt
      </span>
      <span className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-sm border"
          style={{ backgroundColor: REACTION_LIMIT_COLOR, borderColor: REACTION_LIMIT_BORDER }}
        />
        Giới hạn
      </span>
    </div>
  );

  const ReportHeader = () => (
    <div className="border-b-2 border-slate-800 pb-4 mb-6">
      <div className="flex justify-between items-end">
        <div className="flex items-end gap-3">
          <img src="./logo_app.jpg" alt="Greenpan Design" className="h-16 w-16 object-contain" />
          <div>
            <h1 className="text-3xl font-bold text-slate-800 uppercase">Thuyết Minh Tính Toán</h1>
            <h2 className="text-xl text-blue-700 font-semibold mt-1">KẾT CẤU TẤM SANDWICH PANEL</h2>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-slate-500">DỰ ÁN</div>
          <div className="text-lg font-bold">{config.projectName}</div>
          <div className="text-sm text-slate-400 mt-1">{new Date().toLocaleDateString('vi-VN')}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-root flex flex-col min-h-screen bg-gray-50 text-gray-800 font-sans overflow-x-hidden">
      <header className="bg-slate-800 text-white p-4 shadow-md flex justify-between items-center shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <img src="./logo_app.jpg" alt={APP_DISPLAY_NAME} className="h-10 w-10 object-contain" />
          <div>
            <h1 className="text-xl font-bold leading-none">{APP_DISPLAY_NAME} — Panel calculation</h1>
            <div className="text-[11px] text-slate-300">{buildReleaseStamp(resolvedAppVersion)} · {resolvedReleaseChannel}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(updateStatus?.event || updateStatus?.appVersion || appVersion) && (
            <div className="text-[11px] bg-slate-700/70 px-3 py-1 rounded-full whitespace-nowrap">
              {(updateStatus?.appVersion || appVersion) && (
                <span className="mr-2">v{updateStatus?.appVersion || appVersion}</span>
              )}
              {updateStatus?.event === 'checking' && 'Đang kiểm tra cập nhật...'}
              {updateStatus?.event === 'available' && `Có bản mới ${updateStatus.version || ''}`}
              {updateStatus?.event === 'not-available' && 'Không có cập nhật'}
              {updateStatus?.event === 'download-progress' && `Đang tải ${Math.round(updateStatus.percent || 0)}%`}
              {updateStatus?.event === 'downloaded' && `Đã tải xong ${updateStatus.version || ''}. Chuẩn bị cài...`}
              {updateStatus?.event === 'error' && `Lỗi cập nhật: ${updateStatus.message || ''}`}
            </div>
          )}
          <div className="flex gap-2">
            <button className={`px-4 py-1 rounded text-sm ${activeTab === 'input' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setActiveTab('input')}>Nhập liệu</button>
            <button className={`px-4 py-1 rounded text-sm ${activeTab === 'charts' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setActiveTab('charts')}>Biểu đồ</button>
            <button className={`px-4 py-1 rounded text-sm ${activeTab === 'report' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setActiveTab('report')}>Báo cáo</button>
          </div>
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 print:p-0 print:overflow-visible bg-gray-100"
        style={{ scrollbarGutter: 'stable' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportSnapshot}
        />
        <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 print:hidden">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <div className="text-sm font-bold text-violet-900">Snapshot / compare workflow</div>
              <div className="mt-1 text-xs text-violet-800">
                Dùng <strong>Snapshot dự án</strong> để lưu/nạp lại đúng form đang làm. Khi bật compare mode, app sẽ lưu thành <strong>Snapshot compare set</strong> để giữ cả bộ phương án. <strong>Result package</strong> chỉ dùng để audit/kết quả, không dùng để import lại form.
              </div>
              <div className="mt-2 grid gap-2 text-[11px] text-violet-900 md:grid-cols-3">
                <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                  <div className="font-bold uppercase tracking-wide text-violet-700">Snapshot hiện tại</div>
                  <div className="mt-1">{compareModeEnabled ? 'Snapshot compare set' : 'Snapshot dự án'} · {compareVariants.length} phương án</div>
                  <div className="text-slate-600">Active: {compareVariants.find((variant) => variant.id === compareActiveVariantId)?.label || '—'}</div>
                </div>
                <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                  <div className="font-bold uppercase tracking-wide text-violet-700">Compare persistence</div>
                  <div className="mt-1">Baseline: {compareVariants[0]?.label || '—'}</div>
                  <div className="text-slate-600">Trong snapshot: {summarizeVariantLabels(compareVariants)}</div>
                </div>
                <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                  <div className="font-bold uppercase tracking-wide text-violet-700">Import guide</div>
                  <div className="mt-1">Chỉ chọn file “Snapshot dự án” hoặc “Snapshot compare set”.</div>
                  <div className="text-slate-600">Nếu chọn nhầm result package, app sẽ báo rõ lý do.</div>
                </div>
              </div>
              {presetLibraryWarning && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {presetLibraryWarning}
                </div>
              )}
              {snapshotWorkflowMessage && (
                <div className="mt-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs text-violet-900">
                  {snapshotWorkflowMessage}
                </div>
              )}

              <div className="mt-3 rounded-lg border border-violet-200 bg-white px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-violet-700">Preset quick-pick</div>
                    <div className="mt-1 text-[11px] text-slate-600">Lưu nhanh cấu hình đang mở vào app để mở lại project/snapshot hay dùng mà không cần đi qua file JSON.</div>
                  </div>
                  <div className="text-[11px] text-slate-500">Tối đa {PRESET_LIMIT} preset cục bộ trên máy này</div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                  <label className="text-xs text-slate-600">
                    <div className="mb-1 font-semibold">Tên preset</div>
                    <input
                      type="text"
                      value={presetDraftName}
                      onChange={(e) => setPresetDraftName(e.target.value)}
                      className="w-full rounded border border-violet-200 px-2 py-1.5 text-sm text-slate-900"
                      placeholder={buildDefaultPresetName(config, compareModeEnabled, presetLibrary.length + 1)}
                    />
                  </label>
                  <label className="text-xs text-slate-600">
                    <div className="mb-1 font-semibold">Ghi chú nhanh</div>
                    <input
                      type="text"
                      value={presetDraftNote}
                      onChange={(e) => setPresetDraftNote(e.target.value)}
                      className="w-full rounded border border-violet-200 px-2 py-1.5 text-sm text-slate-900"
                      placeholder="Ví dụ: cold room 100 mm / case demo nội bộ"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleSaveCurrentAsPreset}
                      className="w-full rounded-full border border-violet-300 bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                    >
                      Lưu preset đang mở
                    </button>
                  </div>
                </div>

                {presetLibrary.length > 0 ? (
                  <div className="mt-3 grid gap-2 lg:grid-cols-2">
                    {presetLibrary.map((preset) => (
                      <div key={preset.id} className="rounded-lg border border-violet-200 bg-violet-50/40 px-3 py-3 text-xs text-slate-700">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-violet-900">{preset.name}</div>
                            <div className="mt-1 text-[11px] text-slate-600">{buildPresetSummary(preset.configSnapshot, preset.compareModeEnabled, preset.compareVariants)}</div>
                            {preset.note && <div className="mt-1 text-[11px] text-slate-500">{preset.note}</div>}
                            <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">Lưu {new Date(preset.savedAt).toLocaleString('vi-VN')}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => applyPresetToWorkflow(preset)}
                              className="rounded-full border border-violet-300 bg-white px-3 py-1 font-semibold text-violet-900"
                            >
                              Nạp ngay
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePreset(preset.id)}
                              className="rounded-full border border-rose-300 bg-white px-3 py-1 font-semibold text-rose-700"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-violet-200 bg-violet-50/30 px-3 py-3 text-[11px] text-slate-500">
                    Chưa có preset nào. Lưu một cấu hình hay dùng để lần sau mở nhanh hơn thay vì export/import snapshot file.
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleExportSnapshot}
                className="rounded-full border border-violet-300 bg-white px-3 py-1 text-sm font-semibold text-violet-900 hover:border-violet-400"
              >
                Xuất {compareModeEnabled ? 'Snapshot compare set' : 'Snapshot dự án'}
              </button>
              <button
                type="button"
                onClick={handleTriggerSnapshotImport}
                className="rounded-full border border-violet-300 bg-white px-3 py-1 text-sm font-semibold text-violet-900 hover:border-violet-400"
              >
                Nạp snapshot vào form
              </button>
              <label className="inline-flex items-center gap-2 rounded-full border border-violet-300 bg-white px-3 py-1 text-sm font-semibold text-violet-900">
                <input
                  type="checkbox"
                  checked={compareModeEnabled}
                  onChange={(e) => setCompareModeEnabled(e.target.checked)}
                />
                Bật compare mode
              </label>
            </div>
          </div>

          {compareModeEnabled && (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {compareVariants.map((variant) => {
                  const isActive = variant.id === compareActiveVariantId;
                  const summary = compareResults.find((item) => item.id === variant.id)?.summary;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => handleSelectCompareVariant(variant.id)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${isActive ? 'border-violet-500 bg-violet-600 text-white shadow-sm' : 'border-violet-200 bg-white text-violet-900 hover:border-violet-400'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold">{variant.label}</div>
                        {compareExecutiveSummary.bestVariantId === variant.id && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>Đọc trước</span>
                        )}
                      </div>
                      <div className={`text-[11px] ${isActive ? 'text-violet-100' : 'text-violet-700'}`}>
                        {summary?.status === 'pass' ? 'Đạt' : 'Không đạt'} · max ratio {formatRatioPercent(summary?.governingCases?.overall?.ratio || 0)}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-lg border border-violet-200 bg-white p-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-violet-700">Đổi tên compare set để snapshot/load dễ nhận diện</div>
                <div className="grid gap-2 md:grid-cols-3">
                  {compareVariants.map((variant, idx) => (
                    <label key={`compare-rename-${variant.id}`} className="text-xs text-slate-600">
                      <div className="mb-1 font-semibold">{COMPARE_VARIANT_LABELS[idx] || `PA ${idx + 1}`}</div>
                      <input
                        type="text"
                        value={variant.label}
                        onChange={(e) => handleRenameCompareVariant(variant.id, e.target.value)}
                        className="w-full rounded border border-violet-200 px-2 py-1.5 text-sm text-slate-900"
                        placeholder={variant.name || variant.label}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <button type="button" onClick={handleAddCompareVariant} disabled={compareVariants.length >= COMPARE_VARIANT_LIMIT} className="rounded border border-violet-300 bg-white px-3 py-1.5 font-semibold text-violet-900 disabled:cursor-not-allowed disabled:opacity-50">
                  + Thêm phương án mới từ form đang mở
                </button>
                <button type="button" onClick={handleExportSnapshot} className="rounded border border-violet-300 bg-white px-3 py-1.5 font-semibold text-violet-900">
                  Xuất snapshot compare set này
                </button>
                <button type="button" onClick={() => handleCloneCompareVariant(compareActiveVariantId)} disabled={compareVariants.length >= COMPARE_VARIANT_LIMIT} className="rounded border border-violet-300 bg-white px-3 py-1.5 font-semibold text-violet-900 disabled:cursor-not-allowed disabled:opacity-50">
                  Nhân bản {compareVariants.find((item) => item.id === compareActiveVariantId)?.label || 'PA hiện tại'} thành PA mới
                </button>
                <button type="button" onClick={() => handleResetCompareVariant(compareActiveVariantId)} className="rounded border border-violet-300 bg-white px-3 py-1.5 font-semibold text-violet-900">
                  Ghi đè {compareVariants.find((item) => item.id === compareActiveVariantId)?.label || 'PA hiện tại'} bằng form đang mở
                </button>
                {compareVariants.length > 1 && (
                  <button type="button" onClick={() => handleRemoveCompareVariant(compareActiveVariantId)} className="rounded border border-rose-300 bg-white px-3 py-1.5 font-semibold text-rose-700">
                    Xóa {compareVariants.find((item) => item.id === compareActiveVariantId)?.label || 'PA hiện tại'} khỏi compare set
                  </button>
                )}
              </div>

              {compareMetricRows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-violet-200 bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-violet-100 text-violet-950">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold">Chỉ tiêu</th>
                        {compareResults.map((variant) => (
                          <th key={`compare-head-${variant.id}`} className="px-3 py-2 text-left font-bold">{variant.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compareMetricRows.map((row) => (
                        <tr key={row.key} className="border-t border-violet-100 align-top">
                          <td className="px-3 py-2 font-medium text-slate-700">{row.label}</td>
                          {row.values.map((cell) => {
                            const toneClass = cell.tone === 'pass'
                              ? 'text-emerald-700'
                              : cell.tone === 'fail'
                                ? 'text-rose-700'
                                : cell.tone === 'muted'
                                  ? 'text-slate-400'
                                  : 'text-slate-800';
                            return (
                              <td key={`${row.key}-${cell.variantId}`} className={`px-3 py-2 font-semibold ${cell.isBest ? 'bg-emerald-50/70' : ''} ${toneClass}`.trim()}>
                                <div className="flex items-center gap-2">
                                  <span>{cell.value}</span>
                                  {cell.isBest && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Best</span>}
                                </div>
                                {cell.subValue && <div className="text-[11px] font-medium text-slate-500">{cell.subValue}</div>}
                                {cell.diffHint && <div className="text-[10px] font-medium text-slate-500">{cell.diffHint}</div>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* INPUT TAB */}
        <div id="tab-input" className={activeTab === 'input' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-blue-700"><Settings size={20} /> 1. Sơ Đồ & Kích Thước</h2>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 mb-1">Tên dự án</label>
                <input type="text" name="projectName" value={config.projectName} onChange={handleInputChange} className="w-full border p-2 rounded" />
              </div>

              <div className="mb-4 bg-blue-50 p-3 rounded border border-blue-100">
                <div className="flex flex-wrap gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="panelType" value="external" checked={config.panelType === 'external'} onChange={handleInputChange} />
                    <span className="text-sm">Vách ngoài</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="panelType" value="internal" checked={config.panelType === 'internal'} onChange={handleInputChange} />
                    <span className="text-sm">Vách trong</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="panelType" value="ceiling" checked={config.panelType === 'ceiling'} onChange={handleInputChange} />
                    <span className="text-sm">Tấm trần</span>
                  </label>
                </div>

                {config.panelType === 'internal' && (
                  <div className="flex gap-4 mb-2 pl-4 border-l-2 border-blue-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="internalWallType" value="normal" checked={config.internalWallType === 'normal'} onChange={handleInputChange} />
                      <span className="text-xs">Thường</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="internalWallType" value="cold_storage" checked={config.internalWallType === 'cold_storage'} onChange={handleInputChange} />
                      <span className="text-xs">Kho lạnh</span>
                    </label>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2 border-t border-blue-200">
                  <label className="text-xs font-bold">Giới hạn độ võng:</label>
                  <select
                    name="deflectionLimit"
                    value={config.deflectionLimit}
                    onChange={(e) => setConfig({ ...config, deflectionLimit: parseInt(e.target.value, 10) })}
                    className="text-sm border rounded p-1"
                  >
                    <option value="100">L/100</option>
                    <option value="150">L/150</option>
                    <option value="200">L/200</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm block font-medium">Nhịp (m):</label>
                  <div className="flex gap-2 items-center flex-wrap">
                    {config.spans.map((s, i) => (
                      <input key={i} type="number" value={s} onChange={(e) => handleSpanChange(i, e.target.value)} className="w-16 border p-1 rounded text-center" />
                    ))}
                    <button onClick={addSpan} className="text-green-600 font-bold px-2">+</button>
                    <button onClick={removeSpan} className="text-red-600 font-bold px-2">-</button>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="text-sm block font-medium mb-1">Rộng gối (mm):</label>
                  <div className="flex gap-2 flex-wrap">
                    {config.supportWidths.map((w, i) => {
                      const check = results.reactionData && results.reactionData[i];
                      const isFail = check?.status === 'fail';
                      return (
                        <div key={i} className="flex flex-col w-20 relative group">
                          <span className="text-[10px] text-gray-500 text-center uppercase font-bold">Gối {i}</span>
                          <div className="relative">
                            <input
                              type="number"
                              value={w}
                              onChange={(e) => handleSupportWidthChange(i, e.target.value)}
                              className={`w-full border rounded p-1 text-center text-sm outline-none transition-colors duration-200 ${isFail ? 'border-red-500 bg-red-100 text-red-900 font-bold shadow-sm' : 'border-gray-300 focus:border-blue-500'}`}
                            />
                            {isFail && (
                              <div className="absolute top-full left-0 w-full mt-1 z-10 hidden group-hover:block">
                                <div className="bg-red-600 text-white text-[10px] rounded p-1 shadow-lg text-center">
                                  Cần &gt; {Math.ceil(check.reqWidth)}mm
                                </div>
                                <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-red-600 absolute -top-1 left-1/2 -translate-x-1/2"></div>
                              </div>
                            )}
                            {isFail && <AlertCircle size={12} className="text-red-500 absolute top-1.5 right-1 pointer-events-none" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm block font-bold">Độ dày lõi (mm):</label>
                  <div className="flex flex-wrap gap-2">
                    {[40, 50, 60, 75, 80, 100, 125, 150, 200].map(v => (
                      <button
                        key={v}
                        onClick={() => setCoreThickness(v)}
                        className={`border px-2 py-1 rounded text-sm ${config.coreThickness === v ? 'bg-blue-600 text-white' : ''}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-orange-600"><Thermometer size={20} /> 2. Thông số kỹ thuật</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs block">Tôn ngoài (mm)</label><input type="number" step="0.05" name="skinOut" value={config.skinOut} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Tôn trong (mm)</label><input type="number" step="0.05" name="skinIn" value={config.skinIn} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block font-bold">Bề rộng panel (mm)</label><input type="number" step="10" name="panelWidth" value={config.panelWidth} onChange={handlePanelWidthChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Nhiệt độ ngoài (°C)</label><input type="number" name="tempOut" value={config.tempOut} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Nhiệt độ trong (°C)</label><input type="number" name="tempIn" value={config.tempIn} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Hệ số nhiệt γT</label><input type="number" step="0.1" name="gammaF_thermal" value={config.gammaF_thermal} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block font-bold">Áp lực gió (kPa)</label><input type="number" step="0.1" name="windPressure" value={config.windPressure} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block font-bold text-red-600">Thép Fy (MPa)</label><input type="number" name="steelYield" value={config.steelYield} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Cường độ cắt lõi (MPa)</label><input type="number" step="0.01" name="coreShearStrength" value={config.coreShearStrength} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Mô đun cắt lõi Gc (MPa)</label><input type="number" step="0.1" name="coreShearModulus" value={config.coreShearModulus} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Mô đun nén lõi Ec (MPa)</label><input type="number" step="0.1" name="compressiveModulus" value={config.compressiveModulus} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Hệ số kappa cắt</label><input type="number" step="0.05" name="kappaShear" value={config.kappaShear} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Chế độ kiểm tra nhăn</label><select name="wrinklingMode" value={config.wrinklingMode} onChange={handleInputChange} className="w-full border p-2 rounded"><option value="declared">Khai báo trực tiếp</option><option value="approx">Xấp xỉ kỹ thuật</option><option value="yield-only">Theo giới hạn chảy</option></select></div>
                <div className="col-span-2 rounded border border-amber-200 bg-amber-50/40 p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs block">Ứng suất nhăn khai báo</label>
                      <input type="number" step="0.1" name="wrinklingStress" value={config.wrinklingStress} onChange={handleInputChange} className="w-full border p-2 rounded" />
                    </div>
                    <div>
                      <label className="text-xs block">Đơn vị / basis hiển thị</label>
                      <input type="text" name="wrinklingStressUnit" value={config.wrinklingStressUnit} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="MPa" />
                    </div>
                    <div>
                      <label className="text-xs block">Semantic của giá trị khai báo</label>
                      <select name="wrinklingStressBasis" value={config.wrinklingStressBasis} onChange={handleInputChange} className="w-full border p-2 rounded">
                        <option value="design-resistance">Giá trị thiết kế dùng trực tiếp</option>
                        <option value="characteristic-resistance">Giá trị đặc trưng</option>
                        <option value="test-result">Kết quả thử nghiệm</option>
                        <option value="vendor-table">Giá trị từ bảng vendor/datasheet</option>
                        <option value="user-note">Ghi chú nội bộ / user note</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs block">Loại nguồn</label>
                      <select name="wrinklingStressSourceType" value={config.wrinklingStressSourceType} onChange={handleInputChange} className="w-full border p-2 rounded">
                        <option value="unknown">Chưa rõ nguồn</option>
                        <option value="vendor">Vendor datasheet/manual</option>
                        <option value="test">Test report</option>
                        <option value="worksheet">Worksheet nội bộ đã lưu</option>
                        <option value="manual">Nhập tay / nhớ lại</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs block">Nguồn tham chiếu / product context</label>
                    <input type="text" name="wrinklingStressSourceRef" value={config.wrinklingStressSourceRef} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="Ví dụ: datasheet XYZ rev.B / worksheet 2025-11 / PIR 50 mm" />
                  </div>
                  <div>
                    <label className="text-xs block">Ghi chú nguồn / giả định</label>
                    <textarea name="wrinklingStressSourceNote" value={config.wrinklingStressSourceNote} onChange={handleInputChange} className="w-full border p-2 rounded min-h-[72px]" placeholder="Ghi rõ nếu đây là characteristic value, kết quả test chưa quy đổi, hoặc note nội bộ chưa có citation cứng." />
                  </div>
                  <div>
                    <label className="text-xs block">Context sản phẩm áp dụng</label>
                    <input type="text" name="wrinklingStressProductContext" value={config.wrinklingStressProductContext} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="Panel line / core density / thickness / facing..." />
                  </div>
                  <p className="text-[11px] text-slate-600">Giá trị này hiện được hiểu là <b>khai báo sức kháng/ứng suất wrinkling theo nguồn do người dùng cung cấp</b>. Hệ thống vẫn tính như cũ, nhưng sẽ mang theo basis + provenance để tránh nhập một con số mơ hồ.</p>
                  <p className="text-[11px] text-slate-500">Repo hiện đã gắn được <b>guidance cấp product-family</b> từ vendor technical guide có nêu “wrinkling of the face layer…”, nên nếu nhập theo panel family tương ứng hãy ưu tiên khai rõ <b>basis</b> + <b>source ref</b>. Tuy vậy, sau đợt artifact hunt hiện tại repo vẫn <b>chưa có vendor table/test/worksheet/manual line chứa con số MPa cụ thể</b> cho declared path này, nên giá trị số vẫn chỉ được coi là source-backed khi chính table/test/worksheet chứa đúng giá trị đó được đính kèm.</p>
                  {config.wrinklingMode === 'declared' && !(Number(config.wrinklingStress) > 0) && (
                    <p className="text-[11px] text-amber-700">Thiếu ứng suất wrinkling khai báo hợp lệ; báo cáo sẽ gắn cờ thiếu dữ liệu và fallback tạm sang kiểm tra theo giới hạn chảy.</p>
                  )}
                </div>
                <div><label className="text-xs block">Chế độ phân phối nội lực</label><select name="redistributionMode" value={config.redistributionMode} onChange={handleInputChange} className="w-full border p-2 rounded"><option value="elastic">Đàn hồi</option><option value="simplified">Đơn giản hóa</option></select></div>
                {config.panelType !== 'ceiling' && (
                  <>
                    <div><label className="text-xs block">Khả năng chịu kéo vít (kN)</label><input type="number" step="0.1" name="screwStrength" value={config.screwStrength} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                    <div><label className="text-xs block">Bước vít (mm)</label><input type="number" step="10" name="screwSpacing" value={config.screwSpacing} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                    <div><label className="text-xs block">Basis sức kháng vít</label><select name="screwStrengthBasis" value={config.screwStrengthBasis} onChange={handleInputChange} className="w-full border p-2 rounded"><option value="design-resistance-per-fastener">Design resistance / mỗi vít</option><option value="characteristic-resistance-per-fastener">Characteristic resistance / mỗi vít</option><option value="vendor-allowable-per-fastener">Vendor allowable / mỗi vít</option><option value="test-result-per-fastener">Test result / mỗi vít</option><option value="user-note-per-fastener">User note / mỗi vít</option></select></div>
                    <div><label className="text-xs block">Loại nguồn sức kháng vít</label><select name="screwStrengthSourceType" value={config.screwStrengthSourceType} onChange={handleInputChange} className="w-full border p-2 rounded"><option value="unknown">Chưa rõ nguồn</option><option value="vendor">Vendor datasheet / manual</option><option value="schedule">Project fastening schedule</option><option value="test">Test report / lab sheet</option><option value="worksheet">Archived worksheet / calc note</option><option value="manual">Manual user entry</option></select></div>
                    <div><label className="text-xs block">Đơn vị hiển thị</label><input type="text" name="screwStrengthUnit" value={config.screwStrengthUnit} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="kN" /></div>
                    <div><label className="text-xs block">Source ref</label><input type="text" name="screwStrengthSourceRef" value={config.screwStrengthSourceRef} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="Ví dụ: fastener datasheet ABC / schedule rev.2 / worksheet uplift-01" /></div>
                    <div className="col-span-2"><label className="text-xs block">Fastener / application context</label><input type="text" name="screwStrengthFastenerContext" value={config.screwStrengthFastenerContext} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="Fastener type / substrate / sheet thickness / embedment / washer / support line..." /></div>
                    <div className="col-span-2"><label className="text-xs block">Source note</label><textarea name="screwStrengthSourceNote" value={config.screwStrengthSourceNote} onChange={handleInputChange} className="w-full border p-2 rounded min-h-[72px]" placeholder="Ghi rõ nếu đây là characteristic value, vendor allowable chưa quy đổi, hoặc note nội bộ chưa có citation cứng." /></div>
                    <div className="col-span-2"><label className="text-xs block">Diễn giải spacing-to-count (tuỳ chọn)</label><input type="text" name="screwStrengthSpacingMeaning" value={config.screwStrengthSpacingMeaning} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="Mặc định: spacing across panelWidth for simplified count estimate" /></div>
                    <div className="col-span-2 text-[11px] text-slate-600 space-y-1"><p>Giá trị <b>screwStrength</b> hiện được hiểu là <b>sức kháng nhổ / pull-out khai báo trên mỗi vít</b>. Hệ thống giữ nguyên công thức uplift hiện có, nhưng sẽ mang theo basis + provenance để tránh nhập một con số kN mơ hồ.</p><p className="text-slate-500">Repo hiện <b>chưa có documented datasheet/schedule/test/worksheet</b> chứng minh sẵn con số kN cụ thể cho từng case. Nếu chưa gắn <b>source ref</b> hoặc <b>source note</b>, báo cáo sẽ nói rõ đây vẫn là <b>user-declared fastener resistance</b>. Quy tắc <b>round(panelWidth / screwSpacing)</b> và <b>γM,screw</b> cũng đang được exposed minh bạch như source-gap/provisional metadata, không phải cited rule.</p></div>
                  </>
                )}

                <div className="col-span-2">
                  <label className="flex items-center gap-4 text-sm mt-2">
                    <input type="radio" name="windDirection" value="pressure" checked={config.windDirection === 'pressure'} onChange={handleInputChange} /> Gió đẩy
                    <input type="radio" name="windDirection" value="suction" checked={config.windDirection === 'suction'} onChange={handleInputChange} /> Gió hút
                  </label>
                </div>

                {config.panelType === 'ceiling' && (
                  <div className="col-span-2 mt-2 bg-emerald-50 p-3 rounded border border-emerald-200 space-y-2">
                    <div className="text-xs font-bold text-emerald-800">TẢI TRỌNG TÁC DỤNG LÊN TRẦN</div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 rounded border border-emerald-200 bg-white/70 p-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                          <input
                            type="checkbox"
                            checked={config.enableSpanDistributedLoads === true}
                            onChange={(e) => setConfig(prev => ({ ...prev, enableSpanDistributedLoads: e.target.checked }))}
                          />
                          Nhập tải phân bố riêng cho từng nhịp
                        </label>
                        <div className="text-[10px] text-gray-600 mt-1">
                          Tắt tuỳ chọn này để dùng 1 bộ qG/qQ chung như flow cũ. Bật để khai báo qG và qQ riêng cho từng nhịp ở bảng bên dưới.
                        </div>
                      </div>

                      <div>
                        <label className="text-xs block font-bold">Tĩnh tải</label>
                        <select
                          name="deadLoadMode"
                          value={config.deadLoadMode}
                          onChange={handleInputChange}
                          className="w-full border rounded p-1 text-sm"
                        >
                          <option value="auto">Tự động (tự trọng panel)</option>
                          <option value="manual">Nhập tay (kPa)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs block font-bold">Hoạt tải (kPa)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="liveLoad_kPa"
                          value={config.liveLoad_kPa}
                          onChange={handleInputChange}
                          className="w-full border p-2 rounded"
                        />
                      </div>

                      {config.deadLoadMode === 'manual' && (
                        <div className="col-span-2">
                          <label className="text-xs block font-bold">Tĩnh tải nhập tay (kPa)</label>
                          <input
                            type="number"
                            step="0.01"
                            name="deadLoadManual_kPa"
                            value={config.deadLoadManual_kPa}
                            onChange={handleInputChange}
                            className="w-full border p-2 rounded"
                          />
                        </div>
                      )}

                      <div className="col-span-2 space-y-2">
                        {loadWorkflowGuardrails.map((item) => (
                          <div key={item.id} className={`rounded border p-3 ${LOAD_WARNING_TONE[item.tone] || LOAD_WARNING_TONE.info}`}>
                            <div className="text-xs font-semibold">{item.title}</div>
                            <div className="mt-1 text-[11px] leading-relaxed">{item.message}</div>
                          </div>
                        ))}
                      </div>

                      {config.enableSpanDistributedLoads === true && (
                        <div className="col-span-2 rounded border border-emerald-200 bg-white/80 p-3 space-y-3">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <div className="text-xs font-bold text-emerald-800">BẢNG TẢI PHÂN BỐ THEO TỪNG NHỊP (kPa)</div>
                              <div className="text-[10px] text-gray-600 mt-1">Mỗi dòng là một nhịp độc lập. qG = tĩnh tải, qQ = hoạt tải dùng cho nhịp đó.</div>
                            </div>
                            <div className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800">Mode đang bật: Theo từng nhịp</div>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-[11px] font-semibold text-gray-600">
                            <div>Nhịp</div>
                            <div>Chiều dài</div>
                            <div>Tĩnh tải qG</div>
                            <div>Hoạt tải qQ</div>
                          </div>
                          {config.spans.map((span, idx) => {
                            const rawDead = config.deadLoadBySpan_kPa?.[idx];
                            const rawLive = config.liveLoadBySpan_kPa?.[idx];
                            const deadMissing = rawDead === '' || rawDead === null || typeof rawDead === 'undefined';
                            const liveMissing = rawLive === '' || rawLive === null || typeof rawLive === 'undefined';
                            const qG = Number(rawDead || 0);
                            const qQ = Number(rawLive || 0);
                            const isNegative = qG < 0 || qQ < 0;
                            const isZeroDead = qG === 0;
                            const isEmptySpan = qG === 0 && qQ === 0;
                            const rowTone = isNegative ? 'rose' : (deadMissing || liveMissing || isZeroDead) ? 'amber' : 'emerald';
                            const rowClass = rowTone === 'rose'
                              ? 'border-rose-200 bg-rose-50/80'
                              : rowTone === 'amber'
                                ? 'border-amber-200 bg-amber-50/80'
                                : 'border-emerald-100 bg-emerald-50/40';
                            const inputClass = rowTone === 'rose'
                              ? 'border-rose-300 bg-white text-rose-900 focus:border-rose-400 focus:ring-rose-100'
                              : rowTone === 'amber'
                                ? 'border-amber-300 bg-white text-amber-900 focus:border-amber-400 focus:ring-amber-100'
                                : 'border-slate-200 bg-white text-slate-900 focus:border-emerald-400 focus:ring-emerald-100';
                            const helperText = isNegative
                              ? 'Có tải âm, nên kiểm tra lại dấu nhập.'
                              : deadMissing || liveMissing
                                ? 'Ô trống hiện bị hiểu là 0.'
                                : isEmptySpan
                                  ? 'Cả qG và qQ đang về 0 ở nhịp này.'
                                  : isZeroDead
                                    ? 'Nhịp này đang có qG = 0.'
                                    : 'Dòng này đã đủ dữ liệu để solver dùng trực tiếp.';

                            return (
                              <div key={`distributed-span-${idx}`} className={`grid grid-cols-4 gap-2 items-center rounded border p-2 transition-colors ${rowClass}`}>
                                <div>
                                  <div className="text-sm font-semibold text-gray-800">Nhịp {idx + 1}</div>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {isNegative && <span className="rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">Kiểm tra dấu</span>}
                                    {!isNegative && (deadMissing || liveMissing) && <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Ô trống → 0</span>}
                                    {!isNegative && !deadMissing && !liveMissing && isEmptySpan && <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Nhịp đang không tải</span>}
                                    {!isNegative && !deadMissing && !liveMissing && !isEmptySpan && isZeroDead && <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">qG = 0</span>}
                                  </div>
                                </div>
                                <div className="text-sm text-gray-700">
                                  <div>{Number(span || 0).toFixed(2)} m</div>
                                  <div className="mt-1 text-[10px] text-gray-500">{helperText}</div>
                                </div>
                                <div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={config.deadLoadBySpan_kPa?.[idx] ?? 0}
                                    onChange={(e) => handleDistributedLoadSpanChange('dead', idx, e.target.value)}
                                    className={`w-full rounded border p-2 text-sm focus:outline-none focus:ring-2 ${inputClass}`}
                                  />
                                  <div className="mt-1 text-[10px] text-gray-500">qG của nhịp {idx + 1}</div>
                                </div>
                                <div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={config.liveLoadBySpan_kPa?.[idx] ?? 0}
                                    onChange={(e) => handleDistributedLoadSpanChange('live', idx, e.target.value)}
                                    className={`w-full rounded border p-2 text-sm focus:outline-none focus:ring-2 ${inputClass}`}
                                  />
                                  <div className="mt-1 text-[10px] text-gray-500">qQ của nhịp {idx + 1}</div>
                                </div>
                              </div>
                            );
                          })}
                          <div className="rounded border border-emerald-100 bg-emerald-50 p-2 text-[10px] text-gray-700 space-y-1">
                            <div><b>Cách hiểu:</b> hệ sẽ tính nội lực theo đúng bộ qG/qQ của từng nhịp; không còn giả định mọi nhịp nhận cùng một giá trị tải phân bố.</div>
                            <div><b>Lưu ý hiện tại:</b> tải gió vẫn đang áp đều theo toàn dầm như flow hiện hữu.</div>
                          </div>
                        </div>
                      )}

                      {/* ✅ NEW: Creep factor cho trần */}
                      <div className="col-span-2">
                        <label className="text-xs block font-bold">Hệ số từ biến φ</label>
                        <input
                          type="number"
                          step="0.1"
                          name="creepFactor"
                          value={config.creepFactor}
                          onChange={handleInputChange}
                          className="w-full border p-2 rounded"
                        />
                        <div className="text-[10px] text-gray-600 mt-1">
                          Áp dụng cho tải lâu dài (Dead + tải treo) khi tính độ võng trần.
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs block font-bold">Hệ số từ biến uốn φb (tuỳ chọn)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="creepFactorBending"
                          value={config.creepFactorBending}
                          onChange={handleInputChange}
                          className="w-full border p-2 rounded"
                        />
                        <div className="text-[10px] text-gray-600 mt-1">
                          Dùng để giảm EI dài hạn khi cần xét võng lâu dài.
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-emerald-200 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-emerald-800">Tải treo (tải tập trung) — tọa độ X theo toàn dầm</div>
                        <button
                          type="button"
                          onClick={() => setConfig(prev => ({
                            ...prev,
                            pointLoads: [...(prev.pointLoads || []), { x_m: 0, P_kN: 0.2, note: '', type: 'permanent' }]
                          }))}
                          className="text-xs px-2 py-1 rounded bg-emerald-600 text-white"
                        >
                          + Thêm tải
                        </button>
                      </div>

                      <div className="mt-2 space-y-2">
                        {(config.pointLoads || []).map((pl, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-3">
                              <label className="text-[10px] block text-gray-600">X (m)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={pl.x_m}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  setConfig(prev => {
                                    const arr = [...(prev.pointLoads || [])];
                                    arr[idx] = { ...arr[idx], x_m: Number.isFinite(v) ? v : 0 };
                                    return { ...prev, pointLoads: arr };
                                  });
                                }}
                                className="w-full border p-1 rounded text-sm"
                              />
                            </div>

                            <div className="col-span-3">
                              <label className="text-[10px] block text-gray-600">P (kN, + xuống)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={pl.P_kN}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  setConfig(prev => {
                                    const arr = [...(prev.pointLoads || [])];
                                    arr[idx] = { ...arr[idx], P_kN: Number.isFinite(v) ? v : 0 };
                                    return { ...prev, pointLoads: arr };
                                  });
                                }}
                                className="w-full border p-1 rounded text-sm"
                              />
                            </div>

                            <div className="col-span-2">
                              <label className="text-[10px] block text-gray-600">Nhóm tải</label>
                              <select
                                value={pl.type || 'permanent'}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setConfig(prev => {
                                    const arr = [...(prev.pointLoads || [])];
                                    arr[idx] = { ...arr[idx], type: v };
                                    return { ...prev, pointLoads: arr };
                                  });
                                }}
                                className="w-full border p-1 rounded text-sm"
                              >
                                <option value="permanent">G (dài hạn)</option>
                                <option value="variable">Q (ngắn hạn)</option>
                              </select>
                            </div>

                            <div className="col-span-3">
                              <label className="text-[10px] block text-gray-600">Ghi chú</label>
                              <input
                                type="text"
                                value={pl.note || ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setConfig(prev => {
                                    const arr = [...(prev.pointLoads || [])];
                                    arr[idx] = { ...arr[idx], note: v };
                                    return { ...prev, pointLoads: arr };
                                  });
                                }}
                                className="w-full border p-1 rounded text-sm"
                              />
                            </div>

                            <div className="col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setConfig(prev => {
                                  const arr = [...(prev.pointLoads || [])];
                                  arr.splice(idx, 1);
                                  return { ...prev, pointLoads: arr };
                                })}
                                className="text-xs px-2 py-1 rounded bg-red-600 text-white"
                              >
                                x
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="text-[10px] text-gray-600 mt-2">
                        Ví dụ kiểm tra nhanh: nhịp 3m + 3m, X=1.5m P=0.30kN và X=4.5m P=0.30kN (biểu đồ lực cắt sẽ nhảy 0.30kN đúng tại vị trí đặt tải).
                      </div>
                    </div>
                  </div>
                )}

                {config.panelType === 'internal' && config.internalWallType === 'cold_storage' && (
                  <div className="col-span-2 mt-2 bg-blue-50 p-2 rounded border border-blue-200">
                    <label className="text-xs block mb-1 font-bold text-blue-700 flex items-center gap-1"><TrendingUp size={12} /> Hệ số từ biến</label>
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          step="0.1"
                          name="creepFactor"
                          value={config.creepFactor}
                          onChange={handleInputChange}
                          className="w-20 border p-1 rounded border-blue-300 focus:border-blue-500 text-sm"
                        />
                        <span className="text-[10px] text-gray-500">φ cắt (mặc định 2.4)</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          step="0.1"
                          name="creepFactorBending"
                          value={config.creepFactorBending}
                          onChange={handleInputChange}
                          className="w-20 border p-1 rounded border-blue-300 focus:border-blue-500 text-sm"
                        />
                        <span className="text-[10px] text-gray-500">φb uốn (tuỳ chọn)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* CHARTS TAB */}
        <div id="tab-charts" className={activeTab === 'charts' ? 'block w-full space-y-6' : 'hidden'}>
          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h3 className="font-bold text-center mb-2">
              {config.panelType === 'ceiling' ? 'Sơ đồ tính trần (X toàn dầm)' : 'Sơ đồ tính (tải + gối)'}
            </h3>

            {config.panelType === 'ceiling' ? (
              <CeilingSchematic config={config} results={results} />
            ) : (
              <BeamDiagram
                spansM={config.spans}
                windDirection={config.windDirection}
                windPressure={config.windPressure}
              />
            )}
          </div>

          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h3 className="font-bold text-center mb-2">Biểu đồ chuyển vị</h3>
            <div className="h-72">
              <ResponsiveContainer>
                <ComposedChart data={results.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" domain={[0, 'dataMax']} ticks={results.supportLocs} />
                  <YAxis reversed unit="mm" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#000" />

                  {/* ✅ Tổng: fill vùng về 0 */}
                  <Area
                    type="monotone"
                    dataKey="deflectionTotal"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.18}
                    baseValue={0}
                    name="Tổng"
                    dot={false}
                    activeDot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="deflectionWind"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name={config.panelType === 'ceiling' ? 'Cơ học (có creep)' : 'Gió'}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />

                  {/* ✅ Creep (chỉ rõ phần tăng do từ biến) */}
                  <Line
                    type="monotone"
                    dataKey="deflectionCreep"
                    stroke="#64748b"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    name="Từ biến (creep)"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="deflectionThermal"
                    stroke="#ff7300"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Nhiệt"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />

                  <Line type="step" dataKey="limitPlus" stroke="red" strokeWidth={1} strokeDasharray="10 5" dot={false} activeDot={false} name="Giới hạn (+)" />
                  <Line type="step" dataKey="limitMinus" stroke="red" strokeWidth={1} strokeDasharray="10 5" dot={false} activeDot={false} name="Giới hạn (-)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h3 className="font-bold text-center mb-2">Biểu đồ mô-men uốn</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <ComposedChart data={results.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" domain={[0, 'dataMax']} ticks={results.supportLocs} />
                  <YAxis reversed unit="kNm" />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#000" />
                  <Area type="monotone" dataKey="moment" stroke="#ff7300" fill="#fff7ed" name="Mô-men" dot={false} activeDot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h3 className="font-bold text-center mb-2">Biểu đồ lực cắt</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={results.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" domain={[0, 'dataMax']} ticks={results.supportLocs} />
                  <YAxis reversed unit="kN" />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#000" />
                  <Area type="linear" dataKey="shear" stroke="#82ca9d" fill="#82ca9d" name="Lực Cắt" dot={false} activeDot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h3 className="font-bold text-center mb-2">Biểu đồ phản lực gối</h3>
            <div className="mb-3">
              <ReactionLegend />
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={results.reactionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis unit="kN" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="R_Ed" name="Phản lực" barSize={30} isAnimationActive={!printMode}>
                    {results.reactionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.status === 'fail' ? REACTION_FAIL_COLOR : REACTION_PASS_COLOR}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="F_Rd"
                    name="Giới hạn"
                    fill={REACTION_LIMIT_COLOR}
                    stroke={REACTION_LIMIT_BORDER}
                    strokeDasharray="3 3"
                    barSize={30}
                    isAnimationActive={!printMode}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* REPORT TAB */}
        <div id="tab-report" className={activeTab === 'report' ? 'block' : 'hidden'}>
          <div className="w-full mx-auto bg-white p-8 shadow-lg print:shadow-none print:w-full print:max-w-none report-sheet">
            <ReportHeader />
            <ExecutiveSummaryPanel results={results} compareSummary={results.compareSummary} />
            <AssumptionsAndLimitationsPanel results={results} />

            <div className="mb-6 report-section">
              <h3 className="text-sm font-bold border-b border-gray-400 mb-2 uppercase flex items-center gap-2">
                <Settings size={14} /> 1. Thông số đầu vào
              </h3>

              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                <div className="flex justify-between"><span>Loại panel:</span> <b>{config.panelType === 'external' ? 'Vách ngoài' : config.panelType === 'internal' ? 'Vách trong' : 'Tấm trần'}</b></div>
                <div className="flex justify-between"><span>Độ dày lõi:</span> <b>{config.coreThickness} mm</b></div>
                <div className="flex justify-between"><span>Tôn mặt (Ngoài/Trong):</span> <b>{config.skinOut} / {config.skinIn} mm</b></div>
                <div className="flex justify-between"><span>Bề rộng panel:</span> <b>{config.panelWidth} mm</b></div>
                <div className="flex justify-between"><span>Cường độ thép (Fy):</span> <b>{config.steelYield} MPa</b></div>
                <div className="flex justify-between"><span>Tỷ trọng lõi:</span> <b>{config.coreDensity} kg/m3</b></div>
                <div className="flex justify-between"><span>Cường độ cắt lõi:</span> <b>{config.coreShearStrength} MPa</b></div>
                <div className="flex justify-between"><span>Mô đun cắt lõi Gc:</span> <b>{config.coreShearModulus} MPa</b></div>
                <div className="flex justify-between"><span>Mô đun nén lõi Ec:</span> <b>{config.compressiveModulus} MPa</b></div>
                <div className="flex justify-between"><span>Hệ số kappa:</span> <b>{config.kappaShear}</b></div>
                <div className="flex justify-between"><span>Chế độ kiểm tra wrinkling:</span> <b>{getModeLabel(results.wrinklingMode, WRINKLING_MODE_LABELS)}</b></div>
                <div className="flex justify-between"><span>Phân phối nội lực:</span> <b>{getModeLabel(results.redistributionMode, REDISTRIBUTION_MODE_LABELS)}</b></div>
                <div className="flex justify-between"><span>Tải trọng gió/áp suất:</span> <b>{config.windPressure} kPa ({getModeLabel(config.windDirection, WIND_DIRECTION_LABELS)})</b></div>
                <div className="flex justify-between"><span>Chênh lệch nhiệt độ:</span> <b>{Math.abs(config.tempOut - config.tempIn)} °C</b></div>
                <div className="flex justify-between"><span>Hệ số nhiệt γT:</span> <b>{config.gammaF_thermal}</b></div>
                <div className="flex justify-between"><span>Sơ đồ nhịp:</span> <b>{config.spans.join(' + ')} m</b></div>
                <div className="flex justify-between"><span>Bề rộng gối đỡ:</span> <b>{config.supportWidths.join(' + ')} mm</b></div>
                {config.panelType !== 'ceiling' && (
                  <div className="flex justify-between"><span>Khoảng cách vít:</span> <b>{config.screwSpacing} mm</b></div>
                )}
                <div className="flex justify-between"><span>Giới hạn độ võng:</span> <b>L/{results.limitDenom}</b></div>
                {config.panelType === 'ceiling' && (
                  <div className="flex justify-between"><span>Chế độ tải phân bố:</span> <b>{results.distributedLoadMode === 'per-span' ? 'Theo từng nhịp' : 'Một giá trị chung'}</b></div>
                )}
                {config.panelType === 'ceiling' && results.distributedLoadMode === 'per-span' && (
                  <div className="col-span-2 rounded border border-sky-200 bg-sky-50 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-xs font-bold text-sky-800">TÓM TẮT TẢI THEO TỪNG NHỊP</div>
                      <div className="text-[10px] font-semibold text-sky-700">Đang dùng dữ liệu per-span để tính nội lực</div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="text-[11px] text-slate-700">qG theo nhịp: <b>{formatSpanLoadSummary(results.qDeadBySpan_kPa).join(' · ')}</b></div>
                      <div className="text-[11px] text-slate-700">qQ theo nhịp: <b>{formatSpanLoadSummary(results.qLiveBySpan_kPa).join(' · ')}</b></div>
                    </div>
                  </div>
                )}

                {(config.panelType === 'ceiling' || (config.panelType === 'internal' && config.internalWallType === 'cold_storage')) && (
                  <div className="flex justify-between"><span>Hệ số từ biến (φ/φb):</span> <b>{config.creepFactor} / {config.creepFactorBending}</b></div>
                )}
              </div>
            </div>

            <div className="mb-6 report-section">
              <h3 className="text-sm font-bold border-b border-gray-400 mb-2 uppercase flex items-center gap-2">
                <BookOpen size={14} /> 2. Cơ sở & Phương pháp tính toán
              </h3>

              <div className="text-xs text-justify space-y-2 text-slate-700">
                <h4 className="font-bold text-blue-800">2.1 Cơ sở lý thuyết</h4>
                <ul className="list-disc list-inside pl-2">
                  <li><strong>Tiêu chuẩn áp dụng:</strong> TCVN 2737:2023, EN 14509:2013.</li>
                  <li><strong>Phân tích:</strong> Dầm liên tục (FEM Timoshenko), xét biến dạng cắt & nhiệt; ULS có tái phân phối nội lực khi vượt M_Rd.</li>
                  {(config.panelType === 'ceiling' || (config.panelType === 'internal' && config.internalWallType === 'cold_storage')) && (
                    <li><strong>Từ biến lõi (creep):</strong> GA_long = GA_inst/(1+φ), EI_long giảm theo φb (nếu nhập). Trần xét cho tải lâu dài (dead + tải treo), kho lạnh xét cho toàn tải SLS.</li>
                  )}
                </ul>

                <h4 className="font-bold text-blue-800 mt-2">2.2 Đặc trưng tiết diện (Section Properties)</h4>
                <table className="w-full text-[10px] border-collapse border border-gray-300 mt-1 font-mono">
                  <thead className="bg-gray-100 font-bold">
                    <tr>
                      <th className="border p-1 text-left">Thông số</th>
                      <th className="border p-1 text-left">Công thức</th>
                      <th className="border p-1 text-left">Thay số</th>
                      <th className="border p-1 text-center">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-1">Chiều cao hiệu dụng e</td>
                      <td className="border p-1">e = d<sub>C</sub> + (t<sub>F1</sub> + t<sub>F2</sub>)/2</td>
                      <td className="border p-1">{results.dC} + ({results.tF1} + {results.tF2})/2</td>
                      <td className="border p-1 text-center font-bold">{results.e.toFixed(2)} mm</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Diện tích mặt ngoài A<sub>f1</sub></td>
                      <td className="border p-1">A<sub>f1</sub> = B × t<sub>F1</sub></td>
                      <td className="border p-1">{config.panelWidth} × {results.tF1}</td>
                      <td className="border p-1 text-center font-bold">{results.Af1.toFixed(0)} mm²</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Diện tích mặt trong A<sub>f2</sub></td>
                      <td className="border p-1">A<sub>f2</sub> = B × t<sub>F2</sub></td>
                      <td className="border p-1">{config.panelWidth} × {results.tF2}</td>
                      <td className="border p-1 text-center font-bold">{results.Af2.toFixed(0)} mm²</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Diện tích lõi A<sub>c</sub></td>
                      <td className="border p-1">A<sub>c</sub> = B × d<sub>C</sub></td>
                      <td className="border p-1">{config.panelWidth} × {results.dC}</td>
                      <td className="border p-1 text-center font-bold">{results.Ac.toFixed(0)} mm²</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Độ cứng uốn EI</td>
                      <td className="border p-1">EI = E<sub>f</sub>·A<sub>f1</sub>·A<sub>f2</sub>/(A<sub>f1</sub>+A<sub>f2</sub>)·e²</td>
                      <td className="border p-1">210000×{results.Af1.toFixed(0)}×{results.Af2.toFixed(0)}/({results.Af1.toFixed(0)}+{results.Af2.toFixed(0)})×{results.e.toFixed(1)}²</td>
                      <td className="border p-1 text-center font-bold">{(results.EI / 1e9).toFixed(2)}×10⁹ Nmm²</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Độ cứng cắt GA</td>
                      <td className="border p-1">GA = G<sub>c</sub> × A<sub>c</sub></td>
                      <td className="border p-1">{config.coreShearModulus} × {results.Ac.toFixed(0)}</td>
                      <td className="border p-1 text-center font-bold">{(results.GA_inst / 1000).toFixed(0)} kN</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Mô-men quán tính quy đổi I<sub>eq</sub></td>
                      <td className="border p-1">I<sub>eq</sub> = EI / E<sub>f</sub></td>
                      <td className="border p-1">{(results.EI / 1e9).toFixed(2)}×10⁹ / 210000</td>
                      <td className="border p-1 text-center font-bold">{(results.I_eq).toFixed(0)} mm⁴</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Khoảng cách lớn nhất z<sub>max</sub></td>
                      <td className="border p-1">z<sub>max</sub> = max(z<sub>out</sub>, z<sub>in</sub>)</td>
                      <td className="border p-1">—</td>
                      <td className="border p-1 text-center font-bold">{results.zMax.toFixed(2)} mm</td>
                    </tr>
                  </tbody>
                </table>

                <h4 className="font-bold text-blue-800 mt-3">2.3 Tổ hợp tải trọng</h4>
                <table className="w-full text-[10px] border-collapse border border-gray-300 mt-1 font-mono">
                  <thead className="bg-gray-100 font-bold">
                    <tr>
                      <th className="border p-1 text-left">Nhóm tải</th>
                      <th className="border p-1 text-center">Giá trị</th>
                      <th className="border p-1 text-center">Đơn vị</th>
                      <th className="border p-1 text-center">γ (ULS)</th>
                      <th className="border p-1 text-center">γ (SLS)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.panelType === 'ceiling' && (
                      <>
                        <tr>
                          <td className="border p-1">Tự trọng q<sub>G</sub></td>
                          <td className="border p-1 text-center">{results.qDead_kPa.toFixed(4)}</td>
                          <td className="border p-1 text-center">kPa</td>
                          <td className="border p-1 text-center">{results.gammaG}</td>
                          <td className="border p-1 text-center">1.0</td>
                        </tr>
                        <tr>
                          <td className="border p-1">Hoạt tải q<sub>Q</sub></td>
                          <td className="border p-1 text-center">{results.qLive_kPa.toFixed(2)}</td>
                          <td className="border p-1 text-center">kPa</td>
                          <td className="border p-1 text-center">{results.gammaQ}</td>
                          <td className="border p-1 text-center">1.0</td>
                        </tr>
                      </>
                    )}
                    <tr>
                      <td className="border p-1">Gió/Áp suất q<sub>W</sub></td>
                      <td className="border p-1 text-center">{Math.abs(results.qWind_kPa).toFixed(2)}</td>
                      <td className="border p-1 text-center">kPa</td>
                      <td className="border p-1 text-center">2.1</td>
                      <td className="border p-1 text-center">1.0</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Chênh lệch nhiệt ΔT</td>
                      <td className="border p-1 text-center">{Math.abs(results.dT_deg)}</td>
                      <td className="border p-1 text-center">°C</td>
                      <td className="border p-1 text-center">{results.gammaThermal}</td>
                      <td className="border p-1 text-center">1.0</td>
                    </tr>
                  </tbody>
                </table>

                <div className="p-2 bg-blue-50 rounded border border-blue-200 mt-2 text-[10px] font-mono">
                  {results.distributedLoadMode === 'per-span' ? (
                    <>
                      <p><strong>Chế độ tải phân bố:</strong> đang dùng <b>theo từng nhịp</b>; mỗi nhịp có bộ qG/qQ riêng trước khi lập tổ hợp.</p>
                      <div className="overflow-x-auto mt-2">
                        <table className="w-full border-collapse border border-blue-200 text-[10px]">
                          <thead className="bg-blue-100">
                            <tr>
                              <th className="border border-blue-200 p-1 text-left">Nhịp</th>
                              <th className="border border-blue-200 p-1 text-center">qG (kPa)</th>
                              <th className="border border-blue-200 p-1 text-center">qQ (kPa)</th>
                              <th className="border border-blue-200 p-1 text-center">qSLS = qG + qQ</th>
                              <th className="border border-blue-200 p-1 text-center">qULS = γG·qG + γQ·qQ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {distributedLoadRows.map((row) => {
                              const tone = PER_SPAN_ROW_TONE[row.tone] || PER_SPAN_ROW_TONE.neutral;
                              return (
                                <tr key={row.spanLabel} className={tone.row}>
                                  <td className={`border border-blue-200 p-1 font-semibold ${tone.emphasis}`}>
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span>{row.spanLabel}</span>
                                      {row.badges.map((badge) => {
                                        const badgeTone = PER_SPAN_ROW_TONE[badge.tone] || PER_SPAN_ROW_TONE.neutral;
                                        return (
                                          <span key={`${row.spanLabel}-${badge.label}`} className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${badgeTone.badge}`}>
                                            {badge.label}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </td>
                                  <td className={`border border-blue-200 p-1 text-center ${tone.cell}`}>{row.qG.toFixed(3)}</td>
                                  <td className={`border border-blue-200 p-1 text-center ${tone.cell}`}>{row.qQ.toFixed(3)}</td>
                                  <td className={`border border-blue-200 p-1 text-center font-semibold ${tone.emphasis}`}>{row.qSLS.toFixed(3)}</td>
                                  <td className={`border border-blue-200 p-1 text-center font-semibold ${tone.emphasis}`}>{row.qULS.toFixed(3)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-2 rounded border border-blue-200 bg-white/70 p-2 space-y-1">
                        <div className="text-[10px] font-semibold text-blue-800">Nhịp nào nên kiểm tra lại</div>
                        <ul className="space-y-1">
                          {perSpanSummaryItems.map((item, idx) => {
                            const toneClass = item.tone === 'danger'
                              ? 'text-rose-700'
                              : item.tone === 'warning'
                                ? 'text-amber-700'
                                : item.tone === 'info'
                                  ? 'text-sky-700'
                                  : 'text-slate-700';
                            return (
                              <li key={`per-span-summary-${idx}`} className={`flex gap-2 text-[10px] leading-relaxed ${toneClass}`}>
                                <span className="mt-[2px] h-1.5 w-1.5 rounded-full bg-current" />
                                <span>{item.text}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <p className="mt-2"><strong>Giá trị điều khiển đang dùng cho báo cáo tổng:</strong> q<sub>ULS,max</sub> = <b>{results.qULS_kPa.toFixed(3)} kPa</b>; q<sub>SLS,max</sub> = <b>{results.qSLS_kPa.toFixed(3)} kPa</b>.</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Tổ hợp ULS:</strong> q<sub>ULS</sub> = {results.gammaG}×{results.qDead_kPa.toFixed(3)} + {results.gammaQ}×{results.qLive_kPa.toFixed(2)} + 2.1×{Math.abs(results.qWind_kPa).toFixed(2)} = <b>{results.qULS_kPa.toFixed(3)} kPa</b></p>
                      <p><strong>Tổ hợp SLS:</strong> q<sub>SLS</sub> = {results.qDead_kPa.toFixed(3)} + {results.qLive_kPa.toFixed(2)} + {Math.abs(results.qWind_kPa).toFixed(2)} = <b>{results.qSLS_kPa.toFixed(3)} kPa</b></p>
                    </>
                  )}
                  <p><strong>Mô-men nhiệt (ULS):</strong> M<sub>t</sub> = EI·α·ΔT·γ<sub>T</sub>/e = {(results.EI / 1e9).toFixed(2)}×10⁹ × 1.2×10⁻⁵ × {Math.abs(results.dT_deg)} × {results.gammaThermal} / {results.e.toFixed(1)} = <b>{results.Mt_ULS_kNm.toFixed(3)} kNm/m</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.4 Kiểm tra ứng suất uốn & wrinkling (ULS)</h4>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Chế độ kiểm tra wrinkling:</strong> {getModeLabel(results.wrinklingMode, WRINKLING_MODE_LABELS)} {results.sigma_w_source ? `(nguồn: ${getModeLabel(results.sigma_w_source, WRINKLING_SOURCE_LABELS)})` : ''}</p>
                  {results.wrinklingDeclaredMissing && (
                    <p className="text-amber-700"><strong>Cảnh báo dữ liệu đầu vào:</strong> đã chọn chế độ khai báo trực tiếp nhưng thiếu ứng suất wrinkling hợp lệ; hệ thống đang fallback tạm sang <b>{getModeLabel(results.wrinklingFallbackMode, WRINKLING_MODE_LABELS)}</b>.</p>
                  )}
                  <p><strong>Ứng suất wrinkling xấp xỉ:</strong> σ<sub>w,approx</sub> = 0.5√(E<sub>f</sub>·E<sub>c</sub>·G<sub>c</sub>) = 0.5×√(210000×{results.compressiveModulus}×{config.coreShearModulus}) = <b>{results.sigma_w_approx.toFixed(1)} MPa</b></p>
                  <p className="text-slate-500"><strong>Ghi chú provenance approx:</strong> hệ số <b>0.5</b> và bộ biến <b>E<sub>f</sub>, E<sub>c</sub>, G<sub>c</sub></b> hiện đã được externalize là <b>xấp xỉ kỹ thuật nội bộ</b>; repo <b>chưa có citation trực tiếp</b> để nâng thành công thức source-backed.</p>
                  <p><strong>Ứng suất wrinkling khai báo:</strong> σ<sub>w,declared</sub> = <b>{results.sigma_w_declared.toFixed(1)} {results?.wrinklingMeta?.declaredInput?.unit || 'MPa'}</b></p>
                  <p><strong>Semantic giá trị khai báo:</strong> {results?.wrinklingMeta?.declaredInput?.basis || 'design-resistance'} / {results?.wrinklingMeta?.declaredInput?.sourceType || 'unknown'} {results?.wrinklingMeta?.declaredInput?.sourceRef ? `(ref: ${results.wrinklingMeta.declaredInput.sourceRef})` : ''}</p>
                  {results?.wrinklingMeta?.declaredInput?.productContext && (
                    <p><strong>Context sản phẩm:</strong> {results.wrinklingMeta.declaredInput.productContext}</p>
                  )}
                  {results?.wrinklingMeta?.declaredInput?.sourceNote && (
                    <p><strong>Ghi chú nguồn:</strong> {results.wrinklingMeta.declaredInput.sourceNote}</p>
                  )}
                  <p className="text-slate-500"><strong>Ghi chú provenance declared:</strong> khi chọn <b>Khai báo trực tiếp</b>, repo giữ con số MPa ở trạng thái <b>user-declared</b> trừ khi có đúng table/test/worksheet chứa giá trị đó. Repo hiện đã có thêm một vendor technical guide cấp product-family nêu rõ failure mode <b>“wrinkling of the face layer in the span and at an intermediate support”</b>, nên basis/source framing đỡ mơ hồ hơn; nhưng đợt hunt artifact hiện tại vẫn <b>chưa tìm được</b> vendor MPa table, test report, archived worksheet, hay product-manual numeric line đủ mạnh để nâng con số MPa declared này thành source-backed.</p>
                  <p><strong>Ứng suất wrinkling dùng trong kiểm tra:</strong> σ<sub>w</sub> = <b>{results.sigma_w.toFixed(1)} MPa</b></p>
                  <p><strong>Ứng suất thiết kế wrinkling:</strong> σ<sub>w,d</sub> = σ<sub>w</sub>/γ<sub>M,w</sub> = {results.sigma_w.toFixed(1)}/{results?.wrinklingMeta?.factorProvenance?.value || 1.2} = <b>{results.sigma_w_design.toFixed(1)} MPa</b></p>
                  <p className="text-slate-500"><strong>Ghi chú provenance γ<sub>M,w</sub>:</strong> repo hiện áp dụng γ<sub>M,w</sub> = <b>{results?.wrinklingMeta?.factorProvenance?.value || 1.2}</b> nhất quán, nhưng chưa source-link được giá trị này tới clause/vendor/worksheet chấp nhận.</p>
                  <p><strong>Thiết kế chảy:</strong> σ<sub>y,d</sub> = f<sub>y</sub>/γ<sub>M,y</sub> = {config.steelYield}/1.1 = <b>{results.sigma_y_design.toFixed(1)} MPa</b></p>
                  <p><strong>Giới hạn:</strong> {results?.effectiveWrinklingMode === 'yield-only'
                    ? <>σ<sub>limit</sub> = σ<sub>y,d</sub> = <b>{results.sigma_limit.toFixed(1)} MPa</b></>
                    : <>σ<sub>limit</sub> = min(σ<sub>w,d</sub>, σ<sub>y,d</sub>) = min({results.sigma_w_design.toFixed(1)}, {results.sigma_y_design.toFixed(1)}) = <b>{results.sigma_limit.toFixed(1)} MPa</b></>}</p>
                  <p><strong>Ứng suất tính toán (Nhịp):</strong> σ<sub>Ed</sub> = M<sub>Ed</sub>·z<sub>max</sub>/I<sub>eq</sub> = <b>{results.stress_span.toFixed(1)} MPa</b> → Tỷ lệ = <b>{(results.ratios.bending * 100).toFixed(0)}%</b></p>
                  <p><strong>Ứng suất tính toán (Gối):</strong> σ<sub>Ed</sub> = <b>{results.stress_support.toFixed(1)} MPa</b> → Tỷ lệ = <b>{(results.ratios.support * 100).toFixed(0)}%</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.5 Kiểm tra lực cắt (ULS)</h4>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Chế độ phân phối nội lực:</strong> {getModeLabel(results.redistributionMode, REDISTRIBUTION_MODE_LABELS)} {results.redistributionEnabled ? '(đã bật tái phân phối nội lực theo cơ chế khớp)' : '(chỉ dùng bao nội lực đàn hồi)'}</p>
                  <p><strong>Khả năng chịu cắt:</strong> V<sub>Rd</sub> = f<sub>Cv</sub>·A<sub>c</sub>/γ<sub>M</sub> = {config.coreShearStrength}×{results.Ac.toFixed(0)}/1.25 = <b>{(results.V_Rd / 1000).toFixed(2)} kN/m</b></p>
                  <p><strong>Lực cắt tính toán:</strong> V<sub>Ed,max</sub> = <b>{(results.maxShear / 1000).toFixed(2)} kN/m</b></p>
                  <p><strong>Tỷ lệ:</strong> V<sub>Ed</sub>/V<sub>Rd</sub> = {(results.maxShear / 1000).toFixed(2)}/{(results.V_Rd / 1000).toFixed(2)} = <b>{(results.ratios.shear * 100).toFixed(0)}%</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.6 Kiểm tra độ võng (SLS)</h4>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Giới hạn:</strong> w<sub>limit</sub> = L/{results.limitDenom} = {(Math.max(...config.spans) * 1000).toFixed(0)}/{results.limitDenom} = <b>{results.w_limit.toFixed(1)} mm</b></p>
                  <p><strong>Độ võng tính toán:</strong> w<sub>total</sub> = w<sub>mech</sub> + w<sub>thermal</sub> + w<sub>creep</sub> = <b>{results.maxDeflection.toFixed(1)} mm</b></p>
                  <p><strong>Tỷ lệ:</strong> w<sub>total</sub>/w<sub>limit</sub> = {results.maxDeflection.toFixed(1)}/{results.w_limit.toFixed(1)} = <b>{(results.ratios.deflection * 100).toFixed(0)}%</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.7 Kiểm tra lực nhổ / liên kết chống nhổ (ULS)</h4>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Phạm vi kiểm tra uplift:</strong> {results.upliftEnabled ? 'Đang bật vì panel không phải ceiling và có screwStrength > 0.' : 'Không áp dụng cho case hiện tại.'}</p>
                  <p><strong>screwStrength khai báo:</strong> <b>{Number(results?.technicalTransparency?.uplift?.declaredInput?.value || 0).toFixed(2)} {results?.technicalTransparency?.uplift?.declaredInput?.unit || 'kN'}</b> / mỗi vít</p>
                  <p><strong>Semantic giá trị khai báo:</strong> {results?.technicalTransparency?.uplift?.declaredInput?.basis || 'design-resistance-per-fastener'} / {results?.technicalTransparency?.uplift?.declaredInput?.sourceType || 'unknown'} {results?.technicalTransparency?.uplift?.declaredInput?.sourceRef ? `(ref: ${results.technicalTransparency.uplift.declaredInput.sourceRef})` : ''}</p>
                  {results?.technicalTransparency?.uplift?.declaredInput?.fastenerContext && (
                    <p><strong>Context vít/liên kết:</strong> {results.technicalTransparency.uplift.declaredInput.fastenerContext}</p>
                  )}
                  {results?.technicalTransparency?.uplift?.declaredInput?.sourceNote && (
                    <p><strong>Ghi chú nguồn:</strong> {results.technicalTransparency.uplift.declaredInput.sourceNote}</p>
                  )}
                  {!results?.technicalTransparency?.uplift?.declaredInput?.isSourceDocumented && results.upliftEnabled && (
                    <p className="text-slate-500"><strong>Ghi chú provenance screwStrength:</strong> hiện <b>chưa có documented source</b> cho con số kN đang dùng, nên repo chỉ coi đây là <b>user-declared per-fastener resistance</b>, chưa nâng thành source-backed capacity. T3 artifact hunt chỉ tìm được vendor installation guidance xác nhận fastening phải được dimension case-by-case theo <b>fastener-manufacturer instructions / research results</b>; đây là acquisition-path context, không phải numeric authority cho chính giá trị kN.</p>
                  )}
                  <p><strong>Quy tắc đếm vít hiện hành:</strong> {results?.technicalTransparency?.uplift?.declaredInput?.spacingMeaning || results?.technicalTransparency?.uplift?.inputSchema?.spacingMeaning || 'spacing across panelWidth for simplified count estimate'} → screwCount = <b>{results.screwCount}</b></p>
                  <p><strong>Sức kháng thiết kế uplift:</strong> T<sub>Rd</sub> = screwStrength × screwCount / γ<sub>M,screw</sub> = {Number(results?.technicalTransparency?.uplift?.declaredInput?.value || 0).toFixed(2)} × {results.screwCount} / {results?.technicalTransparency?.uplift?.factor?.value || 1.33} = <b>{(results.T_Rd_Worst / 1000).toFixed(2)} kN</b></p>
                  <p className="text-slate-500"><strong>Ghi chú provenance γ<sub>M,screw</sub> & count rule:</strong> repo externalize rõ <b>γ<sub>M,screw</sub></b> và rule <b>round(panelWidth / screwSpacing)</b>, nhưng cả hai hiện vẫn là <b>implementation-visible source gap</b>; chưa có clause/vendor worksheet được attach để nâng authority.</p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.8 Trường hợp chi phối</h4>
                <div className="p-2 bg-amber-50 rounded border border-amber-200 mt-1 text-[10px] font-mono space-y-1">
                  {governingCaseRows.map(({ caseKey, item }) => (
                    <p key={caseKey}>
                      <strong>{caseKey === CAPACITY_GOVERNING_CASE_KEYS.OVERALL ? 'Tổng thể' : getCapacityLabel(caseKey, caseKey)}:</strong> {item.label} — {(item.ratio * 100).toFixed(0)}%
                    </p>
                  ))}
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.9 Kết quả tổng hợp</h4>
                <table className="w-full text-xs border-collapse border border-gray-300 mt-1">
                  <thead className="bg-gray-100 font-bold text-gray-700">
                    <tr>
                      <th className="border p-2 text-left">Hạng mục</th>
                      <th className="border p-2 text-center">S_d</th>
                      <th className="border p-2 text-center">R_d</th>
                      <th className="border p-2 text-center">S/R</th>
                      <th className="border p-2 text-center">Kết luận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capacityReportRows.map((row) => (
                      <tr key={row.key}>
                        <td className="border p-2">{row.label}</td>
                        <td className="border p-2 text-center">{row.demand}</td>
                        <td className="border p-2 text-center">{row.resistance}</td>
                        <td className={`border p-2 text-center font-bold ${row.ratio > 1 ? 'text-red-600' : 'text-green-600'}`}>{(row.ratio * 100).toFixed(0)}%</td>
                        <td className={`border p-2 text-center font-bold ${row.ratio <= 1 ? 'text-green-600' : 'text-red-600'}`}>{row.ratio <= 1 ? 'ĐẠT' : 'KHÔNG ĐẠT'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-6 report-section">
              <h3 className="text-sm font-bold border-b border-gray-400 mb-4 uppercase flex items-center gap-2">
                <Activity size={14} /> 3. Biểu đồ Nội lực & Chuyển vị
              </h3>

              <div className="flex flex-col gap-6">
                {/* ✅ Sơ đồ tính trong báo cáo */}
                <div className="border border-gray-100 rounded p-2 avoid-break">
                  <h4 className="text-xs font-bold text-center mb-1">
                    {config.panelType === 'ceiling' ? 'Sơ đồ tính trần (X toàn dầm)' : 'Sơ đồ tính (tải + gối)'}
                  </h4>

                  {config.panelType === 'ceiling' ? (
                    <CeilingSchematic config={config} results={results} />
                  ) : (
                    <BeamDiagram
                      spansM={config.spans}
                      windDirection={config.windDirection}
                      windPressure={config.windPressure}
                    />
                  )}
                </div>

                {/* REPORT: DEFLECTION CHART */}
                <div className="h-48 report-chart border border-gray-100 rounded p-2 avoid-break">
                  <h4 className="text-xs font-bold text-center mb-1">Chuyển vị [mm]</h4>
                  <ResponsiveContainer width={printMode ? 700 : '100%'} height="100%">
                    <ComposedChart
                      data={results.chartData}
                      margin={{ top: 8, right: 36, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="x"
                        type="number"
                        domain={[0, 'dataMax']}
                        ticks={results.supportLocs}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        reversed
                        width={60}
                        unit="mm"
                        tick={{ fontSize: 10 }}
                        tickMargin={6}
                      />

                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                      <Legend
                        className="report-legend"
                        verticalAlign="top"
                        height={22}
                        iconSize={10}
                        wrapperStyle={{ fontSize: 10 }}
                      />

                      <ReferenceLine y={0} stroke="#000" />
                      {results.supportLocs.map((loc, idx) => (
                        <ReferenceLine key={idx} x={loc} stroke="#e5e7eb" strokeDasharray="3 3" />
                      ))}

                      {results.extrema?.deflectionTotal && (
                        <>
                          <ReferenceLine
                            x={results.extrema.deflectionTotal.max.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Lớn nhất: ${results.extrema.deflectionTotal.max.value.toFixed(1)} mm`,
                              position: 'insideTop',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                          <ReferenceLine
                            x={results.extrema.deflectionTotal.min.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Nhỏ nhất: ${results.extrema.deflectionTotal.min.value.toFixed(1)} mm`,
                              position: 'insideBottom',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                        </>
                      )}

                      <Line
                        type="monotone"
                        dataKey="deflectionWind"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        name={config.panelType === 'ceiling' ? 'Cơ học (có creep)' : 'Gió'}
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />

                      <Line
                        type="monotone"
                        dataKey="deflectionCreep"
                        stroke="#64748b"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        name="Từ biến (creep)"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />

                      <Line
                        type="monotone"
                        dataKey="deflectionThermal"
                        stroke="#ff7300"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Nhiệt"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />

                      {/* ✅ Tổng: fill vùng về 0 */}
                      <Area
                        type="monotone"
                        dataKey="deflectionTotal"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.18}
                        baseValue={0}
                        name="Tổng"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />

                      <Line
                        type="step"
                        dataKey="limitPlus"
                        stroke="red"
                        strokeWidth={1}
                        strokeDasharray="10 5"
                        name="Giới hạn (+)"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="step"
                        dataKey="limitMinus"
                        stroke="red"
                        strokeWidth={1}
                        strokeDasharray="10 5"
                        name="Giới hạn (-)"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* REPORT: MOMENT CHART */}
                <div className="h-48 report-chart border border-gray-100 rounded p-2 avoid-break">
                  <h4 className="text-xs font-bold text-center mb-1">Mô-men uốn [kNm]</h4>
                  <ResponsiveContainer width={printMode ? 700 : '100%'} height="100%">
                    <ComposedChart
                      data={results.chartData}
                      margin={{ top: 8, right: 36, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="x"
                        type="number"
                        domain={[0, 'dataMax']}
                        ticks={results.supportLocs}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        reversed
                        width={60}
                        unit="kNm"
                        tick={{ fontSize: 10 }}
                        tickMargin={6}
                      />

                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                      <Legend
                        className="report-legend"
                        verticalAlign="top"
                        height={22}
                        iconSize={10}
                        wrapperStyle={{ fontSize: 10 }}
                      />

                      <ReferenceLine y={0} stroke="#000" />
                      {results.supportLocs.map((loc, idx) => (
                        <ReferenceLine key={idx} x={loc} stroke="#e5e7eb" strokeDasharray="3 3" />
                      ))}

                      {results.extrema?.moment && (
                        <>
                          <ReferenceLine
                            x={results.extrema.moment.max.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Lớn nhất: ${results.extrema.moment.max.value.toFixed(2)} kNm`,
                              position: 'insideTop',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                          <ReferenceLine
                            x={results.extrema.moment.min.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Nhỏ nhất: ${results.extrema.moment.min.value.toFixed(2)} kNm`,
                              position: 'insideBottom',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                        </>
                      )}

                      <Area
                        type="monotone"
                        dataKey="moment"
                        stroke="#ff7300"
                        fill="#fff7ed"
                        strokeWidth={1.5}
                        name="Mô-men"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* REPORT: SHEAR CHART */}
                <div className="h-48 report-chart border border-gray-100 rounded p-2 avoid-break">
                  <h4 className="text-xs font-bold text-center mb-1">Lực cắt [kN]</h4>
                  <ResponsiveContainer width={printMode ? 700 : '100%'} height="100%">
                    <AreaChart
                      data={results.chartData}
                      margin={{ top: 8, right: 36, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="x"
                        type="number"
                        domain={[0, 'dataMax']}
                        ticks={results.supportLocs}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        reversed
                        width={60}
                        unit="kN"
                        tick={{ fontSize: 10 }}
                        tickMargin={6}
                      />

                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                      <Legend
                        className="report-legend"
                        verticalAlign="top"
                        height={22}
                        iconSize={10}
                        wrapperStyle={{ fontSize: 10 }}
                      />

                      <ReferenceLine y={0} stroke="#000" />
                      {results.supportLocs.map((loc, idx) => (
                        <ReferenceLine key={idx} x={loc} stroke="#e5e7eb" strokeDasharray="3 3" />
                      ))}

                      {results.extrema?.shear && (
                        <>
                          <ReferenceLine
                            x={results.extrema.shear.max.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Lớn nhất: ${results.extrema.shear.max.value.toFixed(2)} kN`,
                              position: 'insideTop',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                          <ReferenceLine
                            x={results.extrema.shear.min.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Nhỏ nhất: ${results.extrema.shear.min.value.toFixed(2)} kN`,
                              position: 'insideBottom',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                        </>
                      )}

                      <Area
                        type="linear"
                        dataKey="shear"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.25}
                        name="Lực Cắt"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* REPORT: REACTION CHART */}
                <div className="h-48 report-chart border border-gray-100 rounded p-2 avoid-break">
                  <h4 className="text-xs font-bold text-center mb-1">Biểu đồ phản lực gối (Reaction) [kN]</h4>
                  <div className="mb-2">
                    <ReactionLegend />
                  </div>
                  <ResponsiveContainer width={printMode ? 700 : '100%'} height="100%">
                    <BarChart
                      data={results.reactionData}
                      margin={{ top: 8, right: 36, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis width={60} unit="kN" tick={{ fontSize: 10 }} tickMargin={6} />

                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                      <Bar dataKey="R_Ed" name="Phản lực" barSize={30} isAnimationActive={!printMode}>
                        {results.reactionData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.status === 'fail' ? REACTION_FAIL_COLOR : REACTION_PASS_COLOR}
                          />
                        ))}
                      </Bar>

                      <Bar
                        dataKey="F_Rd"
                        name="Giới hạn"
                        fill={REACTION_LIMIT_COLOR}
                        stroke={REACTION_LIMIT_BORDER}
                        strokeDasharray="3 3"
                        barSize={30}
                        isAnimationActive={!printMode}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {compareModeEnabled && compareMetricRows.length > 0 && (
              <div className="mb-6 report-section">
                <h3 className="text-sm font-bold border-b border-gray-400 mb-3 uppercase flex items-center gap-2">
                  <Activity size={14} /> 4. So sánh phương án
                </h3>
                <div className="rounded border border-violet-200 bg-violet-50 p-3">
                  <div className="text-xs text-violet-900 mb-3">Bảng này gom ngắn gọn các chỉ tiêu quyết định để so 2–3 phương án song song, không thay flow báo cáo chi tiết của phương án đang mở.</div>
                  {results.compareSummary?.available && (
                    <div className="mb-3 grid gap-2 md:grid-cols-3 text-xs">
                      <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                        <div className="text-violet-500">Phương án nên đọc trước</div>
                        <div className="mt-1 font-bold text-violet-900">{results.compareSummary.bestVariantLabel || '—'}</div>
                        <div className="text-[11px] text-slate-500">{results.compareSummary.bestStatus === 'pass' ? 'Đạt' : 'Không đạt'} · {results.compareSummary.bestRatio != null ? formatRatioPercent(results.compareSummary.bestRatio) : '—'}{results.compareSummary.bestMarginPercent != null ? ` · margin ${results.compareSummary.bestMarginPercent.toFixed(1)}%` : ''}</div>
                      </div>
                      <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                        <div className="text-violet-500">Tổng số phương án đạt</div>
                        <div className="mt-1 font-bold text-violet-900">{results.compareSummary.passCount}/{results.compareSummary.variantCount}</div>
                        <div className="text-[11px] text-slate-500">{results.compareSummary.allPass ? 'Tất cả phương án đều đạt.' : results.compareSummary.mixedStatus ? 'Có phương án đạt, có phương án không đạt.' : 'Chưa có phương án nào đạt hoàn toàn.'}</div>
                      </div>
                      <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                        <div className="text-violet-500">Case chi phối của PA ưu tiên</div>
                        <div className="mt-1 font-bold text-violet-900">{results.compareSummary.bestGoverningLabel || '—'}</div>
                        <div className="text-[11px] text-slate-500">{results.compareSummary.rationale || 'Tóm tắt để chốt shortlist trước khi xem bảng chi tiết.'}</div>
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs bg-white">
                      <thead>
                        <tr className="bg-violet-100 text-violet-950">
                          <th className="border border-violet-200 p-2 text-left">Chỉ tiêu</th>
                          {compareResults.map((variant) => (
                            <th key={`report-compare-${variant.id}`} className="border border-violet-200 p-2 text-left">{variant.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {compareMetricRows.map((row) => (
                          <tr key={`report-row-${row.key}`}>
                            <td className="border border-violet-200 p-2 font-semibold text-slate-700">{row.label}</td>
                            {row.values.map((cell) => {
                              const toneClass = cell.tone === 'pass'
                                ? 'text-emerald-700'
                                : cell.tone === 'fail'
                                  ? 'text-rose-700'
                                  : cell.tone === 'muted'
                                    ? 'text-slate-400'
                                    : 'text-slate-800';
                              return (
                                <td key={`report-cell-${row.key}-${cell.variantId}`} className={`border border-violet-200 p-2 font-semibold ${cell.isBest ? 'bg-emerald-50/70' : ''} ${toneClass}`.trim()}>
                                  <div className="flex items-center gap-2">
                                    <span>{cell.value}</span>
                                    {cell.isBest && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Best</span>}
                                  </div>
                                  {cell.subValue && <div className="text-[10px] font-medium text-slate-500">{cell.subValue}</div>}
                                  {cell.diffHint && <div className="text-[10px] font-medium text-slate-500">{cell.diffHint}</div>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded border border-slate-200 report-section report-conclusion">
              <h3 className="text-sm font-bold uppercase mb-2 text-slate-700 flex items-center gap-2"><Info size={14} /> 5. Kết luận & khuyến nghị</h3>
              <div className="space-y-3">
                <div className={`font-bold text-sm ${results.status === 'pass' ? 'text-green-700' : 'text-red-700'}`}>
                  {results.status === 'pass' ? 'KẾT CẤU ĐẢM BẢO KHẢ NĂNG CHỊU LỰC' : 'KẾT CẤU KHÔNG ĐẠT YÊU CẦU - CẦN ĐIỀU CHỈNH'}
                </div>
                <TransparencyPanel results={results} />
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  {results.advice.map((item, i) => (<li key={i}>{item}</li>))}
                </ul>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
              <button
                type="button"
                onClick={handleExportPackage}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-5 py-2 font-bold text-emerald-800 shadow hover:bg-emerald-100 flex items-center gap-2 transition-colors"
              >
                <FileJson size={18} />Xuất result package JSON (release-stamped)
              </button>
              <button
                onClick={handlePrint}
                className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-red-700 flex items-center gap-2 transition-colors"
              >
                <Printer size={20} />Xuất PDF / Lưu báo cáo
              </button>
            </div>

            <div className="mt-8 text-[10px] text-center text-slate-400 italic space-y-1">
              <div>Báo cáo được tạo tự động bởi phần mềm {APP_DISPLAY_NAME}.</div>
              <div>{buildReleaseStamp(resolvedAppVersion)} · channel: {resolvedReleaseChannel}</div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }

          html, body { height: auto !important; overflow: visible !important; }
          .app-root { height: auto !important; overflow: visible !important; }
          main { height: auto !important; overflow: visible !important; padding: 0 !important; }

          body { background: white !important; }
          header, nav, button { display: none !important; }

          #tab-input, #tab-charts { display: none !important; }
          #tab-report { display: block !important; position: static !important; }

          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          .report-sheet { padding: 6mm !important; }
          .report-section { margin-bottom: 12px !important; }
          .report-chart {
            height: 170px !important;
            padding: 6px 14px 6px 6px !important;
            overflow: visible !important;
          }
          .report-chart .recharts-responsive-container {
            width: 96% !important;
            margin: 0 auto !important;
          }
          .report-legend { display: none !important; }
          .recharts-text { font-size: 8px !important; }
          .recharts-cartesian-axis-tick-value { font-size: 8px !important; }
          .report-conclusion { margin-top: 6px !important; }
        }
      `}</style>
    </div>
  );
}
