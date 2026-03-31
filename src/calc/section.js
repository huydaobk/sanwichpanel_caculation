export const SUPPORT_CRUSHING_RESISTANCE = {
  key: 'core-bearing-stress',
  legacyAlias: 'fCc',
  value: 0.10,
  unit: 'N/mm²',
  status: 'repo-constant-uncited',
  sourceType: 'repository-default',
  evidenceLevel: 'no-direct-source-attached',
  provenanceNote: 'Legacy fCc default kept as the current support crushing/core bearing stress input until a cited product-specific source is attached.',
  sourceAttachmentStatus: 'No direct handbook/datasheet/worksheet citation is attached for the retained 0.10 N/mm² default in this repository.',
};

export const SECTION_CONSTANTS = {
  Ef: 210000,
  Ec: 4.0,
  fCc: SUPPORT_CRUSHING_RESISTANCE.value,
  alpha: 1.2e-5,
  gammaF_wind: 2.1,
  gammaM_yield: 1.1,
  gammaM_shear: 1.25,
  gammaM_crushing: 1.25,
  gammaM_wrinkling: 1.2,
  gammaM_screw: 1.33,
};

export const SUPPORT_CRUSHING_FACTOR = {
  key: 'gammaM_crushing',
  legacyAlias: 'gammaM_shear',
  value: SECTION_CONSTANTS.gammaM_crushing,
  sharedWith: 'gammaM_shear',
  status: 'provisional-shared-factor',
  evidenceLevel: 'no-direct-source-attached',
  provenanceNote: 'Support crushing currently reuses the shear partial factor value. The dedicated crushing name is exposed for clarity while the numeric value remains shared until source-backed separation is available.',
  sourceAttachmentStatus: 'No direct crushing-specific source has yet justified the retained shared 1.25 value or a numeric split from gammaM_shear.',
};

export const WRINKLING_APPROX_PROVENANCE = {
  key: 'sigma_w_approx',
  formula: '0.5 * sqrt(Ef * Ec * Gc)',
  coefficient: 0.5,
  inputs: ['Ef', 'Ec', 'Gc'],
  status: 'repo-formula-uncited',
  sourceType: 'engineering-approximation',
  evidenceLevel: 'no-direct-source-attached',
  provenanceNote: 'Current repository approximation for wrinkling stress is kept visible as an engineering approximation only. No cited handbook, code commentary, vendor table, or archived worksheet in this repo currently justifies the retained 0.5 coefficient together with the exact Ef/Ec/Gc variable set.',
  sourceAttachmentStatus: 'Approximation remains formula-transparent but source-incomplete until a product-family or handbook citation is attached.',
};

export const WRINKLING_FACTOR = {
  key: 'gammaM_wrinkling',
  value: SECTION_CONSTANTS.gammaM_wrinkling,
  status: 'repo-factor-uncited',
  sourceType: 'repository-default',
  evidenceLevel: 'no-direct-source-attached',
  provenanceNote: 'The wrinkling design factor is implemented and applied consistently, but no current repo artifact links the retained 1.2 value to a code clause, vendor recommendation, or archived accepted worksheet for the same product family.',
  sourceAttachmentStatus: 'No direct source note currently justifies gammaM_wrinkling = 1.2 in this repository.',
};

