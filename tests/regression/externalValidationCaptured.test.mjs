import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { solveContinuousBeam, beamShapeW, normalizeSpanDistributedLoads } from '../../src/calc/solver.js';
import { buildSectionProperties, calcSelfWeight_kPa } from '../../src/calc/section.js';
import { runPanelAnalysis } from '../../src/calc/runPanelAnalysis.js';
import { solveTwoSpanThermalReducedSystem } from '../helpers/thermalTwoSpanIndependentHarness.mjs';

const fixturePath = path.resolve('tests/fixtures/external-validation-cases.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function findElementAt(sol, x) {
  let x0 = 0;
  for (const element of sol.elementForces) {
    const x1 = x0 + element.L;
    if (x <= x1 + 1e-9) {
      return { element, xLocal: Math.min(Math.max(x - x0, 0), element.L), xStart: x0, xEnd: x1 };
    }
    x0 = x1;
  }

  const lastElement = sol.elementForces[sol.elementForces.length - 1];
  return { element: lastElement, xLocal: lastElement?.L || 0, xStart: x0 - (lastElement?.L || 0), xEnd: x0 };
}

function buildSimplySupportedMeshSolution({ totalSpanM, meshElements, EI, qDown = 0, pointLoads = [], GA = 1e18, kappaShear = 1 }) {
  const spansM = Array.from({ length: meshElements }, () => totalSpanM / meshElements);
  const qDownBySpan = normalizeSpanDistributedLoads(spansM, qDown);
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

  return {
    sol,
    qDownBySpan,
    shearAt(x, mode = 'post') {
      const { element, xLocal } = findElementAt(sol, x);
      return element.V1 - element.qDown * xLocal - pointLoadSum(x, mode);
    },
    momentAt(x, mode = 'post') {
      const { element, xLocal } = findElementAt(sol, x);
      return element.M1 + element.V1 * xLocal - (element.qDown * xLocal * xLocal) / 2 - pointMomentSum(x, mode);
    },
    deflectionAt(x) {
      const { element, xLocal } = findElementAt(sol, x);
      const de = element.dof.map((idx) => sol.d[idx] || 0);
      return beamShapeW(element.L, xLocal, de[0], de[1], de[2], de[3]);
    },
  };
}

function getTolerance(tolerance, outputName) {
  if (tolerance.type === 'relative') {
    return { kind: 'numeric', rel: tolerance.value };
  }

  if (tolerance.type === 'mixed') {
    if (outputName.startsWith('deflection')) {
      return { kind: 'numeric', rel: tolerance.deflectionRelative };
    }
    return { kind: 'numeric', rel: tolerance.forceRelative };
  }

  if (tolerance.type === 'relative-or-absolute-per-output') {
    const override = tolerance.overrides?.[outputName];
    return {
      kind: 'numeric',
      rel: tolerance.defaultRelative ?? 0,
      abs: override?.absolute,
    };
  }

  if (tolerance.type === 'mixed-ledger') {
    if (outputName === 'governing_case' || outputName === 'status') {
      return { kind: 'exact' };
    }
    return { kind: 'numeric', rel: tolerance.ratioRelative ?? 0 };
  }

  throw new Error(`Unsupported tolerance type for executable captured case: ${tolerance.type}`);
}

function assertWithinTolerance(actual, expected, tolerance, label) {
  if (tolerance.kind === 'exact') {
    assert.equal(actual, expected, `${label}: expected exact match ${expected}, got ${actual}`);
    return;
  }

  const absTol = tolerance.abs ?? 0;
  const relTol = tolerance.rel ?? 0;
  const diff = Math.abs(actual - expected);
  const limit = Math.max(absTol, Math.abs(expected) * relTol);
  assert.ok(
    diff <= limit,
    `${label}: expected ${expected}, got ${actual}, diff=${diff}, limit=${limit}`,
  );
}

