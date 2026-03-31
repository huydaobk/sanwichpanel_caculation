import test from 'node:test';
import assert from 'node:assert/strict';
import * as calc from '../../src/calc/index.js';

const {
  DEFAULT_REDISTRIBUTION_MODE,
  DEFAULT_WRINKLING_MODE,
  CAPACITY_CHECK_KEYS,
  CAPACITY_CHECK_LABELS,
  CAPACITY_GOVERNING_CASE_KEYS,
  runPanelAnalysis,
} = calc;

const baseConfig = {
  projectName: 'Phase C regression harness',
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
  redistributionMode: DEFAULT_REDISTRIBUTION_MODE,
  kappaShear: 1.0,
  coreDensity: 42,
  windPressure: 0.8,
  windDirection: 'pressure',
  tempOut: 65,
  tempIn: 25,
  gammaF_thermal: 1.5,
  screwStrength: 2.0,
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
  pointLoads: [
    { x_m: 1.5, P_kN: 0.30, note: 'Đèn', type: 'permanent' },
    { x_m: 4.5, P_kN: 0.30, note: 'Máng cáp', type: 'permanent' },
  ],
};

function computeResults(config) {
  return runPanelAnalysis(config, { defaultRedistributionMode: DEFAULT_REDISTRIBUTION_MODE });
}

function nodeAtX(chartData, x) {
  return chartData.find((p) => Math.abs(p.x - x) < 1e-6) || null;
}

test('wrinklingMode=declared phản ánh declared ở source/report/capacity', () => {
  const { summary } = computeResults({
    ...baseConfig,
    wrinklingMode: 'declared',
    wrinklingStress: 120,
    steelYield: 280,
    redistributionMode: 'elastic',
  });

  assert.equal(summary.wrinklingMode, 'declared');
  assert.equal(summary.sigma_w_source, 'declared');
  assert.equal(summary.sigma_w_declared, 120);
  assert.ok(Math.abs(summary.sigma_w - 120) < 1e-9);
  assert.ok(Math.abs(summary.sigma_w_design - 100) < 1e-9);
  assert.ok(Math.abs(summary.sigma_limit - 100) < 1e-9);
  assert.match(summary.advice[0], /Chế độ kiểm tra nhăn yêu cầu: khai báo trực tiếp; chế độ đang dùng: khai báo trực tiếp; chế độ phân phối nội lực: đàn hồi\./);
  assert.match(summary.advice[1], /Ứng suất nhăn đang dùng lấy theo giá trị khai báo trực tiếp của người dùng\./);
  assert.equal(summary.effectiveWrinklingMode, 'declared');
  assert.equal(summary.wrinklingMeta?.sourceClassification, 'user-declared');
  assert.equal(summary.technicalTransparency?.wrinkling?.effectiveModeReliability, 'user-declared');
  assert.equal(summary.wrinklingMeta?.declaredInput?.basis, 'design-resistance');
  assert.equal(summary.wrinklingMeta?.declaredInput?.unit, 'MPa');
  assert.equal(summary.wrinklingMeta?.declaredInput?.sourceType, 'unknown');
  assert.equal(summary.wrinklingMeta?.declaredInput?.isSourceDocumented, false);
  assert.equal(summary.wrinklingMeta?.declaredInputSchema?.preferredBasis, 'design-resistance');
});

test('wrinklingMode=yield-only buộc sigma_limit bám yield thay vì wrinkling', () => {
  const { summary } = computeResults({
    ...baseConfig,
    wrinklingMode: 'yield-only',
    wrinklingStress: 120,
    steelYield: 220,
    redistributionMode: 'elastic',
  });

  assert.equal(summary.wrinklingMode, 'yield-only');
  assert.equal(summary.sigma_w_source, 'yield-only');
  assert.equal(summary.sigma_w, 0);
  assert.ok(Math.abs(summary.sigma_y_design - 200) < 1e-9);
  assert.ok(Math.abs(summary.sigma_limit - summary.sigma_y_design) < 1e-9);
  assert.notEqual(summary.sigma_limit, 100);
  assert.equal(summary.effectiveWrinklingMode, 'yield-only');
  assert.equal(summary.wrinklingMeta?.sourceClassification, 'yield-governed');
  assert.equal(summary.technicalTransparency?.wrinkling?.effectiveModeReliability, 'exact-limit-state');
  assert.equal(summary.technicalTransparency?.checks?.sigmaLimit?.source, 'yield-only');
  assert.equal(summary.technicalTransparency?.checks?.sigmaLimit?.classification, 'yield-governed');
  assert.equal(summary.technicalTransparency?.checks?.sigmaLimit?.reliability, 'exact-limit-state');
});

