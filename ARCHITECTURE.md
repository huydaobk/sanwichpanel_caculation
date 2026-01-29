# Kiến Trúc Hệ Thống - Greenpan Design

## 📋 Tổng Quan Dự Án

**Greenpan Design** là ứng dụng desktop dùng để tính toán và thiết kế kết cấu panel sandwich (tấm cách nhiệt 3 lớp). Ứng dụng sử dụng phương pháp phần tử hữu hạn (FEM) với lý thuyết dầm Timoshenko để phân tích ứng suất, biến dạng và độ bền của cấu trúc.

### Thông Tin Dự Án
- **Tên ứng dụng**: Greenpan Design
- **Phiên bản**: 0.0.1
- **Platform**: Desktop (Windows, macOS, Linux)
- **Ngôn ngữ giao diện**: Tiếng Việt
- **Repository**: huydaobk/sanwichpanel_caculation

---

## 🏗️ Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────────┐
│                    GREENPAN DESIGN APPLICATION                  │
│                    (Electron Desktop App)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐       ┌──────────────────────────┐   │
│  │   MAIN PROCESS      │       │   RENDERER PROCESS       │   │
│  │   (main.cjs)        │◄─────►│   (React + Vite)         │   │
│  │                     │  IPC  │                          │   │
│  │  • Window Creation  │       │  • UI Components         │   │
│  │  • Auto-updater     │       │  • State Management      │   │
│  │  • File System      │       │  • FEM Calculations      │   │
│  └─────────────────────┘       │  • Visualization         │   │
│           │                     └──────────────────────────┘   │
│           │                                 │                   │
│           ▼                                 ▼                   │
│  ┌─────────────────────┐       ┌──────────────────────────┐   │
│  │  electron-updater   │       │   React Components       │   │
│  │  (GitHub Releases)  │       │   • App.jsx (Main)       │   │
│  └─────────────────────┘       │   • CeilingSchematic     │   │
│                                 │   • BeamDiagram          │   │
│                                 │   • Charts (Recharts)    │   │
│                                 └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Stack Công Nghệ

### Frontend Framework
- **React 18.3.1**: Thư viện UI components
- **React DOM 18.3.1**: Render engine
- **Vite 6.0.5**: Build tool và dev server (HMR)
- **Tailwind CSS**: Styling qua CDN

### Desktop Framework
- **Electron 33.2.1**: Wrapper desktop application
- **electron-builder 25.1.8**: Đóng gói và tạo installer
- **electron-updater 6.1.8**: Auto-update qua GitHub Releases

### Visualization & UI
- **Recharts 2.15.0**: Biểu đồ tương tác (moment, shear, deflection)
- **Lucide-react 0.471.0**: Icon library
- **SVG Native**: Vẽ sơ đồ kết cấu tùy chỉnh

### Development Tools
- **ESLint 9.17.0**: Code linting
- **Semantic Release 23.0.5**: Automated versioning & releases
- **Conventional Commits**: Commit message standard

---

## 📂 Cấu Trúc Thư Mục

```
sanwichpanel_caculation/
│
├── .github/
│   └── workflows/
│       └── release.yml              # CI/CD workflow (semantic-release)
│
├── public/
│   ├── logo_app.ico                 # Icon ứng dụng Windows
│   ├── logo_app.jpg                 # Logo hiển thị
│   └── vite.svg                     # Vite logo
│
├── src/
│   ├── main.jsx                     # React entry point
│   ├── index.css                    # Global styles
│   ├── App.jsx                      # ★ Component chính (2859 dòng)
│   ├── App.css                      # Component styles
│   └── assets/                      # Tài nguyên tĩnh
│
├── main.cjs                         # ★ Electron main process
├── index.html                       # HTML template
├── vite.config.js                   # Vite configuration
├── package.json                     # Dependencies & scripts
├── eslint.config.js                 # ESLint rules
└── README.md                        # Documentation

★ = File quan trọng nhất
```