function executeCase(item) {
  const inputs = item.inputs;

  if (item.id === 'VM-01') {
    const result = buildSimplySupportedMeshSolution({
      totalSpanM: inputs.spanM,
      meshElements: inputs.meshElements,
      EI: inputs.EI_N_mm2,
      qDown: inputs.qDown_N_per_mm,
    });
    const L = inputs.lengthMm;
    return {
      reaction_left: result.sol.reactions[0],
      reaction_right: result.sol.reactions.at(-1),
      shear_at_left: result.shearAt(0),
      shear_at_mid: result.shearAt(L / 2),
      shear_at_right: result.shearAt(L),
      moment_at_quarter: result.momentAt(L / 4),
      moment_at_mid: result.momentAt(L / 2),
      moment_at_right: result.momentAt(L),
    };
  }

  if (item.id === 'VM-02') {
    const result = buildSimplySupportedMeshSolution({
      totalSpanM: inputs.spanM,
      meshElements: inputs.meshElements,
      EI: inputs.EI_N_mm2,
      pointLoads: [{ x_mm: inputs.pointLoadX_mm, P_N: inputs.pointLoad_N }],
    });
    return {
      reaction_left: result.sol.reactions[0],
      reaction_right: result.sol.reactions.at(-1),
      shear_pre_load: result.shearAt(inputs.pointLoadX_mm, 'pre'),
      shear_post_load: result.shearAt(inputs.pointLoadX_mm, 'post'),
      moment_at_mid: result.momentAt(inputs.pointLoadX_mm, 'pre'),
    };
  }

  if (item.id === 'VM-03') {
    const result = buildSimplySupportedMeshSolution({
      totalSpanM: inputs.spanM,
      meshElements: inputs.meshElements,
      EI: inputs.EI_N_mm2,
      pointLoads: [{ x_mm: inputs.pointLoadX_mm, P_N: inputs.pointLoad_N }],
    });
    return {
      reaction_left: result.sol.reactions[0],
      reaction_right: result.sol.reactions.at(-1),
      moment_at_load: result.momentAt(inputs.pointLoadX_mm, 'pre'),
      deflection_at_load: result.deflectionAt(inputs.pointLoadX_mm),
    };
  }

  if (item.id === 'VM-04') {
    const result = buildSimplySupportedMeshSolution({
      totalSpanM: inputs.spanM,
      meshElements: inputs.meshElements,
      EI: inputs.EI_N_mm2,
      qDown: inputs.qDown_N_per_mm,
    });
    const L = inputs.lengthMm;
    return {
      deflection_at_quarter: result.deflectionAt(L / 4),
      deflection_at_mid: result.deflectionAt(L / 2),
    };
  }

  if (item.id === 'VM-05') {
    const spanM = inputs.spanM;
    const qDown = inputs.qDown_N_per_mm;
    const L = inputs.lengthPerSpanMm;
    const sol = solveContinuousBeam({
      spansM: [spanM, spanM],
      qDown,
      EI: inputs.EI_N_mm2,
      GA: 1e18,
      hinges: [false, false, false],
      pointLoads: [],
      thermalMoment: 0,
      kappaShear: 1,
    });

    const xPositiveLeft = (3 * L) / 8;
    const xPositiveRight = 2 * L - xPositiveLeft;

    const momentAt = (x) => {
      const { element, xLocal } = findElementAt(sol, x);
      return element.M1 + element.V1 * xLocal - (element.qDown * xLocal * xLocal) / 2;
    };

    return {
      support_moment_internal: sol.elementForces[1].M1,
      span_positive_moment: momentAt(xPositiveLeft),
      reaction_left: sol.reactions[0],
      reaction_internal: sol.reactions[1],
      reaction_right: sol.reactions[2],
      governing_moment_location_left_mm: xPositiveLeft,
      governing_moment_location_right_mm: xPositiveRight,
    };
  }

  if (item.id === 'VM-06') {
    const spansM = [inputs.spanM, inputs.spanM];
    const qDown = [inputs.qDownLeft_N_per_mm, inputs.qDownRight_N_per_mm || 0];
    const L = inputs.lengthPerSpanMm;
    const sol = solveContinuousBeam({
      spansM,
      qDown,
      EI: inputs.EI_N_mm2,
      GA: 1e18,
      hinges: [false, false, false],
      pointLoads: [],
      thermalMoment: 0,
      kappaShear: 1,
    });

    const momentAt = (x) => {
      const { element, xLocal } = findElementAt(sol, x);
      return element.M1 + element.V1 * xLocal - (element.qDown * xLocal * xLocal) / 2;
    };

    const loadedSpanSamples = Array.from({ length: 2001 }, (_, idx) => (L * idx) / 2000);
    const unloadedSpanSamples = Array.from({ length: 2001 }, (_, idx) => L + (L * idx) / 2000);
    const loadedSpanPositiveMoment = Math.max(...loadedSpanSamples.map((x) => momentAt(x)));
    const unloadedSpanPositiveMoment = Math.max(...unloadedSpanSamples.map((x) => momentAt(x)));

    return {
      support_moment_internal: sol.elementForces[1].M1,
      loaded_span_positive_moment: loadedSpanPositiveMoment,
      unloaded_span_positive_moment: unloadedSpanPositiveMoment,
      reaction_left: sol.reactions[0],
      reaction_internal: sol.reactions[1],
      reaction_right: sol.reactions[2],
    };
  }

  if (item.id === 'VM-07') {
    const sol = solveContinuousBeam({
      spansM: [inputs.spanM, inputs.spanM],
      qDown: 0,
      EI: inputs.EI_N_mm2,
      GA: 1e18,
      hinges: [false, false, false],
      pointLoads: [{ x_mm: inputs.pointLoadX_mm, P_N: inputs.pointLoad_N }],
      thermalMoment: 0,
      kappaShear: 1,
    });

    const xMax = inputs.pointLoadX_mm;
    const loadedSpanPositiveMoment = sol.elementForces[0].M1 + sol.elementForces[0].V1 * xMax;

    return {
      support_moment_internal: sol.elementForces[1].M1,
      loaded_span_positive_moment: loadedSpanPositiveMoment,
      reaction_left: sol.reactions[0],
      reaction_internal: sol.reactions[1],
      reaction_right: sol.reactions[2],
      loaded_span_positive_moment_location_mm: xMax,
    };
  }

  if (item.id === 'VM-08') {
    const thermalHarness = solveTwoSpanThermalReducedSystem({
      spanMm: inputs.lengthPerSpanMm,
      EI: inputs.EI_N_mm2,
      GA: inputs.GA_N,
      thermalMoment: inputs.thermalMoment_N_mm,
      kappaShear: inputs.kappaShear,
    });
    const sol = solveContinuousBeam({
      spansM: [inputs.spanM, inputs.spanM],
      qDown: 0,
      EI: inputs.EI_N_mm2,
      GA: inputs.GA_N,
      hinges: [false, false, false],
      pointLoads: [],
      thermalMoment: inputs.thermalMoment_N_mm,
      kappaShear: inputs.kappaShear,
    });

    assertWithinTolerance(
      sol.elementForces[0].M2,
      thermalHarness.elementEndActions[0].M2,
      { kind: 'numeric', rel: 1e-9, abs: 1e-9 },
      'VM-08.solver_vs_harness.support_moment_internal_left',
    );
    assertWithinTolerance(
      sol.reactions[1],
      thermalHarness.reactions[1],
      { kind: 'numeric', rel: 1e-9, abs: 1e-9 },
      'VM-08.solver_vs_harness.reaction_internal',
    );

    return {
      left_outer_support_moment: sol.elementForces[0].M1,
      support_moment_internal_left: sol.elementForces[0].M2,
      support_moment_internal_right: sol.elementForces[1].M1,
      reaction_left: sol.reactions[0],
      reaction_internal: sol.reactions[1],
      reaction_right: sol.reactions[2],
    };
  }

  if (item.id === 'VM-09') {
    const section = buildSectionProperties(inputs);
    return {
      EI: section.EI,
      I_eq: section.I_eq,
      zMax: section.zMax,
      GA_inst: section.GA_inst,
      self_weight_kPa: calcSelfWeight_kPa({
        coreDensity: inputs.coreDensity,
        coreThickness_mm: inputs.coreThickness,
        skinOut_mm: inputs.skinOut,
        skinIn_mm: inputs.skinIn,
      }),
    };
  }

  if (item.id === 'VM-10') {
    const summary = runPanelAnalysis(inputs, { defaultRedistributionMode: 'elastic' }).summary;
    return {
      ratio_bending: summary.ratios.bending,
      ratio_support: summary.ratios.support,
      ratio_shear: summary.ratios.shear,
      ratio_crushing: summary.ratios.crushing,
      ratio_uplift: summary.ratios.uplift,
      ratio_deflection: summary.ratios.deflection,
      governing_case: summary.governingCases.overall.key,
      status: summary.status,
    };
  }

  throw new Error(`No executor implemented for captured case ${item.id}`);
}

test('captured validation cases have references, expected values, and executable verification', () => {
  const fixture = loadFixture();
  const capturedCases = fixture.cases.filter((item) => item.status === 'captured');

  assert.ok(capturedCases.length >= 1, 'at least one truly captured validation case is required');

  for (const item of capturedCases) {
    assert.ok(item.referenceSource?.citation, `${item.id} must include a concrete reference citation`);
    assert.ok(item.expected && typeof item.expected === 'object', `${item.id} must include expected values`);

    const actual = executeCase(item);

    for (const outputName of item.outputs) {
      assert.ok(Object.prototype.hasOwnProperty.call(item.expected, outputName), `${item.id} expected values must include ${outputName}`);
      assert.ok(Object.prototype.hasOwnProperty.call(actual, outputName), `${item.id} executor must produce ${outputName}`);
      const tol = getTolerance(item.tolerance, outputName);
      assertWithinTolerance(actual[outputName], item.expected[outputName], tol, `${item.id}.${outputName}`);
    }
  }
});
