export const SECTION_CONSTANTS = {
  Ef: 210000,
  Ec: 4.0,
  fCc: 0.10,
  alpha: 1.2e-5,
  gammaF_wind: 2.1,
  gammaM_yield: 1.1,
  gammaM_shear: 1.25,
  gammaM_wrinkling: 1.2,
  gammaM_screw: 1.33,
};

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
  const sigma_w_design = sigma_w > 0 ? sigma_w / constants.gammaM_wrinkling : 0;
  const sigma_comp_limit = wrinklingFallbackMode === 'yield-only'
    ? sigma_y_design
    : Math.min(sigma_w_design || Number.POSITIVE_INFINITY, sigma_y_design);

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
