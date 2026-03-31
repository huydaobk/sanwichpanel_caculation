import {
  APP_DISPLAY_NAME,
  APP_VERSION,
  INTERNAL_RELEASE_TRACK,
  RELEASE_ARTIFACT_BASENAME,
  buildInternalReleaseBundleLabel,
  buildInternalReleaseStamp,
  buildReleaseCaption,
  buildReleaseStamp,
  resolveReleaseChannel,
} from '../releaseMeta.js';

const EXPORT_PACKAGE_SCHEMA_VERSION = '1.3.0';
const EXPORT_PACKAGE_KIND = 'greenpan-analysis-package';
const APP_SNAPSHOT_SCHEMA_VERSION = '1.3.1';
const APP_SNAPSHOT_KIND = 'greenpan-analysis-snapshot';

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const roundNumber = (value, digits = 6) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Number(num.toFixed(digits));
};

const trimToNull = (value) => {
  const text = String(value ?? '').trim();
  return text || null;
};

const sanitizeSlugPart = (value, fallback = 'greenpan-analysis') => {
  const normalized = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
};

const buildExportStampParts = (exportedAt = new Date().toISOString()) => {
  const parsed = new Date(exportedAt);
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const pad = (value) => String(value).padStart(2, '0');
  const year = safeDate.getUTCFullYear();
  const month = pad(safeDate.getUTCMonth() + 1);
  const day = pad(safeDate.getUTCDate());
  const hours = pad(safeDate.getUTCHours());
  const minutes = pad(safeDate.getUTCMinutes());
  const seconds = pad(safeDate.getUTCSeconds());

  return {
    isoUtc: `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`,
    compactUtc: `${year}${month}${day}-${hours}${minutes}${seconds}z`,
    dateUtc: `${year}-${month}-${day}`,
  };
};

const resolveArtifactScope = (packageKind = EXPORT_PACKAGE_KIND, compareModeEnabled = false) => {
  if (packageKind === APP_SNAPSHOT_KIND) {
    return compareModeEnabled ? 'snapshot-compare-set' : 'snapshot-project';
  }
  return compareModeEnabled ? 'result-package-compare-set' : 'result-package-project';
};

const resolvePairedArtifactScopes = (compareModeEnabled = false) => (
  compareModeEnabled === true
    ? ['snapshot-compare-set', 'result-package-compare-set']
    : ['snapshot-project', 'result-package-project']
);

const buildExportFileName = ({
  projectName = 'greenpan-analysis',
  packageKind = EXPORT_PACKAGE_KIND,
  compareModeEnabled = false,
  exportedAt = new Date().toISOString(),
  extension = 'json',
} = {}) => {
  const projectSlug = sanitizeSlugPart(projectName, 'greenpan-analysis');
  const stamp = buildExportStampParts(exportedAt).compactUtc;
  const ext = String(extension || 'json').replace(/^\./, '') || 'json';
  const scope = resolveArtifactScope(packageKind, compareModeEnabled);

  return `${projectSlug}--${scope}--${stamp}.${ext}`;
};

const resolveAppVersion = (appVersion = null, fallbackVersion = null) => trimToNull(appVersion) || trimToNull(fallbackVersion) || APP_VERSION;

const buildExportMeta = ({
  projectName = null,
  packageKind = null,
  appVersion = null,
  compareModeEnabled = false,
  exportedAt = new Date().toISOString(),
} = {}) => {
  const stamp = buildExportStampParts(exportedAt);
  const resolvedVersion = resolveAppVersion(appVersion);
  const releaseChannel = resolveReleaseChannel(resolvedVersion);
  const artifactScope = resolveArtifactScope(packageKind, compareModeEnabled);
  const fileName = buildExportFileName({
    projectName,
    packageKind,
    compareModeEnabled,
    exportedAt,
    extension: 'json',
  });
  return {
    fileName,
    exportedAtUtc: stamp.isoUtc,
    exportedDateUtc: stamp.dateUtc,
    appVersion: resolvedVersion,
    appDisplayName: APP_DISPLAY_NAME,
    artifactBaseName: RELEASE_ARTIFACT_BASENAME,
    artifactScope,
    packageKind,
    projectSlug: sanitizeSlugPart(projectName, 'greenpan-analysis'),
    releaseStamp: buildReleaseStamp(resolvedVersion),
    releaseCaption: buildReleaseCaption({ version: resolvedVersion, exportedAt }),
    releaseChannel,
    internalReleaseTrack: INTERNAL_RELEASE_TRACK,
    internalReleaseStamp: buildInternalReleaseStamp({ version: resolvedVersion, exportedAt }),
    internalReleaseBundleLabel: buildInternalReleaseBundleLabel({
      artifactScope,
      version: resolvedVersion,
      exportedAt,
    }),
  };
};

