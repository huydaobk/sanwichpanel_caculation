# Internal Release Note Template

> Mẫu ngắn cho mỗi internal release. Điền trực tiếp rồi gửi kèm bundle.

## Release

- **Version / stamp:** `Greenpan Design v...`
- **Date:** `YYYY-MM-DD`
- **Release type:** `internal`
- **Scope:** `project release` hoặc `compare-set release`

## What changed

- 
- 
- 

## Build / regression status

- **Build:** `pass/fail` (`npm run build`)
- **Regression:** `pass/fail` (`npm run test:regression`)
- **Notes:**
  - 

## Included artifacts

- **Installer / packaged build:** `...`
- **Snapshot package:** `...`
- **Result package:** `...`
- **Bundle label / internal release stamp:** `...`

## What to verify after import

- Project/variant state reloads correctly from snapshot.
- Snapshot and result package belong to the same internal release bundle.
- Overall status / governing case / compare summary (if any) match the reviewed state.

## Validation / reporting notes

- Validation framing for this release:
  - `external-captured:` ...
  - `internal-captured:` ...
  - `scaffold / not externally validated:` ...
- Provenance assumptions to keep in mind:
  - 
- Reporting limitations to keep in mind:
  - 

## Known limitations / follow-up

- 
- 

## Suggested handoff message

`Đây là internal release để review nội bộ. Bundle đã gồm installer + snapshot package + result package cùng release stamp. Nhờ anh/chị import snapshot để reload case, rồi đối chiếu result package để kiểm tra overall status, governing case, compare summary (nếu có), và phần assumptions/limitations/provenance.`
