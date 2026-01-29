# Sơ Đồ Hệ Thống - Greenpan Design

Tài liệu này chứa các sơ đồ hệ thống được vẽ bằng Mermaid. Có thể xem trên GitHub hoặc các công cụ hỗ trợ Mermaid.

---

## 1. Sơ Đồ Tổng Quan Hệ Thống

```mermaid
graph TB
    subgraph "ELECTRON DESKTOP APP"
        subgraph "Main Process (main.cjs)"
            A[App Initialization]
            B[BrowserWindow]
            C[IPC Handlers]
            D[Auto Updater]
            D --> D1[GitHub Releases]
        end
        
        subgraph "Renderer Process (React + Vite)"
            E[React Application]
            F[State Management]
            G[FEM Calculation Engine]
            H[UI Components]
            
            E --> F
            F --> G
            G --> H
        end
        
        A --> B
        B --> E
        C <--> F
        D --> F
    end
    
    User((User)) --> E
    H --> User
    
    style A fill:#e1f5ff
    style E fill:#fff4e6
    style G fill:#ffe7e7
    style D1 fill:#e7ffe7
```

---

## 2. Kiến Trúc Chi Tiết Application

```mermaid
graph LR
    subgraph "Frontend Layer"
        UI[React UI Components]
        State[State Management]
        Viz[Visualization]
        
        UI --> State
        State --> Viz
    end
    
    subgraph "Calculation Engine"
        Input[Input Processing]
        Material[Material Properties]
        FEM[FEM Solver]
        PostProcess[Post Processing]
        
        Input --> Material
        Material --> FEM
        FEM --> PostProcess
    end
    
    subgraph "Platform Layer"
        Electron[Electron Runtime]
        NodeAPI[Node.js APIs]
        OS[Operating System]
        
        Electron --> NodeAPI
        NodeAPI --> OS
    end
    
    State --> Input
    PostProcess --> State
    UI --> Electron
    
    style FEM fill:#ffcccc
    style State fill:#ccffcc
    style Electron fill:#ccccff
```

---

## 3. Luồng Dữ Liệu (Data Flow)

```mermaid
flowchart TD
    Start([User Input]) --> Config[Update config State]
    Config --> Trigger{useMemo Triggered?}
    
    Trigger -->|Yes| CalcStart[Start Calculation]
    Trigger -->|No| Wait[Wait for change]
    
    CalcStart --> Material[Calculate Material Properties<br/>EI, GA, I_eq]
    Material --> Loads[Process Load Cases<br/>Dead, Live, Wind, Thermal]
    Loads --> Points[Add Point Loads]
    
    Points --> FEM1[Build Element Stiffness Matrices]
    FEM1 --> FEM2[Assemble Global K, F]
    FEM2 --> FEM3[Apply Boundary Conditions]
    FEM3 --> FEM4[Solve Linear System<br/>Kd = F]
    
    FEM4 --> Post1[Calculate Internal Forces<br/>M, V]
    Post1 --> Post2[Calculate Deflections]
    Post2 --> Post3[Calculate Stresses]
    
    Post3 --> Check{Plastic Hinge?}
    Check -->|Yes| Redist[Create Hinge<br/>Redistribute]
    Redist --> FEM2
    Check -->|No| Capacity[Check Capacities]
    
    Capacity --> Results[Update results State]
    Results --> Render[React Re-render]
    
    Render --> Display1[SVG Diagrams]
    Render --> Display2[Recharts Graphs]
    Render --> Display3[Result Tables]
    
    Display1 --> End([User View])
    Display2 --> End
    Display3 --> End
    
    Wait --> Config
    
    style Config fill:#e1f5ff
    style FEM1 fill:#ffe7e7
    style FEM2 fill:#ffe7e7
    style FEM3 fill:#ffe7e7
    style FEM4 fill:#ffe7e7
    style Results fill:#e7ffe7
    style End fill:#fff4e6
```

---

## 4. Kiến Trúc Component React

