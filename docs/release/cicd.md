# CI/CD Guide

Repo này dùng chiến lược **internal-release-first**: ưu tiên CI rõ ràng và artifact nội bộ usable ngay, còn publish GitHub Release giữ như lane riêng khi thực sự cần.

## Workflows

### 1) CI — `.github/workflows/ci.yml`

Mục đích:
- chặn lỗi cơ bản trước khi merge/push main
- xác nhận repo vẫn build được
- xác nhận regression suite còn pass

Các bước:
1. `npm ci`
2. `npm run build`
3. `npm run test:regression`
4. upload artifact `web-dist`

Ghi chú:
- Lint backlog hiện vẫn còn trong repo, nên CI mặc định chưa gate bằng lint để tránh biến mọi PR thành cleanup ticket.
- Nếu muốn kiểm thêm lint ở local/manual lane, dùng `npm run ci:check:full`.

Trigger:
- push `main`
- pull request
- manual dispatch

## 2) Internal release bundle — `.github/workflows/internal-release.yml`

Mục đích:
- tạo artifact bundle phục vụ review/handoff nội bộ
- không cần tạo public GitHub Release
- bám theo docs/checklist release đã có trong repo

Mặc định bundle gồm:
- `dist/`
- `docs-release/`
- các demo bundle có sẵn dưới `internal-release/` nếu repo đang giữ chúng

Tuỳ chọn:
- `bundle_name`: tên thư mục/artifact dễ nhận biết
- `include_release_dir=true`: thử chạy `npm run dist` và copy `release/` nếu môi trường runner build được

Lưu ý:
- Linux runner có thể không tạo được installer Windows usable trong mọi trường hợp
- vì vậy workflow này được thiết kế theo hướng **best effort for packaged output**, nhưng **strict** với build + regression + docs bundle

## 3) Semantic release — `.github/workflows/release.yml`

Mục đích:
- publish GitHub Release + asset cho lane auto-update Electron

Gate mới trước khi publish:
1. `npm run build`
2. `npm run test:regression`
3. `npm run release`

Khi nào dùng:
- khi muốn publish release thật ra GitHub Releases
- khi cần giữ lane auto-update cho packaged Electron app

Không phải default path cho review nội bộ.

## Local commands

```bash
npm ci
npm run ci:check
```

Nếu cần packaged output local:

```bash
npm run dist
```

## Recommended usage

### PR / change validation
- chạy CI
- xem artifact `web-dist` nếu cần kiểm tra build output

### Internal handoff
- chạy internal release bundle workflow
- export snapshot + result package từ cùng trạng thái app đã review
- điền release note ngắn
- bàn giao theo `docs/release/handoff-checklist.md`

### Public/publish lane
- chỉ dùng semantic release khi thực sự muốn publish GitHub Release

## Caveats

- `semantic-release` vẫn phụ thuộc Conventional Commits để quyết định có publish hay không.
- Internal bundle workflow không tự sinh snapshot/result JSON mới từ UI state; nó chỉ gom build artifact + docs + các bundle đã tồn tại trong repo. Snapshot/result final vẫn nên export từ app state đã review.
- `npm run dist` dùng `electron-builder`; output packaged có thể phụ thuộc OS/runner và đặc biệt nhạy với môi trường build Windows nếu cần `.exe` chuẩn.
