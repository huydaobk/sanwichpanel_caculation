import { buildCapacityCheckTransparency } from './capacityTaxonomy.js';
import {
  FASTENER_UPLIFT_FACTOR,
  FASTENER_UPLIFT_INPUT_SCHEMA,
  SUPPORT_CRUSHING_FACTOR,
  SUPPORT_CRUSHING_RESISTANCE,
  resolveFastenerUpliftDeclaredMetadata,
} from './section.js';
import externalValidationFixture from '../../tests/fixtures/external-validation-cases.json' with { type: 'json' };

const VALIDATION_CLASS_LABELS = {
  'external-captured': 'External benchmark captured',
  'internal-captured': 'Internal benchmark captured',
  scaffold: 'Validation scaffold only',
};

const VALIDATION_STATUS_LABELS = {
  captured: 'Captured',
  partial: 'Partial',
  scaffold: 'Scaffold',
};

const TRANSPARENCY_LEVEL_LABELS = {
  high: 'High transparency',
  medium: 'Medium transparency',
  low: 'Limited transparency',
};

const DEFAULT_COMPARE_SUMMARY = {
  available: false,
  variantCount: 0,
  bestVariantId: null,
  bestVariantLabel: null,
  bestStatus: null,
  bestRatio: null,
  bestGoverningLabel: null,
  bestMarginPercent: null,
  rationale: null,
  passCount: 0,
  allPass: false,
  mixedStatus: false,
};

const VALIDATION_CASES = Array.isArray(externalValidationFixture?.cases) ? externalValidationFixture.cases : [];

const buildValidationSummary = () => {
  const capturedCases = VALIDATION_CASES.filter((item) => item?.status === 'captured');
  const externalCaptured = capturedCases.filter((item) => item?.benchmarkClass === 'external-captured');
  const internalCaptured = capturedCases.filter((item) => item?.benchmarkClass === 'internal-captured');
  const scaffoldCases = VALIDATION_CASES.filter((item) => item?.benchmarkClass === 'scaffold' || item?.status === 'scaffold');

  const headlineClass = externalCaptured.length > 0
    ? 'external-captured'
    : internalCaptured.length > 0
      ? 'internal-captured'
      : scaffoldCases.length > 0
        ? 'scaffold'
        : 'scaffold';

  return {
    totalCases: VALIDATION_CASES.length,
    capturedCount: capturedCases.length,
    externalCapturedCount: externalCaptured.length,
    internalCapturedCount: internalCaptured.length,
    scaffoldCount: scaffoldCases.length,
    headlineClass,
    headlineLabel: VALIDATION_CLASS_LABELS[headlineClass] || headlineClass,
    statusLabel: VALIDATION_STATUS_LABELS[capturedCases.length > 0 ? 'captured' : 'scaffold'],
    keyCases: [...externalCaptured, ...internalCaptured].slice(0, 4).map((item) => ({
      id: item.id,
      title: item.title,
      benchmarkClass: item.benchmarkClass || (item.status === 'captured' ? 'captured' : 'scaffold'),
      benchmarkLabel: VALIDATION_CLASS_LABELS[item.benchmarkClass] || item.benchmarkClass || item.status,
      referenceType: item.referenceType || null,
      status: item.status || null,
    })),
  };
};

const getCheckTone = (ratio = 0) => {
  if (ratio > 1) return 'fail';
  if (ratio >= 0.85) return 'warning';
  return 'pass';
};