test('wrinklingMode=approx dùng approx metadata nhất quán và sigma_limit vẫn bị chặn bởi yield nếu cần', () => {
  const { summary } = computeResults({
    ...baseConfig,
    wrinklingMode: 'approx',
    wrinklingStress: 999,
    steelYield: 280,
    redistributionMode: 'elastic',
  });

  assert.equal(summary.wrinklingMode, 'approx');
  assert.equal(summary.sigma_w_source, 'approx');
  assert.ok(summary.sigma_w_approx > summary.sigma_y_design, 'case sanity: approx wrinkling phải lớn hơn yield design để yield govern');
  assert.ok(Math.abs(summary.sigma_w - summary.sigma_w_approx) < 1e-9);
  assert.ok(Math.abs(summary.sigma_limit - summary.sigma_y_design) < 1e-9, 'sigma_limit phải là min(wrinkling design, yield design)');
  assert.equal(summary.effectiveWrinklingMode, 'approx');
  assert.equal(summary.wrinklingMeta?.sourceClassification, 'engineering-approximation');
  assert.equal(summary.technicalTransparency?.wrinkling?.effectiveModeReliability, 'engineering-approximation');
  assert.equal(summary.technicalTransparency?.checks?.sigmaLimit?.source, 'approx');
  assert.equal(summary.technicalTransparency?.checks?.sigmaLimit?.classification, 'engineering-approximation');
  assert.equal(summary.technicalTransparency?.checks?.sigmaLimit?.reliability, 'engineering-approximation');
});

test('wrinklingMode=declared nhưng thiếu/0 giá trị phải báo declared-missing và fallback rõ ràng', () => {
  const { summary } = computeResults({
    ...baseConfig,
    wrinklingMode: 'declared',
    wrinklingStress: 0,
    steelYield: 220,
    redistributionMode: 'elastic',
  });

  assert.equal(summary.wrinklingMode, 'declared');
  assert.equal(summary.sigma_w_source, 'declared-missing');
  assert.equal(summary.sigma_w_declared, 0);
  assert.equal(summary.sigma_w, 0);
  assert.equal(summary.wrinklingDeclaredMissing, true);
  assert.equal(summary.wrinklingFallbackMode, 'yield-only');
  assert.ok(Math.abs(summary.sigma_y_design - 200) < 1e-9);
  assert.ok(Math.abs(summary.sigma_limit - summary.sigma_y_design) < 1e-9);
  assert.ok(summary.advice.some((line) => /Thiếu ứng suất nhăn khai báo hợp lệ.*fallback rõ ràng sang chỉ theo giới hạn chảy/.test(line)));
  assert.equal(summary.effectiveWrinklingMode, 'yield-only');
  assert.equal(summary.wrinklingMeta?.fallbackApplied, true);
  assert.equal(summary.wrinklingMeta?.sourceClassification, 'missing-declared-input');
  assert.equal(summary.technicalTransparency?.checks?.sigmaLimit?.classification, 'fallback-to-exact-limit-state');
});

test('redistributionMode=simplified trên case nặng phải bật hinge và giảm support moment so với elastic', () => {
  const heavyCase = {
    ...baseConfig,
    wrinklingMode: 'declared',
    wrinklingStress: 5,
    steelYield: 280,
    windPressure: 6.0,
    liveLoad_kPa: 1.5,
    pointLoads: [
      { x_m: 1.5, P_kN: 4.0, note: 'PL1', type: 'permanent' },
      { x_m: 4.5, P_kN: 4.0, note: 'PL2', type: 'permanent' },
    ],
  };

  const simplified = computeResults({ ...heavyCase, redistributionMode: 'simplified' });
  const elastic = computeResults({ ...heavyCase, redistributionMode: 'elastic' });

  const simplifiedHinges = simplified.solverPack.caseResults.flatMap((c) => c.hinges.map((v, idx) => (v ? idx : null)).filter((v) => v !== null));
  const elasticHinges = elastic.solverPack.caseResults.flatMap((c) => c.hinges.map((v, idx) => (v ? idx : null)).filter((v) => v !== null));

  assert.equal(simplified.summary.redistributionMode, 'simplified');
  assert.equal(simplified.summary.redistributionEnabled, true);
  assert.ok(simplifiedHinges.length > 0, 'simplified phải kích hoạt ít nhất một hinge');
  assert.equal(simplified.summary.governingCases.overall.hingesTriggered, true);
  assert.ok(simplified.summary.maxSupportMoment < elastic.summary.maxSupportMoment, 'support moment của simplified phải giảm so với elastic');
  assert.equal(elastic.summary.redistributionEnabled, false);
  assert.equal(elasticHinges.length, 0);
});

