import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_REDISTRIBUTION_MODE,
  DEFAULT_WRINKLING_MODE,
  runPanelAnalysis,
  buildCompareExecutiveSummary,
  buildResultPackage,
  buildExportFileName,
} from '../../src/calc/index.js';

const baseConfig = {
  projectName: 'Export package regression harness',
  panelType: 'external',
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
  wrinklingStressSourceType: 'vendor',
  wrinklingStressUnit: 'MPa',
  wrinklingStressSourceRef: 'Vendor wrinkling table rev.2',
  wrinklingStressSourceNote: 'Locked fixture for regression package export.',
  wrinklingStressProductContext: 'Panel family GP-1000',
  redistributionMode: DEFAULT_REDISTRIBUTION_MODE,
  kappaShear: 1.0,
  coreDensity: 42,
  windPressure: 0.9,
  windDirection: 'suction',
  tempOut: 60,
  tempIn: 25,
  gammaF_thermal: 1.5,
  screwStrength: 8.5,
  screwStrengthBasis: 'vendor-allowable-per-fastener',
  screwStrengthSourceType: 'vendor',
  screwStrengthUnit: 'kN',
  screwStrengthSourceRef: 'Fastener datasheet ABC rev.4, table 7',
  screwStrengthSourceNote: 'Allowable pull-out for 0.5 mm skin over Z200 support; verify washer detail separately.',
  screwStrengthFastenerContext: 'SDS 5.5 / support Z200 / sheet 0.5 mm / washer 19 mm',
  screwStrengthSpacingMeaning: 'Spacing measured along panel width for this simplified panel-line count.',
  screwSpacing: 1000,
  deflectionLimit: 200,
  creepFactor: 2.4,
  creepFactorBending: 0,
  spans: [3.0, 3.0],
  supportWidths: [60, 60, 60],
  deadLoadMode: 'manual',
  deadLoadManual_kPa: 0.18,
  liveLoad_kPa: 0.25,
  gammaG: 1.35,
  gammaQ: 1.5,
  enableSpanDistributedLoads: true,
  deadLoadBySpan_kPa: [0.18, 0.22],
  liveLoadBySpan_kPa: [0.25, 0.1],
  pointLoads: [
    { x_m: 1.5, P_kN: 0.30, note: 'Đèn', type: 'permanent' },
    { x_m: 4.5, P_kN: 0.20, note: 'Máng cáp', type: 'variable' },
  ],
};

function computeSummary(config) {
  return runPanelAnalysis(config, { defaultRedistributionMode: DEFAULT_REDISTRIBUTION_MODE }).summary;
}

