# Implementation Backlog — Phase A

> Purpose: turn the current roadmap/validation state into a buildable backlog for the next implementation phase.
>
> This backlog is intentionally grounded in the repository as it exists now:
> - solver core already has meaningful regression coverage in `tests/regression/solverAnalyticalBenchmarks.test.mjs`
> - captured/scaffold validation flow already exists via `tests/fixtures/external-validation-cases.json` and `tests/regression/externalValidation*.test.mjs`
> - thermal benchmark is only **internal-captured**, not externally validated yet
> - reporting/governing logic already has regression protection in `tests/regression/panelRegression.test.mjs`
> - app shell/UI in `src/App.jsx` is still thin compared with the calculation/validation layer
>
> Therefore the next build phase should not start with random UI polish. It should first harden product trust, then expose the engine through a cleaner workflow.

---

## Backlog structure

- **Milestone v1.0 — Trustable calculation core**
  - finish the highest-value validation and output-contract work before claiming broader readiness
- **Milestone v1.1 — Usable engineering workflow in the app**
  - turn current engine capabilities into a usable input/run/result flow
- **Milestone v1.2 — Packaging, auditability, and release readiness**
  - make the tool easier to ship, support, and explain honestly

Priority scale:
- **P0** = next build item / blocks safe progress
- **P1** = important for the same milestone
- **P2** = useful follow-up, not first move

---

## Milestone v1.0 — Trustable calculation core

### TKT-01 — Expand external solver benchmark set beyond the current canonical cases
- **Priority / phase:** P0 / v1.0
- **Goal**
  - Increase confidence in `src/calc/solver.js` by adding a few more genuinely external-captured continuous-beam and asymmetric benchmark cases, not just the current small canonical set.
- **Scope**
  - Extend `notes/external-validation-matrix.md` with the next concrete reference cases to execute.
  - Add new ready/captured fixtures in `tests/fixtures/external-validation-cases.json`.
  - Implement executor coverage in `tests/regression/externalValidationCaptured.test.mjs` if a new case shape needs it.
  - Prefer cases that expand the current evidence class: unequal spans, unequal UDL pattern, or another continuous-beam handbook case.
- **Definition of done**
  - At least 2 new external-captured solver cases are added with explicit source basis and expected numbers.
  - Each new case runs in regression without being mislabeled as scaffold/internal.
  - The new cases clearly increase coverage beyond VM-01/02/03/05 rather than duplicating them.
- **Test / check wanted**
  - `npm test` passes.
  - New case outputs meet stated tolerances.
  - Fixture metadata includes source/citation and status classification.
- **Risks / notes**
  - Main failure mode is fake validation: adding numbers without a clean source trail.
  - Avoid broad claims like “externally validated” until the matrix breadth is meaningfully larger.

### TKT-02 — Cleanly lock the thermal validation boundary in code, fixture metadata, and repo docs
- **Priority / phase:** P0 / v1.0
- **Goal**
  - Prevent accidental overclaim around thermal behavior by making the internal-benchmark classification explicit everywhere the repo surfaces validation status.
- **Scope**
  - Audit thermal references across `notes/validation-status-report.md`, `notes/external-validation-matrix.md`, fixtures, and tests.
  - Ensure VM-06 or equivalent thermal entries are marked consistently as internal-captured.
  - Add/adjust validation metadata fields if needed so tests distinguish external-captured vs internal-captured more explicitly.
- **Definition of done**
  - There is no place in the repo that reads as if thermal is externally validated when the source is only internal derivation/harness.
  - Classification is machine-readable enough that future contributors are less likely to blur the boundary.
  - Regression/tests still pass after any metadata tightening.
- **Test / check wanted**
  - Search check across repo for thermal validation wording.
  - `npm test` passes.
  - Manual review confirms wording in notes and fixtures is consistent.
- **Risks / notes**
  - This is partly documentation/process work, but it protects product trust directly.
  - Good candidate to include a tiny guard test if classification fields become richer.

