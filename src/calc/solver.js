import { DEFAULT_REDISTRIBUTION_MODE } from './section.js';

export const DEFAULT_REDISTRIBUTION = {
  mode: DEFAULT_REDISTRIBUTION_MODE,
  enabled: false,
  maxIter: 4,
  hingeTrigger: 1.0,
};

export const normalizeRedistribution = (redistribution = DEFAULT_REDISTRIBUTION) => {
  const mode = redistribution?.mode || DEFAULT_REDISTRIBUTION.mode;
  const normalized = {
    ...DEFAULT_REDISTRIBUTION,
    ...redistribution,
    mode,
  };

  if (mode === 'simplified') {
    normalized.enabled = redistribution?.enabled ?? true;
    normalized.maxIter = redistribution?.maxIter ?? 4;
    normalized.hingeTrigger = redistribution?.hingeTrigger ?? 1.0;
  } else {
    normalized.enabled = false;
    normalized.maxIter = 1;
    normalized.hingeTrigger = Number.POSITIVE_INFINITY;
  }

  return normalized;
};

export const consistentLoadPoint = (PDown, a, L) => {
  const P = Number(PDown) || 0;
  const aa = Math.min(Math.max(Number(a) || 0, 0), L);
  const b = L - aa;
  const L2 = L * L;
  const L3 = L2 * L;

  const F1 = -P * (b * b) * (3 * aa + b) / L3;
  const F2 = -P * (aa * aa) * (aa + 3 * b) / L3;
  const M1 = -P * aa * (b * b) / L2;
  const M2 = +P * (aa * aa) * b / L2;

  return [F1, M1, F2, M2];
};

export const consistentLoadUDL = (qDown, L) => [-qDown * L / 2, -qDown * L * L / 12, -qDown * L / 2, qDown * L * L / 12];

export const normalizeSpanDistributedLoads = (spansM = [], qDown = 0) => {
  const nSpan = Array.isArray(spansM) ? spansM.length : 0;
  if (Array.isArray(qDown)) {
    return Array.from({ length: nSpan }, (_, idx) => Number(qDown[idx]) || 0);
  }
  const qScalar = Number(qDown) || 0;
  return Array.from({ length: nSpan }, () => qScalar);
};

export const timoshenkoElementK = (EI, GA, L, kappa = 1.0) => {
  const GAeff = Math.max(GA, 1e-9);
  const psi = (12 * EI) / (kappa * GAeff * L * L);
  const fac = EI / (Math.pow(L, 3) * (1 + psi));
  const L2 = L * L;

  return [
    [fac * 12, fac * (6 * L), fac * (-12), fac * (6 * L)],
    [fac * (6 * L), fac * ((4 + psi) * L2), fac * (-6 * L), fac * ((2 - psi) * L2)],
    [fac * (-12), fac * (-6 * L), fac * 12, fac * (-6 * L)],
    [fac * (6 * L), fac * ((2 - psi) * L2), fac * (-6 * L), fac * ((4 + psi) * L2)],
  ];
};

export const matVec = (A, x) => {
  const n = A.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < x.length; j++) s += A[i][j] * x[j];
    y[i] = s;
  }
  return y;
};

export const solveLinear = (Ain, bin) => {
  const n = Ain.length;
  const A = Ain.map((r) => r.slice());
  const b = bin.slice();

  for (let k = 0; k < n; k++) {
    let piv = k;
    let maxAbs = Math.abs(A[k][k]);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(A[i][k]);
      if (v > maxAbs) {
        maxAbs = v;
        piv = i;
      }
    }
    if (maxAbs < 1e-12) return new Array(n).fill(0);

    if (piv !== k) {
      [A[k], A[piv]] = [A[piv], A[k]];
      [b[k], b[piv]] = [b[piv], b[k]];
    }

    for (let i = k + 1; i < n; i++) {
      const f = A[i][k] / A[k][k];
      if (Math.abs(f) < 1e-18) continue;
      for (let j = k; j < n; j++) A[i][j] -= f * A[k][j];
      b[i] -= f * b[k];
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
    x[i] = s / A[i][i];
  }
  return x;
};

