import test from 'node:test';
import assert from 'node:assert/strict';
import * as calc from '../../src/calc/index.js';

const {
  SECTION_CONSTANTS,
  DEFAULT_REDISTRIBUTION_MODE,
  DEFAULT_WRINKLING_MODE,
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
  assert.match(summary.advice[0], /Wrinkling mode: declared; redistribution mode: elastic\./);
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
  assert.ok(summary.advice.some((line) => /Thiếu wrinkling stress khai báo hợp lệ/.test(line)));
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

test('governing case/report summary có đủ data moment/shear/deflection/overall', () => {
  const { summary } = computeResults({
    ...baseConfig,
    wrinklingMode: 'declared',
    redistributionMode: 'elastic',
  });

  assert.ok(summary.governingCases);
  assert.ok(summary.governingCases.moment);
  assert.ok(summary.governingCases.shear);
  assert.ok(summary.governingCases.deflection);
  assert.ok(summary.governingCases.overall);
  assert.equal(typeof summary.governingCases.moment.ratio, 'number');
  assert.equal(typeof summary.governingCases.shear.ratio, 'number');
  assert.equal(typeof summary.governingCases.deflection.ratio, 'number');
  assert.equal(typeof summary.governingCases.overall.ratio, 'number');
  assert.ok(['Mô-men/ứng suất tại gối', 'Mô-men/ứng suất tại nhịp'].includes(summary.governingCases.moment.label));
  assert.equal(summary.governingCases.shear.label, 'Lực cắt lõi');
  assert.equal(summary.governingCases.deflection.label, 'Độ võng SLS');
  assert.ok(typeof summary.governingCases.overall.label === 'string' && summary.governingCases.overall.label.length > 0);
  assert.ok(summary.extrema.moment);
  assert.ok(summary.extrema.shear);
  assert.ok(summary.extrema.deflectionTotal);
  assert.equal(typeof nodeAtX(summary.chartData, 1.5)?.shear, 'number');
  assert.equal(typeof nodeAtX(summary.chartData, 4.5)?.shear, 'number');
});
