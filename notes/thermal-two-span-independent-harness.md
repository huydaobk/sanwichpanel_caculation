# Independent harness note — equal two-span thermal-only cross-check

## What this harness is

This harness is an **independent reduced-system executable check** for the smallest continuous thermal case used by `VM-06`:

- 2 equal spans
- thermal action only
- all vertical support translations restrained
- no internal hinge
- same thermal fixed-end moment parameter `Mt` on both spans

Artifact files:

- `tests/helpers/thermalTwoSpanIndependentHarness.mjs`
- `tests/regression/thermalTwoSpanIndependentHarness.test.mjs`

The harness does **not** call the production assembly path to obtain its main coefficients. Instead it:

1. builds the reduced 3x3 rotational system explicitly for `[th1, th2, th3]`
2. assembles the thermal rotational load vector explicitly as `[-Mt, 0, Mt]`
3. solves the equal-span symmetric case in closed form
4. recovers element end actions from that reduced solution
5. only then compares the recovered actions with the production solver output

So this is meaningfully more independent than simply re-running `solveContinuousBeam()` and renaming the result.

## What it confirms strongly

For the implemented element thermal vector `{f_temp} = [0, -Mt, 0, Mt]`, the harness confirms:

- middle rotational DOF receives zero direct thermal moment after assembly
- middle rotation vanishes by symmetry in the equal-span thermal-only case
- interior support end moments recover as `±1.5 Mt`
- production solver matches the reduced-system harness on support moments and reactions for the checked case

## Important discrepancy found

While building the executable harness, the recovered **reaction coefficient** did **not** align cleanly with the current prose note `notes/thermal-two-span-derivation.md`.

Observed numerical case:

- span = 4000 mm per span
- `Mt = 1000`
- solver outer reactions ≈ `-0.375`
- solver interior reaction ≈ `+0.75`
- solver interior support moments ≈ `±1500`

So the support-moment coefficient is stable and well-supported by the harness.
But the reaction coefficient currently stated in the prose derivation needs a fresh audit, because the executable cross-check exposed a mismatch there.

## Conclusion for VM-06 readiness

This harness is strong enough to support a **narrower and more honest next step**:

- VM-06 can move closer to capture as an **implemented thermal fixed-end action benchmark for the equal two-span case**, especially on support moment/sign/symmetry behavior.

But it is **not yet enough** to claim full VM-06 capture if the case definition includes reactions as validated closed-form outputs, because:

1. the reaction coefficient in the derivation note is not yet reconciled with the executable check, and
2. this is still an internal reduced-system derivation/harness, not an external published reference.

## Recommended next step

Before marking `VM-06` as `captured`, do one focused follow-up only:

- audit and correct the reaction recovery derivation in `notes/thermal-two-span-derivation.md`, then
- decide whether VM-06 is intentionally an **internal derivation benchmark** or an **external validation benchmark**.

If internal benchmark is acceptable, this harness is already a solid foundation.
If external validation is required, one more outside reference/worksheet is still needed.