export const WRINKLING_DECLARED_INPUT_SCHEMA = {
  key: 'wrinklingStress',
  version: 3,
  sourceFirst: true,
  expectedMeaning: 'Declared wrinkling resistance/stress input supplied by the user for the selected panel product/facing/core combination.',
  preferredBasis: 'design-resistance',
  preferredSourceTypesForRelease: ['vendor', 'test', 'worksheet'],
  acceptedBases: [
    'design-resistance',
    'characteristic-resistance',
    'test-result',
    'vendor-table',
    'user-note',
  ],
  unit: 'MPa',
  basisNote: 'UI/report should always show MPa together with the declared basis because the same numeric value can mean design resistance, characteristic resistance, raw test result, or a vendor-tabulated limit.',
  sourceExpectation: 'Prefer a cited vendor table, test report, or archived engineering worksheet before treating the declared value as stronger than a user declaration.',
  evidenceHierarchy: [
    'vendor datasheet / technical guide with product-family wrinkling terminology and resistance or factor context',
    'test report / lab sheet tied to the same panel family',
    'archived accepted worksheet for the same product family',
  ],
  sourceAttachmentGuidance: {
    acceptableForMetadataOnly: 'A product-family technical guide may document accepted basis/factor context for wrinkling without by itself proving the exact numeric declared MPa value.',
    numericAuthorityRule: 'Do not treat a declared MPa value as source-backed unless the attached artifact itself states the resistance/stress for the same product family or clearly identifies the worksheet/test line from which the number was copied.',
  },
  productFamilySourceGuidance: {
    sourceRef: 'Paroc Panel System technical guide (ASS_533988), section 2.1 General, Table 6a/6b: “Wrinkling of the face layer in the span and at an intermediate support”.',
    sourceType: 'vendor',
    basis: 'characteristic-resistance',
    productContext: 'PAROC AST/S/S+/F/F+/E/L panel families; guide gives product-family wrinkling gamma_m context, not a universal numeric wrinkling stress.',
    sourceNote: 'Use this guide to document accepted product-family wrinkling terminology and factor context. Keep the declared MPa numeric value as user-declared unless the exact table/test/worksheet line supplying that number is attached.',
    attachmentStrength: 'product-family-guidance-only',
    artifactHuntStatus: 'no-numeric-artifact-found-in-repo',
    artifactHuntScope: [
      'vendor wrinkling table with explicit MPa value for the same panel family/path',
      'test report / lab sheet with wrinkling stress or resistance line',
      'archived engineering worksheet identifying the copied wrinkling MPa line',
      'product manual line that states the numeric wrinkling resistance/stress',
    ],
    artifactHuntConclusion: 'Current repo review found only product-family wrinkling terminology/factor guidance, not a numeric artifact strong enough to certify a declared MPa value for this path.',
  },
  acceptedMetadata: [
    'declaredBasis',
    'declaredSourceType',
    'declaredDisplayUnit',
    'declaredSourceRef',
    'declaredSourceNote',
    'declaredProductContext',
  ],
  metadataGuidance: {
    declaredBasis: {
      label: 'Basis của giá trị khai báo',
      values: {
        'design-resistance': 'Giá trị sức kháng/ứng suất thiết kế đã dùng trực tiếp trong kiểm tra (không chia thêm gammaM ngoài flow hiện tại).',
        'characteristic-resistance': 'Giá trị đặc trưng; cần note rõ nếu chưa chuyển về design basis trước khi đưa vào flow này.',
        'test-result': 'Kết quả thử nghiệm/raw lab result; chỉ nên dùng khi có note diễn giải cách chuyển về resistance dùng cho thiết kế.',
        'vendor-table': 'Giá trị lấy từ bảng vendor/datasheet; nên đi kèm product line / thickness / density / facing context.',
        'user-note': 'Ghi chú nội bộ/chưa có source cứng; giữ transparency là user-declared với reliability thấp hơn.',
      },
    },
    declaredSourceType: {
      label: 'Loại nguồn khai báo',
      values: {
        vendor: 'Vendor datasheet / load table / technical manual',
        test: 'Test report / lab sheet',
        worksheet: 'Archived engineering worksheet / internal calc note',
        manual: 'Manual user entry / remembered note',
        unknown: 'Chưa rõ nguồn',
      },
    },
  },
};