### TKT-03 — Add one end-to-end external reconciliation case for capacity/reporting
- **Priority / phase:** P1 / v1.0
- **Goal**
  - Move `runPanelAnalysis` + reporting from “internally consistent” toward “externally reconcilable” with at least one fixed engineering worksheet/vendor-style sheet.
- **Scope**
  - Choose one realistic fixed panel scenario where an outside reference sheet exists.
  - Capture inputs and expected outputs for key reporting quantities: governing mode, pass/fail, main utilization ratios, maybe critical moment/deflection checkpoints.
  - Extend fixture/test chain so the case is executable and repeatable.
- **Definition of done**
  - Repo contains one end-to-end reconciliation case with a documented external source trail.
  - Test coverage proves the reporting layer reproduces the locked expected outputs within declared tolerances.
  - README/notes wording still clearly distinguishes this as one reconciled case, not blanket certification.
- **Test / check wanted**
  - Regression test for the new case passes.
  - Manual spot-check of at least 3 output fields against source worksheet.
- **Risks / notes**
  - Hardest part is obtaining/encoding a trustworthy reference, not writing the test.
  - If exact capacity formulas diverge intentionally from the source, document why instead of forcing numbers.

### TKT-03A — Capacity source-map follow-up for wrinkling / crushing / uplift
- **Priority / phase:** P1 / v1.0
- **Goal**
  - Upgrade the new Q2 source-first artifact into a tighter evidence map for the three most source-sensitive capacity checks.
- **Scope**
  - Link current constants/factors (`fCc`, `gammaM_wrinkling`, `gammaM_shear`, `gammaM_screw`, wrinkling approx coefficient) to either:
    - a cited source, or
    - an explicit documented gap.
  - Add provenance classification for user-entered resistance inputs (`wrinklingStress`, `screwStrength`).
  - Keep formula behavior unchanged unless a source-backed micro-fix is obvious and safe.
- **Definition of done**
  - Repo has one canonical artifact that says, for wrinkling / crushing / uplift, what is source-backed vs still missing.
  - No wording in notes/tests implies those checks are externally validated when they are not.
  - At least one next external reconciliation target is named concretely.
- **Test / check wanted**
  - Smoke/regression test confirms `technicalTransparency.checks.*.sourceMeta` remains surfaced for the mapped checks.
  - Manual review confirms no contradictory wording remains in notes.
- **Risks / notes**
  - Main risk is accidental overclaim through wording, not code breakage.
  - Keep this ticket source-first; do not turn it into a broad formula rewrite.

### TKT-04 — Formalize a validation-status contract artifact for contributors and future UI display
- **Priority / phase:** P1 / v1.0
- **Goal**
  - Convert the current narrative validation notes into a more stable contract the app and contributors can rely on.
- **Scope**
  - Define one structured artifact (JSON or markdown+frontmatter) that lists cases, classification, source type, readiness, and trust level.
  - Keep `notes/validation-status-report.md` as narrative if useful, but reduce drift against fixtures/tests.
  - Document how a case graduates from scaffold → internal-captured/external-captured.
- **Definition of done**
  - There is one canonical source of truth for validation case status.
  - Existing notes/tests can reference it without duplicated status drift.
  - The structure is simple enough to later power a UI “validation status” panel.
- **Test / check wanted**
  - Consistency check or smoke test that fixture/test case ids match the contract artifact.
  - Manual diff confirms no contradictory statuses remain.
- **Risks / notes**
  - Don’t over-engineer this into a big schema project.
  - Aim for drift reduction, not bureaucracy.

### TKT-05 — Strengthen solver invariants around multi-span assembly and load superposition
- **Priority / phase:** P1 / v1.0
- **Goal**
  - Add targeted regression protection around likely FEM assembly failure modes that are not yet obviously covered by the current benchmark set.
