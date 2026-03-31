# Capacity source map (Q2 start) — wrinkling / support crushing / uplift

## Goal

Start externalizing the capacity-formula layer with a **source-first** artifact, without pretending the formulas are externally validated yet.

This note documents, for the three most source-sensitive capacity checks:
- what the current repo implementation actually uses,
- what is already transparent,
- what is still missing,
- and what source anchors could upgrade the checks later.

It is intentionally honest: this is **not** a validation certificate.

---

## 1) Wrinkling / compressive limit

### Current implementation path
- `src/calc/section.js#resolveWrinklingInput`
- `src/calc/section.js#buildSectionProperties`
- surfaced through `src/calc/reporting.js` and `src/calc/capacityTaxonomy.js`

### What the code currently does
The repo currently resolves the compression-side stress limit as:
- `wrinklingMode = declared` → use `wrinklingStress` if > 0
- `wrinklingMode = approx` → use
  - `sigma_w_approx = 0.5 * sqrt(Ef * Ec * Gc)`
- `wrinklingMode = yield-only` → bypass wrinkling and govern by steel yield design stress
- final design compression limit:
  - `sigma_comp_limit = sigma_y_design` for `yield-only`
  - otherwise `min(sigma_w_design, sigma_y_design)`

The good news: the repo already surfaces requested mode, effective mode, fallback behavior, and transparency labels.

### What this is currently based on
- internal implemented formula logic in `section.js`
- user input (`wrinklingStress`) or engineering approximation (`0.5 * sqrt(Ef * Ec * Gc)`)
- repository safety factors (`gammaM_wrinkling`, `gammaM_yield`)

### Provenance boundary clarified in R2
- `wrinklingMode = declared`
  - the repo is now explicit that this path means **user-declared resistance/stress input** only
  - the repo still does **not** know whether that value is intended as characteristic, design, tested, or vendor-tabulated
  - therefore this path is honest as **user-declared**, not as source-backed resistance
- `wrinklingMode = approx`
  - the repo is now explicit that `0.5 * sqrt(Ef * Ec * Gc)` is an **engineering approximation kept visible in code/reporting**
  - the coefficient `0.5` and exact variable set `Ef/Ec/Gc` remain **uncited in current repo artifacts**
  - therefore this path is honest as **engineering approximation**, not as externally validated wrinkling resistance
- `wrinklingMode = yield-only`
  - this is not a wrinkling-resistance derivation at all
  - it is a deliberate boundary mode where the final compression limit is taken directly from steel yield design stress
- `declared` / `approx` versus `yield-only`
  - the repo now states the boundary more truthfully:
    - `yield-only` bypasses wrinkling resistance and goes straight to `sigma_y_design`
    - `declared` / `approx` produce a wrinkling-side candidate, but the final limit is still `min(sigma_w_design, sigma_y_design)`

### What is missing
- no cited external source in repo artifacts for the coefficient `0.5` and exact variable set used by the approximation
- no attached schema/citation defining what semantic meaning the declared `wrinklingStress` input is expected to carry
- no vendor/product-family wrinkling resistance source attached
- no source-linked explanation for why `gammaM_wrinkling = 1.2` is the right factor here

### Source anchors that could upgrade it later
- vendor datasheet/table giving wrinkling or local face instability resistance
- sandwich panel handbook / code commentary with the same or equivalent wrinkling expression
- archived engineering worksheet with explicit derivation and stated assumptions for the same panel family

### Q2 conclusion
Wrinkling is **already transparent in mode bookkeeping**, but **not source-anchored enough** to claim externally validated resistance. Right now it is honest if described as:
- user-declared, or
- engineering approximation, or
- fallback to steel yield limit.

It is **not yet honest** to market the approximation itself as externally validated.

### R4 artifact hunt result — declared wrinkling path
A follow-up artifact hunt for the **declared wrinkling input path** found one real vendor-side document strong enough to improve provenance framing, but **not** strong enough to certify arbitrary numeric MPa values entered by the user.

**Artifact found:**
- Paroc Panel System / Kingspan technical guide `ASS_533988`
- section `2.1 General`
- Table `6a/6b`
- explicit terminology: **“Wrinkling of the face layer in the span and at an intermediate support”**

**What this artifact usefully proves:**
- wrinkling is a named product-family failure mode in a real vendor technical guide
- the guide gives product-family `gamma_m` context for wrinkling for PAROC AST/S/S+/F/F+/E/L panel families
- this is strong enough to improve the **accepted basis/source framing** for declared wrinkling metadata

**What it does not prove:**
- it does **not** give a universal declared wrinkling stress value in MPa for this repo
- it does **not** justify upgrading a user-entered numeric `wrinklingStress` into source-backed resistance unless the exact table/test/worksheet line containing that number is attached
- it does **not** source-link the repo approx formula `0.5 * sqrt(Ef * Ec * Gc)`

**Safe repo action after R4:**
- attach this artifact to declared-path schema/guidance as **product-family guidance only**
- keep the declared MPa numeric path classified as **user-declared** unless the exact numeric source line is provided
- keep `gammaM_wrinkling = 1.2` uncited in repo defaults unless a directly matching accepted worksheet/clause is attached

