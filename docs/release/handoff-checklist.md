# Internal Handoff Checklist

Dùng khi bàn giao một bản internal release cho reviewer, tester, hoặc người tiếp tục xử lý dự án.

## Gói bàn giao tối thiểu

- [ ] Installer/build artifact đúng bản release đang bàn giao
- [ ] 01 snapshot package để reload trạng thái app
- [ ] 01 result package để audit/report lại kết quả
- [ ] 01 release note ngắn nói rõ có gì đổi và cần chú ý gì

## Những gì phải khớp

- [ ] Snapshot và result package được export từ cùng một trạng thái đã review.
- [ ] `internalReleaseTrack` khớp nhau.
- [ ] `internalReleaseStamp` khớp nhau.
- [ ] Scope khớp đúng mode sử dụng:
  - project ↔ `snapshot-project` + `result-package-project`
  - compare ↔ `snapshot-compare-set` + `result-package-compare-set`
- [ ] Nếu là compare set, người nhận biết rõ variant nào đang active/best và không tách rời các variant khỏi bundle.

## Những gì phải nói rõ cho người nhận

- [ ] Build/regression đã được chạy trước handoff.
- [ ] Release này là **internal release**; không được diễn giải thành external certification/approval.
- [ ] Validation state hiện tại gồm cả external-captured, internal-captured, và scaffold; tham chiếu `notes/validation-status-report.md` nếu cần wording chuẩn.
- [ ] Report assumptions/limitations vẫn áp dụng; nhất là các giá trị uplift/wrinkling hoặc declared inputs phải được hiểu theo provenance hiện có.
- [ ] Nếu release có compare mode hoặc import/export workflow mới/chỉnh sửa, nêu rõ cách reload và phạm vi đã được kiểm.

## Reviewer/tester quick path

- [ ] Cài/mở app bản được bàn giao.
- [ ] Import snapshot package.
- [ ] Kiểm tra project name / compare variants / active variant đúng như release note.
- [ ] Mở/đối chiếu result package để xác nhận cùng bundle release.
- [ ] Xem nhanh overall status, governing case, assumptions, limitations, transparency/provenance badges.
- [ ] Nếu đây là compare release, xác nhận compare summary vẫn chỉ ra đúng best variant / pass count / rationale.

## Không bàn giao nếu còn vướng

- [ ] Chưa có cặp snapshot + result package
- [ ] Chỉ có screenshot/PDF mà không có JSON package
- [ ] Wording report/release note đang overclaim validation
- [ ] Người nhận không thể tự reload case để kiểm tra lại
