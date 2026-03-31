export function solveTwoSpanThermalReducedSystem({
  spanMm,
  EI,
  GA,
  thermalMoment,
  kappaShear = 1,
}) {
  const L = Number(spanMm);
  const EIval = Number(EI);
  const GAval = Math.max(Number(GA), 1e-9);
  const Mt = Number(thermalMoment);
  const kappa = Number(kappaShear) || 1;

  if (!(L > 0)) throw new Error('spanMm must be > 0');
  if (!(EIval > 0)) throw new Error('EI must be > 0');
  if (!Number.isFinite(Mt)) throw new Error('thermalMoment must be finite');

  const psi = (12 * EIval) / (kappa * GAval * L * L);
  const c = EIval / (L ** 3 * (1 + psi));
  const a = c * L * L * (4 + psi);
  const b = c * L * L * (2 - psi);

  const K = [
    [a, b, 0],
    [b, 2 * a, b],
    [0, b, a],
  ];
  const F = [-Mt, 0, Mt];

  // By symmetry / antisymmetry of equal-span thermal-only loading.
  const theta2 = 0;
  const theta1 = -Mt / a;
  const theta3 = Mt / a;
  const rotations = [theta1, theta2, theta3];

  const left = recoverElementEndActions({
    L,
    EI: EIval,
    GA: GAval,
    kappaShear: kappa,
    rotations: [theta1, theta2],
    thermalMoment: Mt,
  });
  const right = recoverElementEndActions({
    L,
    EI: EIval,
    GA: GAval,
    kappaShear: kappa,
    rotations: [theta2, theta3],
    thermalMoment: Mt,
  });

  return {
    psi,
    a,
    b,
    K,
    F,
    rotations,
    reactions: [left.V1, left.V2 + right.V1, right.V2],
    elementEndActions: [left, right],
    expectedClosedForm: {
      theta1,
      theta2,
      theta3,
      interiorSupportMomentMagnitude: 1.5 * Mt,
      outerReactionMagnitude: 0.375 * Mt / L,
      interiorReactionMagnitude: 0.75 * Mt / L,
    },
  };
}

function recoverElementEndActions({ L, EI, GA, kappaShear, rotations, thermalMoment }) {
  const psi = (12 * EI) / (kappaShear * GA * L * L);
  const fac = EI / (L ** 3 * (1 + psi));
  const L2 = L * L;
  const ke = [
    [fac * 12, fac * (6 * L), fac * (-12), fac * (6 * L)],
    [fac * (6 * L), fac * ((4 + psi) * L2), fac * (-6 * L), fac * ((2 - psi) * L2)],
    [fac * (-12), fac * (-6 * L), fac * 12, fac * (-6 * L)],
    [fac * (6 * L), fac * ((2 - psi) * L2), fac * (-6 * L), fac * ((4 + psi) * L2)],
  ];
  const d = [0, rotations[0], 0, rotations[1]];
  const feTemp = [0, -thermalMoment, 0, thermalMoment];
  const p = ke.map((row) => row.reduce((sum, value, idx) => sum + value * d[idx], 0)).map((value, idx) => value - feTemp[idx]);
  return {
    V1: p[0],
    M1: -p[1],
    V2: p[2],
    M2: -p[3],
  };
}
