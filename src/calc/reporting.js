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
  'external-captured': 'Đã kiểm chứng bằng benchmark ngoài (External)',
  'internal-captured': 'Đã kiểm chứng nội bộ (Internal)',
  scaffold: 'Chỉ có khung kiểm chứng (Scaffold)',
};

const VALIDATION_STATUS_LABELS = {
  captured: 'Đã đối chiếu',
  partial: 'Đối chiếu một phần',
  scaffold: 'Scaffold',
};

const TRANSPARENCY_LEVEL_LABELS = {
  high: 'Minh bạch cao',
  medium: 'Minh bạch trung bình',
  low: 'Minh bạch hạn chế',
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
      label: results?.status === 'pass' ? 'ĐẠT' : 'KHÔNG ĐẠT',
      detail: `${((overallRatio || 0) * 100).toFixed(0)}% mức độ tận dụng`,
    },
    validation: {
      ...buildValidationSummary(),
    },
    benchmarkClass: {
      key: buildValidationSummary().headlineClass,
      label: buildValidationSummary().headlineLabel,
      detail: `${buildValidationSummary().externalCapturedCount} benchmark ngoài / ${buildValidationSummary().internalCapturedCount} nội bộ đã đối chiếu`,
    },
    transparency: {
      key: transparencyLevel,
      label: TRANSPARENCY_LEVEL_LABELS[transparencyLevel] || transparencyLevel,
      detail: results?.wrinklingDeclaredMissing
        ? 'Thiếu giá trị wrinkling khai báo → đang dùng fallback'
        : `${exactCount} chính xác · ${approximationCount} xấp xỉ · ${inputDependentCount} phụ thuộc đầu vào`,
    },
    panel: {
      key: config?.panelType || 'unknown',
      label: config?.panelType === 'ceiling' ? 'Tấm trần' : config?.panelType === 'external' ? 'Tấm vách ngoài' : 'Tấm vách trong',
      detail: `${(config?.spans || []).length} nhịp · lõi ${Number(config?.coreThickness || 0)} mm`,
    },
  };
};

const buildAssumptions = ({ results, config }) => {
  const assumptions = [
    `Bộ giải sử dụng phần tử hữu hạn dầm liên tục (Timoshenko) theo quy ước dấu hiện hành của repository và logic bao lực cắt/moment.`,
    `Kiểm tra tiết diện và báo cáo sức kháng tuân theo ngữ nghĩa đầu vào hiện tại cho ứng suất nén mặt (wrinkling), sức kháng cắt lõi, chiều rộng gối và sức kháng nhổ của liên kết vít.`,
    `Tải gió được tính theo chế độ ${config?.windDirection === 'suction' ? 'hút (suction)' : 'đẩy (pressure)'} với cường độ ${Number(config?.windPressure || 0).toFixed(2)} kPa; chênh lệch nhiệt độ sử dụng ΔT = ${Math.abs(Number(results?.dT_deg || 0)).toFixed(1)} °C.`,
    results?.distributedLoadMode === 'per-span'
      ? 'Mô hình tải phân bố theo từng nhịp: mỗi nhịp giữ bộ qG/qQ riêng trước khi tổ hợp tải được lắp ráp.'
      : 'Mô hình tải phân bố đồng đều: tất cả các nhịp dùng chung một bộ qG/qQ theo luồng mặc định.',
  ];

  if (results?.creepMode && results.creepMode !== 'none') {
    assumptions.push(`Từ biến (creep) đang kích hoạt ở trạng thái giới hạn sử dụng (SLS) theo chế độ ${results.creepMode} (φ = ${Number(results?.phiShear || 0).toFixed(2)}${Number(results?.phiBending || 0) > 0 ? `, φb = ${Number(results?.phiBending || 0).toFixed(2)}` : ''}).`);
  }

  if (config?.panelType !== 'ceiling') {
    assumptions.push(`Kiểm tra chống nhổ (uplift) đang ${results?.upliftEnabled ? 'kích hoạt' : 'tắt'} dựa trên chế độ tấm vách hiện tại và đường dẫn đầu vào screwStrength.`);
  }

  return assumptions;
};