export const solveContinuousBeam = ({ spansM, qDown, EI, GA, hinges, pointLoads, thermalMoment = 0, kappaShear = 1.0, supportNodes = null }) => {
  const nSpan = spansM.length;
  const nNode = nSpan + 1;
  const qDownBySpan = normalizeSpanDistributedLoads(spansM, qDown);

  const vDof = Array.from({ length: nNode }, (_, i) => i);
  let next = nNode;

  const thShared = new Array(nNode).fill(null);
  const thLeft = new Array(nNode).fill(null);
  const thRight = new Array(nNode).fill(null);

  for (let i = 0; i < nNode; i++) {
    const isEnd = i === 0 || i === nNode - 1;
    const isHinge = !isEnd && hinges?.[i] === true;

    if (!isHinge) thShared[i] = next++;
    else {
      thLeft[i] = next++;
      thRight[i] = next++;
    }
  }

  const ndof = next;
  const K = Array.from({ length: ndof }, () => new Array(ndof).fill(0));
  const F = new Array(ndof).fill(0);
  const elem = [];
  const addK = (I, J, val) => {
    K[I][J] += val;
  };

  for (let e = 0; e < nSpan; e++) {
    const i = e;
    const j = e + 1;
    const L = (Number(spansM[e]) || 0) * 1000;
    if (L <= 0) continue;

    const dof = [];
    dof[0] = vDof[i];
    dof[2] = vDof[j];

    dof[1] = (i !== 0 && i !== nNode - 1 && hinges?.[i]) ? thRight[i] : thShared[i];
    dof[3] = (j !== 0 && j !== nNode - 1 && hinges?.[j]) ? thLeft[j] : thShared[j];

    const ke = timoshenkoElementK(EI, GA, L, kappaShear);
    const qDownElem = qDownBySpan[e] || 0;
    const fe = consistentLoadUDL(qDownElem, L);
    const feTemp = [0, -thermalMoment, 0, thermalMoment];

    const x0 = spansM.slice(0, e).reduce((s, v) => s + (Number(v) || 0), 0) * 1000;
    const x1 = x0 + L;

    let fePoint = [0, 0, 0, 0];
    for (const pl of pointLoads || []) {
      const xg = Number(pl.x_mm);
      const Pn = Number(pl.P_N);
      if (!Number.isFinite(xg) || !Number.isFinite(Pn)) continue;

      const isAtLeftNode = Math.abs(xg - x0) <= 1e-9;
      const isAtRightNode = Math.abs(xg - x1) <= 1e-9;
      const isStrictlyInside = xg > x0 + 1e-9 && xg < x1 - 1e-9;
      const belongsToElement = isStrictlyInside
        || (isAtLeftNode && e === 0)
        || (isAtRightNode);

      if (!belongsToElement) continue;

      const a = isAtLeftNode ? 0 : (isAtRightNode ? L : (xg - x0));
      const fep = consistentLoadPoint(Pn, a, L);
      fePoint = fePoint.map((v, k) => v + fep[k]);
    }

    const feTotal = fe.map((v, k) => v + fePoint[k] + feTemp[k]);

    for (let a = 0; a < 4; a++) {
      F[dof[a]] += feTotal[a];
      for (let b = 0; b < 4; b++) addK(dof[a], dof[b], ke[a][b]);
    }

    elem.push({ e, i, j, L, dof, ke, fe: feTotal, qDown: qDownElem });
  }

  const normalizedSupportNodes = Array.isArray(supportNodes) && supportNodes.length > 0
    ? [...new Set(supportNodes
      .map((node) => Number(node))
      .filter((node) => Number.isInteger(node) && node >= 0 && node < nNode))]
    : vDof.map((_, idx) => idx);

  const constrained = normalizedSupportNodes.map((nodeIdx) => vDof[nodeIdx]);
  const constrainedSet = new Set(constrained);
  const free = [];
  for (let d = 0; d < ndof; d++) {
    if (!constrainedSet.has(d)) free.push(d);
  }

  const Kff = free.map((r) => free.map((c) => K[r][c]));
  const Ff = free.map((r) => F[r]);

  const df = free.length > 0 ? solveLinear(Kff, Ff) : [];
  const d = new Array(ndof).fill(0);
  for (let k = 0; k < free.length; k++) d[free[k]] = df[k];

  const Kd = matVec(K, d);
  const reactions = new Array(nNode).fill(0);
  for (let i = 0; i < nNode; i++) {
    const dofi = vDof[i];
    reactions[i] = Kd[dofi] - F[dofi];
  }

  const elementForces = elem.map((el) => {
    const de = el.dof.map((idx) => d[idx]);
    const p = matVec(el.ke, de).map((v, k) => v - el.fe[k]);
    const V1 = p[0];
    const M1 = -p[1];
    const V2 = p[2];
    const M2 = -p[3];
    return { ...el, p, V1, M1, V2, M2 };
  });

  return { ndof, d, reactions, elementForces, nNode };
};

export const beamShapeW = (L, x, v1, th1, v2, th2) => {
  const xi = x / L;
  const N1 = 1 - 3 * xi * xi + 2 * xi * xi * xi;
  const N2 = L * (xi - 2 * xi * xi + xi * xi * xi);
  const N3 = 3 * xi * xi - 2 * xi * xi * xi;
  const N4 = L * (-xi * xi + xi * xi * xi);
  return N1 * v1 + N2 * th1 + N3 * v2 + N4 * th2;
};