---

## 🔄 Luồng Hoạt Động Chính

### 1. Khởi Động Ứng Dụng

```
User khởi động app
      │
      ▼
┌─────────────────┐
│  main.cjs       │
│  app.whenReady()│──► Tạo BrowserWindow (1280x800)
└─────────────────┘    │
                       ├──► Load dist/index.html
                       ├──► Init auto-updater (nếu packaged)
                       └──► Setup IPC handlers
                              │
                              ▼
                    ┌──────────────────┐
                    │  index.html      │
                    │  (Tailwind CDN)  │──► Load /src/main.jsx
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  main.jsx        │──► createRoot('#root')
                    │                  │──► <StrictMode><App /></>
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  App.jsx         │
                    │  GreenpanDesign  │──► Render UI + Calculations
                    │  _Final()        │
                    └──────────────────┘
```

### 2. Quy Trình Tính Toán FEM

```
User nhập dữ liệu vào form
      │
      ▼
┌────────────────────────┐
│ React State (config)   │
│ • Spans, supports      │
│ • Material properties  │
│ • Loads (wind, dead)   │
│ • Point loads          │
└────────────────────────┘
      │
      ▼
┌────────────────────────┐
│ useMemo(() => {...})   │ ◄─── Tự động tính lại khi config thay đổi
│ Calculation Engine     │
└────────────────────────┘
      │
      ├──► 1. Tính EI, GA (độ cứng uốn, cắt)
      │
      ├──► 2. Xây dựng ma trận độ cứng phần tử (Timoshenko)
      │      timoshenkoElementK(EI, GA, L)
      │
      ├──► 3. Lắp ráp ma trận toàn cục K, vector tải F
      │      solveContinuousBeam()
      │
      ├──► 4. Áp dụng điều kiện biên (v=0 tại gối)
      │
      ├──── 5. Giải hệ phương trình Kd = F
      │      solveLinear() - Gaussian elimination
      │
      ├──► 6. Tính phản lực gối, nội lực (M, V)
      │
      ├──► 7. Kiểm tra khớp dẻo (plastic hinge)
      │      Nếu |M| > M_Rd → tạo khớp, phân phối lại
      │
      └──► 8. Tính ứng suất, độ võng
                │
                ▼
      ┌────────────────────────┐
      │ results = {            │
      │   deflection,          │
      │   moments, shear,      │
      │   stresses,            │
      │   status: 'pass/fail'  │
      │ }                      │
      └────────────────────────┘
                │
                ▼
      ┌────────────────────────┐
      │ Hiển thị kết quả       │
      │ • Biểu đồ (Recharts)   │
      │ • Sơ đồ SVG            │
      │ • Bảng số liệu         │
      └────────────────────────┘
```

### 3. Auto-Update Flow (Chỉ Khi Đóng Gói)

```
App đã đóng gói khởi động
      │
      ▼
main.cjs: initAutoUpdater()
      │
      ├──► autoUpdater.checkForUpdates()
      │           │
      │           ├──► GitHub API: latest release
      │           │
      │           ▼
      │    ┌──────────────────┐
      │    │ Update Available?│
      │    └──────────────────┘
      │           │
      │           ├─── YES ──► autoUpdater.downloadUpdate()
      │           │                    │
      │           │                    ▼
      │           │           Download progress → IPC → Renderer
      │           │                    │
      │           │                    ▼
      │           │           autoUpdater.quitAndInstall()
      │           │
      │           └─── NO ───► Continue normal operation
      │
      └──► Renderer: hiển thị trạng thái update
```

---

## 🧮 Kiến Trúc Module Tính Toán FEM