```mermaid
graph TB
    App[GreenpanDesign_Final<br/>Main Component]
    
    subgraph "UI State"
        S1[config State]
        S2[activeTab State]
        S3[printMode State]
        S4[updateStatus State]
    end
    
    subgraph "Computed Values"
        Calc[useMemo: results]
    end
    
    subgraph "Visual Components"
        Header[Header Component]
        Nav[Navigation Tabs]
        TabInput[Input Tab]
        TabCharts[Charts Tab]
        TabReport[Report Tab]
    end
    
    subgraph "Input Tab Content"
        I1[Project Settings]
        I2[Material Inputs]
        I3[Geometry Inputs]
        I4[Load Inputs]
        I5[BeamDiagram/CeilingSchematic]
    end
    
    subgraph "Charts Tab Content"
        C1[Deflection Chart]
        C2[Moment Diagram]
        C3[Shear Diagram]
        C4[Stress Distribution]
    end
    
    subgraph "Report Tab Content"
        R1[Report Header]
        R2[Input Summary]
        R3[Schematic Diagram]
        R4[All Charts]
        R5[Results Summary]
        R6[Conclusion]
        R7[Print Button]
    end
    
    App --> S1
    App --> S2
    App --> S3
    App --> S4
    
    S1 --> Calc
    
    App --> Header
    App --> Nav
    App --> TabInput
    App --> TabCharts
    App --> TabReport
    
    TabInput --> I1
    TabInput --> I2
    TabInput --> I3
    TabInput --> I4
    TabInput --> I5
    
    TabCharts --> C1
    TabCharts --> C2
    TabCharts --> C3
    TabCharts --> C4
    
    TabReport --> R1
    TabReport --> R2
    TabReport --> R3
    TabReport --> R4
    TabReport --> R5
    TabReport --> R6
    TabReport --> R7
    
    Calc --> I5
    Calc --> C1
    Calc --> C2
    Calc --> C3
    Calc --> C4
    Calc --> R4
    Calc --> R5
    
    style App fill:#ffcccc
    style Calc fill:#ccffcc
    style S1 fill:#e1f5ff
```

---

## 5. FEM Solver Architecture

```mermaid
graph TB
    Input[Input: spans, loads, materials]
    
    subgraph "Pre-Processing"
        PP1[Calculate EI, GA]
        PP2[Process Load Combinations]
        PP3[Convert Units]
        PP4[Build Point Load Array]
    end
    
    subgraph "Element Level"
        E1[timoshenkoElementK<br/>4x4 Stiffness Matrix]
        E2[consistentLoadUDL<br/>Load Vector]
        E3[consistentLoadPoint<br/>Point Load Vector]
    end
    
    subgraph "Global Assembly"
        G1[Loop over elements]
        G2[Create DOF mapping]
        G3[Assemble K matrix]
        G4[Assemble F vector]
    end
    
    subgraph "Boundary Conditions"
        BC1[Set v=0 at supports]
        BC2[Separate free/constrained DOFs]
        BC3[Extract Kff, Ff]
    end
    
    subgraph "Solution"
        Sol1[solveLinear<br/>Gaussian Elimination]
        Sol2[Back substitution]
        Sol3[Full displacement vector]
    end
    
    subgraph "Post-Processing"
        Post1[Calculate Reactions]
        Post2[Element Forces M, V]
        Post3[Interpolate at plot points]
        Post4[Calculate Stresses]
    end
    
    subgraph "Plastic Analysis"
        PA1{|M| > M_Rd?}
        PA2[Create Hinge at node]
        PA3[Split rotation DOF]
        PA4[Iteration counter++]
    end
    
    Input --> PP1
    PP1 --> PP2
    PP2 --> PP3
    PP3 --> PP4
    
    PP4 --> E1
    PP4 --> E2
    PP4 --> E3
    
    E1 --> G1
    E2 --> G1
    E3 --> G1
    
    G1 --> G2
    G2 --> G3
    G3 --> G4
    
    G4 --> BC1
    BC1 --> BC2
    BC2 --> BC3
    
    BC3 --> Sol1
    Sol1 --> Sol2
    Sol2 --> Sol3
    
    Sol3 --> Post1
    Post1 --> Post2
    Post2 --> Post3
    Post3 --> Post4
    
    Post2 --> PA1
    PA1 -->|Yes| PA2
    PA2 --> PA3
    PA3 --> PA4
    PA4 -->|iter < 4| G1
    PA1 -->|No| Output[Output: results]
    PA4 -->|iter >= 4| Output
    
    Post4 --> Output
    
    style E1 fill:#ffe7e7
    style Sol1 fill:#fff4e6
    style Post2 fill:#e7ffe7
    style PA1 fill:#ffcccc
```