export const FASTENER_UPLIFT_INPUT_SCHEMA = {
  key: 'screwStrength',
  version: 1,
  sourceFirst: true,
  expectedMeaning: 'Declared per-fastener uplift resistance input used to convert solver-derived tension demand into fastening resistance.',
  preferredBasis: 'design-resistance-per-fastener',
  acceptedBases: [
    'design-resistance-per-fastener',
    'characteristic-resistance-per-fastener',
    'vendor-allowable-per-fastener',
    'test-result-per-fastener',
    'user-note-per-fastener',
  ],
  unit: 'kN',
  basisNote: 'UI/report should show that screwStrength is interpreted as a per-fastener resistance in kN, because the same number can mean design resistance, characteristic resistance, vendor allowable, or raw test result.',
  sourceExpectation: 'Prefer a cited fastener datasheet, project fastening schedule, test report, or archived worksheet before treating this input as stronger than a user declaration.',
  spacingMeaning: 'screwSpacing is currently interpreted as spacing across panelWidth for a simplified fastener-count estimate, not as a fully detailed edge-distance/layout schedule.',
  countRule: {
    formula: 'round(panelWidth / screwSpacing)',
    minimum: 1,
    status: 'provisional-layout-rule',
    provenanceNote: 'This count rule is a repository simplification used to convert spacing into an estimated number of fasteners across the panel width. No cited source currently justifies this exact rounding convention, tributary assumption, or edge-layout treatment.',
  },
  enablementRule: {
    formula: 'panelType !== ceiling && screwStrength > 0',
    status: 'derived-check-scope',
    provenanceNote: 'Current implementation treats uplift as applicable for non-ceiling panels only when a positive fastener resistance input exists. This is an implementation scope rule, not yet a source-linked fastening design clause.',
  },
  acceptedMetadata: [
    'basis',
    'sourceType',
    'sourceRef',
    'sourceNote',
    'fastenerContext',
    'spacingMeaning',
    'acquisitionPath',
  ],
  metadataGuidance: {
    basis: {
      label: 'Basis của sức kháng vít khai báo',
      values: {
        'design-resistance-per-fastener': 'Giá trị sức kháng thiết kế trên mỗi vít dùng trực tiếp trong kiểm tra hiện tại.',
        'characteristic-resistance-per-fastener': 'Giá trị đặc trưng trên mỗi vít; cần note rõ nếu chưa chuyển về design basis trước khi đưa vào flow này.',
        'vendor-allowable-per-fastener': 'Giá trị allowable / tabulated từ vendor, cần kèm điều kiện nền, tôn, chiều sâu bắn vít, và mode phá hoại.',
        'test-result-per-fastener': 'Kết quả thử nghiệm trên mỗi vít; chỉ nên dùng khi có note diễn giải cách chuyển sang giá trị dùng cho thiết kế.',
        'user-note-per-fastener': 'Ghi chú nội bộ/chưa có source cứng; giữ transparency là user-declared với reliability thấp hơn.',
      },
    },
    sourceType: {
      label: 'Loại nguồn sức kháng vít',
      values: {
        vendor: 'Vendor fastener datasheet / fastening manual / load table',
        schedule: 'Project fastening schedule / approved design note',
        test: 'Test report / lab sheet',
        worksheet: 'Archived engineering worksheet / internal calc note',
        manual: 'Manual user entry / remembered note',
        unknown: 'Chưa rõ nguồn',
      },
    },
    acquisitionPath: {
      label: 'Acquisition path nếu chưa có numeric source cứng',
      guidance: 'Nếu chưa có đúng dòng kN/vít, hãy ghi vendor fastener manufacturer data / approved fastening schedule / archived uplift worksheet mà dự án sẽ dùng để chốt con số. Đây chỉ là metadata chỉ đường, không tự nâng numeric path thành source-backed.',
    },
  },
};

export const FASTENER_UPLIFT_FACTOR = {
  key: 'gammaM_screw',
  value: SECTION_CONSTANTS.gammaM_screw,
  status: 'repo-factor-uncited',
  sourceType: 'repository-default',
  evidenceLevel: 'no-direct-source-attached',
  provenanceNote: 'The uplift design factor is implemented and applied consistently in the fastening resistance path, but no current repo artifact links the retained 1.33 value to a code clause, vendor recommendation, or archived accepted worksheet for the same fastener basis.',
  sourceAttachmentStatus: 'No direct source note currently justifies gammaM_screw = 1.33 in this repository.',
};

const normalizeWrinklingDeclaredBasis = (value) => {
  const allowed = new Set(WRINKLING_DECLARED_INPUT_SCHEMA.acceptedBases);
  return allowed.has(value) ? value : WRINKLING_DECLARED_INPUT_SCHEMA.preferredBasis;
};

const normalizeWrinklingDeclaredSourceType = (value) => {
  const allowed = new Set(['vendor', 'test', 'worksheet', 'manual', 'unknown']);
  return allowed.has(value) ? value : 'unknown';
};