test('backward-compatible: ceiling mặc định vẫn dùng tải phân bố chung khi chưa bật per-span', () => {
  const { summary } = computeResults({
    ...baseConfig,
    enableSpanDistributedLoads: false,
    deadLoadMode: 'manual',
    deadLoadManual_kPa: 0.15,
    liveLoad_kPa: 0.35,
    deadLoadBySpan_kPa: [0.15, 0.45],
    liveLoadBySpan_kPa: [0.35, 0.05],
  });

  assert.equal(summary.distributedLoadMode, 'uniform');
  assert.deepEqual(summary.qDeadBySpan_kPa.map((v) => Number(v.toFixed(3))), [0.15, 0.15]);
  assert.deepEqual(summary.qLiveBySpan_kPa.map((v) => Number(v.toFixed(3))), [0.35, 0.35]);
});

test('ceiling per-span distributed loads map through config into solver path', () => {
  const config = {
    ...baseConfig,
    enableSpanDistributedLoads: true,
    deadLoadMode: 'manual',
    deadLoadManual_kPa: 0.15,
    liveLoad_kPa: 0.25,
    deadLoadBySpan_kPa: [0.15, 0.45],
    liveLoadBySpan_kPa: [0.2, 0.6],
    windPressure: 0,
    tempOut: 25,
    tempIn: 25,
    pointLoads: [],
  };

  const { summary, intermediate, solverPack } = computeResults(config);
  const pressureCaseBase = intermediate.mechanicalCasesBase.find((c) => c.id === 'pressure');
  const pressureCaseSolved = solverPack.caseResults.find((c) => c.id === 'pressure');

  assert.equal(summary.distributedLoadMode, 'per-span');
  assert.deepEqual(summary.qDeadBySpan_kPa.map((v) => Number(v.toFixed(3))), [0.15, 0.45]);
  assert.deepEqual(summary.qLiveBySpan_kPa.map((v) => Number(v.toFixed(3))), [0.2, 0.6]);
  assert.ok(Array.isArray(pressureCaseBase.qULS_line), 'per-span mode must produce array line loads');
  assert.deepEqual(
    pressureCaseBase.qULS_line.map((v) => Number(v.toFixed(3))),
    [0.503, 1.507],
  );
  assert.deepEqual(
    pressureCaseSolved.solULS_Mech.elementForces.map((el) => Number(el.qDown.toFixed(3))),
    [0.503, 1.507],
  );
});

test('governing case/report summary có đủ data moment/shear/crushing/deflection/overall', () => {
  const { summary } = computeResults({
    ...baseConfig,
    wrinklingMode: 'declared',
    redistributionMode: 'elastic',
  });

  assert.ok(summary.governingCases);
  assert.ok(summary.governingCases.moment);
  assert.ok(summary.governingCases.shear);
  assert.ok(summary.governingCases.crushing);
  assert.ok(summary.governingCases.deflection);
  assert.ok(summary.governingCases.overall);
  assert.equal(summary.governingCases.moment.categoryKey, CAPACITY_GOVERNING_CASE_KEYS.MOMENT);
  assert.equal(summary.governingCases.shear.categoryKey, CAPACITY_GOVERNING_CASE_KEYS.SHEAR);
  assert.equal(summary.governingCases.crushing.categoryKey, CAPACITY_GOVERNING_CASE_KEYS.CRUSHING);
  assert.equal(summary.governingCases.deflection.categoryKey, CAPACITY_GOVERNING_CASE_KEYS.DEFLECTION);
  assert.equal(summary.governingCases.overall.categoryKey, CAPACITY_GOVERNING_CASE_KEYS.OVERALL);
  assert.equal(typeof summary.governingCases.moment.ratio, 'number');
  assert.equal(typeof summary.governingCases.shear.ratio, 'number');
  assert.equal(typeof summary.governingCases.crushing.ratio, 'number');
  assert.equal(typeof summary.governingCases.deflection.ratio, 'number');
  assert.equal(typeof summary.governingCases.overall.ratio, 'number');
  assert.ok(['Mô-men/ứng suất tại gối', 'Mô-men/ứng suất tại nhịp'].includes(summary.governingCases.moment.label));
  assert.equal(summary.governingCases.shear.label, 'Lực cắt lõi');
  assert.equal(summary.governingCases.crushing.label, 'Ép dập gối tựa');
  assert.equal(summary.governingCases.deflection.label, 'Độ võng SLS');
  assert.ok(typeof summary.governingCases.overall.label === 'string' && summary.governingCases.overall.label.length > 0);
  assert.ok(summary.extrema.moment);
  assert.ok(summary.extrema.shear);
  assert.ok(summary.extrema.deflectionTotal);
  assert.equal(typeof nodeAtX(summary.chartData, 1.5)?.shear, 'number');
  assert.equal(typeof nodeAtX(summary.chartData, 4.5)?.shear, 'number');
});