- **Scope**
  - Review `src/calc/solver.js` and existing solver tests for gaps: mixed load superposition, support condition edge cases, sign conventions, hinge/redistribution interaction boundaries.
  - Add narrow regression tests that lock invariants without pretending to be external benchmarks.
- **Definition of done**
  - At least 3 meaningful new regression assertions/cases are added for uncovered solver invariants.
  - Tests are phrased to protect bug-prone behavior, not restate implementation internals.
  - New coverage complements the existing internal-node point-load regression rather than overlapping it.
- **Test / check wanted**
  - `npm test` passes.
  - If possible, each new test name states the bug class it is protecting.
- **Risks / notes**
  - Easy trap: adding many shallow tests that do not protect real failure modes.
  - Focus on bug classes likely to break engineering trust silently.

---

## Milestone v1.1 — Usable engineering workflow in the app

### TKT-06 — Build a structured input model + validation layer between UI and engine
- **Priority / phase:** P0 / v1.1
- **Goal**
  - Stop treating the app as a thin demo shell and create a robust user-input boundary before richer UI features are added.
- **Scope**
  - Inspect `src/App.jsx` and current form state shape.
  - Introduce a normalized input model for spans, support widths, loads, section properties, and settings expected by `src/calc/runPanelAnalysis.js`.
  - Add input validation/sanitization rules for impossible or ambiguous entries.
- **Definition of done**
  - UI submits a normalized payload that matches engine expectations consistently.
  - Invalid or incomplete inputs are caught before calculation.
  - Input-model logic is separated enough to test independently from the visible UI.
- **Test / check wanted**
  - Unit tests for input normalization/validation.
  - Manual run in app for common scenarios: single span, two span, thermal on/off, point load.
- **Risks / notes**
  - This is the main bridge between a strong engine and a fragile product.
  - If skipped, later UI/result work will be built on unstable state handling.

### TKT-07 — Create a results model and engineering summary view from existing reporting outputs
- **Priority / phase:** P1 / v1.1
- **Goal**
  - Surface calculation outputs in a way engineers can actually read: governing case, key ratios, reactions/moments/deflection, and trust/assumption notes.
- **Scope**
  - Map outputs from `src/calc/reporting.js` and `runPanelAnalysis` into a stable UI-facing results model.
  - Build a first-pass result panel in the app rather than raw/debug output.
  - Include explicit differentiation between solver outputs, capacity checks, and assumptions/warnings.
- **Definition of done**
  - App shows a coherent result summary for supported scenarios.
  - Governing check and pass/fail state are visually obvious.
  - User can see key engineering numbers without digging into console/debug state.
- **Test / check wanted**
  - Component tests or snapshot tests for result rendering.
  - Manual verification against at least one existing regression fixture.
- **Risks / notes**
  - Avoid hiding caveats; trust notes matter as much as pretty numbers.
  - UI wording should match repo validation boundaries.

### TKT-08 — Add scenario presets tied to real regression fixtures
- **Priority / phase:** P1 / v1.1
- **Goal**
  - Make the app demo-able and developer-checkable by loading known scenarios directly from benchmark/regression fixtures.
- **Scope**
  - Reuse a subset of cases from `tests/fixtures/external-validation-cases.json` or a derived preset file.
  - Provide quick-load scenarios in UI: canonical single span, equal two-span UDL, thermal internal benchmark, governing/crushing case.
  - Ensure loaded presets populate the same normalized input model used by manual entry.
- **Definition of done**
  - User can load at least 4 presets from inside the app.
  - Presets correspond to repo-known cases, not invented marketing examples.
  - Preset run outputs are stable enough for manual smoke checks.
- **Test / check wanted**
  - Manual smoke run for each preset.
  - Optional UI/unit test ensuring preset mapping does not drift from fixture ids.
- **Risks / notes**
  - Great leverage for QA and demos, but only if presets stay synced with actual fixtures.