---

## 6. Auto-Update Mechanism

```mermaid
sequenceDiagram
    participant User
    participant App as Electron App
    participant Updater as electron-updater
    participant GitHub as GitHub Releases
    participant Installer
    
    User->>App: Launch App
    App->>App: Check app.isPackaged
    
    alt app is packaged
        App->>Updater: initAutoUpdater()
        Updater->>GitHub: checkForUpdates()
        GitHub-->>Updater: Latest release info
        
        alt Update Available
            Updater->>App: emit 'update-available'
            App->>User: Show "Update available"
            
            Updater->>GitHub: downloadUpdate()
            GitHub-->>Updater: Download .exe + .blockmap
            
            loop Download Progress
                Updater->>App: emit 'download-progress'
                App->>User: Show progress bar
            end
            
            Updater->>App: emit 'update-downloaded'
            App->>User: Show "Installing in 1.2s"
            
            Note over Updater: Wait 1200ms
            
            Updater->>Installer: quitAndInstall()
            Installer->>App: Close app
            Installer->>User: Install new version
            Installer->>App: Restart app
        else No Update
            Updater->>App: emit 'update-not-available'
            App->>User: Continue normal operation
        end
    else app not packaged
        App->>User: Development mode (no update check)
    end
```

---

## 7. Build & Release Pipeline

```mermaid
flowchart LR
    subgraph "Local Development"
        Dev[Developer]
        Code[Write Code]
        Commit[git commit]
        Push[git push]
        
        Dev --> Code
        Code --> Commit
        Commit --> Push
    end
    
    subgraph "GitHub Actions"
        Trigger[Push to main]
        Checkout[Checkout Code]
        Setup[Setup Node 20]
        Install[npm ci]
        Release[npm run release]
        
        Trigger --> Checkout
        Checkout --> Setup
        Setup --> Install
        Install --> Release
    end
    
    subgraph "Semantic Release"
        Analyze[Analyze Commits]
        Version[Bump Version]
        Notes[Generate Notes]
        Build[npm run dist]
        Publish[Create GitHub Release]
        
        Analyze --> Version
        Version --> Notes
        Notes --> Build
        Build --> Publish
    end
    
    subgraph "electron-builder"
        ViteBuild[vite build → dist/]
        Package[Package Electron App]
        NSIS[Create NSIS Installer]
        
        ViteBuild --> Package
        Package --> NSIS
    end
    
    subgraph "GitHub Release"
        Upload[Upload Assets]
        Tag[Create Git Tag]
        Assets[.exe, .blockmap, .yml]
        
        Upload --> Tag
        Upload --> Assets
    end
    
    Push --> Trigger
    Release --> Analyze
    Build --> ViteBuild
    NSIS --> Publish
    Publish --> Upload
    
    Assets --> EndUsers[End Users<br/>Auto-update]
    
    style Release fill:#ffe7e7
    style Build fill:#fff4e6
    style Publish fill:#e7ffe7
    style EndUsers fill:#e1f5ff
```

---

## 8. State Management Pattern

```mermaid
stateDiagram-v2
    [*] --> InitialState: Component Mount
    
    InitialState --> UserInput: User changes input
    UserInput --> ConfigUpdate: handleInputChange()
    ConfigUpdate --> TriggerCalc: setConfig()
    
    TriggerCalc --> Computing: useMemo triggered
    Computing --> Calculation: Calculate materials
    Calculation --> FEMSolve: Run FEM solver
    
    FEMSolve --> CheckHinge: Check plastic hinges
    CheckHinge --> FEMSolve: If hinge found
    CheckHinge --> PostProcess: No more hinges
    
    PostProcess --> Results: Update results
    Results --> ReRender: React re-render
    
    ReRender --> Display: Update all views
    Display --> Idle: Ready for input
    
    Idle --> UserInput: User changes again
    Idle --> Print: User clicks Print
    
    Print --> SwitchTab: setActiveTab('report')
    SwitchTab --> WaitRender: Wait 2 frames
    WaitRender --> DoPrint: window.print()
    DoPrint --> Idle: Print complete
    
    Idle --> [*]: Component unmount
```

---

## 9. Load Combination Strategy

