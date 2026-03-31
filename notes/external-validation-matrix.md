# External Validation Matrix (C2.1)

## Purpose

This document defines a **small, practical external validation matrix** for the current sandwich panel engine.

Goal for this phase:
- identify representative cases
- specify what external reference each case should be checked against
- define target outputs and suggested tolerances
- avoid inventing benchmark numbers before a trustworthy source is attached

This is intentionally a **scaffold-first** artifact, not a fake benchmark report.

---

## Validation philosophy

The current engine mixes several layers:
- section-property reduction for sandwich panel faces/core
- Timoshenko beam response
- load case assembly (pressure / suction / thermal / point load)
- multi-span support effects and optional simplified redistribution
- resistance checks (bending, shear, support crushing, uplift, deflection)

So the external validation plan should also be layered:

1. **Closed-form beam theory** for cases where exact references are available.
2. **Hand-calculation / handbook checks** for basic sandwich section and resistance formulas.
3. **Spreadsheet or vendor-style reference sheets** for practical engineering cases that are not pure closed-form.
4. **Locked reference datasets** only after an external source is documented.

---

## Suggested tolerances

These tolerances are proposed for phase-2 execution and may be tightened after the first benchmark pass.

### A. Exact statics / internal force cases
Use when comparing simply supported closed-form beam cases.

- Reaction: **±0.5%** relative or **1e-6 absolute** for analytical harnesses
- Shear / moment extrema: **±0.5%** relative
- Governing location: **within 1% of span length**

### B. Deflection cases
Because interpolation / mesh density / shear deformation formulation can affect results:

- Closed-form Euler-Bernoulli deflection with sufficiently refined mesh: **±2%** relative
- Timoshenko / sandwich engineering reference or spreadsheet reference: **±5%** relative
- If reference itself is approximate/vendor-style: accept **±5–10%**, but source type must be marked clearly

### C. Resistance / capacity checks
- Stress / section-property-derived values: **±2%** relative
- Shear capacity / bearing / uplift from direct formulas: **±2%** relative
- Governing pass/fail outcome: **must match exactly**
- Governing mode/case label: **must match exactly**

### D. Redistribution / hinge-trigger behavior
This is not a classical closed-form target in the current app shape.

- Compare against a documented reference workflow rather than a single exact number
- Acceptance should prioritize:
  - hinge triggered / not triggered
  - support-moment reduction trend
  - no non-physical amplification

---

## Validation matrix

| ID | Case | Primary purpose | Expected reference type | Outputs to compare | Suggested tolerance | Status now |
|---|---|---|---|---|---|---|
| VM-01 | Single span, simply supported, UDL | Baseline statics and moment/shear correctness | Closed-form hand calc | reactions, Vmax, Mmax, zero end moments | 0.5% | Reference path exists in regression tests |
| VM-02 | Single span, simply supported, midspan point load | Verify point-load consistent nodal load handling | Closed-form hand calc | reactions, shear jump, Mmax at midspan | 0.5% | Reference path exists in regression tests |
| VM-03 | Single span, simply supported, eccentric point load | Verify unsymmetrical reactions and deflection convergence | Closed-form hand calc | left/right reactions, M(x_load), deflection at load | 0.5% forces; 2% deflection with refined mesh | Partial reference path exists in regression tests |
| VM-04 | Single span, simply supported, UDL deflection convergence | Separate force exactness from displacement convergence behavior | Closed-form hand calc | midspan deflection, quarter-span deflection | 2% with refined mesh | Reference path exists in regression tests |
| VM-05 | Two-span equal beam, UDL on both spans | Validate continuous-beam support moment / span moment distribution | Closed-form / structural analysis handbook / classical beam coefficients | interior support moment, positive span moment, reactions | 2% | Captured via published beam coefficients (Structural Basics) |
| VM-06 | Two-span equal beam, UDL on one span only | Validate asymmetric continuous-beam redistribution and signed reactions under one-sided loading | Closed-form / structural analysis handbook / classical beam coefficients | interior support moment, left/right span moments, reactions | 2% | Reference documented; fixture kept scaffold until span-specific UDL execution exists |
| VM-07 | Two-span equal beam, single midspan point load on one span | Validate one-sided point-load transfer, hogging support moment, and uplift reaction sign | Closed-form / structural analysis handbook / classical beam coefficients | interior support moment, peak loaded-span sagging moment, reactions | 2% | Captured via published beam coefficients (Structural Basics) |
| VM-08 | Thermal-only single/multi-span case | Validate thermal fixed-end action assembly and sign convention | Hand calc from implemented thermal moment model | support moments / end actions, sign, symmetry | 2% | Captured as internal derivation/harness benchmark |
| VM-09 | Sandwich section property sanity case | Validate section-property builder independent of global solver | Internal derivation worksheet from repository equations | EI, I_eq, zMax, GA_inst, self-weight | near-exact deterministic check | Captured via repository derivation |
| VM-10 | Resistance bookkeeping case (shear/crushing/uplift/deflection governor) | Validate capacity ratios and governing-case selection | Internal reporting ledger from fixed repository config | ratio set, governing case, pass/fail, required support width / uplift ratio | exact governing mode; tight ratio tolerance | Captured as internal bookkeeping ledger |
| VM-11 | Redistribution trigger case on heavy 2-span load | Validate simplified redistribution workflow qualitatively | Vendor-style / nonlinear worksheet / documented engineering workflow | hinge triggered, support moment reduced vs elastic, overall governing case | qualitative + trend-based | Existing internal regression only |

