# Validation Status Report — Current Repository State

> Scope: current validation status of the repository **as it exists now**, based only on artifacts already present in the repo.
> 
> This report is intentionally conservative. It separates **external-captured**, **internal-captured**, and **scaffold** cases to avoid overstating confidence.

## Executive summary

The repository now has a **real validation structure**, not just ad-hoc tests:

- there is a documented validation matrix in `notes/external-validation-matrix.md`
- there is an executable captured fixture in `tests/fixtures/external-validation-cases.json`
- there are regression tests that verify both analytical solver behavior and reporting/governing behavior
- there is a narrower but honest thermal benchmark path supported by an independent reduced-system harness

That said, the repo is **not yet fully externally validated as a whole product**.
Current state is better described as:

- **solver core:** partially externally captured for a few canonical beam cases, with good internal regression depth
- **thermal behavior:** internally captured for one locked two-span thermal fixture, but **not** yet externally validated
- **capacity / reporting:** internally captured and regression-covered, useful for trust-building, but still input-/model-dependent rather than externally benchmarked to a vendor/code sheet
- **redistribution workflow:** regression-covered qualitatively, still scaffold/engineering-method territory rather than strict benchmark territory

## 1) Validation inventory by case class

### A. External-captured

These are the strongest cases currently in the repo because they are tied to closed-form or published reference formulas and are executable through captured fixtures/tests.

1. **VM-01 — Single span simply supported under UDL**
   - Source path:
     - `notes/external-validation-matrix.md`
     - `tests/fixtures/external-validation-cases.json`
     - `tests/regression/solverAnalyticalBenchmarks.test.mjs`
     - `tests/regression/externalValidationCaptured.test.mjs`
   - What is locked:
     - reactions
     - shear at key points
     - moment at quarter span / midspan / support
   - Confidence note:
     - strong for statics/internal-force correctness on this canonical case

2. **VM-02 — Single span simply supported with midspan point load**
   - Source path:
     - same artifact chain as VM-01
   - What is locked:
     - reactions
     - shear jump across point load
     - midspan moment
   - Confidence note:
     - strong for point-load assembly and shear discontinuity handling

3. **VM-03 — Single span simply supported with eccentric point load**
   - Source path:
     - fixture + analytical benchmark regression
   - What is locked:
     - unsymmetrical reactions
     - moment at load point
     - deflection at load point using refined mesh
   - Confidence note:
     - good benchmark because it checks both statics and convergence behavior under asymmetry

4. **VM-05 — Two-span equal continuous beam under equal UDL**
   - Source path:
     - `notes/external-validation-matrix.md`
     - `tests/fixtures/external-validation-cases.json`
     - `tests/regression/externalValidationCaptured.test.mjs`
   - Reference basis:
     - Structural Basics continuous-beam coefficients
   - What is locked:
     - interior support moment
     - positive span moment
     - outer/interior reactions
     - positive-moment locations
   - Confidence note:
     - this is the most relevant externally captured continuous-beam check currently in the repo

### B. Internal-captured

These cases are honest and useful, but they are **not external validation**. They are internal derivation-backed, harness-backed, or repository-ledger-backed captures.

1. **VM-06 — Thermal-only equal two-span internal capture**
   - Source path:
     - `notes/thermal-two-span-derivation.md`
     - `notes/thermal-two-span-independent-harness.md`
     - `tests/helpers/thermalTwoSpanIndependentHarness.mjs`
     - `tests/regression/thermalTwoSpanIndependentHarness.test.mjs`
     - `tests/fixtures/external-validation-cases.json`
   - What is locked:
     - zero outer end moments
     - interior support moments `±1.5 Mt`
     - antisymmetric reaction pattern for the locked fixture
   - Important honesty boundary:
     - the repo itself says this should be treated as **internal-captured**, not external-captured
     - reaction pattern is stable for the locked fixture, but the note explicitly avoids overclaiming a portable closed-form coefficient until symbolic/unit cleanup is fully settled

2. **VM-07 — Sandwich section property sanity case**
   - Source path:
     - `src/calc/section.js`
     - fixture case in `tests/fixtures/external-validation-cases.json`
   - What is locked:
     - `EI`, `I_eq`, `zMax`, `GA_inst`, `self_weight_kPa`
   - Confidence note:
     - strong as an internal deterministic worksheet check
     - not evidence of compliance to an outside sandwich-panel standard by itself

3. **VM-08 — Capacity / governing-case bookkeeping case**
   - Source path:
     - `src/calc/runPanelAnalysis.js`
     - `src/calc/checks.js`
     - `src/calc/reporting.js`
     - fixture case in `tests/fixtures/external-validation-cases.json`
     - `tests/regression/panelRegression.test.mjs`
     - `tests/regression/externalValidationCaptured.test.mjs`
   - What is locked:
     - ratios for bending / support / shear / crushing / uplift / deflection
     - governing case label
     - pass/fail status
   - Confidence note:
     - strong for internal bookkeeping consistency of the reporting layer
     - still dependent on the repo's own formulas/inputs, so not an external benchmark