const buildProfessionalBadges = ({ results, config }) => {
  const overallRatio = Number(results?.governingCases?.overall?.ratio || 0);
  const checks = results?.technicalTransparency?.checks || {};
  const reliabilities = Object.values(checks)
    .filter((item) => item?.enabled !== false)
    .map((item) => item?.reliability)
    .filter(Boolean);
  const exactCount = reliabilities.filter((value) => value === 'exact-limit-state').length;
  const approximationCount = reliabilities.filter((value) => value === 'engineering-approximation').length;
  const inputDependentCount = reliabilities.filter((value) => value === 'input-dependent' || value === 'user-declared').length;

  let transparencyLevel = 'medium';
  if (inputDependentCount >= 3 || results?.wrinklingDeclaredMissing) transparencyLevel = 'low';
  else if (exactCount >= 1 && approximationCount === 0 && inputDependentCount <= 1) transparencyLevel = 'high';

  return {
    status: {
      key: results?.status === 'pass' ? 'pass' : 'fail',
      label: results?.status === 'pass' ? 'PASS' : 'FAIL',
      detail: `${((overallRatio || 0) * 100).toFixed(0)}% utilization`,
    },
    validation: {
      ...buildValidationSummary(),
    },
    benchmarkClass: {
      key: buildValidationSummary().headlineClass,
      label: buildValidationSummary().headlineLabel,
      detail: `${buildValidationSummary().externalCapturedCount} external / ${buildValidationSummary().internalCapturedCount} internal captured cases`,
    },
    transparency: {
      key: transparencyLevel,
      label: TRANSPARENCY_LEVEL_LABELS[transparencyLevel] || transparencyLevel,
      detail: results?.wrinklingDeclaredMissing
        ? 'Declared wrinkling input missing → fallback active'
        : `${exactCount} exact · ${approximationCount} approx · ${inputDependentCount} input-dependent`,
    },
    panel: {
      key: config?.panelType || 'unknown',
      label: config?.panelType === 'ceiling' ? 'Ceiling panel' : config?.panelType === 'external' ? 'External wall panel' : 'Internal wall panel',
      detail: `${(config?.spans || []).length} spans · ${Number(config?.coreThickness || 0)} mm core`,
    },
  };
};

const buildAssumptions = ({ results, config }) => {
  const assumptions = [
    `Solver uses continuous-beam FEM (Timoshenko) with current repository sign conventions and reporting envelope logic.`,
    `Section resistance/check reporting follows current input semantics for wrinkling, shear core strength, support width, and uplift fastener resistance.`,
    `Wind is reported in ${config?.windDirection === 'suction' ? 'suction' : 'pressure'} mode at ${Number(config?.windPressure || 0).toFixed(2)} kPa; thermal differential uses ΔT = ${Math.abs(Number(results?.dT_deg || 0)).toFixed(1)} °C.`,
    results?.distributedLoadMode === 'per-span'
      ? 'Distributed load model is per-span: each span keeps its own qG/qQ set before combinations are assembled.'
      : 'Distributed load model is uniform: all spans share the same qG/qQ set as the legacy flow.',
  ];

  if (results?.creepMode && results.creepMode !== 'none') {
    assumptions.push(`Creep is active in SLS with mode ${results.creepMode} (φ = ${Number(results?.phiShear || 0).toFixed(2)}${Number(results?.phiBending || 0) > 0 ? `, φb = ${Number(results?.phiBending || 0).toFixed(2)}` : ''}).`);
  }

  if (config?.panelType !== 'ceiling') {
    assumptions.push(`Uplift check is ${results?.upliftEnabled ? 'active' : 'inactive'} based on current wall mode and screwStrength input path.`);
  }

  return assumptions;
};

const buildLimitations = ({ results, config }) => {
  const limitations = [
    'Captured validation coverage improves confidence in the current solver/reporting path, but does not by itself make the app a substitute for project-specific code approval or vendor-certified design sheets.',
    'Transparency classes reflect provenance, not legal authority: user-declared or approximation-based inputs still require engineering judgment and source review before formal issue.',
  ];

  if (results?.technicalTransparency?.wrinkling?.declaredInput && !results.technicalTransparency.wrinkling.declaredInput.isSourceDocumented) {
    limitations.push('Wrinkling declared path is still user-declared unless a source-linked vendor/test/worksheet reference is attached to the actual numeric value used.');
  }

  if (results?.upliftEnabled && !results?.technicalTransparency?.uplift?.declaredInput?.isSourceDocumented) {
    limitations.push('Uplift resistance remains dependent on declared fastener capacity input; current report exposes provenance but does not upgrade that value into a source-backed fastening certification.');
  }

  if (config?.enableSpanDistributedLoads === true && config?.panelType === 'ceiling') {
    limitations.push('Per-span distributed load workflow keeps the legacy global wind treatment; wind is not yet discretized independently by span in this report version.');
  }

  if (results?.wrinklingDeclaredMissing) {
    limitations.push(`Declared wrinkling input was missing, so the report is currently relying on fallback mode: ${results?.wrinklingFallbackMode || 'yield-only'}.`);
  }

  return limitations;
};

