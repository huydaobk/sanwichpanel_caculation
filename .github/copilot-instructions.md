# Greenpan Design - AI Coding Assistant Guidelines

## Project Overview
**Greenpan Design** is an Electron-based desktop application for structural analysis and design of sandwich panels. It combines React (UI) + Vite (build) + Electron (desktop) with complex finite element method (FEM) calculations using Timoshenko beam theory.

**Key Files:**
- [src/App.jsx](../src/App.jsx) - Monolithic component with FEM solver, UI, and visualization (~1500 lines)
- [main.cjs](../main.cjs) - Electron main process (window creation, file loading)
- [vite.config.js](../vite.config.js) - Build configuration (note: `base: './'` required for Electron relative paths)

## Architecture Patterns

### Single-Component React App
The entire UI, state, and calculations live in `GreenpanDesign_Final()` component. Key state structure:
```javascript
config = {
  // Project metadata
  projectName, panelType, internalWallType,
  // Material properties (mm, kPa, N/mm)
  coreThickness, skinOut, skinIn, steelYield, coreShearStrength, coreDensity,
  // Load & environmental
  windPressure, windDirection, tempOut, tempIn,
  // Geometry & constraints
  spans[], supportWidths[], screwStrength, deflectionLimit, creepFactor
}
```

### FEM Solver Architecture
**Timoshenko Beam Formulation** (handles shear deformation):
1. **Element Stiffness**: `timoshenkoElementK(EI, GA, L)` - 4×4 matrix with shear parameter ψ
2. **Load Vector**: `consistentLoadUDL(qDown, L)` - equivalent nodal forces/moments
3. **Continuous Beam Solver**: `solveContinuousBeam()` - assembles global K, applies constraints (v=0 at supports)
4. **Plastic Hinge Redistribution**: Iteratively forms hinges at supports when moment capacity exceeded
5. **Linear Solver**: Gaussian elimination with pivoting (`solveLinear`)

**Critical Details:**
- Deflection sign convention: positive v = upward, positive q = downward loading
- Shear parameter: `psi = (12*EI)/(κ*GA*L²)` where κ=1.0
- Units: lengths in mm, forces in N, pressures in kPa
- Hinge creation triggers when |M_support| > hingeTrigger × M_Rd (moment capacity)

### SVG Visualization Components
- **BeamDiagram**: Interactive structural diagram with support symbols, wind arrows, dimension lines
- **Charts**: Recharts for deflection, moment, shear, stress plots (ResponsiveContainer for responsiveness)
- **GridLayout**: Organized sections for input, results, reporting

## Development Workflows

### Build & Run
```bash
npm run dev        # Vite dev server (port 5173)
npm run build      # Vite build to dist/
npm run dist       # Build + electron-builder (creates installer)
npm run lint       # ESLint check
npm run preview    # Serve built dist/ locally
```

### Electron Workflow
- **Dev mode** (`npm run dev`): Loads from http://localhost:5173
- **Production** (`npm run dist`): Loads `dist/index.html` via `app.whenReady()` → `win.loadFile(path.join(__dirname, 'dist', 'index.html'))`
- **Key config**: `base: './'` in vite.config.js ensures relative asset paths work in packaged app

### Print/PDF Export
Currently uses browser print (Ctrl+P). Report tab must be active before printing to render all charts. See `handlePrint()` which sets tab and delays print by 250ms for render completion.

## Project-Specific Conventions

### Naming & Vietnamese Comments
- Heavy Vietnamese comments explaining calculations (e.g., "gió đẩy" = wind pressure, "gió hút" = suction)
- Component names like `GreenpanDesign_Final()`, `BeamDiagram()`, function names snake_case (e.g., `handleInputChange`)
- Prefer descriptive variable names: `timoshenkoElementK`, `solveContinuousBeam` over generic

### Numerical Stability
- Use `Number.isNaN()`, `Number.isFinite()` for validation
- Clamp near-zero values: `Math.max(GA, 1e-9)` to prevent division errors
- Pivot detection threshold: `1e-12` in Gaussian elimination
- Filter invalid array values: `.filter(v => v > 0)` before computations

### SVG/Canvas Rendering
- No SVG markers where custom drawing needed (use `<polygon>` for arrows instead)
- ViewBox scaling for responsive sizing: `viewBox="0 0 ${W} ${H}"` with percentage width
- Y-axis flips for visual/engineering convention alignment
- Dimension lines use helper marker `#arrowDim` (from defs)

### State Management Pattern
- Single `useState` for entire `config` object
- Handlers like `handleInputChange`, `handleSpanChange` use `.includes()` to check string fields vs numeric
- Immutable updates: spread operator `{...prev, [name]: value}`

## Integration Points & External Dependencies

### Key Dependencies
| Package | Purpose |
|---------|---------|
| **recharts** | Charting library for moment/shear/deflection plots |
| **lucide-react** | Icon library (Settings, Thermometer, TrendingUp, etc.) |
| **electron** | Desktop app framework |
| **vite** | Build tool with HMR |
| **electron-builder** | Packager for NSIS installer (.exe) |

### Material Properties & Constants
Hard-coded in `CONSTANTS` object:
```javascript
Ef: 210000 (steel E), Ec: 4.0 (core E), Gc: 3.5 (core G),
gammaF_wind: 2.1, gammaM_yield: 1.1, gammaM_shear: 1.25, ...
```
Material lookups by `panelType` ('external'/'internal') and `internalWallType` modify defaults.

### Cross-Tab Communication
State shared via React hooks. Tab switching via `setActiveTab('input'|'report'|...)` controls visibility. Print requires 'report' tab active for chart rendering.

## Common Tasks & Patterns

### Adding a New Input Field
1. Add to `config` state in `GreenpanDesign_Final()` with default value
2. Create `<input onChange={handleInputChange} name="newFieldName" ... />`
3. If numeric, handler parses with `parseFloat()` and validates with `Number.isNaN()`
4. Add label/unit in corresponding input section

### Modifying FEM Solver
- **Geometry changes**: Adjust `spansM` array input validation or add new constraint type
- **Load case**: Create new `consistentLoadUDL` variant or modify wind/thermal handling in calculation
- **Material behavior**: Update `CONSTANTS` or add conditional logic in element stiffness calculation
- **Hinges/redistribution**: Modify `REDISTRIBUTION.maxIter` or `hingeTrigger` threshold

### Adding a Chart
1. Import chart type from recharts (e.g., `BarChart`, `Line`)
2. Prepare data array with `{ x: position, [dataKey]: value }` structure
3. Wrap in `<ResponsiveContainer width="100%" height={300}>`
4. Use `<Tooltip />`, `<Legend />` for interactivity; `<ReferenceLine />` for critical values