test('technical transparency taxonomy chuẩn hóa cho đủ nhóm capacity checks surfaced', () => {
  const { summary } = computeResults({
    ...baseConfig,
    panelType: 'external',
    pointLoads: [],
    wrinklingMode: 'declared',
    wrinklingStress: 120,
    redistributionMode: 'elastic',
  });

  const checks = summary.technicalTransparency?.checks;
  assert.ok(checks, 'technicalTransparency.checks phải tồn tại');

  assert.deepEqual(
    Object.keys(checks),
    [
      CAPACITY_CHECK_KEYS.SIGMA_LIMIT,
      CAPACITY_CHECK_KEYS.BENDING_STRESS,
      CAPACITY_CHECK_KEYS.SHEAR_CAPACITY,
      CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING,
      CAPACITY_CHECK_KEYS.UPLIFT,
      CAPACITY_CHECK_KEYS.DEFLECTION,
    ],
  );

  assert.equal(checks.sigmaLimit.key, CAPACITY_CHECK_KEYS.SIGMA_LIMIT);
  assert.equal(checks.sigmaLimit.label, CAPACITY_CHECK_LABELS.sigmaLimit);
  assert.equal(checks.sigmaLimit.sourceMeta?.title, 'Wrinkling / compressive limit');
  assert.ok(Array.isArray(checks.sigmaLimit.sourceMeta?.missingEvidence));
  assert.ok(Array.isArray(checks.sigmaLimit.sourceMeta?.safeExternalizationSteps));
  assert.equal(checks.sigmaLimit.sourceMeta?.provenanceBreakdown?.declaredPath?.[0]?.classification, 'user-declared');
  assert.match(checks.sigmaLimit.sourceMeta?.provenanceBreakdown?.declaredPath?.[0]?.sourceGap || '', /(exact declared MPa value used for a case|declared basis\/source framing)/i);
  assert.equal(checks.sigmaLimit.sourceMeta?.provenanceBreakdown?.declaredPath?.[1]?.status, 'source-linked');
  assert.match(checks.sigmaLimit.sourceMeta?.provenanceBreakdown?.declaredPath?.[1]?.item || '', /Paroc Panel System technical guide/i);
  assert.equal(checks.sigmaLimit.sourceMeta?.provenanceBreakdown?.approxPath?.[0]?.classification, 'engineering-approximation');
  assert.match(checks.sigmaLimit.sourceMeta?.provenanceBreakdown?.approxPath?.[0]?.evidenceNote || '', /0\.5 coefficient/);
  assert.equal(checks.sigmaLimit.sourceMeta?.provenanceBreakdown?.approxPath?.[1]?.status, 'source-gap');
  assert.equal(checks.sigmaLimit.sourceMeta?.provenanceBreakdown?.yieldBoundary?.[0]?.classification, 'yield-governed');
  assert.equal(checks.bendingStress.key, CAPACITY_CHECK_KEYS.BENDING_STRESS);
  assert.equal(checks.bendingStress.label, CAPACITY_CHECK_LABELS.bendingStress);
  assert.equal(checks.shearCapacity.key, CAPACITY_CHECK_KEYS.SHEAR_CAPACITY);
  assert.equal(checks.shearCapacity.label, CAPACITY_CHECK_LABELS.shearCapacity);
  assert.equal(checks.shearCapacity.label, 'Lực cắt lõi');
  assert.equal(checks.shearCapacity.classification, 'input-resistance-check');
  assert.equal(checks.supportCrushing.key, CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING);
  assert.equal(checks.supportCrushing.label, CAPACITY_CHECK_LABELS.supportCrushing);
  assert.equal(checks.supportCrushing.classification, 'input-resistance-check');
  assert.equal(checks.supportCrushing.reliability, 'input-dependent');
  assert.equal(checks.supportCrushing.sourceMeta?.title, 'Support crushing / core bearing');
  assert.ok(Array.isArray(checks.supportCrushing.sourceMeta?.missingEvidence));
  assert.ok(Array.isArray(checks.supportCrushing.sourceMeta?.safeExternalizationSteps));
  assert.equal(checks.supportCrushing.sourceMeta?.provenanceBreakdown?.demandSide?.[0]?.status, 'solver-derived');
  assert.match(checks.supportCrushing.sourceMeta?.provenanceBreakdown?.demandSide?.[0]?.evidenceNote || '', /Ruukki load-table\/support pages/);
  assert.equal(checks.supportCrushing.sourceMeta?.provenanceBreakdown?.resistanceSide?.[0]?.item, 'supportCrushingResistance record = 0.10 N/mm² (legacy alias: fCc)');
  assert.match(checks.supportCrushing.sourceMeta?.provenanceBreakdown?.resistanceSide?.[0]?.evidenceNote || '', /no reviewed source supplied this exact 0\.10 N\/mm² value/);
  assert.equal(checks.supportCrushing.sourceMeta?.provenanceBreakdown?.resistanceSide?.[0]?.status, 'repo-constant-uncited');
  assert.equal(checks.supportCrushing.sourceMeta?.provenanceBreakdown?.resistanceSide?.[1]?.item, 'gammaM_crushing = 1.25 (legacy shared value with gammaM_shear)');
  assert.equal(checks.supportCrushing.sourceMeta?.provenanceBreakdown?.resistanceSide?.[1]?.status, 'source-gap');
  assert.match(checks.supportCrushing.sourceMeta?.provenanceBreakdown?.resistanceSide?.[1]?.evidenceNote || '', /did not provide a crushing-specific material factor/);
  assert.equal(checks.supportCrushing.sourceMeta?.provenanceBreakdown?.resistanceSide?.[2]?.status, 'user-input-geometry');
  assert.equal(checks.uplift.key, CAPACITY_CHECK_KEYS.UPLIFT);
  assert.equal(checks.uplift.label, CAPACITY_CHECK_LABELS.uplift);
  assert.equal(checks.uplift.classification, 'input-resistance-check');
  assert.equal(checks.uplift.reliability, 'input-dependent');
  assert.equal(checks.uplift.enabled, true);
  assert.equal(checks.uplift.sourceMeta?.title, 'Fastener uplift / pull-out');
  assert.ok(Array.isArray(checks.uplift.sourceMeta?.sourceAnchorCandidates));
  assert.equal(checks.uplift.sourceMeta?.provenanceBreakdown?.demandSide?.[0]?.status, 'solver-derived');
  assert.equal(checks.uplift.sourceMeta?.provenanceBreakdown?.resistanceSide?.[0]?.status, 'user-declared-input');
  assert.match(checks.uplift.sourceMeta?.provenanceBreakdown?.resistanceSide?.[0]?.basis || '', /source-first declared per-fastener resistance input/i);
  assert.match(checks.uplift.sourceMeta?.provenanceBreakdown?.resistanceSide?.[0]?.evidenceNote || '', /fastener-manufacturer instructions \/ research results/i);
  assert.match(checks.uplift.sourceMeta?.provenanceBreakdown?.resistanceSide?.[0]?.sourceGap || '', /did not provide a numeric kN-per-fastener pull-out\/uplift line/i);
  assert.equal(checks.uplift.sourceMeta?.provenanceBreakdown?.resistanceSide?.[1]?.status, 'provisional-rule');
  assert.match(checks.uplift.sourceMeta?.provenanceBreakdown?.resistanceSide?.[1]?.item || '', /round\(panelWidth \/ screwSpacing\)/);
  assert.equal(checks.uplift.sourceMeta?.provenanceBreakdown?.resistanceSide?.[2]?.item, 'gammaM_screw = 1.33');
  assert.equal(checks.uplift.sourceMeta?.provenanceBreakdown?.resistanceSide?.[2]?.status, 'source-gap');
  assert.equal(checks.uplift.sourceMeta?.provenanceBreakdown?.enablement?.[0]?.status, 'derived-enablement');
  assert.equal(checks.deflection.key, CAPACITY_CHECK_KEYS.DEFLECTION);
  assert.equal(checks.deflection.label, CAPACITY_CHECK_LABELS.deflection);
  assert.equal(checks.deflection.classification, 'limit-state-response');
  assert.equal(checks.deflection.reliability, 'engineering-calculation');
});