const buildCheckHighlights = ({ results, config }) => {
  const rows = [
    {
      key: 'overall',
      label: 'Overall governing case',
      value: results?.governingCases?.overall?.label || '—',
      ratio: Number(results?.governingCases?.overall?.ratio || 0),
    },
    {
      key: 'moment',
      label: 'Moment / stress',
      value: results?.governingCases?.moment?.label || '—',
      ratio: Math.max(Number(results?.ratios?.bending || 0), Number(results?.ratios?.support || 0)),
    },
    {
      key: 'shear',
      label: 'Core shear',
      value: `${(Number(results?.maxShear || 0) / 1000).toFixed(2)} / ${(Number(results?.V_Rd || 0) / 1000).toFixed(2)} kN`,
      ratio: Number(results?.ratios?.shear || 0),
    },
    {
      key: 'crushing',
      label: 'Support crushing',
      value: `${(Number(results?.maxReaction || 0) / 1000).toFixed(2)} / ${(Number(results?.F_Rd_Worst || 0) / 1000).toFixed(2)} kN`,
      ratio: Number(results?.ratios?.crushing || 0),
    },
    {
      key: 'deflection',
      label: 'Deflection SLS',
      value: `${Number(results?.maxDeflection || 0).toFixed(1)} / ${Number(results?.w_limit || 0).toFixed(1)} mm`,
      ratio: Number(results?.ratios?.deflection || 0),
    },
  ];

  if (config?.panelType !== 'ceiling') {
    rows.push({
      key: 'uplift',
      label: 'Uplift',
      value: results?.upliftEnabled
        ? `${(Number(results?.maxUplift || 0) / 1000).toFixed(2)} / ${(Number(results?.T_Rd_Worst || 0) / 1000).toFixed(2)} kN`
        : 'N/A',
      ratio: results?.upliftEnabled ? Number(results?.ratios?.uplift || 0) : null,
    });
  }

  return rows.map((item) => ({
    ...item,
    tone: item.ratio == null ? 'neutral' : getCheckTone(item.ratio),
  }));
};

const compareSummaryTieBreaker = (a, b) => {
  if ((a.status === 'pass') !== (b.status === 'pass')) return a.status === 'pass' ? -1 : 1;
  if (a.ratio !== b.ratio) return a.ratio - b.ratio;
  if (a.deflectionRatio !== b.deflectionRatio) return a.deflectionRatio - b.deflectionRatio;
  if (a.crushingRatio !== b.crushingRatio) return a.crushingRatio - b.crushingRatio;
  return a.label.localeCompare(b.label, 'vi');
};

const buildCompareRationale = ({ best, runnerUp, passCount, variantCount }) => {
  if (!best) return null;

  if (best.status === 'pass') {
    if (passCount === 1) {
      return `${best.label} là phương án đạt duy nhất trong compare set nên được ưu tiên đọc trước.`;
    }

    if (runnerUp && Number.isFinite(runnerUp.ratio)) {
      const ratioGap = runnerUp.ratio - best.ratio;
      if (ratioGap > 0.02) {
        return `${best.label} đang an toàn hơn phương án kế tiếp khoảng ${(ratioGap * 100).toFixed(1)} điểm % utilization.`;
      }
    }

    return `${best.label} đang là phương án đạt có utilization thấp nhất trong ${variantCount} phương án.`;
  }

  return `${best.label} chưa đạt nhưng là phương án gần đạt nhất (utilization thấp nhất) nên nên đọc trước để tối ưu tiếp.`;
};

