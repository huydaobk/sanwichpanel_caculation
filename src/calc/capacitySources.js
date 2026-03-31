const TRANSPARENCY_RELIABILITY = {
  USER_DECLARED: 'user-declared',
  ENGINEERING_APPROXIMATION: 'engineering-approximation',
  EXACT_LIMIT_STATE: 'exact-limit-state',
  ENGINEERING_CALCULATION: 'engineering-calculation',
  INPUT_DEPENDENT: 'input-dependent',
};

const TRANSPARENCY_CLASSIFICATION = {
  ENGINEERING_CALCULATION: 'engineering-calculation',
  INPUT_RESISTANCE_CHECK: 'input-resistance-check',
  USER_DECLARED: 'user-declared',
  ENGINEERING_APPROXIMATION: 'engineering-approximation',
  YIELD_GOVERNED: 'yield-governed',
  SOURCE_GAP: 'source-gap',
};

const PROVENANCE_STATUS = {
  SOURCE_LINKED: 'source-linked',
  REPO_CONSTANT_UNCITED: 'repo-constant-uncited',
  USER_INPUT_GEOMETRY: 'user-input-geometry',
  SOLVER_DERIVED: 'solver-derived',
  USER_DECLARED_INPUT: 'user-declared-input',
  DERIVED_ENABLEMENT: 'derived-enablement',
  PROVISIONAL_RULE: 'provisional-rule',
  SOURCE_GAP: 'source-gap',
};

const CAPACITY_SOURCE_CHECK_KEYS = {
  SIGMA_LIMIT: 'sigmaLimit',
  SUPPORT_CRUSHING: 'supportCrushing',
  UPLIFT: 'uplift',
};

export const CAPACITY_SOURCE_TYPES = {
  INTERNAL_FORMULA: 'internal-formula',
  INPUT_PARAMETER: 'input-parameter',
  USER_DECLARED: 'user-declared',
  DERIVED_ENABLEMENT: 'derived-enablement',
  NOT_APPLICABLE: 'not-applicable',
};

