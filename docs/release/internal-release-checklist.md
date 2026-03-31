# Internal Release Checklist

Mục tiêu: chốt một bản internal release gọn, có thể build/lưu hành nội bộ, và giữ đúng cặp artifact để người nhận có thể reload + audit lại.

## 1) Pre-release sanity

- [ ] Xác nhận scope release là internal, không phải tuyên bố external validation/certification.
- [ ] Đọc nhanh `notes/validation-status-report.md` để giữ wording đúng: external-captured / internal-captured / scaffold.
- [ ] Nếu có thay đổi output/report wording, kiểm tra lại các giới hạn về assumptions / limitations / provenance trong report.

## 2) Build + regression gate

- [ ] Chạy `npm run build` và đảm bảo build sạch.
- [ ] Chạy `npm run test:regression` và đảm bảo pass.
- [ ] Nếu release chạm vào export/import/reporting, nhìn lại tối thiểu các regression liên quan:
  - `tests/regression/appSnapshot.test.mjs`
  - `tests/regression/exportPackage.test.mjs`
  - `tests/regression/panelRegression.test.mjs`
  - `tests/regression/loadWorkflowGuardrails.test.mjs`

## 3) Snapshot / result package pairing

Từ cùng một trạng thái app đã review:

- [ ] Export **snapshot package** tương ứng:
  - project mode → `snapshot-project`
  - compare mode → `snapshot-compare-set`
- [ ] Export **result package** tương ứng:
  - project mode → `result-package-project`
  - compare mode → `result-package-compare-set`
- [ ] Kiểm tra hai file có cùng `internalReleaseTrack`.
- [ ] Kiểm tra hai file có cùng `internalReleaseStamp`.
- [ ] Kiểm tra hai file có cặp bundle đúng bằng `internalReleaseBundleLabel` / paired artifact scopes; không gửi lẻ 1 file.
- [ ] Nếu dùng compare mode, giữ nguyên cả compare-set snapshot + result package như một bundle duy nhất.

## 4) Compare mode / import-export sanity

- [ ] Nếu release có compare mode, export thử compare snapshot và reload lại để chắc các variant còn đủ.
- [ ] Kiểm tra `compareActiveVariantId`, số lượng variant, và label chính vẫn đúng sau import.
- [ ] Với per-span load / point load workflow, kiểm tra nhanh dữ liệu import lại không bị mất zero/blank semantics ở UI guardrail path.

## 5) Validation / provenance / reporting sanity

- [ ] Kiểm tra report vẫn hiện rõ benchmark/transparency class, không nói quá mức hiện trạng repo.
- [ ] Xác nhận assumptions chính vẫn hợp lý với case demo/release:
  - build solver/reporting path hiện tại
  - distributed load mode (uniform hay per-span)
  - wind / thermal context nếu có
- [ ] Xác nhận limitations vẫn còn được nêu khi cần, nhất là:
  - không thay thế code approval / vendor-certified sheet
  - uplift / wrinkling vẫn phụ thuộc declared input nếu chưa có source-linked reference
  - thermal VM-06 chỉ là internal-captured, không nâng thành external validation
- [ ] Nếu report dùng compare executive summary, kiểm tra variant best/pass/fail rationale đọc được và không gây hiểu nhầm.

## 6) Release artifact sanity

- [ ] Xác nhận version/app display stamp đúng theo `src/releaseMeta.js`.
- [ ] Nếu đóng gói installer, kiểm tra base name artifact vẫn là `Greenpan-Design-Setup`.
- [ ] Nếu phát hành qua GitHub release flow, nhớ workflow hiện tại build/publish qua `.github/workflows/release.yml` trên `main`.

## 7) Ready-to-send package

- [ ] Bundle gửi nội bộ nên gồm tối thiểu:
  - installer/build artifact cần dùng
  - snapshot package
  - result package
  - 1 release note ngắn
- [ ] Đặt tên bundle/thư mục đủ rõ để người nhận không nhầm project release với compare-set release.
- [ ] Chỉ đánh dấu ready khi người khác có thể: cài → mở → import snapshot → đối chiếu result package.