test('buildResultPackage exports auditable JSON package with metadata, transparency, and compare summary', () => {
  const variantAConfig = { ...baseConfig, projectName: 'Package A', windPressure: 0.9, screwStrength: 8.5 };
  const variantBSlightlyWorse = { ...baseConfig, projectName: 'Package B', windPressure: 1.2, screwStrength: 6.5 };

  const summaryA = computeSummary(variantAConfig);
  const summaryB = computeSummary(variantBSlightlyWorse);

  const compareVariants = [
    { id: 'variant-a', label: 'PA A', config: variantAConfig },
    { id: 'variant-b', label: 'PA B', config: variantBSlightlyWorse },
  ];
  const compareResults = [
    { id: 'variant-a', label: 'PA A', config: variantAConfig, summary: summaryA },
    { id: 'variant-b', label: 'PA B', config: variantBSlightlyWorse, summary: summaryB },
  ];
  const compareSummary = buildCompareExecutiveSummary(compareResults);

  const pkg = buildResultPackage({
    config: variantAConfig,
    summary: summaryA,
    compareModeEnabled: true,
    compareVariants,
    compareResults,
    compareSummary,
    appVersion: '0.0.1-test',
    exportedAt: '2026-03-30T14:30:00.000Z',
  });

  assert.equal(pkg.schemaVersion, '1.3.0');
  assert.equal(pkg.packageKind, 'greenpan-analysis-package');
  assert.equal(pkg.exportedAt, '2026-03-30T14:30:00.000Z');
  assert.equal(pkg.appVersion, '0.0.1-test');
  assert.equal(pkg.exportMeta.fileName, 'package-a--result-package-compare-set--20260330-143000z.json');
  assert.equal(pkg.exportMeta.exportedAtUtc, '2026-03-30T14:30:00Z');
  assert.equal(pkg.exportMeta.appVersion, '0.0.1-test');
  assert.equal(pkg.exportMeta.appDisplayName, 'Greenpan Design');
  assert.equal(pkg.exportMeta.releaseStamp, 'Greenpan Design v0.0.1-test');
  assert.equal(pkg.exportMeta.releaseChannel, 'pre-release');
  assert.equal(pkg.exportMeta.internalReleaseTrack, 'internal');
  assert.equal(pkg.exportMeta.internalReleaseStamp, 'Greenpan Design v0.0.1-test · internal · 2026-03-30T14:30:00.000Z');
  assert.equal(pkg.exportMeta.internalReleaseBundleLabel, 'result-package-compare-set | Greenpan Design v0.0.1-test · internal · 2026-03-30T14:30:00.000Z');
  assert.equal(pkg.exportMeta.artifactBaseName, 'Greenpan-Design-Setup');
  assert.equal(pkg.exportMeta.artifactScope, 'result-package-compare-set');
  assert.equal(pkg.artifactMeta.snapshotRole, 'analysis-result');

  assert.equal(pkg.auditStamp.resultStatus, summaryA.status);
  assert.equal(pkg.auditStamp.releaseStamp, 'Greenpan Design v0.0.1-test');
  assert.equal(pkg.auditStamp.releaseChannel, 'pre-release');
  assert.equal(pkg.auditStamp.internalReleaseTrack, 'internal');
  assert.equal(pkg.auditStamp.internalReleaseBundleLabel, 'result-package-compare-set | Greenpan Design v0.0.1-test · internal · 2026-03-30T14:30:00.000Z');
  assert.deepEqual(pkg.auditStamp.pairedArtifactScopes, ['snapshot-compare-set', 'result-package-compare-set']);
  assert.equal(pkg.auditStamp.artifactFileName, 'package-a--result-package-compare-set--20260330-143000z.json');
  assert.equal(pkg.auditStamp.artifactScope, 'result-package-compare-set');
  assert.equal(pkg.auditStamp.compareMode, true);
  assert.equal(pkg.auditStamp.governingCase, summaryA.governingCases.overall.key);
  assert.equal(pkg.auditStamp.validationHeadlineClass, summaryA.reportPresentation.badges.validation.headlineClass);
  assert.equal(pkg.auditStamp.transparencyLevel, summaryA.reportPresentation.badges.transparency.key);

  assert.equal(pkg.metadata.projectName, variantAConfig.projectName);
  assert.equal(pkg.metadata.panelType, variantAConfig.panelType);
  assert.equal(pkg.metadata.distributedLoadMode, summaryA.distributedLoadMode);
  assert.equal(pkg.metadata.wrinklingModeEffective, summaryA.effectiveWrinklingMode);
  assert.equal(pkg.metadata.artifactBaseName, 'Greenpan-Design-Setup');
  assert.equal(pkg.metadata.artifactScope, 'result-package-compare-set');
  assert.equal(pkg.metadata.internalReleaseTrack, 'internal');
  assert.equal(pkg.metadata.internalReleaseBundleLabel, 'result-package-compare-set | Greenpan Design v0.0.1-test · internal · 2026-03-30T14:30:00.000Z');
  assert.deepEqual(pkg.metadata.pairedArtifactScopes, ['snapshot-compare-set', 'result-package-compare-set']);

  assert.deepEqual(pkg.configSnapshot.geometry.spans, variantAConfig.spans);
  assert.equal(pkg.configSnapshot.loads.enableSpanDistributedLoads, true);
  assert.equal(pkg.configSnapshot.resistanceInputs.screwStrengthSourceRef, variantAConfig.screwStrengthSourceRef);

  assert.equal(pkg.resultSnapshot.status, summaryA.status);
  assert.equal(pkg.resultSnapshot.governing.overall.key, summaryA.governingCases.overall.key);
  assert.equal(pkg.resultSnapshot.utilizationRatios.deflection, Number(summaryA.ratios.deflection.toFixed(6)));
  assert.equal(pkg.resultSnapshot.keyOutputs.maxDeflection_mm, Number(summaryA.maxDeflection.toFixed(6)));
  assert.ok(Array.isArray(pkg.resultSnapshot.reactionSummary) && pkg.resultSnapshot.reactionSummary.length === summaryA.reactionData.length);

  assert.equal(pkg.validationSnapshot.headline.benchmarkClass, summaryA.reportPresentation.badges.validation.headlineClass);
  assert.equal(pkg.validationSnapshot.transparency.key, summaryA.reportPresentation.badges.transparency.key);
  assert.ok(pkg.validationSnapshot.assumptions.length >= 3);
  assert.ok(pkg.validationSnapshot.limitations.length >= 2);
  assert.equal(pkg.validationSnapshot.technicalTransparency.uplift.declaredInput.sourceRef, variantAConfig.screwStrengthSourceRef);

  assert.equal(pkg.compareSnapshot.enabled, true);
  assert.equal(pkg.compareSnapshot.variantCount, 2);
  assert.equal(pkg.compareSnapshot.summary.bestVariantId, compareSummary.bestVariantId);
  assert.equal(pkg.compareSnapshot.variants[0].label, 'PA A');
  assert.equal(pkg.compareSnapshot.variants[1].label, 'PA B');
  assert.equal(typeof pkg.compareSnapshot.variants[0].utilizationRatio, 'number');
});