---

## 2) Support crushing / core bearing at supports

### Current implementation path
- `src/calc/checks.js#buildReactionData`
- constants in `src/calc/section.js#SECTION_CONSTANTS`
- surfaced through report summary / technical transparency

### What the code currently does
For each support:
- compression reaction demand `R_comp` is taken from the reaction envelope
- resistance is computed as:
  - `F_Rd = fCc * panelWidth * supportWidth / gammaM_shear`
- ratio is:
  - `crushingRatio = R_comp / F_Rd`
- required support width is back-calculated for advice text

### What this is currently based on
- solver reaction demand from the current model
- support width input
- panel width input
- repository constant `fCc`
- repository partial factor `gammaM_shear`

### What is missing
- no source note saying where `fCc` came from
- no source note justifying reuse of `gammaM_shear` for this crushing/bearing check
- no external reconciliation against a vendor table or worksheet for support bearing capacity

### Source anchors that could upgrade it later
- vendor bearing/support-width capacity table
- technical manual stating allowable support bearing stress / crushing strength
- archived legacy worksheet if it clearly states origin of `fCc` and factor usage

### TKT-03C source-attachment follow-up
External review in this ticket found **directional evidence only**, not a numeric source attachment:
- Ruukki support/load-table pages show that sandwich-panel design workflows expose support-related checks and downloadable load-table artifacts.
- A Rauta article describing Ruukki TrayPan states that support reactions are decisive in panel selection and are reported in the advanced calculation outputs.

What these sources **do help with**:
- they strengthen confidence that a support-reaction-driven check belongs in the design/reporting flow,
- they make the demand-side provenance less "repo-internal only" in narrative terms.

What they **do not justify yet**:
- the retained default `fCc = 0.10 N/mm²`,
- reuse of `gammaM_shear = 1.25` as `gammaM_crushing`,
- any numeric separation between crushing and shear factors.

### Q2 / TKT-03C conclusion
Support crushing is still the **easiest near-term candidate for source-first externalization** because the formula is simple and localized. TKT-03C improved provenance honesty by separating:
- **support-check existence/context** → externally corroborated,
- **repo resistance number + factor** → still uncited / provisional.

Current honest statement:
- internally repeatable,
- support-check context externally corroborated,
- resistance-side numeric basis still input-dependent / repo-default,
- not yet externally reconciled for absolute authority.

---

## 3) Uplift / fastener pull-out type check

### Current implementation path
- `src/calc/runPanelAnalysis.js#upliftEnabled`
- `src/calc/checks.js#buildReactionData`
- constants in `src/calc/section.js#SECTION_CONSTANTS`

### What the code currently does
- uplift check only runs when `panelType !== ceiling` and `screwStrength > 0`
- fastener count is approximated as:
  - `screwCount = round(panelWidth / screwSpacing)` with minimum 1
- design uplift resistance is:
  - `T_Rd = screwStrength * 1000 * screwCount / gammaM_screw`
- ratio is:
  - `upliftRatio = R_tension / T_Rd`

The solver side already has benchmarked sign behavior for negative reactions/uplift appearance in continuous beam cases; that part is better anchored than the resistance conversion.

### What this is currently based on
- reaction tension demand from the solver
- user-provided `screwStrength`
- user-provided `screwSpacing`
- panel width
- repository factor `gammaM_screw`
- enable/disable rule by panel type

### What is missing
- no cited source for the rounding/layout rule used to turn spacing into screw count
- no provenance structure for `screwStrength` (characteristic? design? per fastener? pull-out vs pull-over?)
- no source-linked justification for `gammaM_screw = 1.33`

### Source anchors that could upgrade it later
- fastener vendor datasheet with resistance basis and applicability conditions
- project fastening schedule with declared per-fastener design resistance
- code/manual clause for resistance factoring and layout assumptions

### Q2 conclusion
Uplift currently has **better demand-side trust than resistance-side trust**:
- demand sign / existence of uplift is solver-covered,
- but capacity remains strongly dependent on user inputs and undocumented conversion assumptions.

Current honest statement:
- useful for internal design iteration,
- not yet a source-anchored fastening design check.

### T3 artifact hunt result — screwStrength / uplift declared path
A follow-up artifact hunt for the **declared screwStrength input path** found a real vendor-side trail that improves the repo's acquisition guidance, but **did not** find a numeric artifact strong enough to certify a per-fastener kN value.

**Artifacts reviewed:**
- Ruukki `Sandwich panels Assembly instruction`
- Ruukki `Sandwich panel SPA Installation instructions`
- Ruukki `Patina sandwich panel installation and maintenance instructions`

**What these artifacts usefully prove:**
- vendor installation guidance treats fastening design as a **case-by-case engineering task**
- the fastening decision is expected to follow **fastener-manufacturer instructions / research results** and project-specific designer decisions
- therefore the repo can now state a clearer **acquisition path** for `screwStrength`: prefer the fastener maker datasheet, approved fastening schedule, or archived uplift worksheet instead of treating any entered kN number as self-authorizing

