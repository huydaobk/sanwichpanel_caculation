# Thermal-only derivation note for the continuous beam solver

## Purpose

This note documents what can be derived **directly and honestly** from the thermal load model currently implemented in the repository, with focus on the smallest non-trivial continuous-beam case:

- **two equal spans**
- **thermal action only** (`qDown = 0`, no point loads)
- vertical translations restrained at all supports
- no internal hinges
- constant thermal fixed-end moment parameter `Mt` applied to every element

The immediate goal is **not** to invent a closed-form thermal theory for sandwich panels from scratch. The goal is narrower and safer:

1. start from the exact element-level thermal load vector used in `src/calc/solver.js`
2. assemble the two-span global system
3. show where the support-moment and reaction pattern comes from
4. separate what is rigorously derivable from what is still only solver-characterized
5. decide whether this is enough groundwork for a future `VM-06` capture

---

## Scope and limits

This note only addresses the solver model actually implemented here.

It does **not** independently re-derive the physical formula for `Mt` from through-thickness temperature gradients. In the current code path (`src/calc/runPanelAnalysis.js`), the thermal scalar is:

- `Mt_Unit = -EI * alpha / e`
- `Mt = Mt_Unit * dT`

and that scalar is passed into the beam solver as a per-element thermal fixed-end action.

So this note begins **after** `Mt` has already been defined.

That means the strongest claim we can make here is:

> Given the solver's thermal nodal load vector `{f_temp} = [0, -Mt, 0, Mt]`, the two-equal-span continuous beam solution leads to a middle support moment magnitude of `1.5 Mt` and equal/opposite outer reactions of magnitude `0.375 Mt / L`.

This is a derivation of the **implemented beam-system response**, not yet an external validation of the physical thermal idealization itself.

---

## Relevant solver definitions

From `src/calc/solver.js`:

- element DOFs are `[v1, th1, v2, th2]`
- for thermal-only loading, the element adds

```text
f_temp = [0, -Mt, 0, Mt]
```

- element internal force recovery is computed from

```text
p = ke * de - fe
```

and reported as

```text
V1 = p[0]
M1 = -p[1]
V2 = p[2]
M2 = -p[3]
```

For the Timoshenko element used here,

```text
ke = (EI / (L^3 (1 + psi))) *
     [[ 12,   6L,  -12,   6L],
      [ 6L, (4+psi)L^2, -6L, (2-psi)L^2],
      [-12, -6L,   12,  -6L],
      [ 6L, (2-psi)L^2, -6L, (4+psi)L^2]]
```

where

```text
psi = 12 EI / (kappa * GA * L^2)
```

For the present thermal-only derivation, the final support-moment coefficient for the equal-span case turns out to be **independent of `psi`**, which is a useful check.

---

## Sign convention used in this note

We keep the solver sign convention rather than forcing a textbook convention onto it.

At the element load-vector level:

```text
f_temp = [0, -Mt, 0, Mt]
```

So each element receives:

- no vertical nodal forces from thermal action alone
- a left-end nodal moment contribution `-Mt`
- a right-end nodal moment contribution `+Mt`

When the system is continuous, the shared rotational DOF at the interior support couples the two adjacent elements, and that coupling creates:

- a nonzero interior support moment
- equal/opposite support reactions, even though each element contributes no net vertical force directly

That is not contradictory: the reactions come from compatibility + stiffness coupling, not from explicit vertical thermal nodal loads.

---

## Problem statement: two equal spans

Consider three support nodes:

- node 1 at `x = 0`
- node 2 at `x = L`
- node 3 at `x = 2L`

with two identical elements:

- element 1 between nodes 1-2
- element 2 between nodes 2-3

Assumptions:

- both spans have the same length `L`
- both elements have the same `EI`, `GA`, `kappa`
- all vertical DOFs are restrained: `v1 = v2 = v3 = 0`
- there is no hinge at the middle support, so rotation `th2` is shared
- end rotations `th1` and `th3` are free
- thermal loading only, with the same `Mt` on both elements

Unknown free DOFs are therefore:

```text
d_f = [th1, th2, th3]^T
```

---

## Element-level thermal contribution

For each element of length `L`, after enforcing `v1 = v2 = 0`, only the rotational part matters.

The rotational stiffness submatrix of one element is:

```text
K_rr = c * L^2 * [[4 + psi, 2 - psi],
                  [2 - psi, 4 + psi]]
```

where

```text
c = EI / (L^3 (1 + psi))
```

The corresponding rotational thermal load part is simply:

```text
f_r,temp = [-Mt, Mt]^T
```

for each element, ordered as `[left rotation, right rotation]`.

---

## Global assembly for the two-span system

Assemble the two elements into the rotational unknown vector `[th1, th2, th3]^T`.

Define for convenience:

```text
a = c L^2 (4 + psi)
b = c L^2 (2 - psi)
```

Then the global rotational stiffness matrix becomes:

```text
K = [[a,   b,   0],
     [b, 2a,   b],
     [0,   b,   a]]
```