const buildLimitations = ({ results, config }) => {
  const limitations = [
    'Mức độ kiểm chứng đối chiếu hiện có giúp nâng cao độ tin cậy của bộ giải và quy trình báo cáo, nhưng không thay thế việc phê duyệt tiêu chuẩn theo dự án cụ thể hoặc bảng tính thiết kế được nhà cung cấp chứng nhận.',
    'Phân loại minh bạch (transparency class) phản ánh nguồn gốc dữ liệu, không phải căn cứ pháp lý: các đầu vào do người dùng tự khai báo hoặc dựa trên xấp xỉ kỹ thuật vẫn cần kỹ sư phán xét và xem xét nguồn trước khi phát hành chính thức.',
  ];

  if (results?.technicalTransparency?.wrinkling?.declaredInput && !results.technicalTransparency.wrinkling.declaredInput.isSourceDocumented) {
    limitations.push('Đường dẫn khai báo wrinkling vẫn ở mức "người dùng tự khai báo" cho đến khi có tham chiếu nhà cung cấp/thử nghiệm/bảng tính được gắn với giá trị số thực tế đang sử dụng.');
  }

  if (results?.upliftEnabled && !results?.technicalTransparency?.uplift?.declaredInput?.isSourceDocumented) {
    limitations.push('Sức kháng chống nhổ (uplift) vẫn phụ thuộc vào giá trị cường độ vít do người dùng khai báo; báo cáo hiện tại chỉ công khai nguồn gốc dữ liệu nhưng không tự động nâng cấp giá trị đó lên mức chứng nhận liên kết từ nguồn.');
  }

  if (config?.enableSpanDistributedLoads === true && config?.panelType === 'ceiling') {
    limitations.push('Quy trình tải phân bố theo từng nhịp vẫn giữ cách xử lý tải gió toàn cục theo phiên bản cũ; gió chưa được rời rạc hóa độc lập theo nhịp trong phiên bản báo cáo này.');
  }

  if (results?.wrinklingDeclaredMissing) {
    limitations.push(`Giá trị wrinkling khai báo bị thiếu, nên báo cáo hiện đang sử dụng chế độ fallback: ${results?.wrinklingFallbackMode || 'yield-only'}.`);
  }

  return limitations;
};

const buildCheckHighlights = ({ results, config }) => {
  const rows = [
    {
      key: 'overall',
      label: 'Trường hợp chi phối tổng thể',
      value: results?.governingCases?.overall?.label || '—',
      ratio: Number(results?.governingCases?.overall?.ratio || 0),
    },
    {
      key: 'moment',
      label: 'Mô-men / Ứng suất tại gối',
      value: results?.governingCases?.moment?.label || '—',
      ratio: Math.max(Number(results?.ratios?.bending || 0), Number(results?.ratios?.support || 0)),
    },
    {
      key: 'shear',
      label: 'Cắt lõi (Core Shear)',
      value: `${(Number(results?.maxShear || 0) / 1000).toFixed(2)} / ${(Number(results?.V_Rd || 0) / 1000).toFixed(2)} kN`,
      ratio: Number(results?.ratios?.shear || 0),
    },
    {
      key: 'crushing',
      label: 'Ép dập gối tựa (Crushing)',
      value: `${(Number(results?.maxReaction || 0) / 1000).toFixed(2)} / ${(Number(results?.F_Rd_Worst || 0) / 1000).toFixed(2)} kN`,
      ratio: Number(results?.ratios?.crushing || 0),
    },
    {
      key: 'deflection',
      label: 'Độ võng SLS (Deflection)',
      value: `${Number(results?.maxDeflection || 0).toFixed(1)} / ${Number(results?.w_limit || 0).toFixed(1)} mm`,
      ratio: Number(results?.ratios?.deflection || 0),
    },
  ];

  if (config?.panelType !== 'ceiling') {
    rows.push({
      key: 'uplift',
      label: 'Chống nhổ (Uplift)',
      value: results?.upliftEnabled
        ? `${(Number(results?.maxUplift || 0) / 1000).toFixed(2)} / ${(Number(results?.T_Rd_Worst || 0) / 1000).toFixed(2)} kN`
        : 'Không áp dụng',
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