**Representative lines captured from the reviewed manuals:**
- `Fasteners are always definitively dimensioned case by case by the designer according to the instructions for use and research results of the fastener manufacturer.`
- `Use manufacturer recommended self-drilling fasteners for fixing Ruukki sandwich panels.`
- `Due to diversified loads in nominal and edge zones, the final number of fasteners is defined by constructor in the project.`

**What these artifacts do not prove:**
- they do **not** provide a numeric pull-out / uplift resistance in kN per fastener for the repo input path
- they do **not** justify upgrading a user-entered `screwStrength` into source-backed capacity without the exact fastener datasheet / schedule / worksheet line containing that number
- they do **not** source-link the repo's `round(panelWidth / screwSpacing)` count rule or `gammaM_screw = 1.33`

**Safe repo action after T3:**
- keep the numeric `screwStrength` path classified as **user-declared** unless the exact kN-per-fastener line is attached
- improve transparency wording so the repo distinguishes between **numeric authority** and **acquisition-path guidance**
- ask future users/reviewers to attach one of: vendor fastener datasheet, approved fastening schedule, archived uplift worksheet, or test report for the same fastener/substrate/detail combination

---

## 4) Small externalization step completed now

A small, safe step was completed in code without changing formulas:
- added `src/calc/capacitySources.js` as a machine-readable source registry for:
  - wrinkling / sigma limit
  - support crushing
  - uplift
- attached this source metadata into `technicalTransparency.checks.*.sourceMeta` for the relevant checks

This means the repo now has a first-class place to store:
- current basis,
- missing evidence,
- candidate source anchors,
- and a plain-language conclusion per check.

No resistance formula was changed in this Q2 start step.

---

## 5) Immediate next tickets

### Ticket A — Source-link constants and factors
Create a focused artifact that maps these constants to evidence or explicit gaps:
- `fCc`
- `gammaM_shear` as used in crushing
- `gammaM_wrinkling`
- `gammaM_screw`
- approximation coefficient `0.5` in wrinkling formula

**Why first:** low implementation risk, directly reduces “mù nguồn gốc”.

### TKT-03A follow-up applied now (support crushing first)
A smaller safe step has now been applied in code:
- `technicalTransparency.checks.supportCrushing.sourceMeta` no longer stops at a coarse summary
- it now carries a structured `provenanceBreakdown` that separates:
  - solver-derived demand side (`R_comp` from reaction envelope)
  - uncited repository resistance constant (`fCc = 0.10`)
  - explicit source-gap for reusing `gammaM_shear = 1.25` in crushing
  - user-entered bearing geometry (`panelWidth`, `supportWidths[]`)
- it also carries `safeExternalizationSteps` so the next move is clearer without changing formulas

This does **not** claim a new citation was found. It only makes the current source gaps more explicit and machine-readable.

### R1a artifact hunt result (support crushing)
A short additional artifact hunt was completed with the goal of finding a **product-specific worksheet/manual/table** strong enough to source-link the support-crushing resistance side.

What was checked in this pass:
- existing repo source registry + note trail (`src/calc/capacitySources.js`, this note)
- Ruukki support/load-table page already referenced in repo artifacts
- the Rauta article describing Ruukki TrayPan outputs and design flow
- broader web discovery attempts for sandwich-panel support bearing / crushing manuals and load tables

What this pass **did confirm**:
- vendor ecosystems for sandwich panels do expose support-oriented design workflows and load-table tooling
- TrayPan-style workflows explicitly treat **support reaction** as an important selection/design criterion
- this continues to support the **demand-side / check-existence** narrative already recorded in the repo

What this pass **did not find**:
- no reviewed artifact gave a product-specific numeric bearing/crushing resistance that could justify the repo default `fCc = 0.10 N/mm²`
- no reviewed artifact gave a crushing-specific partial factor that could justify `gammaM_crushing = 1.25`
- no trustworthy worksheet/manual/table was found that reconciles the repo formula directly enough to upgrade source labels

Net result:
- **no stronger support-crushing artifact was found** in this R1a pass
- therefore the repo should **not** upgrade support-crushing status beyond the current honest framing
- the safe improvement remains provenance clarity only, not citation inflation

Recommended next move:
- **pivot to wrinkling provenance next**, unless a real product-family support-bearing worksheet/manual is obtained offline or from a controlled vendor archive
- wrinkling is now the better follow-up target because the open gap is more clearly bounded around formula provenance / declared-input provenance, whereas support crushing still lacks a usable numeric artifact

### Ticket B — Add one provenance schema for user-entered resistance inputs
At minimum classify:
- `wrinklingStress` = declared characteristic/design/test value?
- `screwStrength` = per fastener characteristic/design/vendor declared value?

**Why:** right now input-dependent checks are transparent only at a coarse level.

### Ticket C — Reconcile one external support-bearing or uplift worksheet
Prefer the simpler of these first:
- one vendor support-width/bearing table, or
- one fixed fastener uplift worksheet

**Why:** easiest route to one genuinely source-anchored capacity check without reopening the whole model.