const normalizeFastenerUpliftBasis = (value) => {
  const allowed = new Set(FASTENER_UPLIFT_INPUT_SCHEMA.acceptedBases);
  return allowed.has(value) ? value : FASTENER_UPLIFT_INPUT_SCHEMA.preferredBasis;
};

const normalizeFastenerUpliftSourceType = (value) => {
  const allowed = new Set(['vendor', 'schedule', 'test', 'worksheet', 'manual', 'unknown']);
  return allowed.has(value) ? value : 'unknown';
};

const cleanOptionalString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

export const resolveWrinklingDeclaredMetadata = (config = {}) => {
  const declaredBasis = normalizeWrinklingDeclaredBasis(config.wrinklingStressBasis);
  const declaredSourceType = normalizeWrinklingDeclaredSourceType(config.wrinklingStressSourceType);
  const declaredDisplayUnit = cleanOptionalString(config.wrinklingStressUnit) || WRINKLING_DECLARED_INPUT_SCHEMA.unit;
  const declaredSourceRef = cleanOptionalString(config.wrinklingStressSourceRef);
  const declaredSourceNote = cleanOptionalString(config.wrinklingStressSourceNote);
  const declaredProductContext = cleanOptionalString(config.wrinklingStressProductContext);

  return {
    declaredBasis,
    declaredSourceType,
    declaredDisplayUnit,
    declaredSourceRef,
    declaredSourceNote,
    declaredProductContext,
    isSourceDocumented: Boolean(declaredSourceRef || declaredSourceNote),
    schema: WRINKLING_DECLARED_INPUT_SCHEMA,
  };
};

export const resolveFastenerUpliftDeclaredMetadata = (config = {}) => {
  const declaredBasis = normalizeFastenerUpliftBasis(config.screwStrengthBasis);
  const declaredSourceType = normalizeFastenerUpliftSourceType(config.screwStrengthSourceType);
  const declaredDisplayUnit = cleanOptionalString(config.screwStrengthUnit) || FASTENER_UPLIFT_INPUT_SCHEMA.unit;
  const declaredSourceRef = cleanOptionalString(config.screwStrengthSourceRef);
  const declaredSourceNote = cleanOptionalString(config.screwStrengthSourceNote);
  const declaredFastenerContext = cleanOptionalString(config.screwStrengthFastenerContext);
  const declaredSpacingMeaning = cleanOptionalString(config.screwStrengthSpacingMeaning) || FASTENER_UPLIFT_INPUT_SCHEMA.spacingMeaning;

  return {
    declaredBasis,
    declaredSourceType,
    declaredDisplayUnit,
    declaredSourceRef,
    declaredSourceNote,
    declaredFastenerContext,
    declaredSpacingMeaning,
    isSourceDocumented: Boolean(declaredSourceRef || declaredSourceNote),
    schema: FASTENER_UPLIFT_INPUT_SCHEMA,
  };
};

import {
  WRINKLING_INPUT_CLASSIFICATION,
  WRINKLING_MODE_RELIABILITY,
  TRANSPARENCY_CLASSIFICATION,
  TRANSPARENCY_RELIABILITY,
} from './capacityTaxonomy.js';

export const DEFAULT_WRINKLING_MODE = 'approx';
export const DEFAULT_REDISTRIBUTION_MODE = 'elastic';

export const RHO_STEEL = 7850;

export const calcSelfWeight_kPa = ({ coreDensity, coreThickness_mm, skinOut_mm, skinIn_mm }) => {
  const tCore_m = (Number(coreThickness_mm) || 0) / 1000;
  const tSteel_m = ((Number(skinOut_mm) || 0) + (Number(skinIn_mm) || 0)) / 1000;
  const rhoCore = Number(coreDensity) || 0;

  const massPerArea = rhoCore * tCore_m + RHO_STEEL * tSteel_m;
  const w_Nm2 = massPerArea * 9.81;
  return w_Nm2 / 1000;
};

export const resolveCompressiveModulus = (config, constants = SECTION_CONSTANTS) => {
  const configured = Number(config.compressiveModulus);
  return configured > 0 ? configured : constants.Ec;
};

