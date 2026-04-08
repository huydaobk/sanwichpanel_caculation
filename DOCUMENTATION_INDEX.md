# 📚 Tài Liệu Kiến Trúc - Index

## Tổng Quan
Bộ tài liệu kiến trúc hoàn chỉnh cho dự án **Greenpan Design** - Ứng dụng desktop tính toán thiết kế panel sandwich.

---

## 📑 Cấu Trúc Tài Liệu

```
Documentation/
│
├── 📄 README.md                      ← Mô tả dự án cơ bản
│
├── 📘 ARCHITECTURE.md (36 KB)        ← ⭐ TÀI LIỆU CHÍNH
│   ├─ Tổng quan dự án
│   ├─ Kiến trúc tổng thể
│   ├─ Stack công nghệ
│   ├─ Cấu trúc thư mục
│   ├─ Luồng hoạt động
│   ├─ FEM Solver architecture
│   ├─ React component hierarchy
│   ├─ State management
│   ├─ IPC communication
│   ├─ Build & deployment
│   ├─ Design patterns
│   └─ Best practices
│
├── 📊 SYSTEM_DIAGRAMS.md (19 KB)     ← Sơ đồ Mermaid
│   ├─ Sơ đồ tổng quan (13 diagrams)
│   ├─ Data flow diagrams
│   ├─ Component diagrams
│   ├─ Sequence diagrams
│   ├─ State machines
│   └─ Deployment diagrams
│
├── ⚡ QUICK_REFERENCE.md (35 KB)     ← Tra cứu nhanh
│   ├─ ASCII diagrams
│   ├─ FEM calculation flow
│   ├─ Component structure
│   ├─ Build commands
│   ├─ Key formulas
│   └─ Dependency list
│
├── 📋 DOCUMENTATION_SUMMARY.md       ← Tóm tắt tài liệu
│   ├─ Overview của các file docs
│   ├─ Key findings
│   ├─ Metrics & statistics
│   └─ Usage guide
│
└── 📑 DOCUMENTATION_INDEX.md         ← File này (Index)
    └─ Navigation guide
```

---

## 🎯 Lộ Trình Đọc Tài Liệu

### 👤 Cho Developer Mới

**Bước 1**: Bắt đầu với overview
- [ ] Đọc `README.md` - Hiểu dự án làm gì
- [ ] Đọc `DOCUMENTATION_SUMMARY.md` - Tổng quan tài liệu

**Bước 2**: Hiểu kiến trúc tổng thể  
- [ ] Đọc phần "Kiến Trúc Tổng Thể" trong `ARCHITECTURE.md`
- [ ] Xem "Sơ Đồ Tổng Quan Hệ Thống" trong `SYSTEM_DIAGRAMS.md`

**Bước 3**: Hiểu cách code hoạt động
- [ ] Đọc phần "Luồng Hoạt Động Chính" trong `ARCHITECTURE.md`
- [ ] Xem "Data Flow Diagram" trong `SYSTEM_DIAGRAMS.md`
- [ ] Đọc "Luồng Tính Toán FEM" trong `QUICK_REFERENCE.md`

**Bước 4**: Hiểu React components
- [ ] Đọc phần "Kiến Trúc Component React" trong `ARCHITECTURE.md`
- [ ] Xem "Component Hierarchy" trong `SYSTEM_DIAGRAMS.md`

**Bước 5**: Thực hành
- [ ] Dùng `QUICK_REFERENCE.md` để tra lệnh
- [ ] Chạy `npm run dev` và explore code

---

### 🔧 Cho Maintainer/DevOps

**Focus Areas:**
1. **Build & Deployment**
   - `ARCHITECTURE.md` → "Build & Deployment Pipeline"
   - `SYSTEM_DIAGRAMS.md` → "Build & Release Pipeline"
   - `QUICK_REFERENCE.md` → "Quick Commands"

2. **Auto-Update**
   - `ARCHITECTURE.md` → "Auto-Update Flow"
   - `SYSTEM_DIAGRAMS.md` → "Auto-Update Mechanism"

3. **CI/CD**
   - `ARCHITECTURE.md` → "CI/CD Workflow"
   - `.github/workflows/release.yml` (actual config)

---

### 🎓 Cho Technical Reviewer

**Review Checklist:**
1. **Architecture Quality**
   - [ ] Review "Kiến Trúc Tổng Thể" diagram
   - [ ] Check "Component Hierarchy" 
   - [ ] Validate "Data Flow"

2. **Code Quality**
   - [ ] Review "Coding Conventions"
   - [ ] Check "Design Patterns"
   - [ ] Validate "Best Practices"

3. **Technical Depth**
   - [ ] Review "FEM Solver Architecture"
   - [ ] Check "Timoshenko vs Euler-Bernoulli"
   - [ ] Validate formulas in `QUICK_REFERENCE.md`

---

### 🧮 Cho Technical Specialist (FEM)

**FEM-Focused Reading:**
1. `ARCHITECTURE.md`
   - "Kiến Trúc Module Tính Toán FEM"
   - "Lý Thuyết Timoshenko Beam"
   - "Công Thức Chính"

2. `SYSTEM_DIAGRAMS.md`
   - "FEM Solver Architecture" (Diagram 5)
   - "Load Combination Strategy" (Diagram 9)

3. `QUICK_REFERENCE.md`
   - "Key Formulas" section
   - "Luồng Tính Toán FEM" (8 steps)

4. Code Reference
   - `src/App.jsx` lines 663-840 (FEM solver)

---

## 🔍 Tra Cứu Nhanh