export const solveBeamWithRedistribution = ({ spansM, mechanicalCases, EI, GA_inst, nNode, M_Rd, solULS_Temp, creepMode, EI_long, GA_long, qDead_kPa, qDead_line, pointLoadsPermanent, kappaShear = 1.0, redistribution = DEFAULT_REDISTRIBUTION }) => {
  const redistributionConfig = normalizeRedistribution(redistribution);
  const emptySol = { elementForces: [], reactions: new Array(nNode).fill(0), d: [] };

  const solSLS_Temp = (EI > 0 && spansM.length >= 1)
    ? solveContinuousBeam({ spansM, qDown: 0, EI, GA: GA_inst, hinges: new Array(nNode).fill(false), pointLoads: [], thermalMoment: 0, kappaShear })
    : emptySol;

  let solSLS_Sust_Short = emptySol;
  let solSLS_Sust_Long = emptySol;

  if (EI > 0 && spansM.length >= 1 && creepMode === 'sustained_dead') {
    const hasSust = Math.abs(qDead_kPa) > 1e-12 || pointLoadsPermanent.length > 0;
    if (hasSust) {
      solSLS_Sust_Short = solveContinuousBeam({ spansM, qDown: qDead_line, EI, GA: GA_inst, hinges: new Array(nNode).fill(false), pointLoads: pointLoadsPermanent, thermalMoment: 0, kappaShear });
      solSLS_Sust_Long = solveContinuousBeam({ spansM, qDown: qDead_line, EI: EI_long, GA: GA_long, hinges: new Array(nNode).fill(false), pointLoads: pointLoadsPermanent, thermalMoment: 0, kappaShear });
    }
  }

  const getElem = (sol, eIdx) => sol?.elementForces?.find((x) => x.e === eIdx);

  return {
    emptySol,
    solSLS_Temp,
    solSLS_Sust_Short,
    solSLS_Sust_Long,
    redistribution: redistributionConfig,
    caseResults: mechanicalCases.map((caseDef) => {
      const pointLoadsSLS = caseDef.pointLoadsSLS ?? [];
      const pointLoadsULS = caseDef.pointLoadsULS ?? [];

      let hinges = new Array(nNode).fill(false);
      let solULS_Mech = emptySol;

      if (EI > 0 && spansM.length >= 1) {
        for (let it = 0; it < redistributionConfig.maxIter; it++) {
          solULS_Mech = solveContinuousBeam({ spansM, qDown: caseDef.qULS_line, EI, GA: GA_inst, hinges, pointLoads: pointLoadsULS, thermalMoment: 0, kappaShear });

          if (!redistributionConfig.enabled || M_Rd <= 0) break;

          let changed = false;
          for (let i = 1; i <= nNode - 2; i++) {
            if (hinges[i]) continue;

            const M_mech_L = getElem(solULS_Mech, i - 1)?.M2 || 0;
            const M_temp_L = getElem(solULS_Temp, i - 1)?.M2 || 0;
            const M_total_L = M_mech_L + M_temp_L;

            const M_mech_R = getElem(solULS_Mech, i)?.M1 || 0;
            const M_temp_R = getElem(solULS_Temp, i)?.M1 || 0;
            const M_total_R = M_mech_R + M_temp_R;

            const Mi = Math.max(Math.abs(M_total_L), Math.abs(M_total_R));
            if (Mi > redistributionConfig.hingeTrigger * M_Rd) {
              hinges[i] = true;
              changed = true;
            }
          }
          if (!changed) break;
        }
      }

      let solSLS_Mech_Short = emptySol;
      let solSLS_Mech_Long = emptySol;

      if (EI > 0 && spansM.length >= 1) {
        solSLS_Mech_Short = solveContinuousBeam({ spansM, qDown: caseDef.qSLS_line, EI, GA: GA_inst, hinges: new Array(nNode).fill(false), pointLoads: pointLoadsSLS, thermalMoment: 0, kappaShear });

        if (creepMode === 'all') {
          solSLS_Mech_Long = solveContinuousBeam({ spansM, qDown: caseDef.qSLS_line, EI: EI_long, GA: GA_long, hinges: new Array(nNode).fill(false), pointLoads: pointLoadsSLS, thermalMoment: 0, kappaShear });
        }
      }

      return {
        ...caseDef,
        hinges,
        redistributionMode: redistributionConfig.mode,
        solULS_Mech,
        solSLS_Mech_Short,
        solSLS_Mech_Long,
        pointLoadsULS,
        pointLoadsSLS,
      };
    }),
  };
};
