import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAppSnapshotPackage,
  APP_SNAPSHOT_KIND,
} from '../../src/calc/index.js';

const baseConfig = {
  projectName: 'Snapshot regression harness',
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
  wrinklingMode: 'approx',
  wrinklingStress: 120,
  wrinklingStressBasis: 'design-resistance',
  wrinklingStressSourceType: 'unknown',
  wrinklingStressUnit: 'MPa',
  wrinklingStressSourceRef: '',
  wrinklingStressSourceNote: '',
  wrinklingStressProductContext: '',
  redistributionMode: 'elastic',
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
  deadLoadMode: 'manual',
  deadLoadManual_kPa: 0.18,
  liveLoad_kPa: 0.25,
  gammaG: 1.35,
  gammaQ: 1.5,
  enableSpanDistributedLoads: true,
  deadLoadBySpan_kPa: [0.18, 0.22],
  liveLoadBySpan_kPa: [0.25, 0.1],
  pointLoads: [
    { x_m: 1.5, P_kN: 0.3, note: 'Đèn', type: 'permanent' },
  ],
};

test('buildAppSnapshotPackage captures current config snapshot for later reload', () => {
  const pkg = buildAppSnapshotPackage({
    config: baseConfig,
    compareModeEnabled: false,
    compareVariants: [{ id: 'variant-a', label: 'PA A', name: 'PA A', config: baseConfig }],
    compareActiveVariantId: 'variant-a',
    appVersion: '0.0.1-test',
    exportedAt: '2026-03-30T14:45:00.000Z',
  });

  assert.equal(pkg.packageKind, APP_SNAPSHOT_KIND);
  assert.equal(pkg.schemaVersion, '1.3.1');
  assert.equal(pkg.exportedAt, '2026-03-30T14:45:00.000Z');
  assert.equal(pkg.exportMeta.fileName, 'snapshot-regression-harness--snapshot-project--20260330-144500z.json');
  assert.equal(pkg.exportMeta.artifactBaseName, 'Greenpan-Design-Setup');
  assert.equal(pkg.exportMeta.artifactScope, 'snapshot-project');
  assert.equal(pkg.artifactMeta.snapshotRole, 'app-state');
  assert.equal(pkg.artifactMeta.packageLabel, 'Snapshot dự án');
  assert.equal(pkg.artifactMeta.internalReleaseTrack, 'internal');
  assert.equal(pkg.artifactMeta.internalReleaseBundleLabel, 'snapshot-project | Greenpan Design v0.0.1-test · internal · 2026-03-30T14:45:00.000Z');
  assert.deepEqual(pkg.artifactMeta.bundleMembers, ['snapshot-package']);
  assert.equal(pkg.exportMeta.exportedAtUtc, '2026-03-30T14:45:00Z');
  assert.equal(pkg.exportMeta.appVersion, '0.0.1-test');
  assert.equal(pkg.exportMeta.appDisplayName, 'Greenpan Design');
  assert.equal(pkg.exportMeta.releaseStamp, 'Greenpan Design v0.0.1-test');
  assert.equal(pkg.exportMeta.releaseChannel, 'pre-release');
  assert.equal(pkg.exportMeta.internalReleaseTrack, 'internal');
  assert.equal(pkg.exportMeta.internalReleaseStamp, 'Greenpan Design v0.0.1-test · internal · 2026-03-30T14:45:00.000Z');
  assert.equal(pkg.appState.compareModeEnabled, false);
  assert.equal(pkg.appState.compareActiveVariantId, 'variant-a');
  assert.equal(pkg.appState.appDisplayName, 'Greenpan Design');
  assert.equal(pkg.appState.releaseChannel, 'pre-release');
  assert.equal(pkg.appState.releaseStamp, 'Greenpan Design v0.0.1-test');
  assert.deepEqual(pkg.configSnapshot.spans, baseConfig.spans);
  assert.equal(pkg.configSnapshot.projectName, baseConfig.projectName);
  assert.equal(pkg.importSummary.packageLabel, 'Snapshot dự án');
  assert.equal(pkg.importSummary.internalReleaseTrack, 'internal');
  assert.equal(pkg.importSummary.internalReleaseBundleLabel, 'snapshot-project | Greenpan Design v0.0.1-test · internal · 2026-03-30T14:45:00.000Z');
  assert.equal(pkg.importSummary.variantCount, 1);
  assert.equal(pkg.importSummary.activeVariantLabel, 'PA A');
  assert.equal(pkg.compareSnapshot.variantCount, 1);
  assert.equal(pkg.compareSnapshot.variants[0].label, 'PA A');
  assert.deepEqual(pkg.compareSnapshot.variants[0].config.deadLoadBySpan_kPa, baseConfig.deadLoadBySpan_kPa);
});

test('buildAppSnapshotPackage preserves compare-set variants when compare mode is on', () => {
  const variantA = { ...baseConfig, projectName: 'PA A', windPressure: 0.8 };
  const variantB = { ...baseConfig, projectName: 'PA B', windPressure: 1.2, liveLoadBySpan_kPa: [0.25, 0.4] };

  const pkg = buildAppSnapshotPackage({
    config: variantB,
    compareModeEnabled: true,
    compareVariants: [
      { id: 'variant-a', label: 'PA A', name: 'PA A', config: variantA },
      { id: 'variant-b', label: 'PA B', name: 'PA B', config: variantB },
    ],
    compareActiveVariantId: 'variant-b',
    fallbackAppVersion: '0.0.1-fallback',
    exportedAt: '2026-03-30T14:46:00.000Z',
  });

  assert.equal(pkg.appVersion, '0.0.1-fallback');
  assert.equal(pkg.exportMeta.fileName, 'pa-b--snapshot-compare-set--20260330-144600z.json');
  assert.equal(pkg.exportMeta.artifactScope, 'snapshot-compare-set');
  assert.equal(pkg.exportMeta.releaseStamp, 'Greenpan Design v0.0.1-fallback');
  assert.equal(pkg.exportMeta.releaseChannel, 'pre-release');
  assert.equal(pkg.artifactMeta.packageLabel, 'Snapshot compare set');
  assert.equal(pkg.artifactMeta.internalReleaseTrack, 'internal');
  assert.equal(pkg.artifactMeta.internalReleaseBundleLabel, 'snapshot-compare-set | Greenpan Design v0.0.1-fallback · internal · 2026-03-30T14:46:00.000Z');
  assert.equal(pkg.appState.compareModeEnabled, true);
  assert.equal(pkg.appState.compareActiveVariantId, 'variant-b');
  assert.equal(pkg.importSummary.packageLabel, 'Snapshot compare set');
  assert.equal(pkg.importSummary.internalReleaseTrack, 'internal');
  assert.equal(pkg.importSummary.internalReleaseBundleLabel, 'snapshot-compare-set | Greenpan Design v0.0.1-fallback · internal · 2026-03-30T14:46:00.000Z');
  assert.equal(pkg.importSummary.variantCount, 2);
  assert.equal(pkg.importSummary.activeVariantLabel, 'PA B');
  assert.equal(pkg.compareSnapshot.variantCount, 2);
  assert.equal(pkg.compareSnapshot.variants[1].label, 'PA B');
  assert.equal(pkg.compareSnapshot.variants[1].config.windPressure, 1.2);
  assert.deepEqual(pkg.compareSnapshot.variants[1].config.liveLoadBySpan_kPa, [0.25, 0.4]);
});