---

## Case details

### VM-01 — Single span simply supported under UDL
**Purpose**
- Smallest trustworthy benchmark for statics.
- Confirms load vector assembly, reactions, shear diagram, moment diagram.

**Reference type**
- Closed-form hand calculation.

**Compare outputs**
- left reaction = qL/2
- right reaction = qL/2
- V(0), V(L/2), V(L)
- M(L/4) = 3qL^2/32
- M(L/2) = qL^2/8
- M(0) = M(L) = 0

**Tolerance**
- 0.5% for all force results.

**Current status**
- Already anchored in `tests/regression/solverAnalyticalBenchmarks.test.mjs`.
- Deflection in 1-element form is intentionally treated as a solver-regression reference, not external truth.

### VM-02 — Single span simply supported with midspan point load
**Purpose**
- Validate point load treatment and shear discontinuity.

**Reference type**
- Closed-form hand calculation.

**Compare outputs**
- reactions = P/2 and P/2
- shear jump across load point
- M(mid) = PL/4
- zero end moments

**Tolerance**
- 0.5% for force results.

**Current status**
- Already anchored in `tests/regression/solverAnalyticalBenchmarks.test.mjs`.

### VM-03 — Single span simply supported with eccentric point load
**Purpose**
- Validate non-symmetric statics and displacement convergence.

**Reference type**
- Closed-form hand calculation.

**Compare outputs**
- left/right reactions = Pb/L and Pa/L
- moment at load point
- deflection at load point (using refined mesh benchmark)

**Tolerance**
- 0.5% for reactions/moment
- 2% for deflection with refined mesh

**Current status**
- Regression test already checks monotonic convergence trend.
- Good candidate for first fully captured external benchmark dataset.

### VM-04 — UDL deflection convergence benchmark
**Purpose**
- Verify displacement response against closed-form deflection once mesh is sufficient.
- Treat this honestly as a **convergence / internal validation benchmark**: coarse-mesh displacement is not claimed to be exact, while refined-mesh displacement is compared against closed-form Euler-Bernoulli values.

**Reference type**
- Closed-form Euler-Bernoulli beam deflection.
- For simply supported UDL: `w(L/2) = 5qL^4 / 384EI`, `w(L/4) = 57qL^4 / 6144EI`.

**Compare outputs**
- deflection at L/2
- deflection at L/4
- convergence monotonicity across meshes

**Tolerance**
- 2% on deflection against the closed-form values.
- Executable captured fixture uses **4 elements** because existing regression already shows:
  - 2 elements are sufficient for midspan deflection to match closed form to numerical precision
  - 4 elements are sufficient for quarter-span deflection to match closed form to numerical precision

**Current status**
- Captured as a truthful refined-mesh executable benchmark.
- Monotonic convergence behavior remains covered by dedicated regression.

### VM-05 — Two-span equal continuous beam under equal UDL
**Purpose**
- Validate interior support behavior, which is central to the app’s real use.

**Reference type**
- Closed-form / beam-coefficient handbook / classical structural analysis text.

**Compare outputs**
- negative support moment at middle support
- positive span moment(s)
- support reactions
- governing moment location(s)

**Tolerance**
- 2%

**Notes**
- Captured reference source: Structural Basics, *2 Span Continuous Beam – Moment and shear force formulas due to different loads*, UDL on two equal spans.
- Coefficients used for benchmark: interior support moment = `-qL^2/8`, positive span moment = `9qL^2/128`, outer reactions = `3qL/8`, interior reaction = `5qL/4`.
- Executable benchmark input locked at `L = 4000 mm` per span and `q = 3 N/mm`, giving:
  - interior support moment = `-6,000,000 N·mm`
  - positive span moment = `3,375,000 N·mm`
  - reactions = `4,500 / 15,000 / 4,500 N`
  - positive-moment locations = `3L/8 = 1500 mm` from each outer support (global x = `1500 mm` and `6500 mm`)