test('support crushing consistency: ratio/overall/advice phải đồng bộ khi bề rộng gối bị giảm mạnh', () => {
  const { summary } = computeResults({
    ...baseConfig,
    panelType: 'external',
    pointLoads: [],
    supportWidths: [20, 20, 20],
    screwStrength: 20,
    wrinklingMode: 'approx',
    redistributionMode: 'elastic',
  });

  assert.ok(summary.ratios.crushing > 1, 'consistency test: support crushing phải fail khi support width quá nhỏ');
  assert.equal(summary.status, 'fail');
  assert.equal(summary.technicalTransparency?.checks?.supportCrushing?.key, CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING);
  assert.equal(summary.technicalTransparency?.checks?.supportCrushing?.source, 'support-width-and-core-bearing-record');
  assert.equal(summary.technicalTransparency?.checks?.supportCrushing?.enabled, true);
  assert.equal(summary.technicalTransparency?.supportCrushing?.resistance?.legacyAlias, 'fCc');
  assert.equal(summary.technicalTransparency?.supportCrushing?.factor?.key, 'gammaM_crushing');
  assert.equal(summary.technicalTransparency?.supportCrushing?.factor?.legacyAlias, 'gammaM_shear');
  assert.ok(summary.reactionData.every((support) => support.status === 'fail'), 'mọi gối phải cùng phản ánh fail trong case ép dập này');
  assert.ok(summary.reactionData.every((support) => support.ratio > 1), 'mọi ratio ép dập tại gối phải > 1');
  assert.equal(summary.governingCases.crushing.key, 'crushing');
  assert.equal(summary.governingCases.crushing.label, 'Ép dập gối tựa');
  assert.equal(summary.governingCases.overall.key, 'crushing');
  assert.equal(summary.governingCases.overall.label, 'Ép dập gối tựa');
  assert.ok(summary.advice.some((line) => /bị quá tải ép dập/.test(line)));
});