export const CAPACITY_SOURCE_REGISTRY = {
  [CAPACITY_SOURCE_CHECK_KEYS.SIGMA_LIMIT]: {
    checkKey: CAPACITY_SOURCE_CHECK_KEYS.SIGMA_LIMIT,
    title: 'Wrinkling / compressive limit',
    sourceType: CAPACITY_SOURCE_TYPES.INTERNAL_FORMULA,
    currentBasis: [
      'src/calc/section.js#resolveWrinklingInput',
      'src/calc/section.js#buildSectionProperties',
    ],
    currentImplementation: 'yield-only => sigma_limit = sigma_y_design. declared/approx => sigma_limit = min(sigma_w_design, sigma_y_design); sigma_w may come from declared input or approx formula 0.5*sqrt(Ef*Ec*Gc).',
    classification: TRANSPARENCY_CLASSIFICATION.ENGINEERING_CALCULATION,
    reliability: TRANSPARENCY_RELIABILITY.ENGINEERING_CALCULATION,
    primaryInputs: [
      'steelYield',
      'compressiveModulus',
      'coreShearModulus',
      'wrinklingStress',
      'wrinklingMode',
    ],
    sourceAnchorCandidates: [
      'Vendor sandwich panel datasheet with wrinkling / local face instability resistance.',
      'Sandwich panel handbook or code commentary giving wrinkling resistance expression for steel-faced panels.',
      'Archived engineering worksheet that states wrinkling resistance derivation and safety factors for the same product family.',
    ],
    provenanceBreakdown: {
      declaredPath: [
        {
          item: 'wrinklingStress input when wrinklingMode = declared',
          status: PROVENANCE_STATUS.USER_INPUT_GEOMETRY,
          classification: TRANSPARENCY_CLASSIFICATION.USER_DECLARED,
          basis: 'The repository now treats wrinklingStress as a source-first declared resistance/stress input that should carry both a numeric MPa value and a stated basis/source context from the user.',
          currentAnchor: 'src/calc/section.js#WRINKLING_DECLARED_INPUT_SCHEMA',
          evidenceNote: 'Declared metadata now distinguishes design-resistance, characteristic-resistance, test-result, vendor-table, and user-note semantics. An attached product-family vendor guide now provides real wrinkling terminology and factor context, but the numeric MPa path remains user-supplied until the exact table/test/worksheet line for that number is attached.',
          sourceGap: 'A direct artifact hunt across the current repo found no vendor MPa table, test report, archived worksheet, or product-manual numeric line that proves the exact declared MPa value used for a case. Product-family guidance improves declared basis/source framing, but treat the numeric value as user-declared unless that numeric source line is supplied.',
        },
        {
          item: 'Paroc Panel System technical guide (ASS_533988) — section 2.1 General, Table 6a/6b',
          status: PROVENANCE_STATUS.SOURCE_LINKED,
          classification: TRANSPARENCY_CLASSIFICATION.USER_DECLARED,
          basis: 'The guide explicitly names “Wrinkling of the face layer in the span and at an intermediate support” and gives product-family material safety factors gamma_m for AST/S/S+/F/F+/E/L panel families.',
          currentAnchor: 'src/calc/section.js#WRINKLING_DECLARED_INPUT_SCHEMA.productFamilySourceGuidance',
          evidenceNote: 'This is strong enough to support declared-input semantics, product-family context, and factor/basis guidance. It is not by itself a direct numeric citation for any declared MPa wrinkling stress value.',
          sourceGap: 'Still attach the exact vendor table, test report, or accepted worksheet line if a specific declared MPa value is to be promoted beyond user-declared numeric input.',
        },
      ],
      approxPath: [
        {
          item: 'sigma_w_approx = 0.5 * sqrt(Ef * Ec * Gc)',
          status: PROVENANCE_STATUS.REPO_CONSTANT_UNCITED,
          classification: TRANSPARENCY_CLASSIFICATION.ENGINEERING_APPROXIMATION,
          basis: 'The repository exposes a visible engineering approximation for wrinkling stress using face modulus Ef, compressive modulus Ec, and core shear modulus Gc.',
          currentAnchor: 'src/calc/section.js#WRINKLING_APPROX_PROVENANCE',
          evidenceNote: 'No cited handbook/code/vendor source in repo currently justifies the retained 0.5 coefficient together with this exact Ef/Ec/Gc variable set.',
          sourceGap: 'Approximation can be described as internal engineering approximation only, not source-linked resistance authority.',
        },
        {
          item: 'gammaM_wrinkling = 1.2',
          status: PROVENANCE_STATUS.SOURCE_GAP,
          classification: TRANSPARENCY_CLASSIFICATION.SOURCE_GAP,
          basis: 'Approx/declared wrinkling stresses are converted to design stress through a dedicated wrinkling factor.',
          currentAnchor: 'src/calc/section.js#WRINKLING_FACTOR',
          evidenceNote: 'The factor is implementation-visible, but no current artifact links 1.2 to a code clause, vendor recommendation, or archived accepted worksheet.',
          sourceGap: 'Do not present gammaM_wrinkling as source-backed until a real anchor is attached.',
        },
      ],
      yieldBoundary: [
        {
          item: 'Final sigma_limit boundary between wrinkling-side candidate and steel yield design stress',
          status: PROVENANCE_STATUS.SOURCE_LINKED,
          classification: TRANSPARENCY_CLASSIFICATION.YIELD_GOVERNED,
          basis: 'The final check is intentionally bounded: yield-only bypasses wrinkling, while declared/approx still cap the final compression limit by steel yield design stress through min(sigma_w_design, sigma_y_design).',
          currentAnchor: 'src/calc/section.js#resolveWrinklingInput',
          evidenceNote: 'This is a truthful implementation boundary statement, not a new external citation for wrinkling resistance itself.',
        },
      ],
    },
    missingEvidence: [
      'No cited external source currently attached for the approx formula coefficient 0.5 and variable set Ef, Ec, Gc.',
      'Declared wrinkling input now has an internal schema, but no product-family-specific source note yet says which basis/source combinations are actually accepted for release use.',
      'No product-family-specific calibration or vendor resistance table is attached in repo.',
      'gammaM_wrinkling = 1.2 is implemented but not source-linked to a code clause in current artifacts.',
    ],
    safeExternalizationSteps: [
      'Keep declared / approx / yield-only as separate provenance classes in transparency outputs and report text.',
      'Expose the approx formula coefficient and gammaM_wrinkling as explicit source-gap metadata instead of implying citation authority.',
      'When a real source appears, attach it first to the metadata records before changing any wrinkling formula.',
      'Keep collecting declared-basis/source metadata in UI/report outputs before upgrading any reliability language beyond user-declared.',
    ],
    conclusion: 'Current wrinkling limit is now clearer about declared-vs-approx-vs-yield boundary and the semantic meaning of declared input, but engineering authority remains partly internal / input-driven until a cited source is attached.',
  },
  [CAPACITY_SOURCE_CHECK_KEYS.SUPPORT_CRUSHING]: {
    checkKey: CAPACITY_SOURCE_CHECK_KEYS.SUPPORT_CRUSHING,
    title: 'Support crushing / core bearing',
    sourceType: CAPACITY_SOURCE_TYPES.INPUT_PARAMETER,
    currentBasis: [
      'src/calc/checks.js#buildReactionData',
      'src/calc/section.js#SECTION_CONSTANTS',
      'https://www.ruukki.com/building-envelopes/services-support/sandwich-panel-support/load-tables-for-sandwich-panels',
      'https://rautagroup.com/en/calculation-of-sandwich-panels-in-traypan-a-convenient-tool-for-envelope-structures-design/',
    ],
    currentImplementation: 'F_Rd = supportCrushingResistance.value * panelWidth * supportWidth / gammaM_crushing; crushingRatio = R_comp / F_Rd. Legacy aliases fCc and gammaM_shear are preserved as compatibility mirrors.',
    classification: TRANSPARENCY_CLASSIFICATION.INPUT_RESISTANCE_CHECK,
    reliability: TRANSPARENCY_RELIABILITY.INPUT_DEPENDENT,
    primaryInputs: [
      'supportCrushingResistance.value (legacy alias: fCc)',
      'panelWidth',
      'supportWidths[]',
      'reactionEnvelope',
      'gammaM_crushing (legacy alias: gammaM_shear)',
    ],
    provenanceBreakdown: {
      demandSide: [
        {
          item: 'R_comp from reactionEnvelope',
          status: PROVENANCE_STATUS.SOLVER_DERIVED,
          basis: 'Compression demand is derived from the solver reaction envelope at each support; this reaction-led support check flow is directionally consistent with vendor tool ecosystems that report support reactions/load-table checks for sandwich panels.',
          currentAnchor: 'src/calc/checks.js#buildReactionData',
          evidenceNote: 'Ruukki load-table/support pages and the Rauta article about Ruukki TrayPan both show support reactions as a real design output/check context, but they do not by themselves justify the repository numeric defaults below.',
        },
      ],
      resistanceSide: [
        {
          item: 'supportCrushingResistance record = 0.10 N/mm² (legacy alias: fCc)',
          status: PROVENANCE_STATUS.REPO_CONSTANT_UNCITED,
          basis: 'Implemented as a named resistance record in section data and mirrored back to legacy fCc for compatibility.',
          currentAnchor: 'src/calc/section.js#SUPPORT_CRUSHING_RESISTANCE',
          evidenceNote: 'External vendor pages reviewed in TKT-03C confirm that sandwich-panel design workflows do treat support reaction/bearing as a real limit-state context, but no reviewed source supplied this exact 0.10 N/mm² value for this repository/product basis.',
          sourceGap: 'No cited vendor table, handbook clause, or legacy worksheet in repo explains the origin or unit basis behind the retained default resistance value.',
          externalizationCandidate: 'Populate this record with product-specific citation, declared basis, and unit note once a source-backed bearing resistance artifact is available.',
        },
        {
          item: 'gammaM_crushing = 1.25 (legacy shared value with gammaM_shear)',
          status: PROVENANCE_STATUS.SOURCE_GAP,
          basis: 'Current implementation now names the factor explicitly for support crushing, but still shares the same numeric value as the shear partial factor until a dedicated source is attached.',
          currentAnchor: 'src/calc/section.js#SUPPORT_CRUSHING_FACTOR',
          evidenceNote: 'The reviewed external sources support the existence of support-related design checks, but they did not provide a crushing-specific material factor that would justify retaining or splitting the current 1.25 value in this repo.',
          sourceGap: 'Repo still does not document why the shared 1.25 factor is appropriate for support crushing, or whether it is only a conservative placeholder inherited from shear design.',
          externalizationCandidate: 'Keep the dedicated crushing name and later detach its numeric value from gammaM_shear once a source-backed crushing factor is identified.',
        },
        {
          item: 'panelWidth and supportWidths[] geometry',
          status: PROVENANCE_STATUS.USER_INPUT_GEOMETRY,
          basis: 'Bearing area is computed directly from user-entered panel width and support width per support.',
          currentAnchor: 'src/calc/checks.js#buildReactionData',
        },
      ],
    },
    sourceAnchorCandidates: [
      'Vendor panel bearing / support reaction capacity table versus support width.',
      'Product technical manual stating allowable support bearing stress / crushing resistance.',
      'Internal legacy worksheet already accepted by the owner if it cites origin of fCc and factor usage.',
    ],
    missingEvidence: [
      'The supportCrushingResistance default record is still uncited in repo artifacts even though its provenance is now named explicitly.',
      'gammaM_crushing is currently only a dedicated alias over the shared 1.25 shear-factor value; no source note yet proves that factor choice for crushing.',
      'The external sources reviewed in TKT-03C only validated the existence of support-reaction/support-width checking in vendor ecosystems, not the repository resistance number or factor.',
      'No external table/worksheet currently reconciles reaction-to-bearing conversion for this product line.',
    ],
    safeExternalizationSteps: [
      'Keep supportCrushingResistance as the named bearing-resistance record and let future product data override it with citation + unit metadata.',
      'Expose gammaM_crushing explicitly in transparency/report text as a provisional shared factor rather than an assumed source-backed crushing clause.',
      'Prefer a product-specific vendor table or an archived legacy worksheet that states both allowable support bearing stress and the factor basis before changing the numeric defaults.',
      'Attach one fixed support-bearing worksheet or vendor table so the resistance side can be reconciled without changing solver behavior.',
    ],
    conclusion: 'Current crushing check is formula-simple and clearly aligned with a real support-reaction design context, but the resistance side is still anchored only to repository constants and user geometry inputs.',
  },
  [CAPACITY_SOURCE_CHECK_KEYS.UPLIFT]: {
    checkKey: CAPACITY_SOURCE_CHECK_KEYS.UPLIFT,
    title: 'Fastener uplift / pull-out',
    sourceType: CAPACITY_SOURCE_TYPES.INPUT_PARAMETER,
    currentBasis: [
      'src/calc/runPanelAnalysis.js#upliftEnabled',
      'src/calc/checks.js#buildReactionData',
      'src/calc/section.js#FASTENER_UPLIFT_INPUT_SCHEMA',
      'src/calc/section.js#FASTENER_UPLIFT_FACTOR',
    ],
    currentImplementation: 'upliftEnabled = panelType !== ceiling && screwStrength > 0; screwCount = round(panelWidth / screwSpacing) bounded to >=1; T_Rd = screwStrength * 1000 * screwCount / gammaM_screw; upliftRatio = R_tension / T_Rd.',
    classification: TRANSPARENCY_CLASSIFICATION.INPUT_RESISTANCE_CHECK,
    reliability: TRANSPARENCY_RELIABILITY.INPUT_DEPENDENT,
    primaryInputs: [
      'panelType',
      'screwStrength',
      'screwSpacing',
      'panelWidth',
      'reactionEnvelope',
      'gammaM_screw',
    ],
    provenanceBreakdown: {
      demandSide: [
        {
          item: 'R_tension from reactionEnvelope',
          status: PROVENANCE_STATUS.SOLVER_DERIVED,
          classification: TRANSPARENCY_CLASSIFICATION.ENGINEERING_CALCULATION,
          basis: 'Uplift demand is taken from solver-derived support reactions; negative support reactions are converted into tensile demand per support.',
          currentAnchor: 'src/calc/checks.js#buildReactionData',
          evidenceNote: 'This is the better-anchored half of the uplift check: reaction sign and uplift appearance come from the solver path already covered by internal analytical/benchmark tests.',
        },
      ],
      resistanceSide: [
        {
          item: 'screwStrength input as per-fastener uplift resistance',
          status: PROVENANCE_STATUS.USER_DECLARED_INPUT,
          classification: TRANSPARENCY_CLASSIFICATION.USER_DECLARED,
          basis: 'The repository now treats screwStrength as a source-first declared per-fastener resistance input, not as an inherently source-backed fastener capacity value.',
          currentAnchor: 'src/calc/section.js#FASTENER_UPLIFT_INPUT_SCHEMA',
          evidenceNote: 'Schema now makes the intended semantic meaning explicit: per-fastener kN resistance with stated basis/source context still expected from the user or project artifacts. A targeted artifact hunt did confirm a real vendor-side acquisition path: Ruukki sandwich-panel installation manuals repeatedly state that fasteners are dimensioned case by case by the designer according to fastener-manufacturer instructions / research results, which supports asking for manufacturer data or an approved fastening schedule before trusting the number.',
          sourceGap: 'Repo still has no attached vendor datasheet, schedule, test report, or archived worksheet proving the exact per-fastener resistance number used for a case. The reviewed Ruukki manuals improved the acquisition path only; they did not provide a numeric kN-per-fastener pull-out/uplift line strong enough to certify screwStrength itself.',
        },
        {
          item: 'screwCount = round(panelWidth / screwSpacing) with minimum 1',
          status: PROVENANCE_STATUS.PROVISIONAL_RULE,
          classification: TRANSPARENCY_CLASSIFICATION.SOURCE_GAP,
          basis: 'Current implementation converts spacing into a simplified fastener count across the panel width using a nearest-integer rule.',
          currentAnchor: 'src/calc/checks.js#buildReactionData',
          evidenceNote: 'This is visible and repeatable, but no cited source currently justifies the exact rounding convention, tributary assumption, or edge-distance treatment.',
          sourceGap: 'Do not present the count rule as vendor- or code-backed layout logic until a fastening schedule, worksheet, or manual line is attached.',
        },
        {
          item: 'gammaM_screw = 1.33',
          status: PROVENANCE_STATUS.SOURCE_GAP,
          classification: TRANSPARENCY_CLASSIFICATION.SOURCE_GAP,
          basis: 'Per-fastener uplift resistance is converted to design resistance through a dedicated screw factor.',
          currentAnchor: 'src/calc/section.js#FASTENER_UPLIFT_FACTOR',
          evidenceNote: 'The factor is implementation-visible, but current repo artifacts do not link 1.33 to a code clause, vendor recommendation, or archived accepted worksheet for the same fastener basis.',
          sourceGap: 'Do not present gammaM_screw as source-backed until a real anchor is attached.',
        },
      ],
      enablement: [
        {
          item: 'upliftEnabled = panelType !== ceiling && screwStrength > 0',
          status: PROVENANCE_STATUS.DERIVED_ENABLEMENT,
          classification: TRANSPARENCY_CLASSIFICATION.INPUT_RESISTANCE_CHECK,
          basis: 'The check is currently enabled only when the panel is not tagged as ceiling and a positive fastener resistance input exists.',
          currentAnchor: 'src/calc/runPanelAnalysis.js#upliftEnabled',
          evidenceNote: 'This is an implementation scope rule that makes reporting behavior explicit; it is not yet a source-linked statement that ceiling panels can never require uplift verification.',
          sourceGap: 'Keep this as explicit enablement semantics, not as a code- or vendor-backed exclusion rule, until a fastening design source defines applicability limits.',
        },
      ],
    },
    sourceAnchorCandidates: [
      'Fastener vendor pull-out / pull-over datasheet with spacing/layout assumptions.',
      'Project fastening schedule specifying per-fastener design resistance.',
      'Code/manual clause for converting characteristic fastener resistance into design T_Rd with relevant safety factor.',
      'Vendor installation manuals that explicitly redirect designers to fastener-manufacturer instructions / research results can be attached as acquisition-path context only, not as numeric screwStrength authority.',
    ],
    missingEvidence: [
      'No cited source explains screwCount rounding rule versus actual edge/tributary fastener layout.',
      'screwStrength now has schema-level semantic meaning, but the numeric path still lacks an attached vendor/schedule/test/worksheet artifact for the exact case value.',
      'gammaM_screw = 1.33 is not yet linked to a clause / vendor recommendation in repo notes.',
      'The uplift enablement rule is an implementation scope statement, not yet a source-linked fastening applicability clause.',
    ],
    safeExternalizationSteps: [
      'Keep solver-derived uplift demand clearly separated from user-declared/input-dependent fastening resistance in transparency outputs.',
      'Expose screwStrength as a per-fastener declared resistance input with basis/source metadata before changing any numeric uplift formula.',
      'Keep the screwCount spacing-to-count conversion labeled as provisional until one fastening schedule or worksheet is reconciled.',
      'When a real source appears, attach it first to screwStrength metadata, count-rule metadata, and gammaM_screw provenance before changing uplift language or formulas.',
    ],
    conclusion: 'Uplift demand sign handling is solver-covered, while resistance-side trust still depends on declared per-fastener strength, a provisional spacing-to-count rule, and an uncited gammaM_screw factor.',
  },
};

export const CAPACITY_PROVENANCE_STATUS = PROVENANCE_STATUS;

export const getCapacitySourceMeta = (checkKey) => CAPACITY_SOURCE_REGISTRY[checkKey] || null;