### VM-06 — Two-span equal continuous beam under UDL on one span only
**Purpose**
- Add asymmetry breadth beyond the existing fully loaded two-span case.
- Validate one-sided continuous-beam force redistribution, including a small uplift reaction at the unloaded outer support.

**Reference type**
- Closed-form / beam-coefficient handbook / classical structural analysis text.

**Compare outputs**
- negative support moment at middle support
- positive span moment in the loaded span
- positive span moment in the unloaded span
- support reactions including negative reaction at unloaded outer support

**Tolerance**
- 0.5% on moment/reaction outputs once executable.

**Notes**
- Reference source identified: Structural Basics, *2 Span Continuous Beam – Moment and shear force formulas due to different loads*, case *Uniformly distributed line load (UDL) on one span – 2 Span continuous beam – formulas*.
- Coefficients listed there are suitable for future capture: support moment `-qL^2/16`, loaded-span positive moment `49qL^2/512`, reactions `R_a = 7qL/16`, `R_b = 5qL/8`, `R_c = -qL/16`.
- However, the current solver execution path only accepts a single scalar `qDown` applied uniformly to every span; it does **not** yet support span-specific UDL assignment in the captured executor path.
- Therefore this case is intentionally left **documented but not captured** in fixtures/tests for now, to avoid fake benchmark execution.
- Recommended next step if this breadth is desired later: add a narrow span-specific distributed-load executor path first, then promote VM-06 from scaffold to captured.

### VM-07 — Two-span equal continuous beam with one midspan point load on the left span
**Purpose**
- Add discrete one-sided loading breadth beyond UDL-only benchmarks.
- Validate hogging support moment transfer and reaction sign pattern under a concentrated load on only one span.

**Reference type**
- Closed-form / beam-coefficient handbook / classical structural analysis text.

**Compare outputs**
- negative support moment at middle support
- maximum positive moment in the loaded span
- support reactions including uplift at the far outer support

**Tolerance**
- 0.5% on moment/reaction outputs.

**Notes**
- Captured reference source: Structural Basics, *2 Span Continuous Beam – Moment and shear force formulas due to different loads*, case *Point load at midspan – 2 Span continuous beam – formulas*.
- Coefficients used for benchmark: support moment `-3QL/32`, loaded-span positive moment `13QL/64`, reactions `R_a = -3Q/32`, `R_b = 11Q/16`, `R_c = 13Q/32`.
- Because the page labels supports from the loaded side opposite to the repository's left-to-right fixture, the executable fixture mirrors the formulas onto a left-span load while preserving the same physical magnitudes; therefore the far outer reaction is negative in the repository's coordinate order.
- Executable benchmark input locked at `L = 4000 mm` per span and `Q = 12000 N` applied at the left-span midspan (`x = 2000 mm`), giving:
  - interior support moment = `-4,500,000 N·mm`
  - loaded-span positive moment = `9,750,000 N·mm`
  - reactions = `4,875 / 8,250 / -1,125 N`
  - positive-moment location in loaded span = `2000 mm`

### VM-08 — Thermal-only equal two-span internal capture
**Purpose**
- Check thermal fixed-end action sign convention and superposition behavior.
- Lock one honest benchmark shape for the repository thermal model: equal two spans, thermal-only, all vertical supports restrained.

**Reference type**
- Internal derivation-backed / independent-harness-backed repository benchmark.

**Compare outputs**
- outer support moment = `0`
- interior support moment pair = `+1.5 Mt` / `-1.5 Mt` in solver sign convention
- equal/opposite outer reactions and doubled interior reaction
- sign convention and equal-two-span symmetry

**Tolerance**
- Near-exact executable capture for the locked fixture (tight relative tolerance with absolute override for zero moment).

**Notes**
- This is important because thermal loads are easy to sign-flip accidentally.
- Current capture basis is now stronger than a mere placeholder:
  - `notes/thermal-two-span-derivation.md` narrows the acceptable claim to a **derivation-backed internal benchmark**.
  - `notes/thermal-two-span-independent-harness.md` shows the independent reduced-system executable check aligns with the production solver on the locked equal-two-span case.
  - `tests/helpers/thermalTwoSpanIndependentHarness.mjs` provides the executable reduced-system harness used to lock the benchmark numbers.
- Therefore `VM-08` is now acceptable as **captured for internal benchmark purposes only**.
- It must **not** be described as an external validation benchmark until an outside worksheet / published reference is attached.
- Locked executable fixture used for capture:
  - `L = 4000 mm` per span
  - `EI = 1.5e13 N·mm²`
  - `GA = 1e18 N`
  - `kappaShear = 1`
  - `thermalMoment = 1000 N·mm` on both spans
  - `qDown = 0`, no point loads, no hinges