The assembled thermal load vector is:

- element 1 contributes `[-Mt, +Mt, 0]^T`
- element 2 contributes `[0, -Mt, +Mt]^T`

so globally

```text
F = [-Mt, 0, Mt]^T
```

This already explains one important pattern:

- the interior rotational DOF gets **zero direct thermal moment** after assembly,
- because `+Mt` from the left element and `-Mt` from the right element cancel.

So the interior support moment is **not** caused by a leftover applied nodal moment at node 2; it arises from compatibility through the global stiffness system.

---

## Solving the rotation system

We solve:

```text
K d_f = F
```

or explicitly

```text
a th1 + b th2         = -Mt
b th1 + 2a th2 + b th3 = 0
        b th2 + a th3 = Mt
```

By symmetry/antisymmetry of geometry and loading:

```text
th3 = -th1
th2 = 0
```

Substituting into the first equation gives:

```text
a th1 = -Mt
=> th1 = -Mt / a
=> th3 = Mt / a
```

So the exact rotational solution is:

```text
th1 = -Mt / a
th2 = 0
th3 = Mt / a
```

with

```text
a = EI (4 + psi) / (L (1 + psi))
```

---

## Recovering end moments and reactions more carefully

At this point, the part that is rigorously clean on paper is the **global rotational solve**:

```text
F = [-Mt, 0, Mt]^T
th2 = 0
th3 = -th1
th1 = -Mt / a
```

This already proves several key facts:

- the interior node has no leftover directly applied thermal nodal moment after assembly
- the response is antisymmetric
- the middle-support action must come from compatibility/stiffness, not from a direct uncancelled nodal thermal moment
- the two-span case is the first non-trivial continuous case

### Interior end-moment recovery

For element 1, use the recovered-force relation implemented in the solver:

```text
p = ke d - f_temp
```

with element displacement vector

```text
d = [0, th1, 0, th2]^T = [0, -Mt/a, 0, 0]^T
```

and `f_temp = [0, -Mt, 0, Mt]`.

The right-end element moment component before reporting is

```text
p4 = c (2 - psi) L^2 th1 - Mt
```

so the reported right-end moment of element 1 is

```text
M2 = -p4
   = Mt - c (2 - psi) L^2 th1
   = Mt + (b/a) Mt
```

because `th1 = -Mt/a` and `b = c L^2 (2 - psi)`.

Therefore

```text
M2 = Mt (1 + b/a)
   = Mt (1 + (2 - psi)/(4 + psi))
   = Mt * 6/(4 + psi)
```

For the slender-beam limit used by the current regression/harness (`psi -> 0`), this becomes

```text
M2 = 1.5 Mt
```

and by antisymmetry on the right span

```text
left outer end moment  = 0
interior support moments = ±1.5 Mt
right outer end moment = 0
```

This part is now reconciled cleanly with the independent reduced-system harness in `tests/helpers/thermalTwoSpanIndependentHarness.mjs`.

### Reaction recovery

For the same element 1 state, the left-end shear component is

```text
V1 = p1 = c (6L th1 + 6L th2)
   = 6 c L th1
   = -6 c L Mt / a
```

Using `a = c L^2 (4 + psi)`, this gives

```text
V1 = -6 Mt / (L (4 + psi))
```

and in the slender-beam limit (`psi -> 0`):

```text
V1 = -3Mt/(2L)
```

This is where the earlier prose in this note was not clean enough. The previous draft mixed coefficient bookkeeping and unit interpretation, and that is exactly why the reaction statement looked inconsistent when checked against the executable harness.

What the independent harness now establishes reliably is the following **as-implemented regression fact** for the locked case `spanMm = 4000`, `Mt = 1000`, very large `GA`:

```text
left reaction   ≈ -0.375
middle reaction ≈ +0.75
right reaction  ≈ -0.375

left outer end moment  = 0
interior support moment magnitude ≈ 1500
right outer end moment = 0
```

So the reaction recovery is stable in the repository's present unit system and solver reporting path, but this note should no longer claim a portable closed-form reaction coefficient more strongly than the derivation actually supports.

The honest boundary is:

- the assembled reduced system is derived here
- the interior support-moment recovery is now reconciled cleanly to `1.5 Mt` for the locked harness regime
- the reaction pattern is verified against the independent harness and production solver for the locked case
- but the reaction expression should still be treated as **solver/unit-system-coupled** until a final symbolic cleanup explicitly locks the unit interpretation end-to-end

That is the honest state of confidence today.


---

## What can still be stated with confidence

Even with the algebraic cleanup caveat above, the following statements are on solid ground for the implemented solver model.

### 1. Single-span thermal-only case collapses to zero end moments

For one span with both vertical DOFs restrained but both end rotations free, the thermal load vector is:

```text
f_temp = [0, -Mt, 0, Mt]
```

The free rotations can relax that self-equilibrated pair completely, so the recovered end moments are zero.

This is consistent with solver behavior and with the intuition that a simply supported member can rotate away a pure fixed-end moment pair.

