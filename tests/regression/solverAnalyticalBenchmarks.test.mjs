import test from 'node:test';
import assert from 'node:assert/strict';
import { solveContinuousBeam, beamShapeW } from '../../src/calc/solver.js';

const REL_TOL = 1e-6;
const ABS_TOL = 1e-6;

function assertClose(actual, expected, { rel = REL_TOL, abs = ABS_TOL, message } = {}) {
  const diff = Math.abs(actual - expected);
  const limit = Math.max(abs, Math.abs(expected) * rel);
  assert.ok(diff <= limit, message || `Expected ${actual} ≈ ${expected} (diff=${diff}, tol=${limit})`);
}

function buildSingleSpanSolution({ spanM, EI, qDown = 0, pointLoads = [], GA = 1e18, kappaShear = 1 }) {
  return buildSimplySupportedMeshSolution({
    totalSpanM: spanM,
    meshElements: 1,
    EI,
    GA,
    qDown,
    pointLoads,
    kappaShear,
  });
}

function buildSimplySupportedMeshSolution({ totalSpanM, meshElements, EI, qDown = 0, pointLoads = [], GA = 1e18, kappaShear = 1 }) {
  const spansM = Array.from({ length: meshElements }, () => totalSpanM / meshElements);
  const sol = solveContinuousBeam({
    spansM,
    qDown,
    EI,
    GA,
    hinges: new Array(meshElements + 1).fill(false),
    pointLoads,
    thermalMoment: 0,
    kappaShear,
    supportNodes: [0, meshElements],
  });

  const totalLength = spansM.reduce((sum, span) => sum + span, 0) * 1000;
  const sortedPointLoads = [...pointLoads].sort((a, b) => a.x_mm - b.x_mm);

  const pointLoadSum = (x, mode = 'post') => sortedPointLoads.reduce((sum, load) => {
    if (mode === 'pre') {
      return load.x_mm < x - 1e-9 ? sum + load.P_N : sum;
    }
    return load.x_mm <= x + 1e-9 ? sum + load.P_N : sum;
  }, 0);

  const pointMomentSum = (x, mode = 'post') => sortedPointLoads.reduce((sum, load) => {
    if (mode === 'pre') {
      return load.x_mm < x - 1e-9 ? sum + load.P_N * (x - load.x_mm) : sum;
    }
    return load.x_mm <= x + 1e-9 ? sum + load.P_N * (x - load.x_mm) : sum;
  }, 0);

  const findElementAt = (x) => {
    let x0 = 0;
    for (const element of sol.elementForces) {
      const x1 = x0 + element.L;
      if (x <= x1 + 1e-9) {
        return { element, xLocal: Math.min(Math.max(x - x0, 0), element.L) };
      }
      x0 = x1;
    }

    const lastElement = sol.elementForces[sol.elementForces.length - 1];
    return { element: lastElement, xLocal: lastElement?.L || 0 };
  };

  return {
    sol,
    L: totalLength,
    deflectionAt(x) {
      const { element, xLocal } = findElementAt(x);
      const de = element.dof.map((idx) => sol.d[idx] || 0);
      return beamShapeW(element.L, xLocal, de[0], de[1], de[2], de[3]);
    },
    shearAt(x, mode = 'post') {
      const { element, xLocal } = findElementAt(x);
      return element.V1 - qDown * xLocal - pointLoadSum(x, mode);
    },
    momentAt(x, mode = 'post') {
      const { element, xLocal } = findElementAt(x);
      return element.M1 + element.V1 * xLocal - (qDown * xLocal * xLocal) / 2 - pointMomentSum(x, mode);
    },
  };
}

function relativeError(actual, expected) {
  const scale = Math.max(Math.abs(expected), 1e-12);
  return Math.abs(actual - expected) / scale;
}

function buildMeshSweep(meshes, buildCase) {
  return meshes.map((meshElements) => ({
    meshElements,
    ...buildCase(meshElements),
  }));
}