export const resolveWrinklingInput = (config, constants = SECTION_CONSTANTS) => {
  const wrinklingMode = config.wrinklingMode || DEFAULT_WRINKLING_MODE;
  const Ec = resolveCompressiveModulus(config, constants);
  const coreShearModulus = Number(config.coreShearModulus) || 0;
  const steelYield = Number(config.steelYield) || 280;
  const declaredStress = Number(config.wrinklingStress);
  const declaredMetadata = resolveWrinklingDeclaredMetadata(config);

  const sigma_w_approx = 0.5 * Math.sqrt(constants.Ef * Ec * Math.max(coreShearModulus, 0));
  const sigma_w_declared = declaredStress > 0 ? declaredStress : 0;
  const sigma_y_design = steelYield / constants.gammaM_yield;

  let sigma_w = 0;
  let sigma_w_source = 'yield-only';

  if (wrinklingMode === 'declared') {
    sigma_w = sigma_w_declared;
    sigma_w_source = sigma_w > 0 ? 'declared' : 'declared-missing';
  } else if (wrinklingMode === 'approx') {
    sigma_w = sigma_w_approx;
    sigma_w_source = 'approx';
  }

  const wrinklingDeclaredMissing = wrinklingMode === 'declared' && sigma_w_declared <= 0;
  const wrinklingFallbackMode = wrinklingDeclaredMissing ? 'yield-only' : wrinklingMode;
  const effectiveWrinklingMode = wrinklingDeclaredMissing ? wrinklingFallbackMode : wrinklingMode;
  const sigma_w_design = sigma_w > 0 ? sigma_w / constants.gammaM_wrinkling : 0;
  const sigma_comp_limit = wrinklingFallbackMode === 'yield-only'
    ? sigma_y_design
    : Math.min(sigma_w_design || Number.POSITIVE_INFINITY, sigma_y_design);

  const wrinklingMeta = {
    requestedMode: wrinklingMode,
    effectiveMode: effectiveWrinklingMode,
    source: sigma_w_source,
    sourceClassification: WRINKLING_INPUT_CLASSIFICATION[sigma_w_source] || TRANSPARENCY_CLASSIFICATION.UNSPECIFIED,
    requestedModeReliability: WRINKLING_MODE_RELIABILITY[wrinklingMode] || TRANSPARENCY_RELIABILITY.UNSPECIFIED,
    effectiveModeReliability: WRINKLING_MODE_RELIABILITY[effectiveWrinklingMode] || TRANSPARENCY_RELIABILITY.UNSPECIFIED,
    usedDeclaredValue: sigma_w_source === 'declared',
    declaredInputMeaning: sigma_w_source === 'declared'
      ? `user-declared-${declaredMetadata.declaredBasis}`
      : null,
    declaredInput: {
      value: sigma_w_declared,
      unit: declaredMetadata.declaredDisplayUnit,
      expectedUnit: WRINKLING_DECLARED_INPUT_SCHEMA.unit,
      expectedMeaning: WRINKLING_DECLARED_INPUT_SCHEMA.expectedMeaning,
      preferredBasis: WRINKLING_DECLARED_INPUT_SCHEMA.preferredBasis,
      basis: declaredMetadata.declaredBasis,
      sourceType: declaredMetadata.declaredSourceType,
      sourceRef: declaredMetadata.declaredSourceRef || null,
      sourceNote: declaredMetadata.declaredSourceNote || null,
      productContext: declaredMetadata.declaredProductContext || null,
      isSourceDocumented: declaredMetadata.isSourceDocumented,
      schemaVersion: WRINKLING_DECLARED_INPUT_SCHEMA.version,
      sourceFirst: WRINKLING_DECLARED_INPUT_SCHEMA.sourceFirst,
      basisNote: WRINKLING_DECLARED_INPUT_SCHEMA.basisNote,
      sourceExpectation: WRINKLING_DECLARED_INPUT_SCHEMA.sourceExpectation,
    },
    declaredInputSchema: WRINKLING_DECLARED_INPUT_SCHEMA,
    fallbackApplied: wrinklingDeclaredMissing,
    fallbackMode: wrinklingFallbackMode,
    approxProvenance: WRINKLING_APPROX_PROVENANCE,
    factorProvenance: WRINKLING_FACTOR,
    limitComputationBoundary: wrinklingFallbackMode === 'yield-only'
      ? 'yield-only bypasses wrinkling resistance and governs directly by steel yield design stress.'
      : 'declared/approx provide a wrinkling-side stress candidate, but the final compression limit remains min(sigma_w_design, sigma_y_design).',
  };

  return {
    wrinklingMode,
    Ec,
    steelYield,
    sigma_w,
    sigma_w_approx,
    sigma_w_declared,
    sigma_w_design,
    sigma_y_design,
    sigma_comp_limit,
    sigma_w_source,
    wrinklingDeclaredMissing,
    wrinklingFallbackMode,
    effectiveWrinklingMode,
    wrinklingMeta,
  };
};