const compactCheck = (item = {}) => ({
  key: item.key || null,
  label: item.label || null,
  ratio: Number.isFinite(Number(item.ratio)) ? roundNumber(item.ratio, 6) : null,
  status: item.status || (Number(item.ratio) > 1 ? 'fail' : 'pass'),
  categoryKey: item.categoryKey || null,
  hingesTriggered: item.hingesTriggered === true,
});

const buildConfigSnapshot = (config = {}) => {
  const cloned = deepClone(config);
  return {
    projectName: cloned.projectName || null,
    panelType: cloned.panelType || null,
    internalWallType: cloned.internalWallType || null,
    geometry: {
      spans: Array.isArray(cloned.spans) ? cloned.spans : [],
      supportWidths: Array.isArray(cloned.supportWidths) ? cloned.supportWidths : [],
      panelWidth: cloned.panelWidth ?? null,
      coreThickness: cloned.coreThickness ?? null,
      skinOut: cloned.skinOut ?? null,
      skinIn: cloned.skinIn ?? null,
    },
    loads: {
      deadLoadMode: cloned.deadLoadMode || null,
      deadLoadManual_kPa: cloned.deadLoadManual_kPa ?? null,
      liveLoad_kPa: cloned.liveLoad_kPa ?? null,
      windPressure: cloned.windPressure ?? null,
      windDirection: cloned.windDirection || null,
      tempOut: cloned.tempOut ?? null,
      tempIn: cloned.tempIn ?? null,
      gammaF_thermal: cloned.gammaF_thermal ?? null,
      enableSpanDistributedLoads: cloned.enableSpanDistributedLoads === true,
      deadLoadBySpan_kPa: Array.isArray(cloned.deadLoadBySpan_kPa) ? cloned.deadLoadBySpan_kPa : [],
      liveLoadBySpan_kPa: Array.isArray(cloned.liveLoadBySpan_kPa) ? cloned.liveLoadBySpan_kPa : [],
      pointLoads: Array.isArray(cloned.pointLoads) ? cloned.pointLoads : [],
    },
    resistanceInputs: {
      steelYield: cloned.steelYield ?? null,
      coreShearStrength: cloned.coreShearStrength ?? null,
      coreShearModulus: cloned.coreShearModulus ?? null,
      compressiveModulus: cloned.compressiveModulus ?? null,
      wrinklingMode: cloned.wrinklingMode || null,
      wrinklingStress: cloned.wrinklingStress ?? null,
      wrinklingStressBasis: cloned.wrinklingStressBasis || null,
      wrinklingStressSourceType: cloned.wrinklingStressSourceType || null,
      wrinklingStressUnit: cloned.wrinklingStressUnit || null,
      wrinklingStressSourceRef: cloned.wrinklingStressSourceRef || null,
      wrinklingStressSourceNote: cloned.wrinklingStressSourceNote || null,
      wrinklingStressProductContext: cloned.wrinklingStressProductContext || null,
      screwStrength: cloned.screwStrength ?? null,
      screwStrengthBasis: cloned.screwStrengthBasis || null,
      screwStrengthSourceType: cloned.screwStrengthSourceType || null,
      screwStrengthUnit: cloned.screwStrengthUnit || null,
      screwStrengthSourceRef: cloned.screwStrengthSourceRef || null,
      screwStrengthSourceNote: cloned.screwStrengthSourceNote || null,
      screwStrengthFastenerContext: cloned.screwStrengthFastenerContext || null,
      screwStrengthSpacingMeaning: cloned.screwStrengthSpacingMeaning || null,
      screwSpacing: cloned.screwSpacing ?? null,
    },
    analysisOptions: {
      redistributionMode: cloned.redistributionMode || null,
      kappaShear: cloned.kappaShear ?? null,
      deflectionLimit: cloned.deflectionLimit ?? null,
      creepFactor: cloned.creepFactor ?? null,
      creepFactorBending: cloned.creepFactorBending ?? null,
      gammaG: cloned.gammaG ?? null,
      gammaQ: cloned.gammaQ ?? null,
      coreDensity: cloned.coreDensity ?? null,
    },
  };
};