4. **VM-04 — UDL deflection convergence benchmark**
   - Classification note:
     - this one sits on the border. The fixture labels it `captured`, but the note is careful that coarse-mesh displacement is **not** external truth.
   - Honest interpretation used in this report:
     - treat VM-04 primarily as a **refined-mesh convergence-backed benchmark**, useful and executable, but not the same strength as exact-force closed-form captures such as VM-01/VM-02.
   - Why this matters:
     - it is trustworthy as a statement about convergence behavior under the current solver formulation
     - it should not be used to claim that all displacement outputs are externally validated at arbitrary mesh choices

### C. Scaffold

1. **VM-09 — Redistribution trigger case**
   - Current status:
     - intentionally scaffold / qualitative
   - Covered by:
     - `tests/regression/panelRegression.test.mjs` qualitative regression that simplified redistribution triggers hinge(s) and reduces support moment vs elastic
   - What is not yet present:
     - no authoritative external worksheet / nonlinear benchmark / vendor sheet is attached
   - Honest interpretation:
     - workflow/regression covered, not numerically benchmarked in a strict external-validation sense

## 2) Summary of existing benchmark / check coverage

## Solver analytical benchmarks

The repo contains meaningful solver-level regression coverage in `tests/regression/solverAnalyticalBenchmarks.test.mjs`:

- exact simply supported UDL reactions / shear / moments
- exact simply supported midspan point-load reactions / shear jump / moments
- convergence benchmark for UDL deflection with mesh refinement
- convergence benchmark for eccentric point-load deflection with mesh refinement
- regression for point load at an internal mesh node to ensure it stays single-counted and stable across mesh densities
- sanity check for two equal spans under UDL symmetry/static balance

This is a strong sign that the author moved beyond “it runs” toward “key response quantities are regression-locked”.

## Captured fixture execution

`tests/regression/externalValidationCaptured.test.mjs` enforces that each `captured` case:

- has a citation
- has expected outputs
- has an executor implementation
- meets output tolerances

This is important because it turns the validation matrix from documentation into an executable contract.

## Scaffold discipline

`tests/regression/externalValidationScaffold.test.mjs` prevents scaffold cases from pretending they already have benchmark numbers.

That is a surprisingly valuable trust signal: the repo is explicitly trying **not** to fake validation completeness.

## Reporting / governing regression coverage

`tests/regression/panelRegression.test.mjs` covers more than raw solver outputs. It checks:

- redistribution simplified vs elastic behavior
- presence and consistency of governing cases for moment / shear / crushing / deflection / overall
- technical transparency taxonomy for surfaced checks
- support crushing consistency
- uplift consistency
- deflection consistency
- wrinkling fallback / declared-input behavior

This gives meaningful confidence in the **reporting and decision layer**, which is often where engineering tools fail silently.

## 3) Real bug(s) found and patched in the current repo history/artifacts

From the current artifacts, the clearest real bug/fix evidence is:

1. **Point load at an internal mesh node double-count / stability risk was explicitly addressed**
   - Evidence:
     - `tests/regression/solverAnalyticalBenchmarks.test.mjs`
     - test name: `regression + stability benchmark: point load applied at an internal mesh node stays single-counted and stable across mesh densities`
   - Why this counts as a real bug class:
     - the test exists specifically to guard against the common FEM assembly error where a nodal point load is applied twice or handled inconsistently when aligned with a mesh node
   - What the test now protects:
     - reaction balance
     - shear jump correctness
     - moment continuity at the node
     - deflection staying on the closed-form target after the fix

2. **Thermal derivation/reporting claim was narrowed after a discrepancy was found**
   - Evidence:
     - `notes/thermal-two-span-independent-harness.md`
     - it explicitly states the reaction coefficient in the earlier prose note did not align cleanly with the executable check, and the claim was narrowed
   - Why this matters:
     - even if the underlying solver behavior may not have been “buggy” in production terms, there was a real mismatch between prose derivation claim and executable result
     - the repo now documents that mismatch honestly and downgrades the claim instead of hiding it
   - Practical value:
     - this is a validation-process fix, not just a code fix

3. **Reporting/governing consistency issues appear to have been actively hardened**
   - Evidence:
     - targeted regression tests for crushing, uplift, deflection, governing-case labels, taxonomy consistency, wrinkling fallback
   - Honest phrasing:
     - from the visible artifacts alone, I can say these areas were treated as bug-prone and now have explicit regression protection
     - I should **not** invent exact historical bug narratives beyond what the tests and notes prove

## 4) Current confidence by layer

Below is a practical confidence assessment for current usage, not a certification statement.

### A. Solver layer — **moderate to high confidence for canonical beam response; moderate overall**

Why:
- exact closed-form checks exist for core single-span statics cases
- continuous two-span UDL benchmark exists with published coefficients
- asymmetric point-load convergence is covered
- nodal point-load stability regression exists

Why not “very high” yet:
- external captures are still limited in breadth
- no broad benchmark family across varied span ratios / support conditions / mixed loads
- redistribution remains outside strict exact-validation territory
- thermal is not externally validated