export const buildSectionProperties = (config, constants = SECTION_CONSTANTS) => {
  const panelWidth = Number(config.panelWidth) || 1000;
  const coreShearModulus = Number(config.coreShearModulus) || 0;

  const dC = Number(config.coreThickness) || 0;
  const tF1 = Number(config.skinOut) || 0;
  const tF2 = Number(config.skinIn) || 0;

  const zOut = dC / 2 + tF1 / 2;
  const zIn = -(dC / 2 + tF2 / 2);
  const e = zOut - zIn;

  const Af1 = panelWidth * tF1;
  const Af2 = panelWidth * tF2;
  const Ac = panelWidth * dC;

  const zNA = (Af1 + Af2) > 0 ? (Af1 * zOut + Af2 * zIn) / (Af1 + Af2) : 0;

  const I_face_out = panelWidth * Math.pow(tF1, 3) / 12;
  const I_face_in = panelWidth * Math.pow(tF2, 3) / 12;
  const I_core = panelWidth * Math.pow(dC, 3) / 12;

  const Ec = resolveCompressiveModulus(config, constants);
  const wrinkling = resolveWrinklingInput(config, constants);

  const EI_faces = constants.Ef * (I_face_out + Af1 * Math.pow(zOut - zNA, 2) + I_face_in + Af2 * Math.pow(zIn - zNA, 2));
  const EI_core = Ec * (I_core + Ac * Math.pow(zNA, 2));
  const EI = EI_faces + EI_core;

  const I_eq = constants.Ef > 0 ? EI / constants.Ef : 0;
  const zOutEff = Math.abs(zOut - zNA);
  const zInEff = Math.abs(zIn - zNA);
  const zMax = Math.max(zOutEff, zInEff);
  const GA_inst = coreShearModulus * Ac;
  const qLineFactor = panelWidth / 1000;

  const sigma_limit = wrinkling.sigma_comp_limit;
  const M_Rd = (sigma_limit * I_eq) / Math.max(zMax, 1e-9);

  return {
    panelWidth,
    coreShearModulus,
    compressiveModulus: Ec,
    wrinklingMode: wrinkling.wrinklingMode,
    dC,
    tF1,
    tF2,
    zOut,
    zIn,
    e,
    Af1,
    Af2,
    Ac,
    zNA,
    EI,
    I_eq,
    zMax,
    GA_inst,
    qLineFactor,
    sigma_w: wrinkling.sigma_w,
    sigma_w_approx: wrinkling.sigma_w_approx,
    sigma_w_declared: wrinkling.sigma_w_declared,
    sigma_w_design: wrinkling.sigma_w_design,
    sigma_y_design: wrinkling.sigma_y_design,
    sigma_limit,
    sigma_w_source: wrinkling.sigma_w_source,
    wrinklingDeclaredMissing: wrinkling.wrinklingDeclaredMissing,
    wrinklingFallbackMode: wrinkling.wrinklingFallbackMode,
    effectiveWrinklingMode: wrinkling.effectiveWrinklingMode,
    wrinklingMeta: wrinkling.wrinklingMeta,
    M_Rd,
  };
};

export const buildSupportLocs = (spansM = []) => {
  const supportLocs = [0];
  let accum = 0;
  spansM.forEach((Lm) => {
    accum += Number(Lm) || 0;
    supportLocs.push(parseFloat(accum.toFixed(2)));
  });
  return supportLocs;
};

export const stressFromMoment = (moment, I_eq, zMax) => (Math.abs(moment) * zMax) / Math.max(I_eq, 1e-9);
