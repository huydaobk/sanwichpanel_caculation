# Internal Release Note

## Release

- **Version / stamp:** `Greenpan Design v0.0.1`
- **Date:** `2026-03-31`
- **Release type:** `internal`
- **Scope:** `project release`

## What changed

- Chốt được bundle internal release đầu tiên bằng đúng flow artifact hiện có trong repo: `snapshot-project` + `result-package-project` từ cùng một exported state.
- Build/regression gate đã được chạy lại trước handoff; regression bao gồm cả app snapshot, export package, panel/reporting, load workflow guardrails, analytical solver benchmarks, và thermal harness regression.
- Bundle này giữ wording validation/provenance theo `notes/validation-status-report.md`, tránh overclaim external certification.

## Build / regression status

- **Build:** `pass` (`npm run build`)
- **Regression:** `pass` (`npm run test:regression`)
- **Notes:**
  - Build tạo `dist/` thành công; hiện chỉ còn cảnh báo chunk size của Vite, không làm fail build.
  - Regression pass `38/38`.
  - Artifact pairing đã được verify thêm bằng `internal-release/first-bundle/verification.json`.

## Included artifacts

- **Installer / packaged build:** `dist/` production web build đã được regenerate từ `npm run build`.
- **Snapshot package:** `internal-release-demo-case-01--snapshot-project--20260331-005931z.json`
- **Result package:** `internal-release-demo-case-01--result-package-project--20260331-005931z.json`
- **Bundle label / internal release stamp:** `Greenpan Design v0.0.1 · internal · 2026-03-31T00:59:31.402Z`

## What to verify after import

- Import snapshot package và xác nhận project `Internal Release Demo Case 01` reload đúng.
- Đối chiếu result package để xác nhận cùng `internalReleaseTrack=internal`, cùng `internalReleaseStamp`, và cặp scope `snapshot-project` ↔ `result-package-project`.
- Kiểm tra overall status / governing case khớp reviewed state hiện tại: **fail** do `Liên kết chống nhổ` với utilization ratio `1.258881`.

## Validation / reporting notes

- Validation framing cho release này:
  - `external-captured:` chỉ dùng cho các benchmark solver/captured cases đã được repo khóa thật.
  - `internal-captured:` thermal VM-06 và các path internal capture vẫn chỉ là internal reference.
  - `scaffold / not externally validated:` những vùng chưa có source-linked benchmark hoặc declared-input path vẫn không được diễn giải thành external approval.
- Provenance assumptions to keep in mind:
  - Solver/reporting path theo current repository implementation và reporting envelope hiện tại.
  - Uplift resistance vẫn phụ thuộc declared fastener capacity input path.
- Reporting limitations to keep in mind:
  - Bundle này là internal release để review nội bộ; không thay thế code approval hay vendor-certified design package.
  - Result package hiện ghi rõ case release **không đạt** ở uplift; không được handoff như một pass-design case.

## Known limitations / follow-up

- Đây là bundle internal usable đầu tiên, nhưng case được đóng gói hiện tại là một **fail case thật** (governing uplift), phù hợp cho reload/audit nội bộ hơn là demo passed design.
- Chưa tạo installer `.exe` vì môi trường hiện tại chỉ xác minh được web build `dist/`; checklist mục installer chỉ mới thỏa ở mức build artifact usable, chưa phải packaged installer handoff.
- Nếu muốn internal release “sạch” hơn cho reviewer không kỹ thuật, nên tạo thêm một bundle thứ hai dùng pass case hoặc tune `screwStrength`/input để tránh overall fail.

## Suggested handoff message

`Đây là internal release để review nội bộ. Bundle gồm build artifact + snapshot package + result package cùng release stamp. Nhờ import snapshot để reload case, rồi đối chiếu result package để kiểm tra overall status, governing case uplift fail hiện tại, và phần assumptions/limitations/provenance trước khi dùng tiếp.`