### Component Diagram - FEM Solver

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEM CALCULATION ENGINE                       │
│                    (trong App.jsx useMemo)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INPUT                          CORE FUNCTIONS                  │
│  ┌─────────────────┐           ┌─────────────────────────┐    │
│  │ config {        │           │ timoshenkoElementK()    │    │
│  │   spans[],      │──────────►│ • Tính K matrix 4×4     │    │
│  │   materials,    │           │ • Shear parameter ψ     │    │
│  │   loads,        │           └─────────────────────────┘    │
│  │   supports      │                      │                    │
│  │ }               │                      ▼                    │
│  └─────────────────┘           ┌─────────────────────────┐    │
│                                 │ consistentLoadUDL()     │    │
│                                 │ • Tải phân bố đều       │    │
│                                 └─────────────────────────┘    │
│                                            │                    │
│                                            ▼                    │
│  SOLVER                         ┌─────────────────────────┐    │
│  ┌─────────────────┐           │ solveContinuousBeam()   │    │
│  │ Global K, F     │◄──────────│ • Lắp ráp toàn cục      │    │
│  │                 │           │ • Áp dụng điều kiện biên│    │
│  │ [K]{d} = {F}    │           └─────────────────────────┘    │
│  │                 │                      │                    │
│  │                 │                      ▼                    │
│  │                 │           ┌─────────────────────────┐    │
│  └────────┬────────┘           │ solveLinear()           │    │
│           │                     │ • Gaussian elimination  │    │
│           │                     │ • Pivoting              │    │
│           │                     └─────────────────────────┘    │
│           │                                │                    │
│           ▼                                ▼                    │
│  ┌─────────────────┐           ┌─────────────────────────┐    │
│  │ Displacements   │           │ Element Forces          │    │
│  │ • Deflections   │           │ • Moments M             │    │
│  │ • Rotations     │           │ • Shear V               │    │
│  └─────────────────┘           └─────────────────────────┘    │
│           │                                │                    │
│           └────────────┬───────────────────┘                    │
│                        ▼                                        │
│           ┌─────────────────────────┐                          │
│           │ Post-Processing         │                          │
│           │ • Stress calculation    │                          │
│           │ • Plastic hinge check   │                          │
│           │ • Redistribution        │                          │
│           │ • Capacity checks       │                          │
│           └─────────────────────────┘                          │
│                        │                                        │
│                        ▼                                        │
│  OUTPUT               ┌─────────────────────────┐              │
│  ┌─────────────────┐ │ results {               │              │
│  │ Charts          │◄┤   deflectionData[],     │              │
│  │ • Deflection    │ │   momentData[],         │              │
│  │ • Moment        │ │   shearData[],          │              │
│  │ • Shear         │ │   stressData[],         │              │
│  │ • Stress        │ │   status,               │              │
│  └─────────────────┘ │   advice[]              │              │
│                      │ }                       │              │
│                      └─────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Công Thức Chính

#### 1. Ma Trận Độ Cứng Timoshenko
```
ψ = (12×EI) / (κ×GA×L²)
fac = EI / (L³ × (1+ψ))

[K]e = fac × [
  12,        6L,      -12,       6L
  6L,   (4+ψ)L²,     -6L,  (2-ψ)L²
 -12,       -6L,       12,      -6L
  6L,   (2-ψ)L²,     -6L,  (4+ψ)L²
]
```

#### 2. Tải Phân Bố Đều (UDL)
```
{F}e = [
  -qL/2
  -qL²/12
  -qL/2
  +qL²/12
]
```

#### 3. Ứng Suất
```
σ = M × z / I_eq

Kiểm tra:
- σ ≤ σ_y / γM_yield (Cường độ thép)
- σ ≤ σ_w / γM_wrinkling (Nhăn mặt)
```

---

## 🎨 Kiến Trúc Component React

### Component Hierarchy