- Locked expected outputs for this internal capture:
  - left outer support moment = `0`
  - interior support moments = `+1500 / -1500 N·mm`
  - reactions = `-0.375 / +0.75 / -0.375 N`
- This is intentionally labeled **internal-captured**, not external-captured.

### VM-09 — Sandwich section property sanity case
**Purpose**
- Decouple section-property validation from global solver validation.

**Reference type**
- Internal derivation worksheet from repository equations.

**Compare outputs**
- `EI`
- `I_eq`
- `zMax`
- `GA_inst`
- self-weight (`calcSelfWeight_kPa`)

**Tolerance**
- Near-exact deterministic check (tight relative tolerance is acceptable because no meshing/iteration is involved).

**Notes**
- Captured honestly as an **internal sanity benchmark**, not an external code-standard benchmark.
- Source basis is the implemented derivation in `src/calc/section.js` (`buildSectionProperties`, `calcSelfWeight_kPa`).
- Locked worksheet used in fixture:
  - `panelWidth = 1000 mm`
  - `coreThickness = 80 mm`
  - `skinOut = 0.5 mm`
  - `skinIn = 0.4 mm`
  - `coreShearModulus = 3.2 N/mm²`
  - `compressiveModulus = 4.5 N/mm²`
  - `coreDensity = 42 kg/m³`
  - `wrinklingMode = yield-only`

### VM-10 — Capacity / governing-case bookkeeping case
**Purpose**
- Validate engineering reporting layer, not only raw solver response.

**Reference type**
- Internal reporting ledger from a fixed repository configuration.

**Compare outputs**
- bending ratio
- support ratio
- shear ratio
- crushing ratio
- uplift ratio
- deflection ratio
- governing case label
- final pass/fail status

**Tolerance**
- ratios: tight relative tolerance because the case is a locked repository ledger
- governing mode + pass/fail: exact

**Notes**
- Captured honestly as an **internal bookkeeping benchmark**, not an external vendor sheet or code-standard benchmark.
- Source basis is the full repository execution path in `src/calc/runPanelAnalysis.js`, `src/calc/checks.js`, and `src/calc/reporting.js`.
- Locked fixture is chosen so the governing result is unambiguous (`crushing` governs overall):
  - external panel
  - spans `[3, 3] m`
  - `supportWidths = [20, 20, 20] mm`
  - `screwStrength = 20 kN`
  - `deflectionLimit = L/1000`
  - no point loads
  - declared wrinkling stress `120 MPa`
- This case is useful because user trust often breaks first in the reporting/governing layer, even when solver internals are fine.

### VM-11 — Redistribution trigger case
**Purpose**
- Validate the app’s optional simplified redistribution mode without pretending it is a textbook exact solution.

**Reference type**
- Vendor-style workflow / documented engineering worksheet / internal method note.

**Compare outputs**
- whether hinge trigger occurs
- support moment decreases versus elastic run
- no non-physical instability
- governing case summary remains coherent

**Tolerance**
- qualitative/trend acceptance, not fake exact-number acceptance

**Notes**
- Keep this separate from strict external benchmarks.

---

## What is already captured now

The repository already contains some trustworthy external / semi-external analytical anchors in:
- `tests/regression/solverAnalyticalBenchmarks.test.mjs`

Specifically available now:
- simply supported single span + UDL
  - exact reactions
  - exact shear at key points
  - exact moment at key points
- simply supported single span + midspan point load
  - exact reactions
  - exact shear jump
  - exact moment at key point
- convergence patterns for
  - UDL deflection
  - eccentric point load deflection

Important caveat:
- the single-element deflection values currently stored in some tests are **solver regression references**, not external analytical truth.
- they must not be labeled as external validation results.

---

## Recommended artifact usage for next phase

1. Pick **VM-01, VM-02, VM-03, VM-05, VM-06, VM-07** as the first execution batch.
2. For each selected case, attach one explicit source:
   - formula note
   - textbook page
   - spreadsheet
   - vendor sheet
3. Record source metadata and expected numbers in `tests/fixtures/external-validation-cases.json`.
4. Add execution tests that only run populated cases with `status: "ready"`.
5. Keep placeholder cases as `status: "scaffold"` so the suite never fails due to missing references.

---

## Acceptance rule for future contributors

Do **not** add benchmark numbers unless one of these is present:
- a derivation in the repository,
- a cited handbook/textbook source,
- a checked spreadsheet fixture,
- or a vendor/reference document stored or linked in project notes.

If no trustworthy source is attached, keep the case in scaffold state.
