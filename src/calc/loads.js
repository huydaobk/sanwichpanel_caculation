import { calcSelfWeight_kPa } from './section.js';

export const normalizeDistributedLoadBySpan = (spans = [], value = 0) => {
  const nSpan = Array.isArray(spans) ? spans.length : 0;
  if (Array.isArray(value)) {
    return Array.from({ length: nSpan }, (_, idx) => Number(value[idx]) || 0);
  }
  const scalar = Number(value) || 0;
  return Array.from({ length: nSpan }, () => scalar);
};

export const resolveCeilingDistributedLoads = (config = {}) => {
  const spans = Array.isArray(config.spans) ? config.spans : [];
  const qDeadScalar = config.deadLoadMode === 'manual'
    ? (Number(config.deadLoadManual_kPa) || 0)
    : calcSelfWeight_kPa({
      coreDensity: config.coreDensity,
      coreThickness_mm: config.coreThickness,
      skinOut_mm: config.skinOut,
      skinIn_mm: config.skinIn,
    });
  const qLiveScalar = Number(config.liveLoad_kPa) || 0;
  const usePerSpan = config.panelType === 'ceiling' && config.enableSpanDistributedLoads === true;

  const deadBySpan = usePerSpan
    ? normalizeDistributedLoadBySpan(spans, config.deadLoadBySpan_kPa)
    : normalizeDistributedLoadBySpan(spans, qDeadScalar);
  const liveBySpan = usePerSpan
    ? normalizeDistributedLoadBySpan(spans, config.liveLoadBySpan_kPa)
    : normalizeDistributedLoadBySpan(spans, qLiveScalar);

  return {
    enabled: usePerSpan,
    qDeadScalar,
    qLiveScalar,
    deadBySpan,
    liveBySpan,
  };
};

export const buildMechanicalCases = ({ config, qDead_kPa, qLive_kPa, qDeadBySpan_kPa, qLiveBySpan_kPa, windBase, qLineFactor, gammaG, gammaQ, gammaF_wind }) => {
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
      const deadBySpan = normalizeDistributedLoadBySpan(config.spans, qDeadBySpan_kPa ?? qDead_kPa);
      const liveSLSBySpan = caseDef.includeLiveSLS
        ? normalizeDistributedLoadBySpan(config.spans, qLiveBySpan_kPa ?? qLive_kPa)
        : normalizeDistributedLoadBySpan(config.spans, 0);
      const liveULSBySpan = caseDef.gammaQ > 0
        ? normalizeDistributedLoadBySpan(config.spans, qLiveBySpan_kPa ?? qLive_kPa)
        : normalizeDistributedLoadBySpan(config.spans, 0);
      const qSLS_bySpan_kPa = deadBySpan.map((dead, idx) => dead + (liveSLSBySpan[idx] || 0) + caseDef.qWind_kPa);
      const qULS_bySpan_kPa = deadBySpan.map((dead, idx) => (caseDef.gammaG * dead) + (caseDef.gammaQ * (liveULSBySpan[idx] || 0)) + (gammaF_wind * caseDef.qWind_kPa));
      const qSLS_kPa = qSLS_bySpan_kPa.length > 0 ? Math.max(...qSLS_bySpan_kPa.map((v) => Math.abs(v))) : 0;
      const qULS_kPa = qULS_bySpan_kPa.length > 0 ? Math.max(...qULS_bySpan_kPa.map((v) => Math.abs(v))) : 0;
      return {
        ...caseDef,
        qSLS_kPa,
        qULS_kPa,
        qDeadBySpan_kPa: deadBySpan,
        qLiveBySpan_kPa: normalizeDistributedLoadBySpan(config.spans, qLiveBySpan_kPa ?? qLive_kPa),
        qSLS_bySpan_kPa,
        qULS_bySpan_kPa,
        qSLS_line: qSLS_bySpan_kPa.map((v) => v * qLineFactor),
        qULS_line: qULS_bySpan_kPa.map((v) => v * qLineFactor),
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
  let qDeadBySpan_kPa = normalizeDistributedLoadBySpan(config.spans, 0);
  let qLiveBySpan_kPa = normalizeDistributedLoadBySpan(config.spans, 0);
  let distributedLoadMode = 'uniform';

  if (config.panelType === 'ceiling') {
    const distributed = resolveCeilingDistributedLoads(config);
    qDead_kPa = distributed.qDeadScalar;
    qLive_kPa = distributed.qLiveScalar;
    qDeadBySpan_kPa = distributed.deadBySpan;
    qLiveBySpan_kPa = distributed.liveBySpan;
    distributedLoadMode = distributed.enabled ? 'per-span' : 'uniform';
  }

  const gammaG = Number(config.gammaG) || 1.35;
  const gammaQ = Number(config.gammaQ) || 1.5;
  const qDead_line = qDeadBySpan_kPa.map((v) => v * qLineFactor);

  return {
    windBase,
    windSign,
    qWindDisplay_kPa,
    qDead_kPa,
    qLive_kPa,
    qDeadBySpan_kPa,
    qLiveBySpan_kPa,
    distributedLoadMode,
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