```
App.jsx (GreenpanDesign_Final)
│
├── Header
│   ├── Logo
│   ├── Project Info
│   └── Update Status
│
├── Navigation Tabs
│   ├── Tab: Input
│   ├── Tab: Charts
│   └── Tab: Report
│
└── Main Content
    │
    ├── [Tab: Input] ──────────────────────┐
    │   │                                   │
    │   ├── Project Settings                │
    │   │   └── Input Fields                │
    │   │                                   │
    │   ├── Material Properties             │
    │   │   ├── Core Thickness Selector     │
    │   │   └── Skin Thickness Inputs       │
    │   │                                   │
    │   ├── Geometry Configuration          │
    │   │   ├── Span Inputs (dynamic)       │
    │   │   ├── Support Width Inputs        │
    │   │   └── Add/Remove Span Buttons     │
    │   │                                   │
    │   ├── Load Configuration              │
    │   │   ├── Wind Load                   │
    │   │   ├── Dead Load                   │
    │   │   ├── Live Load                   │
    │   │   ├── Thermal Load                │
    │   │   └── Point Loads (table)         │
    │   │                                   │
    │   └── Structural Diagram              │
    │       └── BeamDiagram / CeilingSchematic (SVG)
    │
    ├── [Tab: Charts] ─────────────────────┐
    │   │                                   │
    │   ├── Deflection Chart                │
    │   │   └── ResponsiveContainer         │
    │   │       └── ComposedChart (Recharts)│
    │   │                                   │
    │   ├── Moment Diagram                  │
    │   │   └── AreaChart + ReferenceLine   │
    │   │                                   │
    │   ├── Shear Force Diagram             │
    │   │   └── BarChart with Cells         │
    │   │                                   │
    │   └── Stress Distribution             │
    │       └── ComposedChart               │
    │
    └── [Tab: Report] ─────────────────────┐
        │                                   │
        ├── Report Header                   │
        │   ├── Project Info                │
        │   └── Timestamp                   │
        │                                   │
        ├── Input Summary Tables            │
        │   ├── Material Properties         │
        │   ├── Geometry                    │
        │   └── Loads                       │
        │                                   │
        ├── Structural Schematic (SVG)      │
        │                                   │
        ├── All Charts (print-optimized)    │
        │   ├── Deflection                  │
        │   ├── Moment                      │
        │   ├── Shear                       │
        │   └── Stress                      │
        │                                   │
        ├── Results Summary                 │
        │   ├── Max Values                  │
        │   ├── Utilization Ratios          │
        │   └── Safety Checks               │
        │                                   │
        ├── Conclusion                      │
        │   ├── Status (Pass/Fail)          │
        │   └── Recommendations             │
        │                                   │
        └── Print Button                    │
```

### State Management

```javascript
// Global State (useState)
config = {
  // Project metadata
  projectName: string,
  panelType: 'ceiling' | 'external' | 'internal',
  internalWallType: 'normal' | 'cold_storage',
  
  // Material properties (mm, MPa)
  coreThickness: number,
  skinOut: number,
  skinIn: number,
  steelYield: number,
  coreShearStrength: number,
  coreShearModulus: number,
  coreDensity: number,
  
  // Loads (kPa, °C)
  windPressure: number,
  windDirection: 'pressure' | 'suction',
  tempOut: number,
  tempIn: number,
  deadLoadMode: 'auto' | 'manual',
  deadLoadManual_kPa: number,
  liveLoad_kPa: number,
  
  // Geometry (m, mm)
  spans: number[],
  supportWidths: number[],
  panelWidth: number,
  
  // Design parameters
  screwStrength: number,
  screwSpacing: number,
  deflectionLimit: number,
  creepFactor: number,
  
  // Safety factors
  gammaG: number,
  gammaQ: number,
  gammaF_thermal: number,
  
  // Point loads
  pointLoads: Array<{
    x_m: number,
    P_kN: number,
    note: string,
    type: 'permanent' | 'variable'
  }>
}

// Computed Results (useMemo)
results = {
  // Geometry
  supportLocs: number[],
  totalLength: number,
  
  // Section properties
  EI: number,
  GA: number,
  I_eq: number,
  
  // Load cases
  qDead_kPa: number,
  qLive_kPa: number,
  qWind_kPa: number,
  
  // FEM solution arrays
  deflectionData: Array<{x, v, vSLS}>,
  momentData: Array<{x, M, MULS, MRd}>,
  shearData: Array<{x, V}>,
  stressData: Array<{x, sigmaOut, sigmaIn}>,
  
  // Max/min values
  maxDeflection: number,
  maxMoment: number,
  maxShear: number,
  maxStress: number,
  
  // Checks
  deflectionRatio: number,
  utilizationMoment: number,
  utilizationShear: number,
  
  // Status
  status: 'pass' | 'fail',
  advice: string[]
}
```