const buildResultsSnapshot = (summary = {}) => ({
  status: summary.status || null,
  governing: {
    overall: compactCheck(summary.governingCases?.overall),
    moment: compactCheck(summary.governingCases?.moment),
    shear: compactCheck(summary.governingCases?.shear),
    crushing: compactCheck(summary.governingCases?.crushing),
    uplift: compactCheck(summary.governingCases?.uplift),
    deflection: compactCheck(summary.governingCases?.deflection),
  },
  utilizationRatios: {
    bending: roundNumber(summary.ratios?.bending, 6),
    support: roundNumber(summary.ratios?.support, 6),
    shear: roundNumber(summary.ratios?.shear, 6),
    crushing: roundNumber(summary.ratios?.crushing, 6),
    uplift: roundNumber(summary.ratios?.uplift, 6),
    deflection: roundNumber(summary.ratios?.deflection, 6),
  },
  keyOutputs: {
    maxMomentAbs_kNm: roundNumber((summary.maxMomentAbs || 0) / 1e6, 6),
    maxMomentNeg_kNm: roundNumber((summary.maxMomentNeg || 0) / 1e6, 6),
    maxMomentPos_kNm: roundNumber((summary.maxMomentPos || 0) / 1e6, 6),
    maxSupportMoment_kNm: roundNumber((summary.maxSupportMoment || 0) / 1e6, 6),
    maxShear_kN: roundNumber((summary.maxShear || 0) / 1000, 6),
    maxReaction_kN: roundNumber((summary.maxReaction || 0) / 1000, 6),
    maxUplift_kN: roundNumber((summary.maxUplift || 0) / 1000, 6),
    maxDeflection_mm: roundNumber(summary.maxDeflection, 6),
    deflectionLimit_mm: roundNumber(summary.w_limit, 6),
    sigmaLimit_MPa: roundNumber(summary.sigma_limit, 6),
    stressSpan_MPa: roundNumber(summary.stress_span, 6),
    stressSupport_MPa: roundNumber(summary.stress_support, 6),
    resistanceMoment_kNm: roundNumber((summary.M_Rd || 0) / 1e6, 6),
    resistanceShear_kN: roundNumber((summary.V_Rd || 0) / 1000, 6),
    resistanceCrushing_kN: roundNumber((summary.F_Rd_Worst || 0) / 1000, 6),
    resistanceUplift_kN: roundNumber((summary.T_Rd_Worst || 0) / 1000, 6),
  },
  reactionSummary: Array.isArray(summary.reactionData)
    ? summary.reactionData.map((item) => ({
      support: item.support ?? null,
      reaction_kN: roundNumber((item.R_Ed || 0) / 1000, 6),
      compression_kN: roundNumber((item.compression_kN || 0), 6),
      uplift_kN: roundNumber((item.uplift_kN || 0), 6),
      status: item.status || null,
      ratio: roundNumber(item.ratio, 6),
    }))
    : [],
});

const buildValidationSnapshot = (summary = {}) => {
  const badges = summary.reportPresentation?.badges || {};
  const validation = badges.validation || {};
  const transparency = badges.transparency || {};

  return {
    headline: {
      status: validation.statusLabel || null,
      benchmarkClass: validation.headlineClass || null,
      benchmarkLabel: validation.headlineLabel || null,
      capturedCount: validation.capturedCount ?? null,
      totalCases: validation.totalCases ?? null,
      externalCapturedCount: validation.externalCapturedCount ?? null,
      internalCapturedCount: validation.internalCapturedCount ?? null,
      scaffoldCount: validation.scaffoldCount ?? null,
    },
    keyCases: Array.isArray(validation.keyCases) ? validation.keyCases.map((item) => ({ ...item })) : [],
    transparency: {
      key: transparency.key || null,
      label: transparency.label || null,
      detail: transparency.detail || null,
    },
    assumptions: Array.isArray(summary.reportPresentation?.assumptions) ? [...summary.reportPresentation.assumptions] : [],
    limitations: Array.isArray(summary.reportPresentation?.limitations) ? [...summary.reportPresentation.limitations] : [],
    technicalTransparency: deepClone(summary.technicalTransparency || {}),
  };
};

