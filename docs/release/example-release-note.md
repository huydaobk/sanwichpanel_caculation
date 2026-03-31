# Example Internal Release Note

> Example only. Copy, trim, and adapt for the actual internal bundle being handed off.

## Release

- **Version / stamp:** `Greenpan Design v0.3.0-internal`
- **Date:** `2026-03-31`
- **Release type:** `internal`
- **Scope:** `project release`

## What changed

- README/release docs now point to a clear internal release workflow for build, regression, artifact pairing, and handoff.
- Internal handoff expects a matched snapshot package + result package from the same reviewed state.
- Release-note wording is kept explicit about internal-only validation/reporting status.

## Build / regression status

- **Build:** `pass` (`npm run build`)
- **Regression:** `pass` (`npm run test:regression`)
- **Notes:**
  - Release candidate reviewed for internal handoff only.
  - Snapshot/result artifacts should be exported after final review from the same app state.

## Included artifacts

- **Installer / packaged build:** `Greenpan-Design-Setup 0.3.0-internal.exe`
- **Snapshot package:** `snapshot-project-demo-case-v0.3.0-internal.json`
- **Result package:** `result-package-project-demo-case-v0.3.0-internal.json`
- **Bundle label / internal release stamp:** `greenpan-design-v0.3.0-internal-demo-case`

## What to verify after import

- Project state reloads correctly from the snapshot package.
- Snapshot and result package show the same `internalReleaseTrack`, `internalReleaseStamp`, and `internalReleaseBundleLabel`.
- Overall status, governing case, and report assumptions/limitations match the reviewed state.

## Validation / reporting notes

- Validation framing for this release:
  - `external-captured:` keep wording limited to cases explicitly captured in repo notes.
  - `internal-captured:` thermal VM-06 and similar internal references remain internal only.
  - `scaffold / not externally validated:` declared-input paths and unfinished source-linked areas remain non-certification/supporting logic only.
- Provenance assumptions to keep in mind:
  - Declared uplift/wrinkling inputs still depend on the current provenance captured in repo docs.
- Reporting limitations to keep in mind:
  - This release is not an external certification package and should not be described as one.

## Known limitations / follow-up

- Example filenames above should be replaced with the actual exported bundle names.
- If the release uses compare mode, replace project-scope filenames with the compare-set pair and mention the active/best variant in the note.

## Suggested handoff message

`Đây là internal release để review nội bộ. Bundle gồm installer + snapshot package + result package cùng release stamp. Nhờ import snapshot để reload case, rồi đối chiếu result package để kiểm tra overall status, governing case, và assumptions/limitations/provenance trước khi dùng tiếp.`