---

## 🔌 IPC Communication (Electron)

### Main Process → Renderer

```javascript
// main.cjs
mainWindow.webContents.send('auto-update', {
  event: 'checking' | 'available' | 'not-available' | 
         'download-progress' | 'downloaded' | 'error',
  version: string,
  percent: number,
  message: string,
  appVersion: string
})
```

### Renderer → Main Process

```javascript
// App.jsx
const ipcRenderer = window?.require?.('electron')?.ipcRenderer;

// Get app version
const version = await ipcRenderer.invoke('app-version');
```

---

## 📊 Data Flow Diagram

```
┌─────────────┐
│   User      │
│   Input     │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────┐
│  React State Management      │
│  setConfig(newValue)         │
└──────┬───────────────────────┘
       │ State change triggers
       ▼
┌──────────────────────────────┐
│  useMemo(() => {...})        │
│  Auto re-calculation         │
├──────────────────────────────┤
│  1. Material Properties      │
│     • EI, GA calculation     │
│     • Section properties     │
│                              │
│  2. Load Combinations        │
│     • Dead + Live            │
│     • Wind (pressure/suction)│
│     • Thermal                │
│     • Point loads            │
│                              │
│  3. FEM Analysis             │
│     • Element stiffness      │
│     • Global assembly        │
│     • Boundary conditions    │
│     • Linear solve           │
│                              │
│  4. Post-Process             │
│     • Internal forces        │
│     • Deflections            │
│     • Stresses               │
│                              │
│  5. Capacity Checks          │
│     • Deflection limit       │
│     • Moment capacity        │
│     • Shear capacity         │
│     • Stress limits          │
│                              │
│  6. Plastic Redistribution   │
│     • Hinge detection        │
│     • Iterative solve        │
│                              │
└──────┬───────────────────────┘
       │ return results
       ▼
┌──────────────────────────────┐
│  React Re-render             │
├──────────────────────────────┤
│  • Update SVG diagrams       │
│  • Update Recharts           │
│  • Update result tables      │
│  • Update status/advice      │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  User View Updated           │
│  • Input tab                 │
│  • Charts tab                │
│  • Report tab                │
└──────────────────────────────┘
```

---

## 🚀 Build & Deployment Pipeline

### Development Workflow

```
Developer
   │
   ├── npm run dev ──────► Vite Dev Server (localhost:5173)
   │                       │
   │                       └──► Hot Module Replacement (HMR)
   │
   ├── npm run build ────► vite build
   │                       │
   │                       └──► Output: dist/
   │                           ├── index.html
   │                           ├── assets/
   │                           │   ├── *.js
   │                           │   └── *.css
   │                           └── logo_app.*
   │
   └── npm run dist ─────► vite build && electron-builder
                           │
                           └──► Output: release/
                               └── Greenpan-Design-Setup-{version}.exe
```

### CI/CD Workflow (GitHub Actions)

