# Internal Release Note

## Release

- **Version / stamp:** `Greenpan Design v0.0.1`
- **Date:** `2026-03-31`
- **Release type:** `internal`
- **Scope:** `project release`

## What changed

- Tạo internal release bundle thứ hai theo đúng project-mode flow của bundle đầu: `snapshot-project` + `result-package-project` từ cùng một reviewed state.
- Case trong bundle này là một **pass case thật** dùng cho demo/handoff nội bộ, được tinh chỉnh tối thiểu từ bundle đầu thay vì đổi hẳn workflow export.
- Artifact pairing tiếp tục giữ nguyên release metadata (`internalReleaseTrack`, `internalReleaseStamp`, paired scopes) để người nhận có thể reload + audit lại rõ ràng.

## Build / regression status

- **Build:** `pass` (`npm run build`)
- **Regression:** `pass` (`npm run test:regression`)
- **Notes:**
  - Build tạo lại `dist/` thành công.
  - Regression pass `38/38`.
  - Vite vẫn còn cảnh báo chunk size lớn, nhưng không làm fail gate hiện tại.

## Included artifacts

- **Installer / packaged build:** `dist/` production web build đã được regenerate từ `npm run build`
- **Snapshot package:** `internal-release-demo-case-02-pass--snapshot-project--20260331-010352z.json`
- **Result package:** `internal-release-demo-case-02-pass--result-package-project--20260331-010352z.json`
- **Bundle label / internal release stamp:** `Greenpan Design v0.0.1 · internal · 2026-03-31T01:03:52.009Z`

## What to verify after import

- Import snapshot package và xác nhận project `Internal Release Demo Case 02 - Pass` reload đúng.
- Đối chiếu result package để xác nhận cùng `internalReleaseTrack=internal`, cùng `internalReleaseStamp`, và cặp scope `snapshot-project` ↔ `result-package-project`.
- Kiểm tra overall status / governing case khớp reviewed state hiện tại: **pass**, governing case vẫn là **uplift** nhưng ratio chỉ còn `0.891707`.

## Validation / reporting notes

- Validation framing cho release này:
  - `external-captured:` chỉ áp dụng cho các benchmark solver/captured cases đã khóa thật trong repo.
  - `internal-captured:` thermal VM-06 và các path internal capture vẫn chỉ là internal reference.
  - `scaffold / not externally validated:` các input/resistance path chưa có source-linked benchmark vẫn không được diễn giải thành external approval.
- Provenance assumptions to keep in mind:
  - Pass case này vẫn dựa trên current repository implementation và reporting envelope hiện tại.
  - `screwStrength` vẫn là declared per-fastener resistance path có basis/source metadata; không được hiểu thành external certification package.
- Reporting limitations to keep in mind:
  - Đây là internal release để review/demo nội bộ; không thay thế code approval hay vendor-certified design package.
  - Pass status của case này chỉ phản ánh reviewed input state bên trong bundle hiện tại.

## Known limitations / follow-up

- Pass case được tạo bằng cách tinh chỉnh input từ bundle đầu: tăng `screwStrength` từ `8.5` lên `12 kN` và mở `supportWidths` từ `[60,60,60]` lên `[80,80,80]` để đưa cả uplift lẫn crushing xuống dưới ngưỡng.
- Bundle này vẫn mới dừng ở build artifact `dist/`, chưa đóng gói installer `.exe` riêng.
- Nếu muốn demo/handoff tiếp theo “đẹp” hơn nữa, nên bổ sung một case pass với provenance numeric mạnh hơn cho `screwStrength` để wording bớt phụ thuộc declared-input caveat.

## Suggested handoff message

`Đây là internal release bundle thứ hai dùng pass case thật để demo/review nội bộ. Bundle gồm build artifact + snapshot package + result package cùng release stamp. Nhờ import snapshot để reload case, rồi đối chiếu result package để xác nhận overall status = pass, governing uplift ratio ~0.892, và kiểm tra assumptions/limitations/provenance trước khi dùng tiếp.`