test('buildResultPackage stays compare-safe when compare mode is off', () => {
  const summary = computeSummary(baseConfig);
  const pkg = buildResultPackage({
    config: baseConfig,
    summary,
    compareModeEnabled: false,
    compareVariants: [{ id: 'variant-a', label: 'PA A', config: baseConfig }],
    compareResults: [],
    compareSummary: null,
    fallbackAppVersion: '0.0.1-fallback',
    exportedAt: '2026-03-30T14:31:00.000Z',
  });

  assert.equal(pkg.appVersion, '0.0.1-fallback');
  assert.equal(pkg.exportMeta.appVersion, '0.0.1-fallback');
  assert.equal(pkg.compareSnapshot.enabled, false);
  assert.equal(pkg.compareSnapshot.summary, null);
  assert.deepEqual(pkg.compareSnapshot.variants, []);
  assert.equal(pkg.compareSnapshot.variantCount, 1);
});

test('buildExportFileName keeps result and snapshot naming consistent', () => {
  assert.equal(
    buildExportFileName({
      projectName: 'Dự án Áp mái 01',
      packageKind: 'greenpan-analysis-package',
      compareModeEnabled: false,
      exportedAt: '2026-03-30T14:31:00.000Z',
    }),
    'du-an-ap-mai-01--result-package-project--20260330-143100z.json',
  );

  assert.equal(
    buildExportFileName({
      projectName: 'Dự án Áp mái 01',
      packageKind: 'greenpan-analysis-snapshot',
      compareModeEnabled: true,
      exportedAt: '2026-03-30T14:31:00.000Z',
    }),
    'du-an-ap-mai-01--snapshot-compare-set--20260330-143100z.json',
  );
});

test('buildCompareExecutiveSummary ranks compare variants with transparent rationale', () => {
  const variantAConfig = { ...baseConfig, projectName: 'PA toi uu', windPressure: 0.9, screwStrength: 8.5 };
  const variantBConfig = { ...baseConfig, projectName: 'PA sat nguong', windPressure: 1.05, screwStrength: 7.2 };
  const variantCConfig = { ...baseConfig, projectName: 'PA khong dat', windPressure: 1.35, screwStrength: 5.8 };

  const compareSummary = buildCompareExecutiveSummary([
    { id: 'variant-a', label: 'PA tối ưu', config: variantAConfig, summary: computeSummary(variantAConfig) },
    { id: 'variant-b', label: 'PA sát ngưỡng', config: variantBConfig, summary: computeSummary(variantBConfig) },
    { id: 'variant-c', label: 'PA không đạt', config: variantCConfig, summary: computeSummary(variantCConfig) },
  ]);

  assert.equal(compareSummary.available, true);
  assert.equal(compareSummary.variantCount, 3);
  assert.equal(compareSummary.bestVariantLabel, 'PA tối ưu');
  assert.equal(compareSummary.variants[0].label, compareSummary.bestVariantLabel);
  assert.equal(typeof compareSummary.bestMarginPercent, 'number');
  assert.match(compareSummary.rationale || '', /PA tối ưu/);
  assert.equal(compareSummary.passCount, compareSummary.variants.filter((item) => item.status === 'pass').length);
});