Practical reading:
- trustworthy for core beam-response mechanics in the covered envelope
- not yet enough evidence to claim universal solver correctness across all engineering scenarios the UI might let users enter

### B. Thermal layer — **low to moderate confidence externally; moderate confidence internally for the locked fixture**

Why:
- there is a derivation note and an independent reduced-system harness
- the equal two-span thermal-only fixture is well framed and executable
- sign convention / symmetry / support-moment pattern are meaningfully checked

Why confidence stays limited:
- the repo explicitly says this is internal-captured, not external-captured
- reaction expression remains solver/unit-system-coupled for now
- no external worksheet / published thermal benchmark is attached

Practical reading:
- usable as an internal solver-consistency check
- not enough to market thermal predictions as externally validated engineering truth

### C. Capacity layer — **moderate confidence for bookkeeping consistency; moderate-low for absolute engineering authority**

Why:
- deterministic internal cases exist for section properties and governing ratios
- crushing / uplift / deflection / sigma-limit / reporting taxonomy have regression coverage
- governing overall result appears intentionally locked and surfaced

Why confidence stays bounded:
- these checks rely on model assumptions and declared inputs
- they are not yet benchmarked against external datasheets/vendor handbooks/codes in the current artifact set
- some reliability is explicitly input-dependent inside the taxonomy

Practical reading:
- solid for internal consistency and repeatability
- not yet enough to claim externally validated capacity design across product families

### D. Reporting layer — **moderate to high confidence for internal consistency**

Why:
- the repo has unusually explicit tests for governing-case presence, labels, taxonomy, ratio consistency, and advice behavior
- this is a strong sign that reporting is treated as a first-class output, not an afterthought

Limits:
- reporting correctness is only as strong as upstream solver/check formulas and input assumptions
- no evidence yet of external report reconciliation against a trusted third-party calculation sheet

Practical reading:
- likely reliable in surfacing what the current engine computed
- should still be read as “engine report” rather than “independently verified design certificate”

## 5) Usage limits and anti-overclaim warnings

This section matters as much as the benchmark list.

1. **Do not say the whole app is externally validated.**
   - Only a subset of cases are truly external-captured today.

2. **Do not present VM-06 thermal results as external validation.**
   - Current repo artifacts explicitly contradict that stronger claim.

3. **Do not treat coarse-mesh single-element deflection references as analytical truth.**
   - The solver benchmark file itself says those are formulation/regression references.

4. **Do not confuse internal consistency with external engineering authority.**
   - VM-07 and VM-08 are useful and valuable, but they are still repository-backed internal captures.

5. **Do not overclaim redistribution accuracy.**
   - Current evidence supports qualitative/regression confidence, not strict benchmark equivalence to a higher-fidelity nonlinear reference.

6. **Input-dependent capacity checks remain input-dependent.**
   - Support crushing, uplift, wrinkling-related checks, and similar outputs inherit uncertainty from supplied material and fastening assumptions.

## 6) Suggested next steps

Priority order below is based on validation value, not implementation convenience.

### Priority 1 — expand true external captures around the solver

Best immediate additions:
- more continuous-beam handbook cases beyond equal two-span UDL
- unequal spans / unequal loading patterns
- one or two support-condition variants

Why:
- this grows the strongest evidence class fastest
- it directly increases confidence in the solver core

### Priority 2 — finish the thermal claim boundary cleanly

Do one of these, explicitly:
- either keep VM-06 permanently labeled as **internal benchmark** and document that boundary clearly in owner-facing materials
- or attach an outside worksheet/published reference and upgrade it properly

Why:
- thermal is the easiest place to overclaim accidentally
- the repo already did the hard honesty work; finish the classification cleanly

### Priority 3 — add at least one external capacity/reporting reconciliation case

Example targets:
- one vendor-style sheet
- one handbook-style sandwich panel check
- one archived engineering spreadsheet with fixed inputs/outputs

Why:
- current reporting layer looks internally disciplined, but owner trust will increase materially once one end-to-end external reconciliation exists

### Priority 4 — formalize a public-facing validation statement

Create a short repo-facing note that says plainly:
- what is externally captured
- what is internally captured
- what is scaffold only
- what users should and should not rely on yet

Why:
- avoids accidental overclaim in README/demo/sales conversations
- reduces future confusion for contributors and reviewers

## Bottom line

Current repo status is **promising and substantially more credible than a typical calculation prototype**, because it now has:

- a documented validation matrix
- executable captured fixtures
- solver analytical regressions
- independent thermal cross-checking
- reporting/governing consistency regressions

But the repo is **not yet at the stage where the entire calculation stack should be described as externally validated**.

The most honest current framing is:

- **Externally captured:** several canonical solver benchmarks (especially core statics and one important two-span continuous-beam case)
- **Internally captured:** thermal locked fixture, section-property worksheet, capacity/reporting ledger
- **Scaffold / qualitative only:** redistribution benchmark path and any uncited future cases

That framing is technically defensible, useful to the owner, and aligned with the artifacts actually present in the repository.