const buildCompareSnapshot = ({ compareModeEnabled = false, compareVariants = [], compareResults = [], compareSummary = null } = {}) => {
  if (!compareModeEnabled || !Array.isArray(compareResults) || compareResults.length < 2) {
    return {
      enabled: false,
      variantCount: Array.isArray(compareVariants) ? compareVariants.length : 0,
      summary: null,
      variants: [],
    };
  }

  return {
    enabled: true,
    variantCount: compareResults.length,
    summary: compareSummary ? deepClone(compareSummary) : null,
    variants: compareResults.map((variant, index) => ({
      id: variant?.id || compareVariants[index]?.id || null,
      label: variant?.label || compareVariants[index]?.label || null,
      status: variant?.summary?.status || null,
      governing: compactCheck(variant?.summary?.governingCases?.overall),
      utilizationRatio: roundNumber(variant?.summary?.governingCases?.overall?.ratio, 6),
    })),
  };
};

export const buildAppSnapshotPackage = ({
  config = {},
  compareModeEnabled = false,
  compareVariants = [],
  compareActiveVariantId = null,
  appVersion = null,
  fallbackAppVersion = null,
  exportedAt = new Date().toISOString(),
} = {}) => {
  const resolvedAppVersion = resolveAppVersion(appVersion, fallbackAppVersion);

  const exportMeta = buildExportMeta({
    projectName: config.projectName,
    packageKind: APP_SNAPSHOT_KIND,
    appVersion: resolvedAppVersion,
    compareModeEnabled,
    exportedAt,
  });

  const normalizedVariants = Array.isArray(compareVariants)
    ? compareVariants.map((variant, index) => ({
      id: variant?.id || `variant-${index + 1}`,
      label: variant?.label || variant?.name || `PA ${index + 1}`,
      name: variant?.name || variant?.label || `PA ${index + 1}`,
      config: deepClone(variant?.config || {}),
    }))
    : [];

  const activeVariant = normalizedVariants.find((variant) => variant.id === compareActiveVariantId) || normalizedVariants[0] || null;
  const snapshotScope = exportMeta.artifactScope;
  const packageLabel = snapshotScope === 'snapshot-compare-set' ? 'Snapshot compare set' : 'Snapshot dự án';

  return {
    schemaVersion: APP_SNAPSHOT_SCHEMA_VERSION,
    packageKind: APP_SNAPSHOT_KIND,
    exportedAt,
    appVersion: resolvedAppVersion,
    exportMeta,
    artifactMeta: {
      ...exportMeta,
      schemaVersion: APP_SNAPSHOT_SCHEMA_VERSION,
      snapshotRole: 'app-state',
      packageLabel,
      internalReleaseTrack: exportMeta.internalReleaseTrack,
      internalReleaseStamp: exportMeta.internalReleaseStamp,
      internalReleaseBundleLabel: exportMeta.internalReleaseBundleLabel,
      bundleMembers: ['snapshot-package'],
    },
    appState: {
      compareModeEnabled: compareModeEnabled === true,
      compareActiveVariantId: compareActiveVariantId || null,
      appDisplayName: APP_DISPLAY_NAME,
      releaseChannel: exportMeta.releaseChannel,
      releaseStamp: exportMeta.releaseStamp,
    },
    importSummary: {
      packageLabel,
      artifactScope: snapshotScope,
      projectName: trimToNull(config.projectName),
      compareModeEnabled: compareModeEnabled === true,
      internalReleaseTrack: exportMeta.internalReleaseTrack,
      internalReleaseBundleLabel: exportMeta.internalReleaseBundleLabel,
      variantCount: normalizedVariants.length,
      activeVariantId: activeVariant?.id || null,
      activeVariantLabel: activeVariant?.label || null,
      variants: normalizedVariants.map((variant) => ({
        id: variant.id,
        label: variant.label,
      })),
      schemaVersion: APP_SNAPSHOT_SCHEMA_VERSION,
      appVersion: resolvedAppVersion,
    },
    configSnapshot: deepClone(config),
    compareSnapshot: {
      variantCount: normalizedVariants.length,
      variants: normalizedVariants,
    },
  };
};

