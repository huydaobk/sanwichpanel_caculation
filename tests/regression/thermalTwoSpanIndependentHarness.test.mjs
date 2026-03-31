import test from 'node:test';
import assert from 'node:assert/strict';
import { solveContinuousBeam } from '../../src/calc/solver.js';
import { solveTwoSpanThermalReducedSystem } from '../helpers/thermalTwoSpanIndependentHarness.mjs';

function assertClose(actual, expected, { rel = 1e-9, abs = 1e-9, message }) {
  const diff = Math.abs(actual - expected);
  const limit = Math.max(abs, Math.abs(expected) * rel);
  assert.ok(diff <= limit, `${message}: expected ${expected}, got ${actual}, diff=${diff}, limit=${limit}`);
}

test('independent reduced thermal harness reproduces the equal two-span closed form and matches solver outputs', () => {
  const spanMm = 4000;
  const EI = 1.5e13;
  const GA = 1e18;
  const thermalMoment = 1000;

  const harness = solveTwoSpanThermalReducedSystem({
    spanMm,
    EI,
    GA,
    thermalMoment,
    kappaShear: 1,
  });

  const solver = solveContinuousBeam({
    spansM: [spanMm / 1000, spanMm / 1000],
    qDown: 0,
    EI,
    GA,
    hinges: [false, false, false],
    pointLoads: [],
    thermalMoment,
    kappaShear: 1,
  });

  assertClose(harness.K[0][0], harness.a, { message: 'K11 should equal a' });
  assertClose(harness.K[0][1], harness.b, { message: 'K12 should equal b' });
  assert.deepEqual(harness.F, [-thermalMoment, 0, thermalMoment], 'assembled rotational thermal load must cancel at the interior DOF');

  assertClose(harness.rotations[1], 0, { message: 'middle rotation should vanish by symmetry' });
  assertClose(harness.expectedClosedForm.interiorSupportMomentMagnitude, 1.5 * thermalMoment, { message: 'closed-form interior support moment magnitude should be 1.5 Mt' });
  const [left, right] = harness.elementEndActions;
  assertClose(left.M1, 0, { abs: 1e-6, message: 'left outer support moment should be zero' });
  assertClose(right.M2, 0, { abs: 1e-6, message: 'right outer support moment should be zero' });
  assertClose(left.M2, 1.5 * thermalMoment, { message: 'left span interior end moment should be +1.5 Mt in solver sign convention' });
  assertClose(right.M1, -1.5 * thermalMoment, { message: 'right span interior end moment should be -1.5 Mt in solver sign convention' });

  assertClose(solver.reactions[0], harness.reactions[0], { message: 'solver and independent harness must match left reaction' });
  assertClose(solver.reactions[1], harness.reactions[1], { message: 'solver and independent harness must match interior reaction' });
  assertClose(solver.reactions[2], harness.reactions[2], { message: 'solver and independent harness must match right reaction' });

  assertClose(solver.elementForces[0].M2, left.M2, { message: 'solver and independent harness must match left internal support end moment' });
  assertClose(solver.elementForces[1].M1, right.M1, { message: 'solver and independent harness must match right internal support end moment' });
});