export const buildCompareExecutiveSummary = (variants = []) => {
  if (!Array.isArray(variants) || variants.length < 2) return { ...DEFAULT_COMPARE_SUMMARY };

  const normalized = variants.map((variant) => ({
    id: variant?.id,
    label: variant?.label || variant?.name || variant?.id,
    status: variant?.summary?.status || 'fail',
    ratio: Number(variant?.summary?.governingCases?.overall?.ratio || 0),
    governingLabel: variant?.summary?.governingCases?.overall?.label || '—',
    deflectionRatio: Number(variant?.summary?.ratios?.deflection || 0),
    crushingRatio: Number(variant?.summary?.ratios?.crushing || 0),
  }));

  const ranked = [...normalized].sort(compareSummaryTieBreaker);
  const passCount = normalized.filter((item) => item.status === 'pass').length;
  const [best, runnerUp] = ranked;
  const bestMarginPercent = best ? Number(((1 - best.ratio) * 100).toFixed(1)) : null;

  return {
    available: true,
    variantCount: normalized.length,
    bestVariantId: best?.id || null,
    bestVariantLabel: best?.label || null,
    bestStatus: best?.status || null,
    bestRatio: best?.ratio ?? null,
    bestGoverningLabel: best?.governingLabel || null,
    bestMarginPercent,
    rationale: buildCompareRationale({ best, runnerUp, passCount, variantCount: normalized.length }),
    passCount,
    allPass: passCount === normalized.length,
    mixedStatus: passCount > 0 && passCount < normalized.length,
    variants: ranked,
  };
};

