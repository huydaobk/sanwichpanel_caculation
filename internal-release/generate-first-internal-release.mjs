import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_REDISTRIBUTION_MODE,
  DEFAULT_WRINKLING_MODE,
  runPanelAnalysis,
  buildAppSnapshotPackage,
  buildResultPackage,
} from '../src/calc/index.js';
import {
  APP_DISPLAY_NAME,
  APP_VERSION,
  buildReleaseStamp,
} from '../src/releaseMeta.js';

const exportedAt = new Date().toISOString();
const outDir = path.resolve('internal-release/first-bundle');
fs.mkdirSync(outDir, { recursive: true });

const config = {
  projectName: 'Internal Release Demo Case 01',
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
  wrinklingStressSourceNote: 'Locked internal release fixture.',
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

const { summary } = runPanelAnalysis(config, { defaultRedistributionMode: DEFAULT_REDISTRIBUTION_MODE });
const compareVariants = [{ id: 'variant-a', label: 'Release Case', name: 'Release Case', config }];
const compareResults = [{ id: 'variant-a', label: 'Release Case', config, summary }];

const snapshotPkg = buildAppSnapshotPackage({
  config,
  compareModeEnabled: false,
  compareVariants,
  compareActiveVariantId: 'variant-a',
  appVersion: APP_VERSION,
  exportedAt,
});

const resultPkg = buildResultPackage({
  config,
  summary,
  compareModeEnabled: false,
  compareVariants,
  compareResults,
  compareSummary: null,
  appVersion: APP_VERSION,
  exportedAt,
});

const snapshotPath = path.join(outDir, snapshotPkg.exportMeta.fileName);
const resultPath = path.join(outDir, resultPkg.exportMeta.fileName);
fs.writeFileSync(snapshotPath, JSON.stringify(snapshotPkg, null, 2));
fs.writeFileSync(resultPath, JSON.stringify(resultPkg, null, 2));

const verification = {
  appDisplayName: APP_DISPLAY_NAME,
  version: APP_VERSION,
  releaseStamp: buildReleaseStamp(APP_VERSION),
  exportedAt,
  snapshot: {
    path: snapshotPath,
    artifactScope: snapshotPkg.exportMeta.artifactScope,
    internalReleaseTrack: snapshotPkg.exportMeta.internalReleaseTrack,
    internalReleaseStamp: snapshotPkg.exportMeta.internalReleaseStamp,
    internalReleaseBundleLabel: snapshotPkg.exportMeta.internalReleaseBundleLabel,
    projectName: snapshotPkg.importSummary.projectName,
  },
  result: {
    path: resultPath,
    artifactScope: resultPkg.exportMeta.artifactScope,
    internalReleaseTrack: resultPkg.exportMeta.internalReleaseTrack,
    internalReleaseStamp: resultPkg.exportMeta.internalReleaseStamp,
    internalReleaseBundleLabel: resultPkg.exportMeta.internalReleaseBundleLabel,
    projectName: resultPkg.metadata.projectName,
    status: resultPkg.resultSnapshot.status,
    governingCase: resultPkg.resultSnapshot.governing.overall,
    pairedArtifactScopes: resultPkg.auditStamp.pairedArtifactScopes,
  },
  pairingCheck: {
    sameTrack: snapshotPkg.exportMeta.internalReleaseTrack === resultPkg.exportMeta.internalReleaseTrack,
    sameStamp: snapshotPkg.exportMeta.internalReleaseStamp === resultPkg.exportMeta.internalReleaseStamp,
    pairedScopes: [snapshotPkg.exportMeta.artifactScope, resultPkg.exportMeta.artifactScope],
    expectedPairedScopes: resultPkg.auditStamp.pairedArtifactScopes,
  },
};

fs.writeFileSync(path.join(outDir, 'verification.json'), JSON.stringify(verification, null, 2));
console.log(JSON.stringify(verification, null, 2));
