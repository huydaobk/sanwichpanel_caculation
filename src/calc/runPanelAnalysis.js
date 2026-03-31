import {
  SECTION_CONSTANTS,
  SUPPORT_CRUSHING_FACTOR,
  SUPPORT_CRUSHING_RESISTANCE,
  buildSectionProperties,
  buildSupportLocs,
} from './section.js';
import {
  buildLoadInputs,
  buildMechanicalCases,
  buildPointLoads,
  scalePointLoads,
  scalePointLoadsSLS,
} from './loads.js';
import { solveContinuousBeam, solveBeamWithRedistribution, beamShapeW } from './solver.js';
import { getExtrema, buildReactionData, buildCapacityChecks } from './checks.js';
import { buildReportSummary } from './reporting.js';

export const DEFAULT_ANALYSIS_OPTIONS = {
  defaultRedistributionMode: 'elastic',
};

export function runPanelAnalysis(config, options = {}) {
  const { defaultRedistributionMode = DEFAULT_ANALYSIS_OPTIONS.defaultRedistributionMode } = options;

  const section = buildSectionProperties(config, SECTION_CONSTANTS);
  const {
    panelWidth,
    e,
    Af1,
    Af2,
    Ac,
    EI,
    I_eq,
    zMax,
    GA_inst,
    qLineFactor,
    wrinklingMode,
    sigma_limit,
    M_Rd,
  } = section;

  const gammaThermal = Number(config.gammaF_thermal) || 1.0;
  const loadInputs = buildLoadInputs(config, qLineFactor);
  const {
    windBase,
    qWindDisplay_kPa,
    qDead_kPa,
    qLive_kPa,
    qDeadBySpan_kPa,
    qLiveBySpan_kPa,
    distributedLoadMode,
    gammaG,
    gammaQ,
    qDead_line,
  } = loadInputs;

  const mechanicalCasesBase = buildMechanicalCases({
    config,
    qDead_kPa,
    qLive_kPa,
    qDeadBySpan_kPa,
    qLiveBySpan_kPa,
    windBase,
    qLineFactor,
    gammaG,
    gammaQ,
    gammaF_wind: SECTION_CONSTANTS.gammaF_wind,
  });
  const selectedCase = mechanicalCasesBase.find((caseDef) => caseDef.qWind_kPa === qWindDisplay_kPa) || mechanicalCasesBase[0];

  const tempOut = Number(config.tempOut) || 0;
  const tempIn = Number(config.tempIn) || 0;
  const dT = tempOut - tempIn;
  const dT_ULS = dT * gammaThermal;
  const dT_SLS = dT;
  const Mt_Unit = e > 0 ? (-EI * SECTION_CONSTANTS.alpha / e) : 0;
  const Mt_ULS = Mt_Unit * dT_ULS;
  const Mt_SLS = Mt_Unit * dT_SLS;

  const spansM = config.spans.map((s) => Number(s) || 0);
  const nSpan = spansM.length;
  const nNode = nSpan + 1;

  const isColdStorage = config.panelType === 'internal' && config.internalWallType === 'cold_storage';
  const creepMode = isColdStorage ? 'all' : (config.panelType === 'ceiling' ? 'sustained_dead' : 'none');
  const phiShear = creepMode !== 'none' ? (Number(config.creepFactor) || 0) : 0;
  const phiBending = creepMode !== 'none' ? (Number(config.creepFactorBending) || 0) : 0;
  const GA_long = GA_inst / Math.max(1 + phiShear, 1e-6);
  const EI_long = EI / Math.max(1 + phiBending, 1e-6);

  const limitDenom = Number(config.deflectionLimit) || 150;
  const supportLocs = buildSupportLocs(spansM);
  const totalLength_mm = spansM.reduce((s, v) => s + (Number(v) || 0), 0) * 1000;
  const pointLoads = buildPointLoads(config, totalLength_mm);
  const pointLoadsPermanent = pointLoads.filter((pl) => pl.type !== 'variable');
  const kappaShear = Number(config.kappaShear) || 1.0;

  const emptySol = { elementForces: [], reactions: new Array(nNode).fill(0), d: [] };
  const solULS_Temp = (EI > 0 && nSpan >= 1)
    ? solveContinuousBeam({ spansM, qDown: 0, EI, GA: GA_inst, hinges: new Array(nNode).fill(false), pointLoads: [], thermalMoment: Mt_ULS, kappaShear })
    : emptySol;

  const solSLS_Temp = (EI > 0 && nSpan >= 1)
    ? solveContinuousBeam({ spansM, qDown: 0, EI, GA: GA_inst, hinges: new Array(nNode).fill(false), pointLoads: [], thermalMoment: Mt_SLS, kappaShear })
    : emptySol;

  const mechanicalCases = mechanicalCasesBase.map((caseDef) => ({
    ...caseDef,
    pointLoadsULS: scalePointLoads(pointLoads, caseDef.gammaG, caseDef.gammaQ, caseDef.includeVariablePoints),
    pointLoadsSLS: scalePointLoadsSLS(pointLoads, caseDef.includeVariablePoints),
  }));

  const solverPack = solveBeamWithRedistribution({
    spansM,
    mechanicalCases,
    EI,
    GA_inst,
    pointLoads,
    nNode,
    M_Rd,
    solULS_Temp,
    creepMode,
    EI_long,
    GA_long,
    qDead_kPa,
    qDead_line,
    pointLoadsPermanent,
    kappaShear,
    redistribution: { mode: config.redistributionMode || defaultRedistributionMode },
  });

  const { caseResults, solSLS_Sust_Short, solSLS_Sust_Long, redistribution: redistributionState } = solverPack;

  let chartData = [];
  const steps = 40;
  let maxMomentNeg = -Infinity;
  let maxMomentPos = Infinity;
  let maxMomentAbs = 0;
  let maxShear = 0;
  let maxDeflection = 0;
  let maxDeflectionRatio = 0;
  let maxDeflectionForRatio = 0;
  let worstDeflectionLimit = 0;
  let globalX = 0;

  const getElem = (sol, eIdx) => sol?.elementForces?.find((x) => x.e === eIdx);
  const getLocalDisp = (el, sol) => {
    if (!el || !sol?.d) return [0, 0, 0, 0];
    return el.dof.map((idx) => sol.d[idx] || 0);
  };

  const supportMomentEnvelope = new Array(nNode).fill(0);
  const hingeNotes = new Set();

  caseResults.forEach((caseRes) => {
    caseRes.hinges.forEach((isHinge, idx) => {
      if (isHinge) hingeNotes.add(idx);
    });

    for (let i = 0; i < nNode; i++) {
      const leftElem = i - 1 >= 0 ? getElem(caseRes.solULS_Mech, i - 1) : null;
      const rightElem = getElem(caseRes.solULS_Mech, i);
      const leftTemp = i - 1 >= 0 ? getElem(solULS_Temp, i - 1) : null;
      const rightTemp = getElem(solULS_Temp, i);

      const M_left = leftElem ? (leftElem.M2 + (leftTemp?.M2 || 0)) : null;
      const M_right = rightElem ? (rightElem.M1 + (rightTemp?.M1 || 0)) : null;

      const absNode = Math.max(M_left == null ? 0 : Math.abs(M_left), M_right == null ? 0 : Math.abs(M_right));
      if (absNode > supportMomentEnvelope[i]) supportMomentEnvelope[i] = absNode;
    }
  });

  for (let eIdx = 0; eIdx < nSpan; eIdx++) {
    const Lm = spansM[eIdx];
    const L = Lm * 1000;
    if (L <= 0) continue;

    const spanStart_mm = globalX;
    const spanEnd_mm = globalX + L;

    const spanCases = caseResults.map((caseRes) => {
      const elULS_Mech = getElem(caseRes.solULS_Mech, eIdx);
      const elULS_Temp = getElem(solULS_Temp, eIdx);
      const elSLS_Mech = getElem(caseRes.solSLS_Mech_Short, eIdx);
      const elSLS_MechLong = creepMode === 'all' ? getElem(caseRes.solSLS_Mech_Long, eIdx) : null;

      const loadsInSpan = (caseRes.pointLoadsULS || [])
        .filter((pl) => pl.x_mm >= spanStart_mm - 1e-9 && pl.x_mm <= spanEnd_mm + 1e-9)
        .map((pl) => ({ a_mm: pl.x_mm - spanStart_mm, P_N: pl.P_N, note: pl.note }))
        .sort((a, b) => a.a_mm - b.a_mm);

      return {
        caseRes,
        V1_Mech: elULS_Mech ? elULS_Mech.V1 : 0,
        M1_Mech: elULS_Mech ? elULS_Mech.M1 : 0,
        V1_Temp: elULS_Temp ? elULS_Temp.V1 : 0,
        M1_Temp: elULS_Temp ? elULS_Temp.M1 : 0,
        de_Mech: getLocalDisp(elSLS_Mech, caseRes.solSLS_Mech_Short),
        de_MechLong: getLocalDisp(elSLS_MechLong, caseRes.solSLS_Mech_Long),
        loadsInSpan,
      };
    });

    const selectedSpan = spanCases.find((caseSpan) => caseSpan.caseRes.id === selectedCase.id) || spanCases[0];
    const elSLS_Temp = getElem(solSLS_Temp, eIdx);
    const de_Temp = getLocalDisp(elSLS_Temp, solSLS_Temp);
    const elSus_Short = creepMode === 'sustained_dead' ? getElem(solSLS_Sust_Short, eIdx) : null;
    const deSus_Short = getLocalDisp(elSus_Short, solSLS_Sust_Short);
    const elSus_Long = creepMode === 'sustained_dead' ? getElem(solSLS_Sust_Long, eIdx) : null;
    const deSus_Long = getLocalDisp(elSus_Long, solSLS_Sust_Long);

    const samples = [];
    for (let i = 0; i <= steps; i++) samples.push({ x_mm: (i / steps) * L, pr: 1, mode: 'grid' });
    spanCases.forEach((caseSpan) => {
      for (const ev of caseSpan.loadsInSpan) {
        samples.push({ x_mm: ev.a_mm, pr: 0, mode: 'pre' });
        samples.push({ x_mm: ev.a_mm, pr: 2, mode: 'post' });
      }
    });
    samples.sort((u, v) => (u.x_mm - v.x_mm) || (u.pr - v.pr));

    const sumPoint = (loads, x_mm, mode) => {
      let sP = 0;
      for (const ev of loads) {
        if (mode === 'pre') {
          if (ev.a_mm < x_mm - 1e-9) sP += ev.P_N;
        } else if (ev.a_mm <= x_mm + 1e-9) {
          sP += ev.P_N;
        }
      }
      return sP;
    };

    let spanMaxDeflection = 0;

    for (const smp of samples) {
      const x = smp.x_mm;
      const w_temp_up = beamShapeW(L, x, de_Temp[0], de_Temp[1], de_Temp[2], de_Temp[3]);
      const w_temp_down = -w_temp_up;

      const selectedLoads = selectedSpan ? selectedSpan.loadsInSpan : [];
      const selectedDeMech = selectedSpan ? selectedSpan.de_Mech : [0, 0, 0, 0];
      const selectedDeMechLong = selectedSpan ? selectedSpan.de_MechLong : [0, 0, 0, 0];
      const selectedCaseRes = selectedSpan ? selectedSpan.caseRes : { qULS_line: 0 };
      const selectedQULSLine = Array.isArray(selectedCaseRes.qULS_line) ? (selectedCaseRes.qULS_line[eIdx] || 0) : (selectedCaseRes.qULS_line || 0);

      const PsumSelected = selectedSpan ? sumPoint(selectedLoads, x, smp.mode) : 0;
      const Vx_Mech_Selected = selectedSpan ? (selectedSpan.V1_Mech - selectedQULSLine * x - PsumSelected) : 0;
      const Mx_Mech_Selected = selectedSpan
        ? (selectedSpan.M1_Mech + selectedSpan.V1_Mech * x - (selectedQULSLine * x * x) / 2 - selectedLoads
          .filter((ev) => (smp.mode === 'pre' ? ev.a_mm < x - 1e-9 : ev.a_mm <= x + 1e-9))
          .reduce((acc2, ev) => acc2 + ev.P_N * (x - ev.a_mm), 0))
        : 0;
      const Vx_Selected = Vx_Mech_Selected + (selectedSpan ? selectedSpan.V1_Temp : 0);
      const Mx_Selected = Mx_Mech_Selected + (selectedSpan ? selectedSpan.M1_Temp + selectedSpan.V1_Temp * x : 0);

      const w_mech_short_up_sel = beamShapeW(L, x, selectedDeMech[0], selectedDeMech[1], selectedDeMech[2], selectedDeMech[3]);

      let w_creep_inc_up_sel = 0;
      if (creepMode === 'all') {
        const w_long_up = beamShapeW(L, x, selectedDeMechLong[0], selectedDeMechLong[1], selectedDeMechLong[2], selectedDeMechLong[3]);
        w_creep_inc_up_sel = w_long_up - w_mech_short_up_sel;
      } else if (creepMode === 'sustained_dead') {
        const w_sus_short = beamShapeW(L, x, deSus_Short[0], deSus_Short[1], deSus_Short[2], deSus_Short[3]);
        const w_sus_long = beamShapeW(L, x, deSus_Long[0], deSus_Long[1], deSus_Long[2], deSus_Long[3]);
        w_creep_inc_up_sel = w_sus_long - w_sus_short;
      }

      const w_total_up_sel = w_mech_short_up_sel + w_temp_up + w_creep_inc_up_sel;
      const w_total_down_sel = -w_total_up_sel;
      const w_mech_short_down_sel = -w_mech_short_up_sel;
      const w_creep_down_sel = -w_creep_inc_up_sel;

      let envelopeMoment = 0;
      let envelopeShear = 0;
      let envelopeDeflection = 0;
      let envelopeDeflectionAbs = -Infinity;
      let envelopeMomentAbs = -Infinity;
      let envelopeShearAbs = -Infinity;

      for (const caseSpan of spanCases) {
        const qULSLine = Array.isArray(caseSpan.caseRes.qULS_line) ? (caseSpan.caseRes.qULS_line[eIdx] || 0) : (caseSpan.caseRes.qULS_line || 0);
        const Psum = sumPoint(caseSpan.loadsInSpan, x, smp.mode);
        const Vx_Mech = caseSpan.V1_Mech - qULSLine * x - Psum;
        const Mx_Mech = caseSpan.M1_Mech + caseSpan.V1_Mech * x - (qULSLine * x * x) / 2 - caseSpan.loadsInSpan
          .filter((ev) => (smp.mode === 'pre' ? ev.a_mm < x - 1e-9 : ev.a_mm <= x + 1e-9))
          .reduce((acc2, ev) => acc2 + ev.P_N * (x - ev.a_mm), 0);

        const Vx = Vx_Mech + caseSpan.V1_Temp;
        const Mx = Mx_Mech + caseSpan.M1_Temp + caseSpan.V1_Temp * x;

        const momentAbs = Math.abs(Mx);
        if (momentAbs > envelopeMomentAbs) {
          envelopeMomentAbs = momentAbs;
          envelopeMoment = Mx;
        }

        const shearAbs = Math.abs(Vx);
        if (shearAbs > envelopeShearAbs) {
          envelopeShearAbs = shearAbs;
          envelopeShear = Vx;
        }

        const w_mech_short_up = beamShapeW(L, x, caseSpan.de_Mech[0], caseSpan.de_Mech[1], caseSpan.de_Mech[2], caseSpan.de_Mech[3]);
        let w_creep_inc_up = 0;
        if (creepMode === 'all') {
          const w_long_up = beamShapeW(L, x, caseSpan.de_MechLong[0], caseSpan.de_MechLong[1], caseSpan.de_MechLong[2], caseSpan.de_MechLong[3]);
          w_creep_inc_up = w_long_up - w_mech_short_up;
        } else if (creepMode === 'sustained_dead') {
          const w_sus_short = beamShapeW(L, x, deSus_Short[0], deSus_Short[1], deSus_Short[2], deSus_Short[3]);
          const w_sus_long = beamShapeW(L, x, deSus_Long[0], deSus_Long[1], deSus_Long[2], deSus_Long[3]);
          w_creep_inc_up = w_sus_long - w_sus_short;
        }

        const w_total_up = w_mech_short_up + w_temp_up + w_creep_inc_up;
        const w_total_down = -w_total_up;

        const deflectionAbs = Math.abs(w_total_down);
        if (deflectionAbs > envelopeDeflectionAbs) {
          envelopeDeflectionAbs = deflectionAbs;
          envelopeDeflection = w_total_down;
        }
      }

      if (envelopeMoment > maxMomentNeg) maxMomentNeg = envelopeMoment;
      if (envelopeMoment < maxMomentPos) maxMomentPos = envelopeMoment;
      if (Math.abs(envelopeMoment) > maxMomentAbs) maxMomentAbs = Math.abs(envelopeMoment);
      if (Math.abs(envelopeShear) > maxShear) maxShear = Math.abs(envelopeShear);
      if (Math.abs(envelopeDeflection) > maxDeflection) maxDeflection = Math.abs(envelopeDeflection);
      if (Math.abs(envelopeDeflection) > spanMaxDeflection) spanMaxDeflection = Math.abs(envelopeDeflection);

      chartData.push({
        x: parseFloat(((globalX + x) / 1000).toFixed(3)),
        moment: parseFloat((Mx_Selected / 1e6).toFixed(2)),
        shear: parseFloat((Vx_Selected / 1000).toFixed(2)),
        deflectionWind: parseFloat(w_mech_short_down_sel.toFixed(1)),
        deflectionThermal: parseFloat(w_temp_down.toFixed(1)),
        deflectionCreep: parseFloat(w_creep_down_sel.toFixed(1)),
        deflectionTotal: parseFloat(w_total_down_sel.toFixed(1)),
        limitPlus: parseFloat((L / limitDenom).toFixed(1)),
        limitMinus: -parseFloat((L / limitDenom).toFixed(1)),
      });
    }

    const spanLimit = L / limitDenom;
    if (spanLimit > 0) {
      const spanRatio = spanMaxDeflection / spanLimit;
      if (spanRatio > maxDeflectionRatio) {
        maxDeflectionRatio = spanRatio;
        maxDeflectionForRatio = spanMaxDeflection;
        worstDeflectionLimit = spanLimit;
      }
    }

    globalX += L;
  }

  if (!Number.isFinite(maxMomentNeg)) maxMomentNeg = 0;
  if (!Number.isFinite(maxMomentPos)) maxMomentPos = 0;
  if (!Number.isFinite(maxMomentAbs)) maxMomentAbs = 0;

  const maxSupportMomentAbs = supportMomentEnvelope.length > 0 ? Math.max(...supportMomentEnvelope) : 0;
  if (worstDeflectionLimit === 0) worstDeflectionLimit = (Math.max(...spansM) * 1000) / limitDenom;
  maxDeflection = maxDeflectionForRatio > 0 ? maxDeflectionForRatio : maxDeflection;

  const extrema = {
    deflectionTotal: getExtrema(chartData, 'deflectionTotal'),
    moment: getExtrema(chartData, 'moment'),
    shear: getExtrema(chartData, 'shear'),
  };

  const reactionEnvelope = caseResults.map((caseRes) => {
    const reactMech = caseRes.solULS_Mech?.reactions || new Array(nNode).fill(0);
    const reactTemp = solULS_Temp?.reactions || new Array(nNode).fill(0);
    return reactMech.map((rm, i) => rm + reactTemp[i]);
  });

  const screwStrength = Number(config.screwStrength) || 0;
  const upliftEnabled = config.panelType !== 'ceiling' && screwStrength > 0;
  const reactionPack = buildReactionData({
    config,
    reactionEnvelope,
    panelWidth,
    upliftEnabled,
    screwStrength,
    constants: {
      ...SECTION_CONSTANTS,
      supportCrushingResistance: SUPPORT_CRUSHING_RESISTANCE,
      supportCrushingFactor: SUPPORT_CRUSHING_FACTOR,
    },
  });

  const hingeNoteList = Array.from(hingeNotes);
  const capacity = buildCapacityChecks({
    config,
    maxMomentAbs,
    maxSupportMomentAbs,
    maxShear,
    maxDeflectionRatio,
    maxReactionRatio: reactionPack.maxReactionRatio,
    maxUpliftRatio: reactionPack.maxUpliftRatio,
    upliftEnabled,
    sigma_limit,
    I_eq,
    zMax,
    Ac,
    reactionData: reactionPack.reactionData,
    hingeNoteList,
    creepMode,
    phiShear,
    phiBending,
    wrinklingMode,
    wrinklingDeclaredMissing: section.wrinklingDeclaredMissing,
    wrinklingFallbackMode: section.wrinklingFallbackMode,
    redistributionMode: redistributionState.mode,
    constants: SECTION_CONSTANTS,
  });

  const summary = buildReportSummary({
    results: {
      chartData,
      reactionData: reactionPack.reactionData,
      M_Rd,
      V_Rd: capacity.V_Rd,
      maxMomentNeg,
      maxMomentPos,
      maxMomentAbs,
      maxSupportMoment: maxSupportMomentAbs,
      maxShear,
      maxReaction: reactionPack.maxReactionCompression,
      maxUplift: reactionPack.maxReactionTension,
      maxDeflection,
      ratios: capacity.ratios,
      upliftEnabled,
      status: capacity.status,
      advice: capacity.advice,
      stress_span: capacity.stress_span_val,
      stress_support: capacity.stress_support_val,
      sigma_limit,
      governingCases: capacity.governingCases,
      supportLocs,
      extrema,
      creepMode,
      phiShear,
      phiBending,
      panelWidth,
      screwCount: reactionPack.screwCount,
      qDead_kPa,
      qLive_kPa,
      qDeadBySpan_kPa,
      qLiveBySpan_kPa,
      distributedLoadMode,
      qWind_kPa: qWindDisplay_kPa,
    },
    worstSupport: reactionPack.worstSupport,
    worstUplift: reactionPack.worstUplift,
    selectedCase,
    dT,
    Mt_ULS,
    section: { ...section, Af1, Af2 },
    extra: {
      config,
      limitDenom,
      w_limit: worstDeflectionLimit,
      GA_long,
      EI_long,
      gammaG,
      gammaQ,
      gammaThermal,
      redistributionMode: redistributionState.mode,
      redistributionEnabled: redistributionState.enabled,
    },
  });

  return {
    summary,
    section,
    solverPack,
    selectedCase,
    intermediate: {
      loadInputs,
      mechanicalCasesBase,
      mechanicalCases,
      solULS_Temp,
      solSLS_Temp,
      solSLS_Sust_Short,
      solSLS_Sust_Long,
      supportMomentEnvelope,
      hingeNoteList,
    },
  };
}