test('uplift consistency: enabled/ratios/governing/advice phải đồng bộ giữa fail và non-governing pass case', () => {
  const upliftFail = computeResults({
    ...baseConfig,
    panelType: 'external',
    pointLoads: [],
    supportWidths: [60, 60, 60],
    screwStrength: 2,
    wrinklingMode: 'approx',
    redistributionMode: 'elastic',
  }).summary;

  assert.equal(upliftFail.technicalTransparency?.checks?.uplift?.enabled, true);
  assert.equal(upliftFail.technicalTransparency?.checks?.uplift?.source, 'fastener-capacity-input');
  assert.ok(upliftFail.ratios.uplift > 1, 'consistency test: uplift phải fail với screw strength thấp');
  assert.equal(upliftFail.governingCases.uplift.key, 'uplift');
  assert.equal(upliftFail.governingCases.uplift.label, 'Liên kết chống nhổ');
  assert.equal(upliftFail.governingCases.overall.key, 'uplift');
  assert.ok(upliftFail.reactionData.some((support) => support.upliftStatus === 'fail'));
  assert.ok(upliftFail.advice.some((line) => /Liên kết chống nhổ không đủ/.test(line)));

  const upliftPass = computeResults({
    ...baseConfig,
    panelType: 'external',
    pointLoads: [],
    supportWidths: [20, 20, 20],
    screwStrength: 20,
    wrinklingMode: 'approx',
    redistributionMode: 'elastic',
  }).summary;

  assert.ok(upliftPass.ratios.uplift > 0 && upliftPass.ratios.uplift < 1, 'uplift vẫn phải được tính nhưng không fail');
  assert.equal(upliftPass.technicalTransparency?.checks?.uplift?.enabled, true);
  assert.ok(upliftPass.reactionData.every((support) => support.upliftStatus === 'pass'));
  assert.notEqual(upliftPass.governingCases.overall.key, 'uplift');
  assert.equal(upliftPass.governingCases.overall.key, 'crushing');
});

test('deflection consistency: ratio phải bám maxDeflection/w_limit và overall chuyển sang deflection khi limit đủ chặt', () => {
  const { summary } = computeResults({
    ...baseConfig,
    panelType: 'external',
    pointLoads: [],
    screwStrength: 20,
    wrinklingMode: 'approx',
    redistributionMode: 'elastic',
    deflectionLimit: 1000,
  });

  assert.ok(summary.w_limit > 0);
  assert.ok(summary.maxDeflection > summary.w_limit, 'consistency test: case này cần fail deflection');
  assert.ok(Math.abs(summary.ratios.deflection - (summary.maxDeflection / summary.w_limit)) < 1e-9);
  assert.ok(summary.ratios.deflection > 1);
  assert.equal(summary.governingCases.deflection.key, 'deflection');
  assert.equal(summary.governingCases.overall.key, 'deflection');
  assert.equal(summary.governingCases.overall.label, 'Độ võng SLS');
  assert.equal(summary.technicalTransparency?.checks?.deflection?.source, 'solver-response');
  assert.ok(summary.advice.some((line) => /Độ võng lớn/.test(line)));
});