export const buildResultPackage = ({
  config = {},
  summary = {},
  compareModeEnabled = false,
  compareVariants = [],
  compareResults = [],
  compareSummary = null,
  appVersion = null,
  fallbackAppVersion = null,
  exportedAt = new Date().toISOString(),
} = {}) => {
  const resolvedAppVersion = resolveAppVersion(appVersion, fallbackAppVersion);

  const exportMeta = buildExportMeta({
    projectName: config.projectName,
    packageKind: EXPORT_PACKAGE_KIND,
    appVersion: resolvedAppVersion,
    compareModeEnabled,
    exportedAt,
  });

  return {
    schemaVersion: EXPORT_PACKAGE_SCHEMA_VERSION,
    packageKind: EXPORT_PACKAGE_KIND,
    exportedAt,
    appVersion: resolvedAppVersion,
    exportMeta,
    artifactMeta: {
      ...exportMeta,
      schemaVersion: EXPORT_PACKAGE_SCHEMA_VERSION,
      snapshotRole: 'analysis-result',
      internalReleaseTrack: exportMeta.internalReleaseTrack,
      internalReleaseStamp: exportMeta.internalReleaseStamp,
      internalReleaseBundleLabel: exportMeta.internalReleaseBundleLabel,
      pairedArtifactScopes: resolvePairedArtifactScopes(compareModeEnabled),
    },
    auditStamp: {
      resultStatus: summary.status || null,
      overallUtilizationRatio: roundNumber(summary.governingCases?.overall?.ratio, 6),
      governingCase: summary.governingCases?.overall?.key || null,
      transparencyLevel: summary.reportPresentation?.badges?.transparency?.key || null,
      validationHeadlineClass: summary.reportPresentation?.badges?.validation?.headlineClass || null,
      compareMode: compareModeEnabled === true,
      releaseStamp: exportMeta.releaseStamp,
      releaseChannel: exportMeta.releaseChannel,
      artifactFileName: exportMeta.fileName,
      artifactScope: exportMeta.artifactScope,
      internalReleaseTrack: exportMeta.internalReleaseTrack,
      internalReleaseStamp: exportMeta.internalReleaseStamp,
      internalReleaseBundleLabel: exportMeta.internalReleaseBundleLabel,
      pairedArtifactScopes: resolvePairedArtifactScopes(compareModeEnabled),
    },
    metadata: {
      projectName: config.projectName || null,
      panelType: config.panelType || null,
      internalWallType: config.internalWallType || null,
      distributedLoadMode: summary.distributedLoadMode || null,
      redistributionMode: summary.redistributionMode || config.redistributionMode || null,
      wrinklingModeRequested: config.wrinklingMode || null,
      wrinklingModeEffective: summary.effectiveWrinklingMode || null,
      upliftEnabled: summary.upliftEnabled === true,
      spans: Array.isArray(config.spans) ? config.spans.length : 0,
      appDisplayName: APP_DISPLAY_NAME,
      releaseChannel: exportMeta.releaseChannel,
      releaseStamp: exportMeta.releaseStamp,
      artifactBaseName: exportMeta.artifactBaseName,
      artifactFileName: exportMeta.fileName,
      artifactScope: exportMeta.artifactScope,
      internalReleaseTrack: exportMeta.internalReleaseTrack,
      internalReleaseStamp: exportMeta.internalReleaseStamp,
      internalReleaseBundleLabel: exportMeta.internalReleaseBundleLabel,
      pairedArtifactScopes: resolvePairedArtifactScopes(compareModeEnabled),
    },
    configSnapshot: buildConfigSnapshot(config),
    resultSnapshot: buildResultsSnapshot(summary),
    validationSnapshot: buildValidationSnapshot(summary),
    compareSnapshot: buildCompareSnapshot({ compareModeEnabled, compareVariants, compareResults, compareSummary }),
  };
};

export {
  EXPORT_PACKAGE_KIND,
  EXPORT_PACKAGE_SCHEMA_VERSION,
  APP_SNAPSHOT_KIND,
  APP_SNAPSHOT_SCHEMA_VERSION,
  buildExportFileName,
};