test('exact analytical benchmark: simply supported single span with UDL matches closed-form reactions, shear, moment; deflection stays stable for current single-element formulation', () => {
  const spanM = 6;
  const L = spanM * 1000;
  const qDown = 5; // N/mm
  const EI = 2e13; // N.mm2

  const result = buildSingleSpanSolution({ spanM, qDown, EI });

  const expectedReaction = (qDown * L) / 2;
  const expectedMidMoment = (qDown * L * L) / 8;
  const expectedQuarterMoment = (3 * qDown * L * L) / 32;
  const expectedMidDeflectionSolverReference = -3.375;
  const expectedQuarterDeflectionSolverReference = -2.53125;

  assertClose(result.sol.reactions[0], expectedReaction, { message: 'Reaction at left support must match qL/2' });
  assertClose(result.sol.reactions[1], expectedReaction, { message: 'Reaction at right support must match qL/2' });

  assertClose(result.shearAt(0), expectedReaction, { message: 'Left-end shear must match reaction' });
  assertClose(result.shearAt(L / 2), 0, { abs: 1e-9, message: 'Midspan shear under symmetric UDL must be zero' });
  assertClose(result.shearAt(L), -expectedReaction, { message: 'Right-end shear must match -qL/2' });

  assertClose(result.momentAt(0), 0, { abs: 1e-9, message: 'Simply supported end moment must be zero' });
  assertClose(result.momentAt(L / 4), expectedQuarterMoment, { message: 'Quarter-span moment must match 3qL²/32' });
  assertClose(result.momentAt(L / 2), expectedMidMoment, { message: 'Midspan moment must match qL²/8' });
  assertClose(result.momentAt(L), 0, { abs: 1e-9, message: 'Simply supported end moment must be zero' });

  // Note: with the current solver API, a true single-span simply supported benchmark is represented by one beam element.
  // Internal forces/reactions are exact for these load cases, while in-element displacement is a formulation reference
  // for the current single-element interpolation rather than an exact closed-form benchmark.
  assertClose(result.deflectionAt(L / 4), expectedQuarterDeflectionSolverReference, { abs: 1e-9, message: 'Quarter-span deflection should remain stable for the current solver formulation' });
  assertClose(result.deflectionAt(L / 2), expectedMidDeflectionSolverReference, { abs: 1e-9, message: 'Midspan deflection should remain stable for the current solver formulation' });
});

test('exact analytical benchmark: simply supported single span with midspan point load matches closed-form reactions, shear jump, moment; deflection stays stable for current single-element formulation', () => {
  const spanM = 6;
  const L = spanM * 1000;
  const P = 12000; // N
  const EI = 2e13; // N.mm2
  const xMid = L / 2;

  const result = buildSingleSpanSolution({
    spanM,
    EI,
    pointLoads: [{ x_mm: xMid, P_N: P }],
  });

  const expectedReaction = P / 2;
  const expectedMidMoment = (P * L) / 4;
  const expectedMidDeflectionSolverReference = -2.025;

  assertClose(result.sol.reactions[0], expectedReaction, { message: 'Reaction at left support must match P/2' });
  assertClose(result.sol.reactions[1], expectedReaction, { message: 'Reaction at right support must match P/2' });

  assertClose(result.shearAt(0), expectedReaction, { message: 'Left-end shear must match reaction' });
  assertClose(result.shearAt(xMid, 'pre'), expectedReaction, { message: 'Shear just before point load must remain +P/2' });
  assertClose(result.shearAt(xMid, 'post'), -expectedReaction, { message: 'Shear just after point load must jump to -P/2' });
  assertClose(result.shearAt(L), -expectedReaction, { message: 'Right-end shear must match -P/2' });

  assertClose(result.momentAt(0), 0, { abs: 1e-6, message: 'Simply supported end moment must be zero' });
  assertClose(result.momentAt(xMid, 'pre'), expectedMidMoment, { message: 'Midspan moment just before load must match PL/4' });
  assertClose(result.momentAt(xMid, 'post'), expectedMidMoment, { message: 'Midspan moment just after load must still match PL/4' });
  assertClose(result.momentAt(L), 0, { abs: 1e-6, message: 'Simply supported end moment must be zero' });

  // Same note as UDL case: deflection here is kept as a regression reference for the current single-element solver response.
  assertClose(result.deflectionAt(xMid), expectedMidDeflectionSolverReference, { abs: 1e-9, message: 'Midspan deflection should remain stable for the current solver formulation' });
});