```
git push origin main
   │
   ▼
┌─────────────────────────────────────────┐
│  GitHub Actions: release.yml            │
│  (runs-on: windows-latest)              │
├─────────────────────────────────────────┤
│  1. Checkout code                       │
│  2. Setup Node.js 20                    │
│  3. npm ci (install dependencies)       │
│  4. npm run release                     │
│     │                                   │
│     └──► semantic-release               │
│          ├── Analyze commits           │
│          │   (Conventional Commits)     │
│          │                              │
│          ├── Determine version          │
│          │   • feat: → minor            │
│          │   • fix:  → patch            │
│          │   • feat!: → major           │
│          │                              │
│          ├── Generate release notes     │
│          │                              │
│          ├── Update package.json        │
│          │                              │
│          ├── npm run dist               │
│          │   └──► electron-builder      │
│          │       └──► .exe + .blockmap  │
│          │                              │
│          └──► Create GitHub Release     │
│               ├── Tag version           │
│               ├── Upload assets:        │
│               │   • *.exe               │
│               │   • *.exe.blockmap      │
│               │   • latest*.yml         │
│               └── Publish               │
└─────────────────────────────────────────┘
   │
   ▼
GitHub Release Created
   │
   └──► electron-updater detects new version
        │
        └──► Auto-update for existing users
```

### Semantic Release Flow

```
Commit Messages (Conventional Commits)
│
├── feat: New feature ────────────► MINOR version bump (0.x.0)
│
├── fix: Bug fix ─────────────────► PATCH version bump (0.0.x)
│
├── feat!: Breaking change ───────► MAJOR version bump (x.0.0)
│
└── docs/chore/style: No release ─► Skip release
```

---

## 🎯 Key Design Patterns

### 1. Single Component Architecture
- **Mọi logic tính toán và UI đều trong App.jsx** (~2859 dòng)
- State tập trung trong `useState`
- Tính toán tự động với `useMemo`
- Không có Redux/Context - đủ đơn giản cho app này

### 2. FEM Solver Pattern
```
Input → Material Properties → Element Stiffness → 
Global Assembly → Boundary Conditions → Linear Solve → 
Post-Processing → Redistribution (if needed) → Output
```

### 3. Reactive Calculations
- `useMemo(() => {...}, [config])` - tự động tính lại khi config thay đổi
- Không cần button "Calculate" - real-time updates

### 4. Tab-Based UI
- 3 tabs: Input, Charts, Report
- Print mode: force switch to Report tab trước khi in

### 5. SVG Visualization
- Không dùng SVG markers (để PDF/print ổn định)
- Custom `ArrowHead` component vẽ bằng `<polygon>`
- Dimension lines với tính toán layout tự động

---

## 📐 Lý Thuyết Timoshenko Beam

### Sự Khác Biệt với Euler-Bernoulli

| Aspect | Euler-Bernoulli | Timoshenko |
|--------|-----------------|------------|
| Giả định | Mặt cắt vuông góc với trục trung hòa | Cho phép biến dạng cắt |
| Phù hợp | Dầm mảnh (L/h > 20) | Dầm thấp, sandwich panels |
| Độ cứng | Chỉ EI | EI + GA |
| Độ chính xác | Thấp cho panel sandwich | Cao ✓ |

### Shear Parameter ψ
```
ψ = (12×EI) / (κ×GA×L²)

Ý nghĩa:
- ψ → 0: Ảnh hưởng cắt không đáng kể → Euler-Bernoulli
- ψ lớn: Biến dạng cắt đáng kể → Timoshenko cần thiết

Panel sandwich: ψ thường lớn do GA nhỏ (lõi yếu)
```

### Plastic Hinge Redistribution
```
Khi |M_support| > M_Rd:
1. Tạo khớp dẻo tại gối
2. Moment tại gối = M_Rd (cố định)
3. Tách DOF góc xoay trái/phải
4. Giải lại FEM
5. Lặp tối đa 4 lần
```

---

## 🔒 Security & Updates

### Auto-Update Security
```
1. electron-updater chỉ chạy khi app.isPackaged = true
2. Download từ GitHub Releases (HTTPS)
3. Signature check bằng .yml metadata
4. Install sau 1.2s để user thấy progress
```