### "Tôi cần tìm..."

| Cần tìm... | Xem ở đâu | Section |
|-----------|-----------|---------|
| **Cấu trúc thư mục** | ARCHITECTURE.md | "Cấu Trúc Thư Mục" |
| **Component hierarchy** | SYSTEM_DIAGRAMS.md | Diagram 4 |
| **FEM solver flow** | QUICK_REFERENCE.md | "Luồng Tính Toán FEM" |
| **Build commands** | QUICK_REFERENCE.md | "Quick Commands" |
| **State management** | ARCHITECTURE.md | "State Management" |
| **Auto-update** | SYSTEM_DIAGRAMS.md | Diagram 6 |
| **Dependencies** | QUICK_REFERENCE.md | "Key Dependencies" |
| **Formulas** | QUICK_REFERENCE.md | "Key Formulas" |
| **Design patterns** | ARCHITECTURE.md | "Key Design Patterns" |
| **Data flow** | SYSTEM_DIAGRAMS.md | Diagram 3 |

---

## 📊 Số Liệu Thống Kê

| Item | Value |
|------|-------|
| Tổng số file tài liệu | 5 |
| Tổng kích thước | ~100 KB |
| Số lượng sections | 50+ |
| Số lượng diagrams | 20+ (Mermaid + ASCII) |
| Ngôn ngữ | Vietnamese |
| Last updated | 2026-01-29 |

---

## 🎨 Visual Overview

```
╔════════════════════════════════════════════════════════════════╗
║             GREENPAN DESIGN DOCUMENTATION SUITE                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  📘 ARCHITECTURE.md (Main Documentation)                       ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ • Project Overview                                     │   ║
║  │ • System Architecture                                  │   ║
║  │ • Technology Stack                                     │   ║
║  │ • File Structure                                       │   ║
║  │ • Workflows & Data Flows                               │   ║
║  │ • FEM Calculation Engine                               │   ║
║  │ • React Components                                     │   ║
║  │ • Build & Deployment                                   │   ║
║  │ • Design Patterns                                      │   ║
║  │ • Performance & Security                               │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  📊 SYSTEM_DIAGRAMS.md (Visual Diagrams)                      ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ 13 Mermaid Diagrams:                                   │   ║
║  │  1. System Overview                                    │   ║
║  │  2. Application Architecture                           │   ║
║  │  3. Data Flow                                          │   ║
║  │  4. Component Hierarchy                                │   ║
║  │  5. FEM Solver Architecture                            │   ║
║  │  6. Auto-Update Sequence                               │   ║
║  │  7. Build & Release Pipeline                           │   ║
║  │  8. State Management                                   │   ║
║  │  9. Load Combinations                                  │   ║
║  │ 10. Component Interactions                             │   ║
║  │ 11. Timoshenko vs Euler-Bernoulli                      │   ║
║  │ 12. File Structure Tree                                │   ║
║  │ 13. Technology Stack Layers                            │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  ⚡ QUICK_REFERENCE.md (Cheat Sheet)                          ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ • ASCII Diagrams (10+)                                 │   ║
║  │ • FEM Calculation Steps                                │   ║
║  │ • Component Structure                                  │   ║
║  │ • Build Commands                                       │   ║
║  │ • Key Formulas                                         │   ║
║  │ • Dependencies List                                    │   ║
║  │ • Quick Tips                                           │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  📋 DOCUMENTATION_SUMMARY.md (Summary)                        ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ • Overview of all docs                                 │   ║
║  │ • Key findings                                         │   ║
║  │ • Important insights                                   │   ║
║  │ • Usage guide                                          │   ║
║  │ • Metrics & statistics                                 │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  📑 DOCUMENTATION_INDEX.md (This file)                        ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ • Navigation guide                                     │   ║
║  │ • Reading roadmap                                      │   ║
║  │ • Quick reference table                                │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 🔗 Links

### Documentation Files
- [README.md](./README.md) - Project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Main architecture doc
- [SYSTEM_DIAGRAMS.md](./SYSTEM_DIAGRAMS.md) - Mermaid diagrams
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick reference
- [DOCUMENTATION_SUMMARY.md](./DOCUMENTATION_SUMMARY.md) - Summary

### External Resources
- [Repository](https://github.com/huydaobk/sanwichpanel_caculation)
- [GitHub Releases](https://github.com/huydaobk/sanwichpanel_caculation/releases)
- [Mermaid Live Editor](https://mermaid.live/) - For viewing/editing diagrams

---

## 💡 Tips

### Viewing Mermaid Diagrams
1. **On GitHub**: Diagrams render automatically
2. **VS Code**: Install "Markdown Preview Mermaid Support" extension
3. **Online**: Copy diagram code to [mermaid.live](https://mermaid.live/)

### Searching Documentation
Use your editor's search function:
- `Ctrl+F` (Windows/Linux) or `Cmd+F` (Mac)
- Search across all `.md` files for keywords

### Updating Documentation
When code changes:
1. Update relevant sections in `ARCHITECTURE.md`
2. Update diagrams in `SYSTEM_DIAGRAMS.md` if needed
3. Update formulas/commands in `QUICK_REFERENCE.md` if needed
4. Update this index if adding new docs

---

## 📞 Support

Nếu có câu hỏi về tài liệu:
1. Đọc kỹ các file tài liệu liên quan
2. Check code trong `src/` để đối chiếu
3. Mở issue trên GitHub nếu tìm thấy lỗi trong docs

---

**Index Version**: 1.0  
**Last Updated**: 2026-01-29  
**Maintainer**: Development Team