test('convergence benchmark: simply supported UDL remains exact in reactions/moment and deflection does not worsen as the mesh is refined', () => {
  const totalSpanM = 6;
  const L = totalSpanM * 1000;
  const qDown = 5;
  const EI = 2e13;
  const meshes = [1, 2, 4, 8, 16];

  const expectedReaction = (qDown * L) / 2;
  const expectedMidMoment = (qDown * L * L) / 8;
  const expectedMidDeflection = -(5 * qDown * L ** 4) / (384 * EI);
  const expectedQuarterDeflection = -(57 * qDown * L ** 4) / (6144 * EI);

  const sweep = buildMeshSweep(meshes, (meshElements) => {
    const result = buildSimplySupportedMeshSolution({ totalSpanM, meshElements, qDown, EI });
    return {
      result,
      midDeflectionError: Math.abs(result.deflectionAt(L / 2) - expectedMidDeflection),
      quarterDeflectionError: Math.abs(result.deflectionAt(L / 4) - expectedQuarterDeflection),
    };
  });

  for (const { meshElements, result } of sweep) {
    assertClose(result.sol.reactions[0], expectedReaction, { message: `Mesh ${meshElements}: left reaction must match qL/2` });
    assertClose(result.sol.reactions.at(-1), expectedReaction, { message: `Mesh ${meshElements}: right reaction must match qL/2` });
    assertClose(result.momentAt(L / 2), expectedMidMoment, { message: `Mesh ${meshElements}: midspan moment must match qL²/8` });
  }

  for (let i = 1; i < sweep.length; i++) {
    assert.ok(
      sweep[i].midDeflectionError <= sweep[i - 1].midDeflectionError + 1e-9,
      `Midspan deflection error should not worsen when refining from ${sweep[i - 1].meshElements} to ${sweep[i].meshElements} elements`,
    );
    assert.ok(
      sweep[i].quarterDeflectionError <= sweep[i - 1].quarterDeflectionError + 1e-9,
      `Quarter-span deflection error should not worsen when refining from ${sweep[i - 1].meshElements} to ${sweep[i].meshElements} elements`,
    );
  }

  const mesh2 = sweep.find(({ meshElements }) => meshElements === 2);
  const mesh4 = sweep.find(({ meshElements }) => meshElements === 4);
  assert.ok(mesh2.midDeflectionError <= 1e-9, 'With 2 elements the UDL midspan deflection should already match the closed form to numerical precision');
  assert.ok(mesh4.quarterDeflectionError <= 1e-9, 'With 4 elements the UDL quarter-span deflection should already match the closed form to numerical precision');
});

test('convergence benchmark: simply supported eccentric point load converges monotonically in deflection while keeping reactions exact', () => {
  const totalSpanM = 6;
  const L = totalSpanM * 1000;
  const EI = 2e13;
  const P = 12000;
  const xLoad = 2500;
  const meshes = [1, 2, 4, 8, 16, 32];

  const a = xLoad;
  const b = L - a;
  const expectedLeftReaction = (P * b) / L;
  const expectedRightReaction = (P * a) / L;
  const expectedDeflectionAtLoad = -(P * a * a * b * b) / (3 * EI * L);

  const sweep = buildMeshSweep(meshes, (meshElements) => {
    const result = buildSimplySupportedMeshSolution({
      totalSpanM,
      meshElements,
      EI,
      pointLoads: [{ x_mm: xLoad, P_N: P }],
    });

    return {
      result,
      loadDeflectionError: Math.abs(result.deflectionAt(xLoad) - expectedDeflectionAtLoad),
    };
  });

  for (const { meshElements, result } of sweep) {
    assertClose(result.sol.reactions[0], expectedLeftReaction, {
      rel: 1e-6,
      abs: 1e-6,
      message: `Mesh ${meshElements}: left reaction must match Pb/L`,
    });
    assertClose(result.sol.reactions.at(-1), expectedRightReaction, {
      rel: 1e-6,
      abs: 1e-6,
      message: `Mesh ${meshElements}: right reaction must match Pa/L`,
    });
  }

  for (let i = 1; i < sweep.length; i++) {
    assert.ok(
      sweep[i].loadDeflectionError <= sweep[i - 1].loadDeflectionError + 1e-9,
      `Point-load deflection error should not worsen when refining from ${sweep[i - 1].meshElements} to ${sweep[i].meshElements} elements`,
    );
  }

  const mesh8 = sweep.find(({ meshElements }) => meshElements === 8);
  const mesh16 = sweep.find(({ meshElements }) => meshElements === 16);
  assert.ok(relativeError(mesh8.result.deflectionAt(xLoad), expectedDeflectionAtLoad) <= 4e-4, 'At 8 elements the eccentric point-load deflection should already be within 0.04% of closed form');
  assert.ok(relativeError(mesh16.result.deflectionAt(xLoad), expectedDeflectionAtLoad) <= 5e-5, 'At 16 elements the eccentric point-load deflection should be within 0.005% of closed form');
});