test('uplift không áp dụng vẫn có taxonomy ổn định nhưng disabled', () => {
  const { summary } = computeResults({
    ...baseConfig,
    panelType: 'ceiling',
    pointLoads: baseConfig.pointLoads,
  });

  const upliftMeta = summary.technicalTransparency?.checks?.uplift;
  assert.ok(upliftMeta, 'uplift meta vẫn phải surfaced để taxonomy nhất quán');
  assert.equal(upliftMeta.label, CAPACITY_CHECK_LABELS.uplift);
  assert.equal(upliftMeta.enabled, false);
  assert.equal(upliftMeta.source, 'not-applicable');
  assert.equal(upliftMeta.reliability, 'unspecified');
});

test('uplift transparency stays enabled when check scope is active even if current ratio is zero', () => {
  const { summary } = computeResults({
    ...baseConfig,
    panelType: 'external',
    windPressure: 0,
    tempOut: 25,
    tempIn: 25,
    pointLoads: [],
    screwStrength: 20,
    supportWidths: [60, 60, 60],
  });

  assert.equal(summary.upliftEnabled, true);
  assert.equal(summary.ratios.uplift, 0);
  assert.equal(summary.technicalTransparency?.checks?.uplift?.enabled, true);
  assert.equal(summary.technicalTransparency?.checks?.uplift?.source, 'fastener-capacity-input');
  assert.equal(summary.technicalTransparency?.uplift?.inputSchema?.key, 'screwStrength');
  assert.equal(summary.technicalTransparency?.uplift?.inputSchema?.sourceFirst, true);
  assert.equal(summary.technicalTransparency?.uplift?.factor?.key, 'gammaM_screw');
});

test('wall modes vẫn phân tích/summary ổn định và không phụ thuộc point loads trần', () => {
  for (const panelType of ['external', 'internal']) {
    const { summary } = computeResults({
      ...baseConfig,
      panelType,
      internalWallType: panelType === 'internal' ? 'normal' : 'normal',
      pointLoads: [],
      deflectionLimit: panelType === 'external' ? 150 : 200,
    });

    assert.ok(Array.isArray(summary.chartData) && summary.chartData.length > 0, `${panelType}: chartData phải có dữ liệu`);
    assert.ok(Array.isArray(summary.reactionData) && summary.reactionData.length === 3, `${panelType}: reactionData phải đủ 3 gối`);
    assert.equal(typeof summary.qWind_kPa, 'number', `${panelType}: qWind_kPa phải là number`);
    assert.equal(typeof summary.maxDeflection, 'number', `${panelType}: maxDeflection phải là number`);
    assert.equal(typeof summary.maxUplift, 'number', `${panelType}: maxUplift phải là number`);
    assert.ok(summary.governingCases?.overall?.label, `${panelType}: governingCases.overall.label phải tồn tại`);
  }
});


test('wrinkling declared schema carries source-first metadata without changing numeric path', () => {
  const { summary } = computeResults({
    ...baseConfig,
    wrinklingMode: 'declared',
    wrinklingStress: 135,
    wrinklingStressBasis: 'vendor-table',
    wrinklingStressSourceType: 'vendor',
    wrinklingStressUnit: 'MPa',
    wrinklingStressSourceRef: 'Vendor table XYZ rev.B',
    wrinklingStressSourceNote: 'Value copied from vendor wrinkling line for PIR 50 mm panel.',
    wrinklingStressProductContext: 'PIR 50 mm / skin 0.45-0.45 / density 42',
  });

  assert.equal(summary.sigma_w_declared, 135);
  assert.equal(summary.sigma_w, 135);
  assert.equal(summary.wrinklingMeta?.declaredInput?.basis, 'vendor-table');
  assert.equal(summary.wrinklingMeta?.declaredInput?.sourceType, 'vendor');
  assert.equal(summary.wrinklingMeta?.declaredInput?.sourceRef, 'Vendor table XYZ rev.B');
  assert.equal(summary.wrinklingMeta?.declaredInput?.sourceNote, 'Value copied from vendor wrinkling line for PIR 50 mm panel.');
  assert.equal(summary.wrinklingMeta?.declaredInput?.productContext, 'PIR 50 mm / skin 0.45-0.45 / density 42');
  assert.equal(summary.wrinklingMeta?.declaredInput?.isSourceDocumented, true);
  assert.equal(summary.wrinklingMeta?.declaredInput?.expectedUnit, 'MPa');
  assert.equal(summary.wrinklingMeta?.declaredInputSchema?.sourceFirst, true);
  assert.equal(summary.wrinklingMeta?.declaredInputSchema?.productFamilySourceGuidance?.sourceType, 'vendor');
  assert.equal(summary.wrinklingMeta?.declaredInputSchema?.productFamilySourceGuidance?.attachmentStrength, 'product-family-guidance-only');
  assert.match(summary.wrinklingMeta?.declaredInputSchema?.productFamilySourceGuidance?.sourceRef || '', /Wrinkling of the face layer/i);
  assert.match(summary.technicalTransparency?.checks?.sigmaLimit?.sourceMeta?.provenanceBreakdown?.declaredPath?.[0]?.basis || '', /source-first declared resistance\/stress input/i);
});