```mermaid
graph TB
    subgraph "Load Types"
        Dead[Dead Load<br/>Self-weight]
        Live[Live Load<br/>User-defined]
        Wind[Wind Load<br/>Pressure/Suction]
        Thermal[Thermal Load<br/>Temperature difference]
        Point[Point Loads<br/>Equipment, lights]
    end
    
    subgraph "Service Limit State (SLS)"
        SLS[SLS Combination]
        QSLS[q_SLS = Dead + Live + Wind]
        DefLimit[Deflection Check<br/>δ < L/limit]
    end
    
    subgraph "Ultimate Limit State (ULS)"
        ULS[ULS Combination]
        QULS[q_ULS = γG·Dead + γQ·Live + γW·Wind]
        Capacity[Capacity Checks<br/>M < M_Rd, V < V_Rd]
    end
    
    subgraph "Thermal Analysis (Separate)"
        ThermULS[Thermal ULS<br/>ΔT × γT]
        ThermSLS[Thermal SLS<br/>ΔT × 1.0]
        MomentT[Thermal Moment<br/>M_T = -EI·α·ΔT/e]
    end
    
    Dead --> QSLS
    Live --> QSLS
    Wind --> QSLS
    
    Dead --> QULS
    Live --> QULS
    Wind --> QULS
    
    QSLS --> DefLimit
    QULS --> Capacity
    
    Thermal --> ThermULS
    Thermal --> ThermSLS
    ThermULS --> MomentT
    ThermSLS --> MomentT
    
    MomentT --> Capacity
    MomentT --> DefLimit
    
    Point --> QSLS
    Point --> QULS
    
    DefLimit --> Result[Final Results]
    Capacity --> Result
    
    style QSLS fill:#e1f5ff
    style QULS fill:#ffe7e7
    style MomentT fill:#fff4e6
    style Result fill:#e7ffe7
```

---

## 10. Component Interaction Diagram

```mermaid
graph TB
    subgraph "User Interactions"
        U1[Change Input Value]
        U2[Add/Remove Span]
        U3[Switch Tab]
        U4[Click Print]
        U5[Add Point Load]
    end
    
    subgraph "Event Handlers"
        H1[handleInputChange]
        H2[addSpan/removeSpan]
        H3[setActiveTab]
        H4[handlePrint]
        H5[Point Load Handlers]
    end
    
    subgraph "State Updates"
        S1[setConfig]
        S2[setActiveTab]
        S3[setPrintMode]
    end
    
    subgraph "Side Effects"
        E1[useMemo recalculates]
        E2[Tab visibility change]
        E3[window.print]
        E4[IPC: listen auto-update]
    end
    
    subgraph "Visual Updates"
        V1[Input Form Re-render]
        V2[SVG Diagrams Update]
        V3[Charts Re-render]
        V4[Results Tables Update]
        V5[Print Dialog Opens]
    end
    
    U1 --> H1
    U2 --> H2
    U3 --> H3
    U4 --> H4
    U5 --> H5
    
    H1 --> S1
    H2 --> S1
    H3 --> S2
    H4 --> S2
    H4 --> S3
    H5 --> S1
    
    S1 --> E1
    S2 --> E2
    S3 --> E3
    
    E1 --> V1
    E1 --> V2
    E1 --> V3
    E1 --> V4
    E2 --> V1
    E3 --> V5
    
    E4 --> V1
    
    style S1 fill:#ffe7e7
    style E1 fill:#fff4e6
    style V2 fill:#e7ffe7
    style V3 fill:#e7ffe7
```

---

## 11. Timoshenko vs Euler-Bernoulli Comparison

```mermaid
graph LR
    subgraph "Euler-Bernoulli"
        EB1[Assumption:<br/>No shear deformation]
        EB2[Stiffness: EI only]
        EB3[Suitable for:<br/>Slender beams<br/>L/h > 20]
        EB4[Accuracy:<br/>LOW for sandwich]
        
        EB1 --> EB2
        EB2 --> EB3
        EB3 --> EB4
    end
    
    subgraph "Timoshenko Used Here"
        T1[Includes:<br/>Shear deformation]
        T2[Stiffness: EI + GA]
        T3[Suitable for:<br/>Sandwich panels<br/>Any L/h ratio]
        T4[Accuracy:<br/>HIGH ✓]
        
        T1 --> T2
        T2 --> T3
        T3 --> T4
    end
    
    Problem[Sandwich Panel<br/>Weak core<br/>Large shear effect] --> T1
    Problem -.Not suitable.-> EB1
    
    T4 --> Recommended[✓ Recommended]
    EB4 --> NotRecommended[✗ Not recommended]
    
    style T1 fill:#e7ffe7
    style T2 fill:#e7ffe7
    style T3 fill:#e7ffe7
    style T4 fill:#e7ffe7
    style Recommended fill:#ccffcc
    style NotRecommended fill:#ffcccc
```