### Build Security
- `nodeIntegration: true` - CẦN CẨN THẬN (app tin cậy nội bộ)
- `contextIsolation: false` - Đơn giản hóa IPC
- Chỉ load từ file:// protocol (không có remote content)

---

## 📈 Performance Optimization

### 1. Calculation Caching
- `useMemo` prevents unnecessary recalculations
- Chỉ tính lại khi `config` thay đổi

### 2. SVG Rendering
- ViewBox scaling thay vì pixel-based
- Minimize DOM nodes: reuse shapes where possible

### 3. Chart Performance
- `ResponsiveContainer` với width="100%"
- Data decimation cho curves (sampling every Nth point)

### 4. Print Optimization
```css
@media print {
  • Force display: block cho Report tab
  • Hide navigation và buttons
  • Adjust chart heights (170px)
  • Page break avoidance
}
```

---

## 🐛 Debugging & Logging

### Development Tools
```bash
# Start dev server
npm run dev

# Build only (no package)
npm run build

# Preview built app
npm run preview

# Lint code
npm run lint

# Package for Windows
npm run dist
```

### Debug Locations
- **FEM solver**: `solveContinuousBeam()` trong App.jsx line ~731
- **Element stiffness**: `timoshenkoElementK()` line ~663
- **Load calculation**: `buildCaseLoads()` line ~931
- **Rendering**: React DevTools trong Chrome

---

## 📝 Coding Conventions

### Vietnamese Comments
- Heavy use of Vietnamese in code comments
- Variable names: mix of English + Vietnamese terms
- UI text: 100% Vietnamese

### Naming Patterns
- Functions: `camelCase` hoặc `snake_case`
- Components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- React hooks: standard `useState`, `useMemo`, `useEffect`

### Units Convention
```
Lengths:  mm (internal FEM), m (display)
Forces:   N (internal), kN (display)
Stress:   MPa
Pressure: kPa
Angle:    radian
```

---

## 🚦 Future Improvements

### Tính Năng Có Thể Thêm
1. **Export Excel**: Xuất kết quả ra file Excel
2. **Save/Load Projects**: Lưu config vào file JSON
3. **Multiple Load Cases**: So sánh nhiều trường hợp tải
4. **3D Visualization**: WebGL rendering với Three.js
5. **Database**: Lưu material library
6. **Multi-language**: Tiếng Anh + Tiếng Việt
7. **Advanced Charts**: Interactive tooltips, zoom, pan
8. **Optimization**: Tìm thiết kế tối ưu tự động

### Code Refactoring
1. **Split App.jsx**: Tách thành nhiều component nhỏ
2. **Separate FEM Module**: Move solver ra file riêng
3. **TypeScript**: Add type safety
4. **Unit Tests**: Jest + React Testing Library
5. **State Management**: Consider Zustand/Jotai nếu phức tạp hơn

---

## 📚 Tài Liệu Tham Khảo

### Standards & Codes
- Eurocode 3 (EN 1993): Steel structures
- Eurocode 9 (EN 1999): Aluminium structures  
- ECCS (European Convention for Constructional Steelwork): Sandwich panels

### Technical Resources
- Timoshenko Beam Theory
- Finite Element Method fundamentals
- Plastic Analysis & Redistribution
- Sandwich Panel Design Guide

### Libraries Documentation
- [React](https://react.dev/)
- [Electron](https://www.electronjs.org/)
- [Vite](https://vitejs.dev/)
- [Recharts](https://recharts.org/)
- [electron-builder](https://www.electron.build/)

---

## 📞 Liên Hệ & Đóng Góp

- **Repository**: https://github.com/huydaobk/sanwichpanel_caculation
- **Issues**: Báo lỗi tại GitHub Issues
- **Releases**: Tải phiên bản mới tại GitHub Releases

---

**Tài liệu này được tạo bởi: AI Coding Assistant**  
**Ngày cập nhật**: 2026-01-29