### TKT-09 — Add explicit assumption/warning surfacing in the UI
- **Priority / phase:** P2 / v1.1
- **Goal**
  - Make product honesty visible in the app, not only in repo notes.
- **Scope**
  - Surface warnings for internal-only validation areas, declared-input dependencies, redistribution simplification, and thermal claim boundaries.
  - Reuse taxonomy or reporting concepts already present in `src/calc/capacityTaxonomy.js` / reporting layer where possible.
- **Definition of done**
  - Result view shows concise but explicit limitation notes when relevant.
  - Warnings are tied to scenario/output context, not generic boilerplate.
  - The UI does not imply more validation authority than the repo can defend.
- **Test / check wanted**
  - Manual scenario checks for at least one thermal case and one internally-ledger capacity case.
  - Component tests for conditional warning rendering.
- **Risks / notes**
  - If overdone, this becomes noisy; if skipped, the app becomes misleading.

---

## Milestone v1.2 — Packaging, auditability, and release readiness

### TKT-10 — Add exportable calculation report artifact from a locked result model
- **Priority / phase:** P1 / v1.2
- **Goal**
  - Turn the tool from “screen output” into something engineers can review/share internally.
- **Scope**
  - Define a report payload sourced from the stable results model.
  - Implement export to JSON and/or printable HTML/PDF-friendly format.
  - Include inputs, key outputs, governing checks, and validation-status disclaimer block.
- **Definition of done**
  - User can export a reproducible result artifact from the app.
  - Export contains enough detail to cross-check later without reopening the UI state manually.
  - Disclaimer/assumption section matches repo validation posture.
- **Test / check wanted**
  - Golden-file style test for exported JSON/HTML if practical.
  - Manual export review for one benchmark-backed and one internal-only scenario.
- **Risks / notes**
  - Report schema should come after TKT-07, not before.
  - Avoid promising formal design certification language.

### TKT-11 — Add lightweight release-readiness checks around packaging and auto-update path
- **Priority / phase:** P2 / v1.2
- **Goal**
  - Ensure the Electron packaging/release setup described in repo docs is backed by basic verification, not just configuration.
- **Scope**
  - Review root packaging flow and `electron-updater` assumptions noted in README.
  - Add a small release checklist or CI smoke step ensuring app builds, packaged artifacts are named as expected, and update metadata path is sane.
- **Definition of done**
  - There is an executable or documented smoke path for release packaging.
  - Build/release docs match actual scripts/config in repo.
  - No obvious disconnect remains between README claims and package configuration.
- **Test / check wanted**
  - Build command succeeds in CI/local release smoke.
  - Manual inspection of generated artifact names/update metadata.
- **Risks / notes**
  - This should come after core product workflow is usable.
  - Don’t spend weeks on release polish before trustable outputs exist.

---

## Recommended build order

1. **TKT-01 — Expand external solver benchmark set**
2. **TKT-02 — Cleanly lock thermal validation boundary**
3. **TKT-06 — Structured input model + validation layer**
4. **TKT-07 — Results model and engineering summary view**
5. **TKT-03 — End-to-end external reconciliation for capacity/reporting**
6. **TKT-08 — Scenario presets tied to fixtures**
7. **TKT-05 — Additional solver invariant regressions**
8. **TKT-09 — Assumption/warning surfacing in UI**
9. **TKT-10 — Exportable calculation report artifact**
10. **TKT-11 — Release-readiness checks**

---

## Recommended first ticket to build next

**TKT-01 — Expand external solver benchmark set beyond the current canonical cases**

Why this should go first:
- it compounds trust in the strongest part of the repo: the solver core
- it is lower-risk than building more UI on top of still-narrow validation breadth
- it creates better anchored scenarios for later UI presets/results demos
- it directly addresses the main current repo limitation called out in `notes/validation-status-report.md`: validation breadth is still too narrow to overclaim overall product confidence

If the goal is product credibility, this is a better first move than UI polish.
