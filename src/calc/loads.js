import { calcSelfWeight_kPa } from './section.js';

export const buildMechanicalCases = ({ config, qDead_kPa, qLive_kPa, windBase, qLineFactor, gammaG, gammaQ, gammaF_wind }) => {
  const baseCases = [
    {
      id: 'pressure',
      qWind_kPa: windBase,
      gammaG,
      gammaQ,
      includeLiveSLS: true,
      includeVariablePoints: true,
    },
    {
      id: 'suction',
      qWind_kPa: -windBase,
      gammaG: 0.9 * gammaG,
      gammaQ: 0,
      includeLiveSLS: false,
      includeVariablePoints: false,
    },
  ];

  const buildCaseLoads = (caseDef) => {
    if (config.panelType === 'ceiling') {
      const liveSLS = caseDef.includeLiveSLS ? qLive_kPa : 0;
      const liveULS = caseDef.gammaQ > 0 ? qLive_kPa : 0;
      const qSLS_kPa = qDead_kPa + liveSLS + caseDef.qWind_kPa;
      const qULS_kPa = (caseDef.gammaG * qDead_kPa) + (caseDef.gammaQ * liveULS) + (gammaF_wind * caseDef.qWind_kPa);
      return {
        ...caseDef,
        qSLS_kPa,
        qULS_kPa,
        qSLS_line: qSLS_kPa * qLineFactor,
        qULS_line: qULS_kPa * qLineFactor,
      };
    }

    const qSLS_kPa = caseDef.qWind_kPa;
    const qULS_kPa = caseDef.qWind_kPa * gammaF_wind;
    return {
      ...caseDef,
      qSLS_kPa,
      qULS_kPa,
      qSLS_line: qSLS_kPa * qLineFactor,
      qULS_line: qULS_kPa * qLineFactor,
    };
  };

  return baseCases.map(buildCaseLoads);
};

export const buildLoadInputs = (config, qLineFactor) => {
  const windBase = Math.abs(Number(config.windPressure) || 0);
  const windSign = config.windDirection === 'suction' ? -1 : 1;
  const qWindDisplay_kPa = windBase * windSign;

  let qDead_kPa = 0;
  let qLive_kPa = 0;

  if (config.panelType === 'ceiling') {
    if (config.deadLoadMode === 'manual') {
      qDead_kPa = Number(config.deadLoadManual_kPa) || 0;
    } else {
      qDead_kPa = calcSelfWeight_kPa({
        coreDensity: config.coreDensity,
        coreThickness_mm: config.coreThickness,
        skinOut_mm: config.skinOut,
        skinIn_mm: config.skinIn,
      });
    }
    qLive_kPa = Number(config.liveLoad_kPa) || 0;
  }

  const gammaG = Number(config.gammaG) || 1.35;
  const gammaQ = Number(config.gammaQ) || 1.5;
  const qDead_line = qDead_kPa * qLineFactor;

  return {
    windBase,
    windSign,
    qWindDisplay_kPa,
    qDead_kPa,
    qLive_kPa,
    gammaG,
    gammaQ,
    qDead_line,
  };
};

export const buildPointLoads = (config, totalLength_mm) => {
  return (config.panelType === 'ceiling' ? (config.pointLoads || []) : [])
    .map((pl) => ({
      x_mm: (Number(pl.x_m) || 0) * 1000,
      P_N: (Number(pl.P_kN) || 0) * 1000,
      note: pl.note || '',
      type: pl.type || 'permanent',
    }))
    .filter((pl) => Number.isFinite(pl.x_mm) && Number.isFinite(pl.P_N))
    .filter((pl) => pl.x_mm >= 0 && pl.x_mm <= totalLength_mm);
};

export const scalePointLoads = (loads, gammaG_case, gammaQ_case, includeVariable) => {
  return loads
    .filter((pl) => includeVariable || pl.type !== 'variable')
    .map((pl) => ({
      ...pl,
      P_N: pl.P_N * (pl.type === 'variable' ? gammaQ_case : gammaG_case),
    }));
};

export const scalePointLoadsSLS = (loads, includeVariable) => {
  return loads
    .filter((pl) => includeVariable || pl.type !== 'variable')
    .map((pl) => ({ ...pl }));
};