test('regression + stability benchmark: point load applied at an internal mesh node stays single-counted and stable across mesh densities', () => {
  const totalSpanM = 6;
  const L = totalSpanM * 1000;
  const EI = 2e13;
  const P = 12000;
  const xLoad = 3000;
  const meshes = [2, 4, 8, 16, 32];
  const expectedReaction = P / 2;
  const expectedMidMoment = (P * L) / 4;
  const expectedMidDeflection = -(P * L ** 3) / (48 * EI);

  const sweep = buildMeshSweep(meshes, (meshElements) => ({
    result: buildSimplySupportedMeshSolution({
      totalSpanM,
      meshElements,
      EI,
      pointLoads: [{ x_mm: xLoad, P_N: P }],
    }),
  }));

  for (const { meshElements, result } of sweep) {
    const totalReaction = result.sol.reactions.reduce((sum, value) => sum + value, 0);
    assertClose(totalReaction, P, { message: `Mesh ${meshElements}: total reactions must balance the nodal point load without double counting` });
    assertClose(result.sol.reactions[0], expectedReaction, { message: `Mesh ${meshElements}: left support reaction must stay at P/2` });
    assertClose(result.sol.reactions.at(-1), expectedReaction, { message: `Mesh ${meshElements}: right support reaction must stay at P/2` });
    assertClose(result.shearAt(xLoad, 'pre'), expectedReaction, { message: `Mesh ${meshElements}: shear just before the nodal point load must stay at +P/2` });
    assertClose(result.shearAt(xLoad, 'post'), -expectedReaction, { message: `Mesh ${meshElements}: shear just after the nodal point load must jump to -P/2` });
    assertClose(result.momentAt(xLoad, 'pre'), expectedMidMoment, { message: `Mesh ${meshElements}: moment just before the nodal point load must match PL/4` });
    assertClose(result.momentAt(xLoad, 'post'), expectedMidMoment, { message: `Mesh ${meshElements}: moment just after the nodal point load must still match PL/4` });
    assertClose(result.deflectionAt(xLoad), expectedMidDeflection, {
      rel: 5e-4,
      abs: 1e-3,
      message: `Mesh ${meshElements}: deflection at the nodal point load should stay on the simply supported closed form after the fix`,
    });
  }
});

test('sanity check: two equal spans under UDL stay statically balanced and symmetric', () => {
  const spanM = 4;
  const qDown = 3;
  const EI = 1.5e13;
  const GA = 1e18;
  const spansM = [spanM, spanM];
  const totalLoad = qDown * spanM * 1000 * spansM.length;

  const sol = solveContinuousBeam({
    spansM,
    qDown,
    EI,
    GA,
    hinges: [false, false, false],
    pointLoads: [],
    thermalMoment: 0,
    kappaShear: 1,
  });

  const [r0, r1, r2] = sol.reactions;
  assertClose(r0 + r1 + r2, totalLoad, { message: 'Total reactions must balance total applied UDL' });
  assertClose(r0, r2, { message: 'Equal two-span symmetric case must have equal outer reactions' });

  const leftSpan = sol.elementForces[0];
  const rightSpan = sol.elementForces[1];
  assertClose(leftSpan.M2 + rightSpan.M1, 0, { message: 'Internal support end actions from adjacent spans must balance each other' });
  assert.ok(leftSpan.M2 > 0, 'Left span end action at internal support should be non-zero in this symmetric continuous case');
  assert.ok(rightSpan.M1 < 0, 'Right span end action at internal support should be equal/opposite to the left span end action');
});

test('benchmark unlock: two equal spans with UDL on one span only supports span-specific distributed loads and matches handbook coefficients', () => {
  const spanM = 4;
  const L = spanM * 1000;
  const qDownLeft = 3;
  const EI = 1.5e13;
  const GA = 1e18;

  const sol = solveContinuousBeam({
    spansM: [spanM, spanM],
    qDown: [qDownLeft, 0],
    EI,
    GA,
    hinges: [false, false, false],
    pointLoads: [],
    thermalMoment: 0,
    kappaShear: 1,
  });

  const [r0, r1, r2] = sol.reactions;
  const totalLoad = qDownLeft * L;
  assertClose(r0 + r1 + r2, totalLoad, { message: 'Total reactions must balance the one-span-only UDL' });
  assertClose(r0, (7 * qDownLeft * L) / 16, { rel: 5e-3, message: 'Left reaction must match 7qL/16' });
  assertClose(r1, (5 * qDownLeft * L) / 8, { rel: 5e-3, message: 'Internal reaction must match 5qL/8' });
  assertClose(r2, -(qDownLeft * L) / 16, { rel: 5e-3, message: 'Right reaction must match -qL/16 uplift' });

  const supportMoment = sol.elementForces[1].M1;
  assertClose(supportMoment, -(qDownLeft * L * L) / 16, { rel: 5e-3, message: 'Internal support moment must match -qL²/16' });

  const momentAt = (x) => {
    const element = x <= L ? sol.elementForces[0] : sol.elementForces[1];
    const xLocal = x <= L ? x : (x - L);
    return element.M1 + element.V1 * xLocal - (element.qDown * xLocal * xLocal) / 2;
  };

  const loadedSpanPositiveMoment = Math.max(...Array.from({ length: 2001 }, (_, idx) => momentAt((L * idx) / 2000)));
  const unloadedSpanPositiveMoment = Math.max(...Array.from({ length: 2001 }, (_, idx) => momentAt(L + (L * idx) / 2000)));

  assertClose(loadedSpanPositiveMoment, (49 * qDownLeft * L * L) / 512, { rel: 5e-3, message: 'Loaded span positive moment must match 49qL²/512' });
  assertClose(unloadedSpanPositiveMoment, 0, { abs: 1e-6, message: 'Unloaded span carries no positive sagging moment under the current solver/sign convention for this one-sided UDL case' });
});