---

## 12. File Structure Tree

```
sanwichpanel_caculation/
│
├── 📁 .github/
│   └── 📁 workflows/
│       └── 📄 release.yml          ← CI/CD pipeline
│
├── 📁 public/
│   ├── 🖼️ logo_app.ico
│   ├── 🖼️ logo_app.jpg
│   └── 🖼️ vite.svg
│
├── 📁 src/
│   ├── 📄 main.jsx                 ← React entry
│   ├── 📄 index.css
│   ├── 📄 App.jsx ⭐               ← MAIN COMPONENT (2859 lines)
│   ├── 📄 App.css
│   └── 📁 assets/
│
├── 📄 main.cjs ⭐                   ← Electron main process
├── 📄 index.html
├── 📄 vite.config.js               ← base: './' for Electron
├── 📄 package.json                 ← Dependencies & build config
├── 📄 eslint.config.js
├── 📄 README.md
├── 📄 ARCHITECTURE.md              ← This documentation
└── 📄 SYSTEM_DIAGRAMS.md           ← Mermaid diagrams

⭐ = Critical files
```

---

## 13. Technology Stack Layers

```mermaid
graph TB
    subgraph "Layer 1: Desktop Platform"
        OS[Operating System<br/>Windows/macOS/Linux]
        NodeJS[Node.js Runtime]
        Electron[Electron Framework]
    end
    
    subgraph "Layer 2: Build Tools"
        Vite[Vite Build Tool<br/>HMR + Fast build]
        Builder[electron-builder<br/>Packaging]
        Semantic[semantic-release<br/>Versioning]
    end
    
    subgraph "Layer 3: Frontend Framework"
        React[React 18<br/>UI Components]
        ReactDOM[React DOM<br/>Rendering]
        Hooks[Hooks: useState, useMemo]
    end
    
    subgraph "Layer 4: UI & Visualization"
        Tailwind[Tailwind CSS<br/>Styling]
        Recharts[Recharts<br/>Interactive Charts]
        SVG[SVG Native<br/>Custom Diagrams]
        Icons[Lucide Icons]
    end
    
    subgraph "Layer 5: Application Logic"
        State[State Management<br/>React State]
        FEM[FEM Calculation<br/>Timoshenko Solver]
        PostProc[Post-Processing<br/>Results Analysis]
    end
    
    subgraph "Layer 6: Update & Deploy"
        Updater[electron-updater<br/>Auto-update]
        GitHub[GitHub Releases<br/>Distribution]
        CI[GitHub Actions<br/>CI/CD]
    end
    
    OS --> NodeJS
    NodeJS --> Electron
    Electron --> Vite
    Vite --> React
    React --> ReactDOM
    ReactDOM --> Hooks
    
    Hooks --> State
    State --> FEM
    FEM --> PostProc
    
    PostProc --> Recharts
    PostProc --> SVG
    
    Tailwind --> ReactDOM
    Icons --> ReactDOM
    
    Vite --> Builder
    Builder --> GitHub
    Semantic --> GitHub
    CI --> Builder
    
    Electron --> Updater
    Updater --> GitHub
    
    style Electron fill:#9cf
    style React fill:#61dafb
    style FEM fill:#ff6b6b
    style GitHub fill:#28a745
```

---

## Ghi Chú

- Tất cả sơ đồ trên có thể xem trực tiếp trên GitHub (hỗ trợ Mermaid)
- Hoặc sử dụng các công cụ như:
  - [Mermaid Live Editor](https://mermaid.live/)
  - VS Code extension: Markdown Preview Mermaid Support
  - Draw.io (import Mermaid syntax)

---

**Được tạo bởi**: AI Coding Assistant  
**Ngày**: 2026-01-29