test('wrinkling declared metadata defaults stay backward-compatible when new fields are omitted', () => {
  const { summary } = computeResults({
    ...baseConfig,
    wrinklingMode: 'declared',
    wrinklingStress: 120,
    wrinklingStressBasis: 'unsupported-basis',
    wrinklingStressSourceType: 'mystery-source',
    wrinklingStressUnit: '',
  });

  assert.equal(summary.sigma_w_declared, 120);
  assert.equal(summary.sigma_w, 120);
  assert.equal(summary.wrinklingMeta?.declaredInput?.basis, 'design-resistance');
  assert.equal(summary.wrinklingMeta?.declaredInput?.sourceType, 'unknown');
  assert.equal(summary.wrinklingMeta?.declaredInput?.unit, 'MPa');
  assert.equal(summary.wrinklingMeta?.declaredInput?.sourceRef, null);
  assert.equal(summary.wrinklingMeta?.declaredInput?.sourceNote, null);
  assert.equal(summary.wrinklingMeta?.declaredInput?.productContext, null);
});

test('uplift declared schema carries source-first metadata without changing uplift formula path', () => {
  const { summary } = computeResults({
    ...baseConfig,
    panelType: 'external',
    screwStrength: 8.5,
    screwStrengthBasis: 'vendor-allowable-per-fastener',
    screwStrengthSourceType: 'vendor',
    screwStrengthUnit: 'kN',
    screwStrengthSourceRef: 'Fastener datasheet ABC rev.4, table 7',
    screwStrengthSourceNote: 'Allowable pull-out for 0.5 mm skin over Z200 support; verify washer detail separately.',
    screwStrengthFastenerContext: 'SDS 5.5 / support Z200 / sheet 0.5 mm / washer 19 mm',
    screwStrengthSpacingMeaning: 'Spacing measured along panel width for this simplified panel-line count.',
  });

  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.value, 8.5);
  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.basis, 'vendor-allowable-per-fastener');
  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.sourceType, 'vendor');
  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.sourceRef, 'Fastener datasheet ABC rev.4, table 7');
  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.sourceNote, 'Allowable pull-out for 0.5 mm skin over Z200 support; verify washer detail separately.');
  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.fastenerContext, 'SDS 5.5 / support Z200 / sheet 0.5 mm / washer 19 mm');
  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.spacingMeaning, 'Spacing measured along panel width for this simplified panel-line count.');
  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.isSourceDocumented, true);
  assert.equal(summary.technicalTransparency?.uplift?.inputSchema?.sourceFirst, true);
  assert.equal(summary.technicalTransparency?.uplift?.factor?.key, 'gammaM_screw');
  assert.equal(summary.screwCount, 1);
  assert.ok(summary.T_Rd_Worst > 0);
});

test('uplift declared metadata defaults stay backward-compatible when new fields are omitted', () => {
  const { summary } = computeResults({
    ...baseConfig,
    panelType: 'external',
    screwStrength: 6,
    screwStrengthBasis: 'mystery-basis',
    screwStrengthSourceType: 'alien-source',
    screwStrengthUnit: '',
  });

  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.value, 6);
  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.basis, 'design-resistance-per-fastener');
  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.sourceType, 'unknown');
  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.unit, 'kN');
  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.sourceRef, null);
  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.sourceNote, null);
  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.fastenerContext, null);
  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.spacingMeaning, summary.technicalTransparency?.uplift?.inputSchema?.spacingMeaning);
  assert.equal(summary.technicalTransparency?.uplift?.declaredInput?.isSourceDocumented, false);
});