export const buildReportSummary = ({
  results,
  worstSupport,
  worstUplift,
  selectedCase,
  dT,
  Mt_ULS,
  section,
  extra,
}) => {
  const upliftDeclaredInput = resolveFastenerUpliftDeclaredMetadata(extra?.config || {});
  const professionalBadges = buildProfessionalBadges({ results, config: extra?.config || {} });
  const assumptions = buildAssumptions({ results, config: extra?.config || {} });
  const limitations = buildLimitations({ results, config: extra?.config || {} });
  const checkHighlights = buildCheckHighlights({ results, config: extra?.config || {} });

  return ({
  chartData: results.chartData,
  reactionData: results.reactionData,
  M_Rd: results.M_Rd,
  V_Rd: results.V_Rd,
  F_Rd_Worst: worstSupport.F_Rd * 1000,
  T_Rd_Worst: worstUplift.T_Rd * 1000,
  limitDenom: extra.limitDenom,
  w_limit: extra.w_limit,
  maxMomentNeg: results.maxMomentNeg,
  maxMomentPos: results.maxMomentPos,
  maxMomentAbs: results.maxMomentAbs,
  maxSupportMoment: results.maxSupportMoment,
  maxShear: results.maxShear,
  maxReaction: results.maxReaction,
  maxUplift: results.maxUplift,
  maxDeflection: results.maxDeflection,
  ratios: results.ratios,
  upliftEnabled: results.upliftEnabled,
  status: results.status,
  advice: results.advice,
  governingCases: results.governingCases,
  stress_span: results.stress_span,
  stress_support: results.stress_support,
  sigma_limit: results.sigma_limit,
  supportLocs: results.supportLocs,
  extrema: results.extrema,
  creepMode: results.creepMode,
  phiShear: results.phiShear,
  phiBending: results.phiBending,
  panelWidth: results.panelWidth,
  screwCount: results.screwCount,
  qDead_kPa: results.qDead_kPa,
  qLive_kPa: results.qLive_kPa,
  qDeadBySpan_kPa: results.qDeadBySpan_kPa,
  qLiveBySpan_kPa: results.qLiveBySpan_kPa,
  distributedLoadMode: results.distributedLoadMode,
  qWind_kPa: results.qWind_kPa,
  qSLS_kPa: selectedCase.qSLS_kPa,
  qULS_kPa: selectedCase.qULS_kPa,
  dT_deg: dT,
  Mt_ULS_kNm: Mt_ULS / 1e6,
  EI: section.EI,
  GA_inst: section.GA_inst,
  GA_long: extra.GA_long,
  EI_long: extra.EI_long,
  e: section.e,
  Af1: section.Af1,
  Af2: section.Af2,
  Ac: section.Ac,
  I_eq: section.I_eq,
  zMax: section.zMax,
  sigma_w: section.sigma_w,
  sigma_w_approx: section.sigma_w_approx,
  sigma_w_declared: section.sigma_w_declared,
  sigma_w_design: section.sigma_w_design,
  sigma_w_source: section.sigma_w_source,
  wrinklingDeclaredMissing: section.wrinklingDeclaredMissing,
  wrinklingFallbackMode: section.wrinklingFallbackMode,
  effectiveWrinklingMode: section.effectiveWrinklingMode,
  wrinklingMeta: section.wrinklingMeta,
  technicalTransparency: {
    wrinkling: section.wrinklingMeta,
    supportCrushing: {
      resistance: SUPPORT_CRUSHING_RESISTANCE,
      factor: SUPPORT_CRUSHING_FACTOR,
    },
    uplift: {
      inputSchema: FASTENER_UPLIFT_INPUT_SCHEMA,
      declaredInput: {
        value: Number(extra?.config?.screwStrength) > 0 ? Number(extra.config.screwStrength) : 0,
        unit: upliftDeclaredInput.declaredDisplayUnit,
        expectedUnit: FASTENER_UPLIFT_INPUT_SCHEMA.unit,
        expectedMeaning: FASTENER_UPLIFT_INPUT_SCHEMA.expectedMeaning,
        preferredBasis: FASTENER_UPLIFT_INPUT_SCHEMA.preferredBasis,
        basis: upliftDeclaredInput.declaredBasis,
        sourceType: upliftDeclaredInput.declaredSourceType,
        sourceRef: upliftDeclaredInput.declaredSourceRef || null,
        sourceNote: upliftDeclaredInput.declaredSourceNote || null,
        fastenerContext: upliftDeclaredInput.declaredFastenerContext || null,
        spacingMeaning: upliftDeclaredInput.declaredSpacingMeaning,
        isSourceDocumented: upliftDeclaredInput.isSourceDocumented,
        schemaVersion: FASTENER_UPLIFT_INPUT_SCHEMA.version,
        sourceFirst: FASTENER_UPLIFT_INPUT_SCHEMA.sourceFirst,
        basisNote: FASTENER_UPLIFT_INPUT_SCHEMA.basisNote,
        sourceExpectation: FASTENER_UPLIFT_INPUT_SCHEMA.sourceExpectation,
      },
      factor: FASTENER_UPLIFT_FACTOR,
    },
    checks: buildCapacityCheckTransparency({
      wrinklingMeta: section.wrinklingMeta,
      wrinklingDeclaredMissing: section.wrinklingDeclaredMissing,
      sigma_w_source: section.sigma_w_source,
      upliftEnabled: results.upliftEnabled === true,
    }),
  },
  sigma_y_design: section.sigma_y_design,
  gammaG: extra.gammaG,
  gammaQ: extra.gammaQ,
  gammaThermal: extra.gammaThermal,
  dC: section.dC,
  tF1: section.tF1,
  tF2: section.tF2,
  compressiveModulus: section.compressiveModulus,
  wrinklingMode: section.wrinklingMode,
  redistributionMode: extra.redistributionMode,
  redistributionEnabled: extra.redistributionEnabled,
  reportPresentation: {
    badges: professionalBadges,
    assumptions,
    limitations,
    checkHighlights,
  },
  compareSummary: extra.compareSummary || { ...DEFAULT_COMPARE_SUMMARY },
});
};