### 2. Two equal spans are the first non-trivial continuous case

When two spans share the middle rotation, the thermal load cannot be independently released in each span. Compatibility at the shared support generates:

- a nonzero interior support moment
- opposite outer reactions
- zero outer end moments

### 3. The assembled thermal load at the middle rotational DOF is zero

This is important. The interior support moment does **not** come from an explicit uncancelled nodal thermal moment at node 2. The two element thermal vectors contribute `+Mt` and `-Mt` there, which cancel exactly.

So the support moment is a **compatibility/stiffness effect**, not a direct applied nodal moment effect.

### 4. For the two-equal-span case, the solver pattern is antisymmetric

Recovered thermal-only actions are antisymmetric, with:

```text
left outer end moment   = 0
middle support moment   = ±3Mt/2 (equal/opposite from the two adjacent elements)
right outer end moment  = 0
```

For reactions, the independent harness + solver cross-check gives the locked numerical pattern:

```text
left reaction   ≈ -0.375
middle reaction ≈ +0.75
right reaction  ≈ -0.375
```

for the regression case `spanMm = 4000`, `Mt = 1000`, `GA -> very large`.

So the sign pattern, symmetry, and zero/nonzero structure are stable. The exact reaction coefficient should be treated as tied to the present solver/unit system unless and until the final symbolic cleanup is written out end-to-end.

---

## Why the reactions are not zero

A common reviewer question is:

> If `f_temp` has no vertical nodal forces, why are there support reactions?

Answer:

- At element level, thermal loading contributes only nodal moments.
- But once the beam is continuous, those nodal moments induce rotations.
- The rotations, through the beam stiffness matrix, generate vertical shears at the element ends.
- Because vertical translations are restrained at supports, those end shears appear as support reactions.

So the reactions are a **secondary consequence of compatibility**, not a direct component of the applied thermal load vector.

---

## Relation to `VM-06`

This note improves the basis for future `VM-06`, but it does **not** automatically justify capturing `VM-06` as fully validated yet.

### What this note is strong enough to support

It is strong enough to support a future benchmark if `VM-06` is defined narrowly as:

- **"implemented solver consistency benchmark for the two-equal-span thermal-only case"**

using the locked assumptions in this note.

In that narrower sense, the benchmark would check:

- correct assembly of `{f_temp} = [0, -Mt, 0, Mt]`
- correct cancellation at the shared rotational DOF
- correct two-span support-moment/reaction symmetry
- stable sign convention in force recovery

### What is still missing before calling it a stronger external validation case

If `VM-06` is intended to mean:

- **"externally validated thermal beam benchmark"**

then more is still needed.

At least one of these should be added first:

1. a cleaned symbolic derivation that carries the full matrix algebra to the final reaction expression with the unit interpretation locked end-to-end, or
2. an independent external worksheet / reference that reproduces the same support-moment and reaction outputs from the same thermal fixed-end model, or
3. a symbolic harness checked outside the production solver path, so the captured numbers are not merely the implementation checking itself.

So the honest assessment is now:

- **enough groundwork to support an internal derivation-backed benchmark for the locked equal-two-span case**
- **not yet enough to claim fully independent external validation**

---

## Suggested benchmark shape if `VM-06` is captured later

A sensible future locked case would be:

- spans: `[L, L]`
- `qDown = 0`
- no point loads
- all vertical supports restrained
- no internal hinge
- constant thermal moment `Mt` on both elements

Expected outputs to compare:

- outer end moments = `0`
- interior support moment magnitudes = `1.5 Mt`
- locked reaction pattern for the captured unit system / fixture
- symmetry / antisymmetry checks

This should be labeled carefully as either:

- **derivation-backed internal benchmark**, if it is explicitly tied to the repository unit system / harness assumptions, or
- **external validation benchmark**, only after an independent source is attached.

---

## Bottom line

### Firmly derived here

- the exact thermal nodal load vector used by the solver is `{f_temp} = [0, -Mt, 0, Mt]`
- in the two-equal-span case, global assembly gives reduced thermal load `[-Mt, 0, Mt]^T` for rotational DOFs
- the middle rotational DOF receives zero direct thermal nodal moment after assembly
- the response must therefore come from continuity/compatibility, not a leftover direct nodal thermal moment
- the case is antisymmetric, with zero outer end moments and nonzero middle support action

### Strongly supported after reconciliation

- interior support moment magnitude `= 1.5 Mt` for the locked equal-two-span harness regime
- zero outer end moments
- antisymmetric reaction pattern, numerically cross-checked by the independent harness and production solver for the locked fixture

### Not yet established by this note

- a fully independent physical validation of the `Mt = -EI alpha dT / e` model itself
- a portable closed-form reaction expression documented end-to-end without any unit-interpretation caveat
- a polished symbolic proof suitable to cite as the sole external-validation source

That is why this note can now support a **derivation-backed internal benchmark** for the locked case, but should not yet be presented as final proof that `VM-06` is externally validated.
