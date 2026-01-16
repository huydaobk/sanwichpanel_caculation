import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell
} from 'recharts';
import {
  Settings, Thermometer, TrendingUp, AlertCircle, Printer, BookOpen, Activity, Info
} from 'lucide-react';

// ===============================
// ✅ SƠ ĐỒ TÍNH (SVG) - TRẦN: X toàn dầm
// - KHÔNG dùng marker => in PDF/tab Báo cáo chắc chắn hiện mũi tên
// - Dimension đẩy xa gối + né ký hiệu gối
// - Mũi tên nhỏ + bỏ mũi tên đen
// ===============================
const CeilingSchematic = ({ config, results }) => {
  const spans = (config?.spans || []).map(s => Number(s) || 0);
  const supportLocs = (results?.supportLocs && results.supportLocs.length > 0)
    ? results.supportLocs
    : (() => {
      let acc = 0;
      const arr = [0];
      spans.forEach(L => { acc += L; arr.push(Number(acc.toFixed(3))); });
      return arr;
    })();

  const totalM = supportLocs[supportLocs.length - 1] || spans.reduce((a, b) => a + b, 0);
  const windDir = config?.windDirection || 'pressure';

  const qDead = Number(results?.qDead_kPa) || 0;
  const qLive = Number(results?.qLive_kPa) || 0;
  const qWindRaw = Number(results?.qWind_kPa);

  const windSign = windDir === 'suction' ? -1 : 1;
  const qWindFallback = (Number(config?.windPressure) || 0) * windSign;
  const qWind = Number.isFinite(qWindRaw) ? qWindRaw : qWindFallback;

  // Point loads (nếu có): {x_m, P_kN, note}
  const pls = (config?.pointLoads || [])
    .map(p => ({
      x_m: Number(p?.x_m) || 0,
      P_kN: Number(p?.P_kN) || 0, // (+) xuống
      note: p?.note || ''
    }))
    .filter(p => p.x_m >= 0 && p.x_m <= totalM);

  // SVG geometry
  const W = 900, H = 260;
  const marginL = 40, marginR = 40;
  const beamY = 70;

  const supTopY = beamY + 6;
  const supBottomY = 112;

  const dimY = 180;      // ✅ đẩy xuống xa gối
  const loadTopY = 46;

  const xMap = (xm) => {
    if (totalM <= 0) return marginL;
    return marginL + (xm / totalM) * (W - marginL - marginR);
  };

  const supports = supportLocs.map((xm, i) => ({ xm, i, x: xMap(xm) }));

  const nArrows = 14;

  // ✅ helper: arrow head polygon (không marker)
  const ArrowHead = ({ x, y, dir = 'down', w = 6, h = 6, fill = '#64748b' }) => {
    let pts = '';
    if (dir === 'down') pts = `${x},${y} ${x - w / 2},${y - h} ${x + w / 2},${y - h}`;
    if (dir === 'up') pts = `${x},${y} ${x - w / 2},${y + h} ${x + w / 2},${y + h}`;
    if (dir === 'left') pts = `${x},${y} ${x + h},${y - w / 2} ${x + h},${y + w / 2}`;
    if (dir === 'right') pts = `${x},${y} ${x - h},${y - w / 2} ${x - h},${y + w / 2}`;
    return <polygon points={pts} fill={fill} />;
  };

  const LoadArrow = ({ x, y1, y2, up, color }) => {
    const stroke = color;
    return (
      <g>
        <line x1={x} y1={y1} x2={x} y2={y2} stroke={stroke} strokeWidth="1.4" />
        <ArrowHead x={x} y={y2} dir={up ? 'up' : 'down'} w={6} h={6} fill={stroke} />
      </g>
    );
  };

  const DimLine = ({ x1, x2, y }) => {
    const stroke = '#64748b';
    return (
      <g>
        <line x1={x1} y1={y} x2={x2} y2={y} stroke={stroke} strokeWidth="1.4" />
        <ArrowHead x={x1} y={y} dir="right" w={6} h={6} fill={stroke} />
        <ArrowHead x={x2} y={y} dir="left" w={6} h={6} fill={stroke} />
      </g>
    );
  };

  const loadBands = [
    {
      key: 'dead',
      label: 'Dead load',
      value: qDead,
      color: '#64748b',
      up: false,
      y1: loadTopY,
      y2: beamY - 8,
      labelY: loadTopY - 6,
    },
    {
      key: 'live',
      label: 'Hoạt tải',
      value: qLive,
      color: '#3b82f6',
      up: false,
      y1: loadTopY + 14,
      y2: beamY - 18,
      labelY: loadTopY + 8,
    },
    {
      key: 'wind',
      label: 'Tải gió',
      value: qWind,
      color: '#16a34a',
      up: qWind < 0,
      y1: qWind < 0 ? (beamY + 48) : (loadTopY + 28),
      y2: qWind < 0 ? (beamY + 18) : (beamY - 28),
      labelY: qWind < 0 ? (beamY + 58) : (loadTopY + 22),
    },
  ].filter(item => Number(item.value) !== 0);

  const legendItems = loadBands.length > 0
    ? loadBands
    : [{ key: 'none', label: 'Không có tải phân bố', value: 0, color: '#94a3b8', up: false, y1: 0, y2: 0 }];

  const legendHeight = Math.max(1, legendItems.length) * 14 + 12;

  return (
    <div className="w-full" style={{ overflow: 'visible' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="220" style={{ overflow: 'visible' }}>
        <text x={marginL} y={14} fontSize="12" fill="#0f172a" fontWeight="700">
          Sơ đồ tính (X toàn dầm) — Tấm trần
        </text>

        {/* Beam */}
        <line x1={marginL} y1={beamY} x2={W - marginR} y2={beamY} stroke="#0f172a" strokeWidth="4" />

        {/* Supports */}
        {supports.map(s => (
          <g key={s.i}>
            <polygon
              points={`${s.x},${supTopY} ${s.x - 14},${supBottomY} ${s.x + 14},${supBottomY}`}
              fill="#e2e8f0"
              stroke="#64748b"
              strokeWidth="1"
            />
            <line x1={s.x - 22} y1={supBottomY} x2={s.x + 22} y2={supBottomY} stroke="#64748b" strokeWidth="2" />
            <text x={s.x} y={supBottomY + 16} fontSize="10" fill="#334155" textAnchor="middle" fontWeight="700">
              Gối {s.i}
            </text>
          </g>
        ))}

        {/* Dimension lines per span */}
        {supports.slice(0, -1).map((s, idx) => {
          const s2 = supports[idx + 1];
          const x1 = s.x;
          const x2 = s2.x;
          const Lm = spans[idx] || (supportLocs[idx + 1] - supportLocs[idx]) || 0;
          const mid = (x1 + x2) / 2;

          return (
            <g key={`dim-${idx}`}>
              <DimLine x1={x1} x2={x2} y={dimY} />
              <text x={mid} y={dimY - 7} fontSize="10" fill="#334155" textAnchor="middle" fontWeight="700">
                L{idx + 1} = {Lm.toFixed(2)} m
              </text>
            </g>
          );
        })}

        {/* UDL arrows */}
        {(() => {
          const xs = [];
          for (let i = 0; i < nArrows; i++) {
            const t = (i + 0.5) / nArrows;
            xs.push(marginL + t * (W - marginL - marginR));
          }

          const legendX = W - marginR - 280;
          const legendY = dimY + 12;

          return (
            <g>
              {loadBands.map(item => (
                <g key={`band-${item.key}`}>
                  <text
                    x={marginL - 6}
                    y={item.labelY}
                    fontSize="10"
                    fill={item.color}
                    textAnchor="end"
                    fontWeight="600"
                  >
                    {item.label}
                  </text>
                  {xs.map((x, i) => (
                    <LoadArrow
                      key={`${item.key}-${i}`}
                      x={x}
                      y1={item.y1}
                      y2={item.y2}
                      up={item.up}
                      color={item.color}
                    />
                  ))}
                </g>
              ))}

              {/* legend box */}
              <rect
                x={legendX}
                y={legendY}
                width={260}
                height={legendHeight}
                rx={8}
                fill="#f8fafc"
                stroke="#e2e8f0"
              />
              {legendItems.map((item, idx) => (
                <g key={`legend-${item.key}`} transform={`translate(${legendX + 12}, ${legendY + 18 + idx * 14})`}>
                  <rect x={0} y={-8} width={16} height={6} rx={2} fill={item.color} />
                  <text x={22} y={-2} fontSize="10" fill="#0f172a" fontWeight="600">
                    {item.label}{item.key === 'none' ? '' : `: ${Math.abs(Number(item.value)).toFixed(3)} kPa`}
                  </text>
                </g>
              ))}
            </g>
          );
        })()}

        {/* Point loads */}
        {pls.map((pl, idx) => {
          const x = xMap(pl.x_m);
          const down = pl.P_kN >= 0;
          const stroke = '#ef4444';

          const yFrom = down ? (loadTopY + 8) : (beamY + 38);
          const yTo = down ? (beamY - 8) : (beamY + 8);

          const nearestSupport = supports.reduce((best, s) => {
            const dist = Math.abs(s.x - x);
            if (!best || dist < best.dist) return { x: s.x, xm: s.xm, dist };
            return best;
          }, null);

          const dimX1 = nearestSupport ? nearestSupport.x : marginL;
          const dimX2 = x;
          const pointDimY = dimY - 20;
          const dimStart = Math.min(dimX1, dimX2);
          const dimEnd = Math.max(dimX1, dimX2);
          const dimLabelX = (dimStart + dimEnd) / 2;
          const dimLabelValue = Math.abs((pl.x_m || 0) - (nearestSupport?.xm || 0));

          return (
            <g key={`pl-${idx}`}>
              <line x1={x} y1={yFrom} x2={x} y2={yTo} stroke={stroke} strokeWidth="2.2" />
              <ArrowHead x={x} y={yTo} dir={down ? 'down' : 'up'} w={11} h={11} fill={stroke} />
              <circle cx={x} cy={yTo} r="4.5" fill={stroke} />
              <text x={x + 10} y={Math.min(yFrom, yTo) - 2} fontSize="11" fill="#7f1d1d" fontWeight="700">
                P = {Math.abs(pl.P_kN).toFixed(2)} kN
              </text>
              {pl.note ? (
                <text x={x + 10} y={Math.min(yFrom, yTo) + 12} fontSize="10" fill="#7f1d1d">
                  {pl.note}
                </text>
              ) : null}

              <line
                x1={x}
                y1={beamY}
                x2={x}
                y2={pointDimY}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <line
                x1={dimX1}
                y1={beamY}
                x2={dimX1}
                y2={pointDimY}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <DimLine x1={dimStart} x2={dimEnd} y={pointDimY} />
              <text x={dimLabelX} y={pointDimY - 6} fontSize="9" fill="#334155" textAnchor="middle" fontWeight="600">
                X = {dimLabelValue.toFixed(2)} m
              </text>
            </g>
          );
        })}

        <text x={marginL} y={H - 10} fontSize="10" fill="#64748b">
          Trục X: 0 → {totalM.toFixed(2)} m (toàn dầm)
        </text>
      </svg>
    </div>
  );
};

// ✅ Helper: tìm max/min (dùng để vẽ đường đứng + label tự động)
const getExtrema = (data, key) => {
  let max = { x: 0, value: -Infinity };
  let min = { x: 0, value: Infinity };

  for (const p of data || []) {
    const v = Number(p?.[key]);
    if (!Number.isFinite(v)) continue;

    if (v > max.value) max = { x: p.x, value: v };
    if (v < min.value) min = { x: p.x, value: v };
  }

  if (!Number.isFinite(max.value)) max = { x: 0, value: 0 };
  if (!Number.isFinite(min.value)) min = { x: 0, value: 0 };

  return { max, min };
};

// ✅ Steel density (kg/m3)
const RHO_STEEL = 7850;

// ✅ Tự trọng panel theo kPa
const calcSelfWeight_kPa = ({ coreDensity, coreThickness_mm, skinOut_mm, skinIn_mm }) => {
  const tCore_m = (Number(coreThickness_mm) || 0) / 1000;
  const tSteel_m = ((Number(skinOut_mm) || 0) + (Number(skinIn_mm) || 0)) / 1000;
  const rhoCore = Number(coreDensity) || 0;

  // kg/m2
  const massPerArea = rhoCore * tCore_m + RHO_STEEL * tSteel_m;

  // N/m2
  const w_Nm2 = massPerArea * 9.81;

  // kPa = N/m2 / 1000
  return w_Nm2 / 1000;
};

// ✅ Equivalent nodal load cho Point Load P tại vị trí a (mm) trong phần tử dài L (mm)
// Quy ước:
// - PDown > 0: tải xuống
// - F dương lên => tải xuống => F âm
// - M dương CCW
const consistentLoadPoint = (PDown, a, L) => {
  const P = Number(PDown) || 0;
  const aa = Math.min(Math.max(Number(a) || 0, 0), L);
  const b = L - aa;
  const L2 = L * L;
  const L3 = L2 * L;

  const F1 = -P * (b * b) * (3 * aa + b) / L3;
  const F2 = -P * (aa * aa) * (aa + 3 * b) / L3;
  const M1 = -P * aa * (b * b) / L2;
  const M2 = +P * (aa * aa) * b / L2;

  return [F1, M1, F2, M2];
};

// ✅ BeamDiagram (cho vách) — mũi tên nhỏ + bỏ mũi tên đen + in PDF chắc hiện
const BeamDiagram = ({ spansM = [], windDirection = 'pressure', windPressure = 0 }) => {
  const spans = (spansM || []).map(v => Number(v) || 0).filter(v => v > 0);
  const totalL = spans.reduce((a, b) => a + b, 0) || 1;

  const W = 900;
  const H = 200;
  const padL = 50;
  const padR = 30;

  const beamY = 92;
  const dimY = 178;
  const dimTextY = dimY - 10;

  const isDown = windDirection === 'pressure';
  const windText = isDown ? 'GIÓ ĐẨY (Pressure) → tải xuống' : 'GIÓ HÚT (Suction) → tải lên';

  const xOf = (xm) => padL + (xm / totalL) * (W - padL - padR);

  const supportLocs = [0];
  let acc = 0;
  for (const L of spans) { acc += L; supportLocs.push(acc); }

  const nArrows = Math.max(10, Math.round(totalL * 4));
  const arrows = Array.from({ length: nArrows + 1 }, (_, i) => (i / nArrows) * totalL);

  const windX = xOf(totalL * 0.18);

  const ArrowHead = ({ x, y, dir = 'down', w = 6, h = 6, fill = '#64748b' }) => {
    let pts = '';
    if (dir === 'down') pts = `${x},${y} ${x - w / 2},${y - h} ${x + w / 2},${y - h}`;
    if (dir === 'up') pts = `${x},${y} ${x - w / 2},${y + h} ${x + w / 2},${y + h}`;
    if (dir === 'left') pts = `${x},${y} ${x + h},${y - w / 2} ${x + h},${y + w / 2}`;
    if (dir === 'right') pts = `${x},${y} ${x - h},${y - w / 2} ${x - h},${y + w / 2}`;
    return <polygon points={pts} fill={fill} />;
  };

  const WindArrow = ({ x, y1, y2, down }) => {
    const stroke = '#16a34a';
    return (
      <g>
        <line x1={x} y1={y1} x2={x} y2={y2} stroke={stroke} strokeWidth="1.2" opacity="0.95" />
        <ArrowHead x={x} y={y2} dir={down ? 'down' : 'up'} w={6} h={6} fill={stroke} />
      </g>
    );
  };

  const DimLine = ({ x1, x2, y }) => {
    const stroke = '#64748b'; // ✅ bỏ đen
    return (
      <g>
        <line x1={x1} y1={y} x2={x2} y2={y} stroke={stroke} strokeWidth="1.2" opacity="0.9" />
        <ArrowHead x={x1} y={y} dir="right" w={6} h={6} fill={stroke} />
        <ArrowHead x={x2} y={y} dir="left" w={6} h={6} fill={stroke} />
      </g>
    );
  };

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="160" className="block">
        <rect x={windX - 160} y={8} width={320} height={24} rx={6} fill="#f3f4f6" stroke="#d1d5db" />
        <text x={windX} y={25} textAnchor="middle" fontSize="12" fontWeight="800" fill="#111827">
          {windText}{Number.isFinite(Number(windPressure)) ? ` (q = ${Number(windPressure).toFixed(2)} kPa)` : ''}
        </text>

        <line x1={xOf(0)} y1={beamY} x2={xOf(totalL)} y2={beamY} stroke="#111827" strokeWidth="4" />

        {supportLocs.map((xm, i) => {
          const x = xOf(xm);
          const tri = ` ${x},${beamY} ${x - 14},${beamY + 22} ${x + 14},${beamY + 22} `;
          return (
            <g key={i}>
              <polygon points={tri} fill="#e5e7eb" stroke="#111827" strokeWidth="1.2" />
              <text x={x} y={beamY + 38} textAnchor="middle" fontSize="10" fill="#111827" fontWeight="700">
                G{i}
              </text>
            </g>
          );
        })}

        {/* ✅ UDL arrows (no marker => in report chắc hiện) */}
        {arrows.map((xm, idx) => {
          const x = xOf(xm);
          const y1 = isDown ? 60 : 72;
          const y2 = isDown ? 82 : 50;
          return <WindArrow key={idx} x={x} y1={y1} y2={y2} down={isDown} />;
        })}

        {/* Dimension lines từng nhịp + đường gióng */}
        {spans.map((L, i) => {
          const xL = xOf(supportLocs[i]);
          const xR = xOf(supportLocs[i + 1]);

          const x1 = xL;
          const x2 = xR;

          const mid = (x1 + x2) / 2;
          const extTop = beamY + 4;
          const extBot = dimY - 6;

          return (
            <g key={i}>
              <line x1={xL} y1={extTop} x2={xL} y2={extBot} stroke="#111827" strokeWidth="1" opacity="0.35" />
              <line x1={xR} y1={extTop} x2={xR} y2={extBot} stroke="#111827" strokeWidth="1" opacity="0.35" />

              <DimLine x1={x1} x2={x2} y={dimY} />

              <text x={mid} y={dimTextY} textAnchor="middle" fontSize="10" fill="#111827">
                L{i + 1} = {Number(L).toFixed(2)} m
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default function GreenpanDesign_Final() {
  // --- CONFIG STATE ---
  const [config, setConfig] = useState({
    projectName: 'Nhà máy Greenpan - GĐ1',
    panelType: 'ceiling',
    internalWallType: 'normal',
    coreThickness: 50,
    skinOut: 0.45,
    skinIn: 0.45,
    panelWidth: 1000,
    steelYield: 280,
    coreShearStrength: 0.12,
    coreShearModulus: 3.5,
    kappaShear: 1.0,
    coreDensity: 42,
    windPressure: 0.8,
    windDirection: 'pressure',
    tempOut: 65,
    tempIn: 25,
    gammaF_thermal: 1.5,
    screwStrength: 2.0,
    screwSpacing: 1000,
    deflectionLimit: 150,
    creepFactor: 2.4, // ✅ dùng cho trần + kho lạnh
    creepFactorBending: 0,
    spans: [3.0, 3.0],
    supportWidths: [60, 60, 60],
    deadLoadMode: 'auto',
    deadLoadManual_kPa: 0,
    liveLoad_kPa: 0.25,
    gammaG: 1.35,
    gammaQ: 1.5,
    pointLoads: [
      { x_m: 1.5, P_kN: 0.30, note: 'Đèn', type: 'permanent' },
      { x_m: 4.5, P_kN: 0.30, note: 'Máng cáp', type: 'permanent' },
    ],
  });

  const [activeTab, setActiveTab] = useState('input');
  const [printMode, setPrintMode] = useState(false);

  // --- CONSTANTS ---
  const CONSTANTS = {
    Ef: 210000,
    Ec: 4.0,
    fCc: 0.10,
    alpha: 1.2e-5,
    gammaF_wind: 2.1,
    gammaM_yield: 1.1,
    gammaM_shear: 1.25,
    gammaM_wrinkling: 1.2,
    gammaM_screw: 1.33,
  };

  // --- HANDLERS ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (['panelType', 'windDirection', 'internalWallType', 'projectName', 'deadLoadMode'].includes(name)) {
      if (name === 'panelType') {
        const recommendedLimit =
          value === 'external' ? 150 :
            value === 'internal' ? 200 :
              200;
        setConfig(prev => ({
          ...prev,
          [name]: value,
          deflectionLimit: recommendedLimit,
          internalWallType: value === 'external' ? 'normal' : prev.internalWallType,
          pointLoads: value === 'ceiling' ? prev.pointLoads : []
        }));
      } else {
        setConfig(prev => ({ ...prev, [name]: value }));
      }
    } else {
      const parsed = parseFloat(value);
      const newValue = Number.isNaN(parsed) ? '' : parsed;
      setConfig(prev => ({ ...prev, [name]: newValue }));
    }
  };

  const handlePanelWidthChange = (e) => {
    const parsed = parseFloat(e.target.value);
    const newValue = Number.isNaN(parsed) ? '' : parsed;
    setConfig(prev => ({
      ...prev,
      panelWidth: newValue,
      ...(Number.isFinite(newValue) ? { screwSpacing: newValue } : {})
    }));
  };

  const handleSpanChange = (index, value) => {
    const newSpans = [...config.spans];
    const parsed = parseFloat(value);
    newSpans[index] = Number.isNaN(parsed) ? '' : parsed;
    setConfig(prev => ({ ...prev, spans: newSpans }));
  };

  const handleSupportWidthChange = (index, value) => {
    const newSupportWidths = [...config.supportWidths];
    const parsed = parseFloat(value);
    newSupportWidths[index] = Number.isNaN(parsed) ? '' : parsed;
    setConfig(prev => ({ ...prev, supportWidths: newSupportWidths }));
  };

  const addSpan = () => {
    if (config.spans.length < 5) {
      setConfig(prev => ({ ...prev, spans: [...prev.spans, 3.0], supportWidths: [...prev.supportWidths, 60] }));
    }
  };

  const removeSpan = () => {
    if (config.spans.length > 1) {
      const newSpans = [...config.spans]; newSpans.pop();
      const newSupportWidths = [...config.supportWidths]; newSupportWidths.pop();
      setConfig(prev => ({ ...prev, spans: newSpans, supportWidths: newSupportWidths }));
    }
  };

  const setCoreThickness = (val) => setConfig(prev => ({ ...prev, coreThickness: val }));

  // ✅ FIX: In/PDF ổn định (chuyển sang tab report trước, đợi render xong rồi in)
  const handlePrint = () => {
    setActiveTab('report');
    setPrintMode(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        setPrintMode(false);
      });
    });
  };

  // =========================
  // PATCH B: FEM (Timoshenko) + Redistribution (plastic hinge ở gối)
  // =========================
  const KAPPA_SHEAR = Number(config.kappaShear) || 1.0;
  const REDISTRIBUTION = {
    enabled: true,
    maxIter: 4,
    hingeTrigger: 1.0,
  };

  const timoshenkoElementK = (EI, GA, L, kappa = 1.0) => {
    const GAeff = Math.max(GA, 1e-9);
    const psi = (12 * EI) / (kappa * GAeff * L * L);
    const fac = EI / (Math.pow(L, 3) * (1 + psi));
    const L2 = L * L;

    return [
      [fac * 12, fac * (6 * L), fac * (-12), fac * (6 * L)],
      [fac * (6 * L), fac * ((4 + psi) * L2), fac * (-6 * L), fac * ((2 - psi) * L2)],
      [fac * (-12), fac * (-6 * L), fac * 12, fac * (-6 * L)],
      [fac * (6 * L), fac * ((2 - psi) * L2), fac * (-6 * L), fac * ((4 + psi) * L2)],
    ];
  };

  // qDown: dương = tải xuống (N/mm). FE: v dương = hướng lên.
  const consistentLoadUDL = (qDown, L) => {
    return [-qDown * L / 2, -qDown * L * L / 12, -qDown * L / 2, qDown * L * L / 12];
  };

  const matVec = (A, x) => {
    const n = A.length;
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < x.length; j++) s += A[i][j] * x[j];
      y[i] = s;
    }
    return y;
  };

  const solveLinear = (Ain, bin) => {
    const n = Ain.length;
    const A = Ain.map(r => r.slice());
    const b = bin.slice();

    for (let k = 0; k < n; k++) {
      let piv = k;
      let maxAbs = Math.abs(A[k][k]);
      for (let i = k + 1; i < n; i++) {
        const v = Math.abs(A[i][k]);
        if (v > maxAbs) { maxAbs = v; piv = i; }
      }
      if (maxAbs < 1e-12) return new Array(n).fill(0);

      if (piv !== k) {
        [A[k], A[piv]] = [A[piv], A[k]];
        [b[k], b[piv]] = [b[piv], b[k]];
      }

      for (let i = k + 1; i < n; i++) {
        const f = A[i][k] / A[k][k];
        if (Math.abs(f) < 1e-18) continue;
        for (let j = k; j < n; j++) A[i][j] -= f * A[k][j];
        b[i] -= f * b[k];
      }
    }

    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
      x[i] = s / A[i][i];
    }
    return x;
  };

  // hinges[i] = true => node i (gối trong) bị "tách góc" (khớp)
  // hinges[i] = true => node i (gối trong) bị "tách góc" (khớp)
  const solveContinuousBeam = ({ spansM, qDown, EI, GA, hinges, pointLoads, thermalMoment = 0 }) => {
    const nSpan = spansM.length;
    const nNode = nSpan + 1;

    const vDof = Array.from({ length: nNode }, (_, i) => i);
    let next = nNode;

    const thShared = new Array(nNode).fill(null);
    const thLeft = new Array(nNode).fill(null);
    const thRight = new Array(nNode).fill(null);

    for (let i = 0; i < nNode; i++) {
      const isEnd = (i === 0 || i === nNode - 1);
      const isHinge = !isEnd && hinges?.[i] === true;

      if (!isHinge) {
        thShared[i] = next++;
      } else {
        thLeft[i] = next++;
        thRight[i] = next++;
      }
    }

    const ndof = next;
    const K = Array.from({ length: ndof }, () => new Array(ndof).fill(0));
    const F = new Array(ndof).fill(0);

    const elem = [];
    const addK = (I, J, val) => { K[I][J] += val; };

    for (let e = 0; e < nSpan; e++) {
      const i = e;
      const j = e + 1;
      const L = (Number(spansM[e]) || 0) * 1000;
      if (L <= 0) continue;

      const dof = [];
      dof[0] = vDof[i];
      dof[2] = vDof[j];

      if (i !== 0 && i !== nNode - 1 && hinges?.[i]) dof[1] = thRight[i];
      else dof[1] = thShared[i];

      if (j !== 0 && j !== nNode - 1 && hinges?.[j]) dof[3] = thLeft[j];
      else dof[3] = thShared[j];

      const ke = timoshenkoElementK(EI, GA, L, KAPPA_SHEAR);
      const fe = consistentLoadUDL(qDown, L);

      // ✅ Thermal Nodal Loads: [0, -Mt, 0, Mt]
      const feTemp = [0, -thermalMoment, 0, thermalMoment];

      const x0 = spansM.slice(0, e).reduce((s, v) => s + (Number(v) || 0), 0) * 1000;
      const x1 = x0 + L;

      let fePoint = [0, 0, 0, 0];
      for (const pl of pointLoads || []) {
        const xg = Number(pl.x_mm);
        const Pn = Number(pl.P_N);
        if (!Number.isFinite(xg) || !Number.isFinite(Pn)) continue;
        if (xg < x0 - 1e-9 || xg > x1 + 1e-9) continue;

        const a = xg - x0;
        const fep = consistentLoadPoint(Pn, a, L);
        fePoint = fePoint.map((v, k) => v + fep[k]);
      }

      const feTotal = fe.map((v, k) => v + fePoint[k] + feTemp[k]);

      for (let a = 0; a < 4; a++) {
        F[dof[a]] += feTotal[a];
        for (let b = 0; b < 4; b++) addK(dof[a], dof[b], ke[a][b]);
      }

      elem.push({ e, i, j, L, dof, ke, fe: feTotal, qDown });
    }

    const constrained = vDof.slice();
    const free = [];
    for (let d = 0; d < ndof; d++) {
      if (!constrained.includes(d)) free.push(d);
    }

    const Kff = free.map(r => free.map(c => K[r][c]));
    const Ff = free.map(r => F[r]);

    const df = free.length > 0 ? solveLinear(Kff, Ff) : [];
    const d = new Array(ndof).fill(0);
    for (let k = 0; k < free.length; k++) d[free[k]] = df[k];

    const Kd = matVec(K, d);
    const reactions = new Array(nNode).fill(0);
    for (let i = 0; i < nNode; i++) {
      const dofi = vDof[i];
      reactions[i] = Kd[dofi] - F[dofi]; // (+) lên
    }

    const elementForces = elem.map(el => {
      const de = el.dof.map(idx => d[idx]);
      const p = matVec(el.ke, de).map((v, k) => v - el.fe[k]);
      const V1 = p[0];
      const M1 = -p[1];
      const V2 = p[2];
      const M2 = -p[3];

      return { ...el, p, V1, M1, V2, M2 };
    });

    return { ndof, d, reactions, elementForces, nNode };
  };

  const beamShapeW = (L, x, v1, th1, v2, th2) => {
    const xi = x / L;
    const N1 = 1 - 3 * xi * xi + 2 * xi * xi * xi;
    const N2 = L * (xi - 2 * xi * xi + xi * xi * xi);
    const N3 = 3 * xi * xi - 2 * xi * xi * xi;
    const N4 = L * (-xi * xi + xi * xi * xi);
    return N1 * v1 + N2 * th1 + N3 * v2 + N4 * th2;
  };

  // --- CALCULATION ENGINE ---
  const results = useMemo(() => {
    const panelWidth = Number(config.panelWidth) || 1000;
    const coreShearModulus = Number(config.coreShearModulus) || 0;
    const gammaThermal = Number(config.gammaF_thermal) || 1.0;

    const dC = Number(config.coreThickness) || 0;
    const tF1 = Number(config.skinOut) || 0;
    const tF2 = Number(config.skinIn) || 0;

    const zOut = dC / 2 + tF1 / 2;
    const zIn = -(dC / 2 + tF2 / 2);
    const e = zOut - zIn;

    const Af1 = panelWidth * tF1;
    const Af2 = panelWidth * tF2;
    const Ac = panelWidth * dC;

    const zNA = (Af1 + Af2) > 0 ? (Af1 * zOut + Af2 * zIn) / (Af1 + Af2) : 0;

    const I_face_out = panelWidth * Math.pow(tF1, 3) / 12;
    const I_face_in = panelWidth * Math.pow(tF2, 3) / 12;
    const I_core = panelWidth * Math.pow(dC, 3) / 12;

    const EI_faces = CONSTANTS.Ef * (I_face_out + Af1 * Math.pow(zOut - zNA, 2) + I_face_in + Af2 * Math.pow(zIn - zNA, 2));
    const EI_core = CONSTANTS.Ec * (I_core + Ac * Math.pow(zNA, 2));
    const EI = EI_faces + EI_core;

    const I_eq = CONSTANTS.Ef > 0 ? EI / CONSTANTS.Ef : 0;
    const zOutEff = Math.abs(zOut - zNA);
    const zInEff = Math.abs(zIn - zNA);
    const zMax = Math.max(zOutEff, zInEff);

    const GA_inst = coreShearModulus * Ac;
    const qLineFactor = panelWidth / 1000;

    const windBase = Math.abs(Number(config.windPressure) || 0);
    const windSign = config.windDirection === 'suction' ? -1 : 1;
    const qWindDisplay_kPa = windBase * windSign;

    let qDead_kPa = 0;
    let qLive_kPa = 0;

    if (config.panelType === 'ceiling') {
      if (config.deadLoadMode === 'manual') {
        qDead_kPa = Number(config.deadLoadManual_kPa) || 0;
      } else {
        qDead_kPa = calcSelfWeight_kPa({
          coreDensity: config.coreDensity,
          coreThickness_mm: config.coreThickness,
          skinOut_mm: config.skinOut,
          skinIn_mm: config.skinIn,
        });
      }
      qLive_kPa = Number(config.liveLoad_kPa) || 0;
    }

    const gammaG = Number(config.gammaG) || 1.35;
    const gammaQ = Number(config.gammaQ) || 1.5;

    // Load Combinations (Mechanical Only) - Envelope pressure/suction
    const baseCases = [
      {
        id: 'pressure',
        qWind_kPa: windBase,
        gammaG: gammaG,
        gammaQ: gammaQ,
        includeLiveSLS: true,
        includeVariablePoints: true,
      },
      {
        id: 'suction',
        qWind_kPa: -windBase,
        gammaG: 0.9 * gammaG,
        gammaQ: 0,
        includeLiveSLS: false,
        includeVariablePoints: false,
      },
    ];

    const buildCaseLoads = (caseDef) => {
      if (config.panelType === 'ceiling') {
        const liveSLS = caseDef.includeLiveSLS ? qLive_kPa : 0;
        const liveULS = caseDef.gammaQ > 0 ? qLive_kPa : 0;
        const qSLS_kPa = qDead_kPa + liveSLS + caseDef.qWind_kPa;
        const qULS_kPa = (caseDef.gammaG * qDead_kPa) + (caseDef.gammaQ * liveULS) + (CONSTANTS.gammaF_wind * caseDef.qWind_kPa);
        return {
          ...caseDef,
          qSLS_kPa,
          qULS_kPa,
          qSLS_line: qSLS_kPa * qLineFactor,
          qULS_line: qULS_kPa * qLineFactor,
        };
      }

      const qSLS_kPa = caseDef.qWind_kPa;
      const qULS_kPa = caseDef.qWind_kPa * CONSTANTS.gammaF_wind;
      return {
        ...caseDef,
        qSLS_kPa,
        qULS_kPa,
        qSLS_line: qSLS_kPa * qLineFactor,
        qULS_line: qULS_kPa * qLineFactor,
      };
    };

    const mechanicalCases = baseCases.map(buildCaseLoads);
    const selectedCase = mechanicalCases.find(caseDef => caseDef.qWind_kPa === qWindDisplay_kPa) || mechanicalCases[0];

    // Thermal Load
    const tempOut = Number(config.tempOut) || 0;
    const tempIn = Number(config.tempIn) || 0;
    const dT = tempOut - tempIn;

    // Thermal Moment: M = EI * alpha * dT / e
    const dT_ULS = dT * gammaThermal;
    const dT_SLS = dT * 1.0;

    const Mt_Unit = (e > 0) ? (-EI * CONSTANTS.alpha / e) : 0;
    const Mt_ULS = Mt_Unit * dT_ULS;
    const Mt_SLS = Mt_Unit * dT_SLS;

    const spansM = config.spans.map(s => Number(s) || 0);
    const nSpan = spansM.length;
    const nNode = nSpan + 1;

    // ✅ CREEP:
    // - internal cold_storage: creep cho toàn bộ tải SLS (độ cứng cắt giảm dài hạn)
    // - ceiling: creep chỉ cho tải lâu dài (dead + point loads)
    // - còn lại: không creep
    const isColdStorage = config.panelType === 'internal' && config.internalWallType === 'cold_storage';
    const creepMode = isColdStorage ? 'all' : (config.panelType === 'ceiling' ? 'sustained_dead' : 'none');
    const phiShear = creepMode !== 'none' ? (Number(config.creepFactor) || 0) : 0;
    const phiBending = creepMode !== 'none' ? (Number(config.creepFactorBending) || 0) : 0;
    const GA_long = GA_inst / Math.max(1 + phiShear, 1e-6);
    const EI_long = EI / Math.max(1 + phiBending, 1e-6);

    const limitDenom = Number(config.deflectionLimit) || 150;

    const sigma_w = 0.5 * Math.sqrt(CONSTANTS.Ef * CONSTANTS.Ec * Math.max(coreShearModulus, 0));
    const sigma_w_design = sigma_w / CONSTANTS.gammaM_wrinkling;
    const steelYield = Number(config.steelYield) || 280;
    const sigma_y_design = steelYield / CONSTANTS.gammaM_yield;
    const sigma_comp_limit = Math.min(sigma_w_design, sigma_y_design);
    const sigma_limit = sigma_comp_limit;
    const M_Rd = (sigma_comp_limit * I_eq) / Math.max(zMax, 1e-9);
    const stressFromMoment = (moment) => (Math.abs(moment) * zMax) / Math.max(I_eq, 1e-9);

    // support ticks
    let supportLocs = [0];
    let accum = 0;
    spansM.forEach(Lm => { accum += Lm; supportLocs.push(parseFloat(accum.toFixed(2))); });

    const totalLength_mm = spansM.reduce((s, v) => s + (Number(v) || 0), 0) * 1000;

    const pointLoads = (config.panelType === 'ceiling' ? (config.pointLoads || []) : [])
      .map(pl => ({
        x_mm: (Number(pl.x_m) || 0) * 1000,
        P_N: (Number(pl.P_kN) || 0) * 1000,
        note: pl.note || '',
        type: pl.type || 'permanent',
      }))
      .filter(pl => Number.isFinite(pl.x_mm) && Number.isFinite(pl.P_N))
      .filter(pl => pl.x_mm >= 0 && pl.x_mm <= totalLength_mm);

    const qDead_line = qDead_kPa * qLineFactor;

    const pointLoadsPermanent = pointLoads.filter(pl => pl.type !== 'variable');

    const scalePointLoads = (loads, gammaG_case, gammaQ_case, includeVariable) => {
      return loads
        .filter(pl => includeVariable || pl.type !== 'variable')
        .map(pl => ({
          ...pl,
          P_N: pl.P_N * (pl.type === 'variable' ? gammaQ_case : gammaG_case),
        }));
    };

    const scalePointLoadsSLS = (loads, includeVariable) => {
      return loads
        .filter(pl => includeVariable || pl.type !== 'variable')
        .map(pl => ({ ...pl }));
    };

    const emptySol = { elementForces: [], reactions: new Array(nNode).fill(0), d: [] };

    const solULS_Temp = (EI > 0 && nSpan >= 1)
      ? solveContinuousBeam({ spansM, qDown: 0, EI, GA: GA_inst, hinges: new Array(nNode).fill(false), pointLoads: [], thermalMoment: Mt_ULS })
      : emptySol;

    const solSLS_Temp = (EI > 0 && nSpan >= 1)
      ? solveContinuousBeam({ spansM, qDown: 0, EI, GA: GA_inst, hinges: new Array(nNode).fill(false), pointLoads: [], thermalMoment: Mt_SLS })
      : emptySol;

    let solSLS_Sust_Short = emptySol;
    let solSLS_Sust_Long = emptySol;

    if (EI > 0 && nSpan >= 1 && creepMode === 'sustained_dead') {
      const hasSust = Math.abs(qDead_kPa) > 1e-12 || pointLoadsPermanent.length > 0;
      if (hasSust) {
        solSLS_Sust_Short = solveContinuousBeam({ spansM, qDown: qDead_line, EI, GA: GA_inst, hinges: new Array(nNode).fill(false), pointLoads: pointLoadsPermanent, thermalMoment: 0 });
        solSLS_Sust_Long = solveContinuousBeam({ spansM, qDown: qDead_line, EI: EI_long, GA: GA_long, hinges: new Array(nNode).fill(false), pointLoads: pointLoadsPermanent, thermalMoment: 0 });
      }
    }

    const getElem = (sol, eIdx) => sol?.elementForces?.find(x => x.e === eIdx);

    const caseResults = mechanicalCases.map((caseDef) => {
      const pointLoadsSLS = scalePointLoadsSLS(pointLoads, caseDef.includeVariablePoints);
      const pointLoadsULS = scalePointLoads(pointLoads, caseDef.gammaG, caseDef.gammaQ, caseDef.includeVariablePoints);

      let hinges = new Array(nNode).fill(false);
      let solULS_Mech = emptySol;

      if (EI > 0 && nSpan >= 1) {
        for (let it = 0; it < (REDISTRIBUTION.enabled ? REDISTRIBUTION.maxIter : 1); it++) {
          solULS_Mech = solveContinuousBeam({ spansM, qDown: caseDef.qULS_line, EI, GA: GA_inst, hinges, pointLoads: pointLoadsULS, thermalMoment: 0 });

          if (!REDISTRIBUTION.enabled || M_Rd <= 0) break;

          let changed = false;
          for (let i = 1; i <= nNode - 2; i++) {
            if (hinges[i]) continue;

            const M_mech_L = getElem(solULS_Mech, i - 1)?.M2 || 0;
            const M_temp_L = getElem(solULS_Temp, i - 1)?.M2 || 0;
            const M_total_L = M_mech_L + M_temp_L;

            const M_mech_R = getElem(solULS_Mech, i)?.M1 || 0;
            const M_temp_R = getElem(solULS_Temp, i)?.M1 || 0;
            const M_total_R = M_mech_R + M_temp_R;

            const Mi = 0.5 * (M_total_L + M_total_R);

            if (Math.abs(Mi) > REDISTRIBUTION.hingeTrigger * M_Rd) {
              hinges[i] = true;
              changed = true;
            }
          }
          if (!changed) break;
        }
      }

      let solSLS_Mech_Short = emptySol;
      let solSLS_Mech_Long = emptySol;

      if (EI > 0 && nSpan >= 1) {
        solSLS_Mech_Short = solveContinuousBeam({ spansM, qDown: caseDef.qSLS_line, EI, GA: GA_inst, hinges: new Array(nNode).fill(false), pointLoads: pointLoadsSLS, thermalMoment: 0 });

        if (creepMode === 'all') {
          solSLS_Mech_Long = solveContinuousBeam({ spansM, qDown: caseDef.qSLS_line, EI: EI_long, GA: GA_long, hinges: new Array(nNode).fill(false), pointLoads: pointLoadsSLS, thermalMoment: 0 });
        }
      }

      return {
        ...caseDef,
        hinges,
        solULS_Mech,
        solSLS_Mech_Short,
        solSLS_Mech_Long,
        pointLoadsULS,
        pointLoadsSLS,
      };
    });

    // 3) Chart data
    let chartData = [];
    const steps = 40;

    let maxMomentNeg = -Infinity;
    let maxMomentPos = Infinity;
    let maxMomentAbs = 0;
    let maxShear = 0;
    let maxDeflection = 0;
    let maxDeflectionRatio = 0;
    let maxDeflectionForRatio = 0;
    let worstDeflectionLimit = 0;

    let globalX = 0; // mm

    // helper lấy DOF local
    const getLocalDisp = (el, sol) => {
      if (!el || !sol?.d) return [0, 0, 0, 0];
      const de = el.dof.map(idx => sol.d[idx] || 0);
      return de;
    };

    const supportMomentEnvelope = new Array(nNode).fill(0);
    const hingeNotes = new Set();

    caseResults.forEach(caseRes => {
      caseRes.hinges.forEach((isHinge, idx) => {
        if (isHinge) hingeNotes.add(idx);
      });

      for (let i = 0; i < nNode; i++) {
        const leftElem = i - 1 >= 0 ? getElem(caseRes.solULS_Mech, i - 1) : null;
        const rightElem = getElem(caseRes.solULS_Mech, i);
        const leftTemp = i - 1 >= 0 ? getElem(solULS_Temp, i - 1) : null;
        const rightTemp = getElem(solULS_Temp, i);

        const M_left = leftElem ? (leftElem.M2 + (leftTemp?.M2 || 0)) : null;
        const M_right = rightElem ? (rightElem.M1 + (rightTemp?.M1 || 0)) : null;

        const absLeft = M_left == null ? 0 : Math.abs(M_left);
        const absRight = M_right == null ? 0 : Math.abs(M_right);
        const absNode = Math.max(absLeft, absRight);

        if (absNode > supportMomentEnvelope[i]) supportMomentEnvelope[i] = absNode;
      }
    });

    for (let eIdx = 0; eIdx < nSpan; eIdx++) {
      const Lm = spansM[eIdx];
      const L = Lm * 1000;
      if (L <= 0) continue;

      const spanStart_mm = globalX;
      const spanEnd_mm = globalX + L;

      const spanCases = caseResults.map(caseRes => {
        const elULS_Mech = getElem(caseRes.solULS_Mech, eIdx);
        const elULS_Temp = getElem(solULS_Temp, eIdx);

        const V1_Mech = elULS_Mech ? elULS_Mech.V1 : 0;
        const M1_Mech = elULS_Mech ? elULS_Mech.M1 : 0;
        const V1_Temp = elULS_Temp ? elULS_Temp.V1 : 0;
        const M1_Temp = elULS_Temp ? elULS_Temp.M1 : 0;

        const elSLS_Mech = getElem(caseRes.solSLS_Mech_Short, eIdx);
        const de_Mech = getLocalDisp(elSLS_Mech, caseRes.solSLS_Mech_Short);

        const elSLS_MechLong = (creepMode === 'all') ? getElem(caseRes.solSLS_Mech_Long, eIdx) : null;
        const de_MechLong = getLocalDisp(elSLS_MechLong, caseRes.solSLS_Mech_Long);

        const loadsInSpan = (caseRes.pointLoadsULS || [])
          .filter(pl => pl.x_mm >= spanStart_mm - 1e-9 && pl.x_mm <= spanEnd_mm + 1e-9)
          .map(pl => ({ a_mm: pl.x_mm - spanStart_mm, P_N: pl.P_N, note: pl.note }))
          .sort((a, b) => a.a_mm - b.a_mm);

        return {
          caseRes,
          V1_Mech,
          M1_Mech,
          V1_Temp,
          M1_Temp,
          de_Mech,
          de_MechLong,
          loadsInSpan,
        };
      });

      const selectedSpan = spanCases.find(caseSpan => caseSpan.caseRes.id === selectedCase.id) || spanCases[0];

      const elSLS_Temp = getElem(solSLS_Temp, eIdx);
      const de_Temp = getLocalDisp(elSLS_Temp, solSLS_Temp);

      const elSus_Short = (creepMode === 'sustained_dead') ? getElem(solSLS_Sust_Short, eIdx) : null;
      const deSus_Short = getLocalDisp(elSus_Short, solSLS_Sust_Short);

      const elSus_Long = (creepMode === 'sustained_dead') ? getElem(solSLS_Sust_Long, eIdx) : null;
      const deSus_Long = getLocalDisp(elSus_Long, solSLS_Sust_Long);

      // Samples
      const samples = [];
      for (let i = 0; i <= steps; i++) samples.push({ x_mm: (i / steps) * L, pr: 1, mode: 'grid' });
      spanCases.forEach(caseSpan => {
        for (const ev of caseSpan.loadsInSpan) {
          samples.push({ x_mm: ev.a_mm, pr: 0, mode: 'pre' });
          samples.push({ x_mm: ev.a_mm, pr: 2, mode: 'post' });
        }
      });
      samples.sort((u, v) => (u.x_mm - v.x_mm) || (u.pr - v.pr));

      const sumPoint = (loads, x_mm, mode) => {
        let sP = 0;
        for (const ev of loads) {
          if (mode === 'pre') { if (ev.a_mm < x_mm - 1e-9) sP += ev.P_N; }
          else { if (ev.a_mm <= x_mm + 1e-9) sP += ev.P_N; }
        }
        return sP;
      };

      let spanMaxDeflection = 0;

      for (const smp of samples) {
        const x = smp.x_mm;

        const w_temp_up = beamShapeW(L, x, de_Temp[0], de_Temp[1], de_Temp[2], de_Temp[3]);
        const w_temp_down = -w_temp_up;

        const selectedLoads = selectedSpan ? selectedSpan.loadsInSpan : [];
        const selectedDeMech = selectedSpan ? selectedSpan.de_Mech : [0, 0, 0, 0];
        const selectedDeMechLong = selectedSpan ? selectedSpan.de_MechLong : [0, 0, 0, 0];
        const selectedCaseRes = selectedSpan ? selectedSpan.caseRes : { qULS_line: 0 };

        const PsumSelected = selectedSpan ? sumPoint(selectedLoads, x, smp.mode) : 0;
        const Vx_Mech_Selected = selectedSpan ? (selectedSpan.V1_Mech - selectedCaseRes.qULS_line * x - PsumSelected) : 0;
        const Mx_Mech_Selected = selectedSpan
          ? (selectedSpan.M1_Mech + selectedSpan.V1_Mech * x - (selectedCaseRes.qULS_line * x * x) / 2 - selectedLoads
            .filter(ev => (smp.mode === 'pre' ? ev.a_mm < x - 1e-9 : ev.a_mm <= x + 1e-9))
            .reduce((acc2, ev) => acc2 + ev.P_N * (x - ev.a_mm), 0))
          : 0;
        const Vx_Selected = Vx_Mech_Selected + (selectedSpan ? selectedSpan.V1_Temp : 0);
        const Mx_Selected = Mx_Mech_Selected + (selectedSpan ? selectedSpan.M1_Temp + selectedSpan.V1_Temp * x : 0);

        const w_mech_short_up_sel = beamShapeW(L, x, selectedDeMech[0], selectedDeMech[1], selectedDeMech[2], selectedDeMech[3]);

        let w_creep_inc_up_sel = 0;
        if (creepMode === 'all') {
          const w_long_up = beamShapeW(L, x, selectedDeMechLong[0], selectedDeMechLong[1], selectedDeMechLong[2], selectedDeMechLong[3]);
          w_creep_inc_up_sel = (w_long_up - w_mech_short_up_sel);
        } else if (creepMode === 'sustained_dead') {
          const w_sus_short = beamShapeW(L, x, deSus_Short[0], deSus_Short[1], deSus_Short[2], deSus_Short[3]);
          const w_sus_long = beamShapeW(L, x, deSus_Long[0], deSus_Long[1], deSus_Long[2], deSus_Long[3]);
          w_creep_inc_up_sel = (w_sus_long - w_sus_short);
        }

        const w_total_up_sel = w_mech_short_up_sel + w_temp_up + w_creep_inc_up_sel;
        const w_total_down_sel = -w_total_up_sel;
        const w_mech_short_down_sel = -w_mech_short_up_sel;
        const w_creep_down_sel = -w_creep_inc_up_sel;

        let envelopeMoment = 0;
        let envelopeShear = 0;
        let envelopeDeflection = 0;
        let envelopeDeflectionWind = 0;
        let envelopeDeflectionCreep = 0;
        let envelopeDeflectionAbs = -Infinity;
        let envelopeMomentAbs = -Infinity;
        let envelopeShearAbs = -Infinity;

        for (const caseSpan of spanCases) {
          const Psum = sumPoint(caseSpan.loadsInSpan, x, smp.mode);

          const Vx_Mech = caseSpan.V1_Mech - caseSpan.caseRes.qULS_line * x - Psum;
          const Mx_Mech = caseSpan.M1_Mech + caseSpan.V1_Mech * x - (caseSpan.caseRes.qULS_line * x * x) / 2 - caseSpan.loadsInSpan
            .filter(ev => (smp.mode === 'pre' ? ev.a_mm < x - 1e-9 : ev.a_mm <= x + 1e-9))
            .reduce((acc2, ev) => acc2 + ev.P_N * (x - ev.a_mm), 0);

          const Vx = Vx_Mech + caseSpan.V1_Temp;
          const Mx = Mx_Mech + caseSpan.M1_Temp + caseSpan.V1_Temp * x;

          const momentAbs = Math.abs(Mx);
          if (momentAbs > envelopeMomentAbs) {
            envelopeMomentAbs = momentAbs;
            envelopeMoment = Mx;
          }

          const shearAbs = Math.abs(Vx);
          if (shearAbs > envelopeShearAbs) {
            envelopeShearAbs = shearAbs;
            envelopeShear = Vx;
          }

          const w_mech_short_up = beamShapeW(L, x, caseSpan.de_Mech[0], caseSpan.de_Mech[1], caseSpan.de_Mech[2], caseSpan.de_Mech[3]);

          let w_creep_inc_up = 0;
          if (creepMode === 'all') {
            const w_long_up = beamShapeW(L, x, caseSpan.de_MechLong[0], caseSpan.de_MechLong[1], caseSpan.de_MechLong[2], caseSpan.de_MechLong[3]);
            w_creep_inc_up = (w_long_up - w_mech_short_up);
          } else if (creepMode === 'sustained_dead') {
            const w_sus_short = beamShapeW(L, x, deSus_Short[0], deSus_Short[1], deSus_Short[2], deSus_Short[3]);
            const w_sus_long = beamShapeW(L, x, deSus_Long[0], deSus_Long[1], deSus_Long[2], deSus_Long[3]);
            w_creep_inc_up = (w_sus_long - w_sus_short);
          }

          const w_total_up = w_mech_short_up + w_temp_up + w_creep_inc_up;
          const w_total_down = -w_total_up;

          const deflectionAbs = Math.abs(w_total_down);
          if (deflectionAbs > envelopeDeflectionAbs) {
            envelopeDeflectionAbs = deflectionAbs;
            envelopeDeflection = w_total_down;
            envelopeDeflectionWind = -w_mech_short_up;
            envelopeDeflectionCreep = -w_creep_inc_up;
          }
        }

        if (envelopeMoment > maxMomentNeg) maxMomentNeg = envelopeMoment;
        if (envelopeMoment < maxMomentPos) maxMomentPos = envelopeMoment;
        if (Math.abs(envelopeMoment) > maxMomentAbs) maxMomentAbs = Math.abs(envelopeMoment);
        if (Math.abs(envelopeShear) > maxShear) maxShear = Math.abs(envelopeShear);
        if (Math.abs(envelopeDeflection) > maxDeflection) maxDeflection = Math.abs(envelopeDeflection);
        if (Math.abs(envelopeDeflection) > spanMaxDeflection) spanMaxDeflection = Math.abs(envelopeDeflection);

        chartData.push({
          x: parseFloat(((globalX + x) / 1000).toFixed(3)),
          moment: parseFloat((Mx_Selected / 1e6).toFixed(2)),
          shear: parseFloat((Vx_Selected / 1000).toFixed(2)),

          deflectionWind: parseFloat(w_mech_short_down_sel.toFixed(1)),
          deflectionThermal: parseFloat(w_temp_down.toFixed(1)),
          deflectionCreep: parseFloat(w_creep_down_sel.toFixed(1)),
          deflectionTotal: parseFloat(w_total_down_sel.toFixed(1)),

          limitPlus: parseFloat((L / limitDenom).toFixed(1)),
          limitMinus: -parseFloat((L / limitDenom).toFixed(1)),
        });
      }

      const spanLimit = L / limitDenom;
      if (spanLimit > 0) {
        const spanRatio = spanMaxDeflection / spanLimit;
        if (spanRatio > maxDeflectionRatio) {
          maxDeflectionRatio = spanRatio;
          maxDeflectionForRatio = spanMaxDeflection;
          worstDeflectionLimit = spanLimit;
        }
      }

      globalX += L;
    }

    if (!Number.isFinite(maxMomentNeg)) maxMomentNeg = 0;
    if (!Number.isFinite(maxMomentPos)) maxMomentPos = 0;
    if (!Number.isFinite(maxMomentAbs)) maxMomentAbs = 0;

    const maxSupportMomentAbs = supportMomentEnvelope.length > 0 ? Math.max(...supportMomentEnvelope) : 0;
    if (worstDeflectionLimit === 0) {
      worstDeflectionLimit = (Math.max(...spansM) * 1000) / limitDenom;
    }

    const deflectionCheck = maxDeflectionForRatio > 0 ? maxDeflectionForRatio : maxDeflection;
    maxDeflection = deflectionCheck;

    const extrema = {
      deflectionTotal: getExtrema(chartData, 'deflectionTotal'),
      moment: getExtrema(chartData, 'moment'),
      shear: getExtrema(chartData, 'shear'),
    };

    // 4) Reactions (Combined ULS envelope)
    const reactionEnvelope = caseResults.map(caseRes => {
      const reactMech = caseRes.solULS_Mech?.reactions || new Array(nNode).fill(0);
      const reactTemp = solULS_Temp?.reactions || new Array(nNode).fill(0);
      return reactMech.map((rm, i) => rm + reactTemp[i]);
    });

    const screwSpacing = Number(config.screwSpacing) || 0;
    const screwStrength = Number(config.screwStrength) || 0;
    const screwCount = screwSpacing > 0 ? Math.max(1, Math.round(panelWidth / screwSpacing)) : 1;
    const T_Rd_N = screwStrength > 0 ? (screwStrength * 1000 * screwCount) / Math.max(CONSTANTS.gammaM_screw, 1e-9) : 0;
    const upliftEnabled = config.panelType !== 'ceiling' && T_Rd_N > 0;

    let maxReactionCompression = 0;
    let maxReactionTension = 0;
    let maxReactionRatio = 0;
    let maxUpliftRatio = 0;

    const reactionData = (config.supportWidths || []).map((widthVal, idx) => {
      const width = Number(widthVal) || 60;
      const reactionsAtSupport = reactionEnvelope.map(arr => arr[idx] || 0);
      const R_comp = Math.max(...reactionsAtSupport.map(r => Math.max(r, 0)));
      const R_tension = Math.max(...reactionsAtSupport.map(r => Math.max(-r, 0)));

      const F_Rd = (CONSTANTS.fCc * panelWidth * width) / CONSTANTS.gammaM_shear;
      const crushingRatio = F_Rd > 0 ? R_comp / F_Rd : 999;
      const upliftRatio = upliftEnabled && T_Rd_N > 0 ? R_tension / T_Rd_N : 0;

      if (R_comp > maxReactionCompression) maxReactionCompression = R_comp;
      if (R_tension > maxReactionTension) maxReactionTension = R_tension;
      if (crushingRatio > maxReactionRatio) maxReactionRatio = crushingRatio;
      if (upliftRatio > maxUpliftRatio) maxUpliftRatio = upliftRatio;

      return {
        id: idx,
        name: `Gối ${idx}`,
        R_Ed: parseFloat((R_comp / 1000).toFixed(2)),
        F_Rd: parseFloat((F_Rd / 1000).toFixed(2)),
        ratio: crushingRatio,
        status: crushingRatio <= 1 ? 'pass' : 'fail',
        reqWidth: CONSTANTS.fCc > 0 ? (R_comp * CONSTANTS.gammaM_shear) / (CONSTANTS.fCc * panelWidth) : 0,
        R_uplift: parseFloat((R_tension / 1000).toFixed(2)),
        T_Rd: parseFloat((T_Rd_N / 1000).toFixed(2)),
        upliftRatio,
        upliftStatus: upliftEnabled ? (upliftRatio <= 1 ? 'pass' : 'fail') : 'na',
      };
    });

    const worstSupport = reactionData.find(s => s.ratio === maxReactionRatio) || { F_Rd: 0 };
    const worstUplift = reactionData.find(s => s.upliftRatio === maxUpliftRatio) || { T_Rd: 0 };

    // 5) Capacity checks
    const stress_span_val = stressFromMoment(maxMomentAbs);
    const stress_support_val = stressFromMoment(maxSupportMomentAbs);

    const fCv_input = Number(config.coreShearStrength) || 0.12;
    const V_Rd = (fCv_input * Ac) / CONSTANTS.gammaM_shear;
    const w_limit = worstDeflectionLimit;

    const ratios = {
      bending: sigma_limit > 0 ? stress_span_val / sigma_limit : 0,
      support: sigma_limit > 0 ? stress_support_val / sigma_limit : 0,
      shear: V_Rd > 0 ? maxShear / V_Rd : 0,
      crushing: maxReactionRatio,
      deflection: maxDeflectionRatio,
      uplift: upliftEnabled ? maxUpliftRatio : 0,
    };

    let status = 'pass';
    if (
      ratios.bending > 1 ||
      ratios.support > 1 ||
      ratios.shear > 1 ||
      ratios.crushing > 1 ||
      ratios.deflection > 1 ||
      (upliftEnabled && ratios.uplift > 1)
    ) status = 'fail';

    const hingeNoteList = Array.from(hingeNotes);

    let advice = [];
    if (hingeNoteList.length > 0) {
      advice.push(`Đã kích hoạt tái phân phối nội lực (khớp) tại gối: ${hingeNoteList.join(', ')} (ULS).`);
    }
    if (creepMode !== 'none') {
      const creepNote = phiBending > 0 ? `φ = ${phiShear}, φb = ${phiBending}` : `φ = ${phiShear}`;
      advice.push(`SLS đã xét từ biến lõi (${creepNote}). Mode: ${creepMode === 'all' ? 'toàn tải SLS' : 'chỉ tải lâu dài (dead + tải treo)'}.`);
    }
    if (ratios.bending > 1) advice.push("Nguy cơ nhăn tôn/chảy thép: Tăng độ dày tôn hoặc giảm nhịp.");
    if (ratios.support > 1) advice.push("Ứng suất tại gối cao: tăng độ dày tôn hoặc tăng bề rộng gối.");
    if (ratios.shear > 1) advice.push("Lực cắt quá lớn: tăng cường độ cắt của lõi hoặc tăng độ dày Panel.");
    reactionData.forEach(s => {
      if (s.status === 'fail') advice.push(`Gối ${s.id} bị quá tải ép dập. Cần tăng bề rộng lên > ${Math.ceil(s.reqWidth)}mm.`);
      if (upliftEnabled && s.upliftStatus === 'fail') advice.push(`Gối ${s.id} bị nhổ (uplift). Cần tăng số lượng/khoảng cách vít hoặc tăng khả năng vít.`);
    });
    if (ratios.deflection > 1) advice.push("Độ võng lớn: tăng độ dày Panel.");
    if (upliftEnabled && ratios.uplift > 1) advice.push("Liên kết chống nhổ không đủ: kiểm tra vít và bố trí liên kết.");
    if (advice.length === 0) advice.push("Thiết kế Đạt yêu cầu và An toàn.");

    return {
      chartData,
      reactionData,

      M_Rd,
      V_Rd,
      F_Rd_Worst: worstSupport.F_Rd * 1000,
      T_Rd_Worst: worstUplift.T_Rd * 1000,

      limitDenom,
      w_limit,

      maxMomentNeg,
      maxMomentPos,
      maxMomentAbs,
      maxSupportMoment: maxSupportMomentAbs,
      maxShear,
      maxReaction: maxReactionCompression,
      maxUplift: maxReactionTension,
      maxDeflection,

      ratios,
      status,
      advice,

      stress_span: stress_span_val,
      stress_support: stress_support_val,
      sigma_limit,
      supportLocs,

      extrema,

      creepMode,
      phiShear,
      phiBending,

      panelWidth,
      screwCount,

      // ✅ NEW: để sơ đồ trần hiển thị q
      qDead_kPa: qDead_kPa,
      qLive_kPa: qLive_kPa,
      qWind_kPa: qWindDisplay_kPa,
      qSLS_kPa: selectedCase.qSLS_kPa,
      qULS_kPa: selectedCase.qULS_kPa,
      dT_deg: dT,
      Mt_ULS_kNm: Mt_ULS / 1e6,

      // ✅ Section properties for detailed report
      EI,
      GA_inst,
      GA_long,
      EI_long,
      e,
      Af1,
      Af2,
      Ac,
      I_eq,
      zMax,
      sigma_w,
      sigma_w_design,
      sigma_y_design,
      gammaG,
      gammaQ,
      gammaThermal,
      dC,
      tF1,
      tF2,
    };
  }, [config]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded text-xs">
          <p className="font-bold mb-1">{typeof label === 'number' ? `Vị trí: ${label} m` : label}</p>
          {payload.map((entry, index) => {
            let unit = '';
            if (entry.dataKey === 'moment') unit = 'kNm';
            else if (entry.dataKey.includes('deflection')) unit = 'mm';
            else if (entry.dataKey.includes('limit')) unit = 'mm';
            else if (entry.dataKey === 'shear') unit = 'kN';
            else if (entry.dataKey === 'R_Ed' || entry.dataKey === 'F_Rd') unit = 'kN';

            return (
              <div key={index} className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span>{entry.name}: <b>{entry.value}</b> {unit}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const ReportHeader = () => (
    <div className="border-b-2 border-slate-800 pb-4 mb-6">
      <div className="flex justify-between items-end">
        <div className="flex items-end gap-3">
          <img src="./logo_app.jpg" alt="Greenpan Design" className="h-16 w-16 object-contain" />
          <div>
            <h1 className="text-3xl font-bold text-slate-800 uppercase">Thuyết Minh Tính Toán</h1>
            <h2 className="text-xl text-blue-700 font-semibold mt-1">KẾT CẤU TẤM SANDWICH PANEL</h2>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-slate-500">PROJECT</div>
          <div className="text-lg font-bold">{config.projectName}</div>
          <div className="text-sm text-slate-400 mt-1">{new Date().toLocaleDateString('vi-VN')}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-root flex flex-col min-h-screen bg-gray-50 text-gray-800 font-sans overflow-x-hidden">
      <header className="bg-slate-800 text-white p-4 shadow-md flex justify-between items-center shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <img src="./logo_app.jpg" alt="Greenpan Design" className="h-10 w-10 object-contain" />
          <div><h1 className="text-xl font-bold leading-none">Greenpan Design (Wall)</h1></div>
        </div>
        <div className="flex gap-2">
          <button className={`px-4 py-1 rounded text-sm ${activeTab === 'input' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setActiveTab('input')}>Nhập Liệu</button>
          <button className={`px-4 py-1 rounded text-sm ${activeTab === 'charts' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setActiveTab('charts')}>Biểu Đồ</button>
          <button className={`px-4 py-1 rounded text-sm ${activeTab === 'report' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setActiveTab('report')}>Báo cáo</button>
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 print:p-0 print:overflow-visible bg-gray-100"
        style={{ scrollbarGutter: 'stable' }}
      >
        {/* INPUT TAB */}
        <div id="tab-input" className={activeTab === 'input' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-blue-700"><Settings size={20} /> 1. Sơ Đồ & Kích Thước</h2>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 mb-1">Tên Dự Án</label>
                <input type="text" name="projectName" value={config.projectName} onChange={handleInputChange} className="w-full border p-2 rounded" />
              </div>

              <div className="mb-4 bg-blue-50 p-3 rounded border border-blue-100">
                <div className="flex flex-wrap gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="panelType" value="external" checked={config.panelType === 'external'} onChange={handleInputChange} />
                    <span className="text-sm">Vách Ngoài</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="panelType" value="internal" checked={config.panelType === 'internal'} onChange={handleInputChange} />
                    <span className="text-sm">Vách Trong</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="panelType" value="ceiling" checked={config.panelType === 'ceiling'} onChange={handleInputChange} />
                    <span className="text-sm">Tấm Trần</span>
                  </label>
                </div>

                {config.panelType === 'internal' && (
                  <div className="flex gap-4 mb-2 pl-4 border-l-2 border-blue-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="internalWallType" value="normal" checked={config.internalWallType === 'normal'} onChange={handleInputChange} />
                      <span className="text-xs">Thường</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="internalWallType" value="cold_storage" checked={config.internalWallType === 'cold_storage'} onChange={handleInputChange} />
                      <span className="text-xs">Kho lạnh</span>
                    </label>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2 border-t border-blue-200">
                  <label className="text-xs font-bold">Giới hạn Độ võng:</label>
                  <select
                    name="deflectionLimit"
                    value={config.deflectionLimit}
                    onChange={(e) => setConfig({ ...config, deflectionLimit: parseInt(e.target.value, 10) })}
                    className="text-sm border rounded p-1"
                  >
                    <option value="100">L/100</option>
                    <option value="150">L/150</option>
                    <option value="200">L/200</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm block font-medium">Nhịp (m):</label>
                  <div className="flex gap-2 items-center flex-wrap">
                    {config.spans.map((s, i) => (
                      <input key={i} type="number" value={s} onChange={(e) => handleSpanChange(i, e.target.value)} className="w-16 border p-1 rounded text-center" />
                    ))}
                    <button onClick={addSpan} className="text-green-600 font-bold px-2">+</button>
                    <button onClick={removeSpan} className="text-red-600 font-bold px-2">-</button>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="text-sm block font-medium mb-1">Rộng gối (mm):</label>
                  <div className="flex gap-2 flex-wrap">
                    {config.supportWidths.map((w, i) => {
                      const check = results.reactionData && results.reactionData[i];
                      const isFail = check?.status === 'fail';
                      return (
                        <div key={i} className="flex flex-col w-20 relative group">
                          <span className="text-[10px] text-gray-500 text-center uppercase font-bold">Gối {i}</span>
                          <div className="relative">
                            <input
                              type="number"
                              value={w}
                              onChange={(e) => handleSupportWidthChange(i, e.target.value)}
                              className={`w-full border rounded p-1 text-center text-sm outline-none transition-colors duration-200 ${isFail ? 'border-red-500 bg-red-100 text-red-900 font-bold shadow-sm' : 'border-gray-300 focus:border-blue-500'}`}
                            />
                            {isFail && (
                              <div className="absolute top-full left-0 w-full mt-1 z-10 hidden group-hover:block">
                                <div className="bg-red-600 text-white text-[10px] rounded p-1 shadow-lg text-center">
                                  Cần &gt; {Math.ceil(check.reqWidth)}mm
                                </div>
                                <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-red-600 absolute -top-1 left-1/2 -translate-x-1/2"></div>
                              </div>
                            )}
                            {isFail && <AlertCircle size={12} className="text-red-500 absolute top-1.5 right-1 pointer-events-none" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm block font-bold">Độ dày Lõi (mm):</label>
                  <div className="flex flex-wrap gap-2">
                    {[40, 50, 60, 75, 80, 100, 125, 150, 200].map(v => (
                      <button
                        key={v}
                        onClick={() => setCoreThickness(v)}
                        className={`border px-2 py-1 rounded text-sm ${config.coreThickness === v ? 'bg-blue-600 text-white' : ''}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-orange-600"><Thermometer size={20} /> 2. Thông Số Kỹ Thuật</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs block">Tôn Ngoài (mm)</label><input type="number" step="0.05" name="skinOut" value={config.skinOut} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Tôn Trong (mm)</label><input type="number" step="0.05" name="skinIn" value={config.skinIn} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block font-bold">Bề rộng panel (mm)</label><input type="number" step="10" name="panelWidth" value={config.panelWidth} onChange={handlePanelWidthChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Nhiệt độ Ngoài (C)</label><input type="number" name="tempOut" value={config.tempOut} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Nhiệt độ Trong (C)</label><input type="number" name="tempIn" value={config.tempIn} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Hệ số nhiệt γT</label><input type="number" step="0.1" name="gammaF_thermal" value={config.gammaF_thermal} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block font-bold">Áp lực Gió (kPa)</label><input type="number" step="0.1" name="windPressure" value={config.windPressure} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block font-bold text-red-600">Thép Fy (MPa)</label><input type="number" name="steelYield" value={config.steelYield} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Cường độ Cắt Lõi (MPa)</label><input type="number" step="0.01" name="coreShearStrength" value={config.coreShearStrength} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Mô đun cắt lõi Gc (MPa)</label><input type="number" step="0.1" name="coreShearModulus" value={config.coreShearModulus} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Hệ số kappa (shear)</label><input type="number" step="0.05" name="kappaShear" value={config.kappaShear} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                {config.panelType !== 'ceiling' && (
                  <>
                    <div><label className="text-xs block">Khả năng Vít (kN)</label><input type="number" step="0.1" name="screwStrength" value={config.screwStrength} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                    <div><label className="text-xs block">Khoảng cách vít (mm)</label><input type="number" step="10" name="screwSpacing" value={config.screwSpacing} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                  </>
                )}

                <div className="col-span-2">
                  <label className="flex items-center gap-4 text-sm mt-2">
                    <input type="radio" name="windDirection" value="pressure" checked={config.windDirection === 'pressure'} onChange={handleInputChange} /> Gió Đẩy
                    <input type="radio" name="windDirection" value="suction" checked={config.windDirection === 'suction'} onChange={handleInputChange} /> Gió Hút
                  </label>
                </div>

                {config.panelType === 'ceiling' && (
                  <div className="col-span-2 mt-2 bg-emerald-50 p-3 rounded border border-emerald-200 space-y-2">
                    <div className="text-xs font-bold text-emerald-800">TẢI TRỌNG TRẦN</div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs block font-bold">Dead load</label>
                        <select
                          name="deadLoadMode"
                          value={config.deadLoadMode}
                          onChange={handleInputChange}
                          className="w-full border rounded p-1 text-sm"
                        >
                          <option value="auto">Auto (tự trọng panel)</option>
                          <option value="manual">Manual (kPa)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs block font-bold">Live load (kPa)</label>
                        <input
                          type="number"
                          step="0.01"
                          name="liveLoad_kPa"
                          value={config.liveLoad_kPa}
                          onChange={handleInputChange}
                          className="w-full border p-2 rounded"
                        />
                      </div>

                      {config.deadLoadMode === 'manual' && (
                        <div className="col-span-2">
                          <label className="text-xs block font-bold">Dead load manual (kPa)</label>
                          <input
                            type="number"
                            step="0.01"
                            name="deadLoadManual_kPa"
                            value={config.deadLoadManual_kPa}
                            onChange={handleInputChange}
                            className="w-full border p-2 rounded"
                          />
                        </div>
                      )}

                      {/* ✅ NEW: Creep factor cho trần */}
                      <div className="col-span-2">
                        <label className="text-xs block font-bold">Hệ số từ biến φ (creep)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="creepFactor"
                          value={config.creepFactor}
                          onChange={handleInputChange}
                          className="w-full border p-2 rounded"
                        />
                        <div className="text-[10px] text-gray-600 mt-1">
                          Áp dụng cho tải lâu dài (Dead + tải treo) khi tính độ võng trần.
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs block font-bold">Hệ số từ biến uốn φb (tuỳ chọn)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="creepFactorBending"
                          value={config.creepFactorBending}
                          onChange={handleInputChange}
                          className="w-full border p-2 rounded"
                        />
                        <div className="text-[10px] text-gray-600 mt-1">
                          Dùng để giảm EI dài hạn khi cần xét võng lâu dài.
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-emerald-200 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-emerald-800">Tải treo (Point loads) — X toàn dầm</div>
                        <button
                          type="button"
                          onClick={() => setConfig(prev => ({
                            ...prev,
                            pointLoads: [...(prev.pointLoads || []), { x_m: 0, P_kN: 0.2, note: '', type: 'permanent' }]
                          }))}
                          className="text-xs px-2 py-1 rounded bg-emerald-600 text-white"
                        >
                          + Thêm tải
                        </button>
                      </div>

                      <div className="mt-2 space-y-2">
                        {(config.pointLoads || []).map((pl, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-3">
                              <label className="text-[10px] block text-gray-600">X (m)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={pl.x_m}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  setConfig(prev => {
                                    const arr = [...(prev.pointLoads || [])];
                                    arr[idx] = { ...arr[idx], x_m: Number.isFinite(v) ? v : 0 };
                                    return { ...prev, pointLoads: arr };
                                  });
                                }}
                                className="w-full border p-1 rounded text-sm"
                              />
                            </div>

                            <div className="col-span-3">
                              <label className="text-[10px] block text-gray-600">P (kN, + xuống)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={pl.P_kN}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  setConfig(prev => {
                                    const arr = [...(prev.pointLoads || [])];
                                    arr[idx] = { ...arr[idx], P_kN: Number.isFinite(v) ? v : 0 };
                                    return { ...prev, pointLoads: arr };
                                  });
                                }}
                                className="w-full border p-1 rounded text-sm"
                              />
                            </div>

                            <div className="col-span-2">
                              <label className="text-[10px] block text-gray-600">Loại tải</label>
                              <select
                                value={pl.type || 'permanent'}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setConfig(prev => {
                                    const arr = [...(prev.pointLoads || [])];
                                    arr[idx] = { ...arr[idx], type: v };
                                    return { ...prev, pointLoads: arr };
                                  });
                                }}
                                className="w-full border p-1 rounded text-sm"
                              >
                                <option value="permanent">G (lâu dài)</option>
                                <option value="variable">Q (tạm thời)</option>
                              </select>
                            </div>

                            <div className="col-span-3">
                              <label className="text-[10px] block text-gray-600">Ghi chú</label>
                              <input
                                type="text"
                                value={pl.note || ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setConfig(prev => {
                                    const arr = [...(prev.pointLoads || [])];
                                    arr[idx] = { ...arr[idx], note: v };
                                    return { ...prev, pointLoads: arr };
                                  });
                                }}
                                className="w-full border p-1 rounded text-sm"
                              />
                            </div>

                            <div className="col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setConfig(prev => {
                                  const arr = [...(prev.pointLoads || [])];
                                  arr.splice(idx, 1);
                                  return { ...prev, pointLoads: arr };
                                })}
                                className="text-xs px-2 py-1 rounded bg-red-600 text-white"
                              >
                                x
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="text-[10px] text-gray-600 mt-2">
                        Gợi ý test: span 3m+3m, X=1.5m P=0.30kN và X=4.5m P=0.30kN (shear sẽ nhảy 0.30kN tại đúng vị trí).
                      </div>
                    </div>
                  </div>
                )}

                {config.panelType === 'internal' && config.internalWallType === 'cold_storage' && (
                  <div className="col-span-2 mt-2 bg-blue-50 p-2 rounded border border-blue-200">
                    <label className="text-xs block mb-1 font-bold text-blue-700 flex items-center gap-1"><TrendingUp size={12} /> Hệ số từ biến (Creep Factor)</label>
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          step="0.1"
                          name="creepFactor"
                          value={config.creepFactor}
                          onChange={handleInputChange}
                          className="w-20 border p-1 rounded border-blue-300 focus:border-blue-500 text-sm"
                        />
                        <span className="text-[10px] text-gray-500">φ cắt (mặc định 2.4)</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          step="0.1"
                          name="creepFactorBending"
                          value={config.creepFactorBending}
                          onChange={handleInputChange}
                          className="w-20 border p-1 rounded border-blue-300 focus:border-blue-500 text-sm"
                        />
                        <span className="text-[10px] text-gray-500">φb uốn (tuỳ chọn)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* CHARTS TAB */}
        <div id="tab-charts" className={activeTab === 'charts' ? 'block w-full space-y-6' : 'hidden'}>
          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h3 className="font-bold text-center mb-2">
              {config.panelType === 'ceiling' ? 'Sơ đồ tính trần (X toàn dầm)' : 'Sơ đồ tính (Load + Gối)'}
            </h3>

            {config.panelType === 'ceiling' ? (
              <CeilingSchematic config={config} results={results} />
            ) : (
              <BeamDiagram
                spansM={config.spans}
                windDirection={config.windDirection}
                windPressure={config.windPressure}
              />
            )}
          </div>

          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h3 className="font-bold text-center mb-2">Biểu đồ Chuyển vị</h3>
            <div className="h-72">
              <ResponsiveContainer>
                <ComposedChart data={results.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" domain={[0, 'dataMax']} ticks={results.supportLocs} />
                  <YAxis reversed unit="mm" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#000" />

                  {/* ✅ Tổng: fill vùng về 0 */}
                  <Area
                    type="monotone"
                    dataKey="deflectionTotal"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.18}
                    baseValue={0}
                    name="Tổng"
                    dot={false}
                    activeDot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="deflectionWind"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name={config.panelType === 'ceiling' ? 'Cơ học (có creep)' : 'Gió'}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />

                  {/* ✅ Creep (chỉ rõ phần tăng do từ biến) */}
                  <Line
                    type="monotone"
                    dataKey="deflectionCreep"
                    stroke="#64748b"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    name="Từ biến (creep)"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="deflectionThermal"
                    stroke="#ff7300"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Nhiệt"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />

                  <Line type="step" dataKey="limitPlus" stroke="red" strokeWidth={1} strokeDasharray="10 5" dot={false} activeDot={false} name="Giới hạn (+)" />
                  <Line type="step" dataKey="limitMinus" stroke="red" strokeWidth={1} strokeDasharray="10 5" dot={false} activeDot={false} name="Giới hạn (-)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h3 className="font-bold text-center mb-2">Biểu đồ Mô-men Uốn</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <ComposedChart data={results.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" domain={[0, 'dataMax']} ticks={results.supportLocs} />
                  <YAxis reversed unit="kNm" />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#000" />
                  <Area type="monotone" dataKey="moment" stroke="#ff7300" fill="#fff7ed" name="Mô-men" dot={false} activeDot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h3 className="font-bold text-center mb-2">Biểu đồ Lực Cắt</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={results.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" domain={[0, 'dataMax']} ticks={results.supportLocs} />
                  <YAxis reversed unit="kN" />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#000" />
                  <Area type="linear" dataKey="shear" stroke="#82ca9d" fill="#82ca9d" name="Lực Cắt" dot={false} activeDot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow border border-gray-200">
            <h3 className="font-bold text-center mb-2">Phản Lực Gối</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={results.reactionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis unit="kN" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="R_Ed" name="Phản lực" barSize={30} isAnimationActive={!printMode}>
                    {results.reactionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.status === 'fail' ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Bar>
                  <Bar dataKey="F_Rd" name="Giới hạn" fill="#e5e7eb" isAnimationActive={!printMode} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* REPORT TAB */}
        <div id="tab-report" className={activeTab === 'report' ? 'block' : 'hidden'}>
          <div className="w-full mx-auto bg-white p-8 shadow-lg print:shadow-none print:w-full print:max-w-none report-sheet">
            <ReportHeader />

            <div className="mb-6 report-section">
              <h3 className="text-sm font-bold border-b border-gray-400 mb-2 uppercase flex items-center gap-2">
                <Settings size={14} /> 1. Thông số đầu vào
              </h3>

              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                <div className="flex justify-between"><span>Loại Panel:</span> <b>{config.panelType === 'external' ? 'Vách Ngoài' : config.panelType === 'internal' ? 'Vách Trong' : 'Tấm Trần'}</b></div>
                <div className="flex justify-between"><span>Độ dày lõi:</span> <b>{config.coreThickness} mm</b></div>
                <div className="flex justify-between"><span>Tôn mặt (Ngoài/Trong):</span> <b>{config.skinOut} / {config.skinIn} mm</b></div>
                <div className="flex justify-between"><span>Bề rộng panel:</span> <b>{config.panelWidth} mm</b></div>
                <div className="flex justify-between"><span>Cường độ thép (Fy):</span> <b>{config.steelYield} MPa</b></div>
                <div className="flex justify-between"><span>Tỷ trọng lõi:</span> <b>{config.coreDensity} kg/m3</b></div>
                <div className="flex justify-between"><span>Cường độ cắt lõi:</span> <b>{config.coreShearStrength} MPa</b></div>
                <div className="flex justify-between"><span>Mô đun cắt lõi Gc:</span> <b>{config.coreShearModulus} MPa</b></div>
                <div className="flex justify-between"><span>Hệ số kappa:</span> <b>{config.kappaShear}</b></div>
                <div className="flex justify-between"><span>Tải trọng Gió/Áp suất:</span> <b>{config.windPressure} kPa ({config.windDirection})</b></div>
                <div className="flex justify-between"><span>Chênh lệch nhiệt độ:</span> <b>{Math.abs(config.tempOut - config.tempIn)} °C</b></div>
                <div className="flex justify-between"><span>Hệ số nhiệt γT:</span> <b>{config.gammaF_thermal}</b></div>
                <div className="flex justify-between"><span>Sơ đồ nhịp:</span> <b>{config.spans.join(' + ')} m</b></div>
                <div className="flex justify-between"><span>Bề rộng gối đỡ:</span> <b>{config.supportWidths.join(' + ')} mm</b></div>
                {config.panelType !== 'ceiling' && (
                  <div className="flex justify-between"><span>Khoảng cách vít:</span> <b>{config.screwSpacing} mm</b></div>
                )}
                <div className="flex justify-between"><span>Giới hạn độ võng:</span> <b>L/{results.limitDenom}</b></div>

                {(config.panelType === 'ceiling' || (config.panelType === 'internal' && config.internalWallType === 'cold_storage')) && (
                  <div className="flex justify-between"><span>Hệ số từ biến (φ/φb):</span> <b>{config.creepFactor} / {config.creepFactorBending}</b></div>
                )}
              </div>
            </div>

            <div className="mb-6 report-section">
              <h3 className="text-sm font-bold border-b border-gray-400 mb-2 uppercase flex items-center gap-2">
                <BookOpen size={14} /> 2. Cơ sở & Phương pháp tính toán
              </h3>

              <div className="text-xs text-justify space-y-2 text-slate-700">
                <h4 className="font-bold text-blue-800">2.1 Cơ sở lý thuyết</h4>
                <ul className="list-disc list-inside pl-2">
                  <li><strong>Tiêu chuẩn áp dụng:</strong> TCVN 2737:2023, EN 14509:2013.</li>
                  <li><strong>Phân tích:</strong> Dầm liên tục (FEM Timoshenko), xét biến dạng cắt & nhiệt; ULS có tái phân phối nội lực khi vượt M_Rd.</li>
                  {(config.panelType === 'ceiling' || (config.panelType === 'internal' && config.internalWallType === 'cold_storage')) && (
                    <li><strong>Từ biến lõi (creep):</strong> GA_long = GA_inst/(1+φ), EI_long giảm theo φb (nếu nhập). Trần xét cho tải lâu dài (dead + tải treo), kho lạnh xét cho toàn tải SLS.</li>
                  )}
                </ul>

                <h4 className="font-bold text-blue-800 mt-2">2.2 Đặc trưng tiết diện (Section Properties)</h4>
                <table className="w-full text-[10px] border-collapse border border-gray-300 mt-1 font-mono">
                  <thead className="bg-gray-100 font-bold">
                    <tr>
                      <th className="border p-1 text-left">Thông số</th>
                      <th className="border p-1 text-left">Công thức</th>
                      <th className="border p-1 text-left">Thay số</th>
                      <th className="border p-1 text-center">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-1">Chiều cao hiệu dụng e</td>
                      <td className="border p-1">e = d<sub>C</sub> + (t<sub>F1</sub> + t<sub>F2</sub>)/2</td>
                      <td className="border p-1">{results.dC} + ({results.tF1} + {results.tF2})/2</td>
                      <td className="border p-1 text-center font-bold">{results.e.toFixed(2)} mm</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Diện tích mặt ngoài A<sub>f1</sub></td>
                      <td className="border p-1">A<sub>f1</sub> = B × t<sub>F1</sub></td>
                      <td className="border p-1">{config.panelWidth} × {results.tF1}</td>
                      <td className="border p-1 text-center font-bold">{results.Af1.toFixed(0)} mm²</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Diện tích mặt trong A<sub>f2</sub></td>
                      <td className="border p-1">A<sub>f2</sub> = B × t<sub>F2</sub></td>
                      <td className="border p-1">{config.panelWidth} × {results.tF2}</td>
                      <td className="border p-1 text-center font-bold">{results.Af2.toFixed(0)} mm²</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Diện tích lõi A<sub>c</sub></td>
                      <td className="border p-1">A<sub>c</sub> = B × d<sub>C</sub></td>
                      <td className="border p-1">{config.panelWidth} × {results.dC}</td>
                      <td className="border p-1 text-center font-bold">{results.Ac.toFixed(0)} mm²</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Độ cứng uốn EI</td>
                      <td className="border p-1">EI = E<sub>f</sub>·A<sub>f1</sub>·A<sub>f2</sub>/(A<sub>f1</sub>+A<sub>f2</sub>)·e²</td>
                      <td className="border p-1">210000×{results.Af1.toFixed(0)}×{results.Af2.toFixed(0)}/({results.Af1.toFixed(0)}+{results.Af2.toFixed(0)})×{results.e.toFixed(1)}²</td>
                      <td className="border p-1 text-center font-bold">{(results.EI / 1e9).toFixed(2)}×10⁹ Nmm²</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Độ cứng cắt GA</td>
                      <td className="border p-1">GA = G<sub>c</sub> × A<sub>c</sub></td>
                      <td className="border p-1">{config.coreShearModulus} × {results.Ac.toFixed(0)}</td>
                      <td className="border p-1 text-center font-bold">{(results.GA_inst / 1000).toFixed(0)} kN</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Mô-men quán tính quy đổi I<sub>eq</sub></td>
                      <td className="border p-1">I<sub>eq</sub> = EI / E<sub>f</sub></td>
                      <td className="border p-1">{(results.EI / 1e9).toFixed(2)}×10⁹ / 210000</td>
                      <td className="border p-1 text-center font-bold">{(results.I_eq).toFixed(0)} mm⁴</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Khoảng cách lớn nhất z<sub>max</sub></td>
                      <td className="border p-1">z<sub>max</sub> = max(z<sub>out</sub>, z<sub>in</sub>)</td>
                      <td className="border p-1">—</td>
                      <td className="border p-1 text-center font-bold">{results.zMax.toFixed(2)} mm</td>
                    </tr>
                  </tbody>
                </table>

                <h4 className="font-bold text-blue-800 mt-3">2.3 Tổ hợp tải trọng (Load Combinations)</h4>
                <table className="w-full text-[10px] border-collapse border border-gray-300 mt-1 font-mono">
                  <thead className="bg-gray-100 font-bold">
                    <tr>
                      <th className="border p-1 text-left">Loại tải</th>
                      <th className="border p-1 text-center">Giá trị</th>
                      <th className="border p-1 text-center">Đơn vị</th>
                      <th className="border p-1 text-center">γ (ULS)</th>
                      <th className="border p-1 text-center">γ (SLS)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.panelType === 'ceiling' && (
                      <>
                        <tr>
                          <td className="border p-1">Tự trọng q<sub>G</sub></td>
                          <td className="border p-1 text-center">{results.qDead_kPa.toFixed(4)}</td>
                          <td className="border p-1 text-center">kPa</td>
                          <td className="border p-1 text-center">{results.gammaG}</td>
                          <td className="border p-1 text-center">1.0</td>
                        </tr>
                        <tr>
                          <td className="border p-1">Hoạt tải q<sub>Q</sub></td>
                          <td className="border p-1 text-center">{results.qLive_kPa.toFixed(2)}</td>
                          <td className="border p-1 text-center">kPa</td>
                          <td className="border p-1 text-center">{results.gammaQ}</td>
                          <td className="border p-1 text-center">1.0</td>
                        </tr>
                      </>
                    )}
                    <tr>
                      <td className="border p-1">Gió/Áp suất q<sub>W</sub></td>
                      <td className="border p-1 text-center">{Math.abs(results.qWind_kPa).toFixed(2)}</td>
                      <td className="border p-1 text-center">kPa</td>
                      <td className="border p-1 text-center">2.1</td>
                      <td className="border p-1 text-center">1.0</td>
                    </tr>
                    <tr>
                      <td className="border p-1">Chênh lệch nhiệt ΔT</td>
                      <td className="border p-1 text-center">{Math.abs(results.dT_deg)}</td>
                      <td className="border p-1 text-center">°C</td>
                      <td className="border p-1 text-center">{results.gammaThermal}</td>
                      <td className="border p-1 text-center">1.0</td>
                    </tr>
                  </tbody>
                </table>

                <div className="p-2 bg-blue-50 rounded border border-blue-200 mt-2 text-[10px] font-mono">
                  <p><strong>Tổ hợp ULS:</strong> q<sub>ULS</sub> = {results.gammaG}×{results.qDead_kPa.toFixed(3)} + {results.gammaQ}×{results.qLive_kPa.toFixed(2)} + 2.1×{Math.abs(results.qWind_kPa).toFixed(2)} = <b>{results.qULS_kPa.toFixed(3)} kPa</b></p>
                  <p><strong>Tổ hợp SLS:</strong> q<sub>SLS</sub> = {results.qDead_kPa.toFixed(3)} + {results.qLive_kPa.toFixed(2)} + {Math.abs(results.qWind_kPa).toFixed(2)} = <b>{results.qSLS_kPa.toFixed(3)} kPa</b></p>
                  <p><strong>Mô-men nhiệt (ULS):</strong> M<sub>t</sub> = EI·α·ΔT·γ<sub>T</sub>/e = {(results.EI / 1e9).toFixed(2)}×10⁹ × 1.2×10⁻⁵ × {Math.abs(results.dT_deg)} × {results.gammaThermal} / {results.e.toFixed(1)} = <b>{results.Mt_ULS_kNm.toFixed(3)} kNm/m</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.4 Kiểm tra ứng suất uốn (Bending Check - ULS)</h4>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Ứng suất nhăn:</strong> σ<sub>w</sub> = 0.5√(E<sub>f</sub>·E<sub>c</sub>·G<sub>c</sub>) = 0.5×√(210000×4×{config.coreShearModulus}) = <b>{results.sigma_w.toFixed(1)} MPa</b></p>
                  <p><strong>Thiết kế nhăn:</strong> σ<sub>w,d</sub> = σ<sub>w</sub>/γ<sub>M,w</sub> = {results.sigma_w.toFixed(1)}/1.2 = <b>{results.sigma_w_design.toFixed(1)} MPa</b></p>
                  <p><strong>Thiết kế chảy:</strong> σ<sub>y,d</sub> = f<sub>y</sub>/γ<sub>M,y</sub> = {config.steelYield}/1.1 = <b>{results.sigma_y_design.toFixed(1)} MPa</b></p>
                  <p><strong>Giới hạn:</strong> σ<sub>limit</sub> = min(σ<sub>w,d</sub>, σ<sub>y,d</sub>) = min({results.sigma_w_design.toFixed(1)}, {results.sigma_y_design.toFixed(1)}) = <b>{results.sigma_limit.toFixed(1)} MPa</b></p>
                  <p><strong>Ứng suất tính toán (Nhịp):</strong> σ<sub>Ed</sub> = M<sub>Ed</sub>·z<sub>max</sub>/I<sub>eq</sub> = <b>{results.stress_span.toFixed(1)} MPa</b> → Tỷ lệ = <b>{(results.ratios.bending * 100).toFixed(0)}%</b></p>
                  <p><strong>Ứng suất tính toán (Gối):</strong> σ<sub>Ed</sub> = <b>{results.stress_support.toFixed(1)} MPa</b> → Tỷ lệ = <b>{(results.ratios.support * 100).toFixed(0)}%</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.5 Kiểm tra lực cắt (Shear Check - ULS)</h4>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Khả năng chịu cắt:</strong> V<sub>Rd</sub> = f<sub>Cv</sub>·A<sub>c</sub>/γ<sub>M</sub> = {config.coreShearStrength}×{results.Ac.toFixed(0)}/1.25 = <b>{(results.V_Rd / 1000).toFixed(2)} kN/m</b></p>
                  <p><strong>Lực cắt tính toán:</strong> V<sub>Ed,max</sub> = <b>{(results.maxShear / 1000).toFixed(2)} kN/m</b></p>
                  <p><strong>Tỷ lệ:</strong> V<sub>Ed</sub>/V<sub>Rd</sub> = {(results.maxShear / 1000).toFixed(2)}/{(results.V_Rd / 1000).toFixed(2)} = <b>{(results.ratios.shear * 100).toFixed(0)}%</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.6 Kiểm tra độ võng (Deflection Check - SLS)</h4>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Giới hạn:</strong> w<sub>limit</sub> = L/{results.limitDenom} = {(Math.max(...config.spans) * 1000).toFixed(0)}/{results.limitDenom} = <b>{results.w_limit.toFixed(1)} mm</b></p>
                  <p><strong>Độ võng tính toán:</strong> w<sub>total</sub> = w<sub>mech</sub> + w<sub>thermal</sub> + w<sub>creep</sub> = <b>{results.maxDeflection.toFixed(1)} mm</b></p>
                  <p><strong>Tỷ lệ:</strong> w<sub>total</sub>/w<sub>limit</sub> = {results.maxDeflection.toFixed(1)}/{results.w_limit.toFixed(1)} = <b>{(results.ratios.deflection * 100).toFixed(0)}%</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.7 Kết quả tổng hợp</h4>
                <table className="w-full text-xs border-collapse border border-gray-300 mt-1">
                  <thead className="bg-gray-100 font-bold text-gray-700">
                    <tr>
                      <th className="border p-2 text-left">Hạng mục</th>
                      <th className="border p-2 text-center">S_d</th>
                      <th className="border p-2 text-center">R_d</th>
                      <th className="border p-2 text-center">S/R</th>
                      <th className="border p-2 text-center">Kết luận</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2">Ứng suất Uốn (Nhịp)</td>
                      <td className="border p-2 text-center">{results.stress_span.toFixed(1)} MPa</td>
                      <td className="border p-2 text-center">{results.sigma_limit.toFixed(1)} MPa</td>
                      <td className={`border p-2 text-center font-bold ${results.ratios.bending > 1 ? 'text-red-600' : 'text-green-600'}`}>{(results.ratios.bending * 100).toFixed(0)}%</td>
                      <td className={`border p-2 text-center font-bold ${results.ratios.bending <= 1 ? 'text-green-600' : 'text-red-600'}`}>{results.ratios.bending <= 1 ? 'ĐẠT' : 'KHÔNG ĐẠT'}</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Ứng suất Uốn (Gối)</td>
                      <td className="border p-2 text-center">{results.stress_support.toFixed(1)} MPa</td>
                      <td className="border p-2 text-center">{results.sigma_limit.toFixed(1)} MPa</td>
                      <td className={`border p-2 text-center font-bold ${results.ratios.support > 1 ? 'text-red-600' : 'text-green-600'}`}>{(results.ratios.support * 100).toFixed(0)}%</td>
                      <td className={`border p-2 text-center font-bold ${results.ratios.support <= 1 ? 'text-green-600' : 'text-red-600'}`}>{results.ratios.support <= 1 ? 'ĐẠT' : 'KHÔNG ĐẠT'}</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Lực Cắt Lõi (Max)</td>
                      <td className="border p-2 text-center">{(results.maxShear / 1000).toFixed(2)} kN</td>
                      <td className="border p-2 text-center">{(results.V_Rd / 1000).toFixed(2)} kN</td>
                      <td className={`border p-2 text-center font-bold ${results.ratios.shear > 1 ? 'text-red-600' : 'text-green-600'}`}>{(results.ratios.shear * 100).toFixed(0)}%</td>
                      <td className={`border p-2 text-center font-bold ${results.ratios.shear <= 1 ? 'text-green-600' : 'text-red-600'}`}>{results.ratios.shear <= 1 ? 'ĐẠT' : 'KHÔNG ĐẠT'}</td>
                    </tr>
                    <tr>
                      <td className="border p-2">Phản Lực Gối (Max)</td>
                      <td className="border p-2 text-center">{(results.maxReaction / 1000).toFixed(2)} kN</td>
                      <td className="border p-2 text-center">{(results.F_Rd_Worst / 1000).toFixed(2)} kN</td>
                      <td className={`border p-2 text-center font-bold ${results.ratios.crushing > 1 ? 'text-red-600' : 'text-green-600'}`}>{(results.ratios.crushing * 100).toFixed(0)}%</td>
                      <td className={`border p-2 text-center font-bold ${results.ratios.crushing <= 1 ? 'text-green-600' : 'text-red-600'}`}>{results.ratios.crushing <= 1 ? 'ĐẠT' : 'KHÔNG ĐẠT'}</td>
                    </tr>
                    {config.panelType !== 'ceiling' && (
                      <tr>
                        <td className="border p-2">Liên kết chống nhổ (Uplift)</td>
                        <td className="border p-2 text-center">{(results.maxUplift / 1000).toFixed(2)} kN</td>
                        <td className="border p-2 text-center">{(results.T_Rd_Worst / 1000).toFixed(2)} kN</td>
                        <td className={`border p-2 text-center font-bold ${results.ratios.uplift > 1 ? 'text-red-600' : 'text-green-600'}`}>{(results.ratios.uplift * 100).toFixed(0)}%</td>
                        <td className={`border p-2 text-center font-bold ${results.ratios.uplift <= 1 ? 'text-green-600' : 'text-red-600'}`}>{results.ratios.uplift <= 1 ? 'ĐẠT' : 'KHÔNG ĐẠT'}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="border p-2">Độ Võng (SLS)</td>
                      <td className="border p-2 text-center">{results.maxDeflection.toFixed(1)} mm</td>
                      <td className="border p-2 text-center">{results.w_limit.toFixed(1)} mm (L/{results.limitDenom})</td>
                      <td className={`border p-2 text-center font-bold ${results.ratios.deflection > 1 ? 'text-red-600' : 'text-green-600'}`}>{(results.ratios.deflection * 100).toFixed(0)}%</td>
                      <td className={`border p-2 text-center font-bold ${results.ratios.deflection <= 1 ? 'text-green-600' : 'text-red-600'}`}>{results.ratios.deflection <= 1 ? 'ĐẠT' : 'KHÔNG ĐẠT'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-6 report-section">
              <h3 className="text-sm font-bold border-b border-gray-400 mb-4 uppercase flex items-center gap-2">
                <Activity size={14} /> 3. Biểu đồ Nội lực & Chuyển vị
              </h3>

              <div className="flex flex-col gap-6">
                {/* ✅ Sơ đồ tính trong báo cáo */}
                <div className="border border-gray-100 rounded p-2 avoid-break">
                  <h4 className="text-xs font-bold text-center mb-1">
                    {config.panelType === 'ceiling' ? 'Sơ đồ tính trần (X toàn dầm)' : 'Sơ đồ tính (Load + Gối)'}
                  </h4>

                  {config.panelType === 'ceiling' ? (
                    <CeilingSchematic config={config} results={results} />
                  ) : (
                    <BeamDiagram
                      spansM={config.spans}
                      windDirection={config.windDirection}
                      windPressure={config.windPressure}
                    />
                  )}
                </div>

                {/* REPORT: DEFLECTION CHART */}
                <div className="h-48 report-chart border border-gray-100 rounded p-2 avoid-break">
                  <h4 className="text-xs font-bold text-center mb-1">Chuyển vị (Deflection) [mm]</h4>
                  <ResponsiveContainer width={printMode ? 700 : '100%'} height="100%">
                    <ComposedChart
                      data={results.chartData}
                      margin={{ top: 8, right: 36, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="x"
                        type="number"
                        domain={[0, 'dataMax']}
                        ticks={results.supportLocs}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        reversed
                        width={60}
                        unit="mm"
                        tick={{ fontSize: 10 }}
                        tickMargin={6}
                      />

                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                      <Legend
                        className="report-legend"
                        verticalAlign="top"
                        height={22}
                        iconSize={10}
                        wrapperStyle={{ fontSize: 10 }}
                      />

                      <ReferenceLine y={0} stroke="#000" />
                      {results.supportLocs.map((loc, idx) => (
                        <ReferenceLine key={idx} x={loc} stroke="#e5e7eb" strokeDasharray="3 3" />
                      ))}

                      {results.extrema?.deflectionTotal && (
                        <>
                          <ReferenceLine
                            x={results.extrema.deflectionTotal.max.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Max: ${results.extrema.deflectionTotal.max.value.toFixed(1)} mm`,
                              position: 'insideTop',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                          <ReferenceLine
                            x={results.extrema.deflectionTotal.min.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Min: ${results.extrema.deflectionTotal.min.value.toFixed(1)} mm`,
                              position: 'insideBottom',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                        </>
                      )}

                      <Line
                        type="monotone"
                        dataKey="deflectionWind"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        name={config.panelType === 'ceiling' ? 'Cơ học (có creep)' : 'Gió'}
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />

                      <Line
                        type="monotone"
                        dataKey="deflectionCreep"
                        stroke="#64748b"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        name="Từ biến (creep)"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />

                      <Line
                        type="monotone"
                        dataKey="deflectionThermal"
                        stroke="#ff7300"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Nhiệt"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />

                      {/* ✅ Tổng: fill vùng về 0 */}
                      <Area
                        type="monotone"
                        dataKey="deflectionTotal"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.18}
                        baseValue={0}
                        name="Tổng"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />

                      <Line
                        type="step"
                        dataKey="limitPlus"
                        stroke="red"
                        strokeWidth={1}
                        strokeDasharray="10 5"
                        name="Giới hạn (+)"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="step"
                        dataKey="limitMinus"
                        stroke="red"
                        strokeWidth={1}
                        strokeDasharray="10 5"
                        name="Giới hạn (-)"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* REPORT: MOMENT CHART */}
                <div className="h-48 report-chart border border-gray-100 rounded p-2 avoid-break">
                  <h4 className="text-xs font-bold text-center mb-1">Mô-men Uốn (Moment) [kNm]</h4>
                  <ResponsiveContainer width={printMode ? 700 : '100%'} height="100%">
                    <ComposedChart
                      data={results.chartData}
                      margin={{ top: 8, right: 36, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="x"
                        type="number"
                        domain={[0, 'dataMax']}
                        ticks={results.supportLocs}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        reversed
                        width={60}
                        unit="kNm"
                        tick={{ fontSize: 10 }}
                        tickMargin={6}
                      />

                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                      <Legend
                        className="report-legend"
                        verticalAlign="top"
                        height={22}
                        iconSize={10}
                        wrapperStyle={{ fontSize: 10 }}
                      />

                      <ReferenceLine y={0} stroke="#000" />
                      {results.supportLocs.map((loc, idx) => (
                        <ReferenceLine key={idx} x={loc} stroke="#e5e7eb" strokeDasharray="3 3" />
                      ))}

                      {results.extrema?.moment && (
                        <>
                          <ReferenceLine
                            x={results.extrema.moment.max.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Max: ${results.extrema.moment.max.value.toFixed(2)} kNm`,
                              position: 'insideTop',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                          <ReferenceLine
                            x={results.extrema.moment.min.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Min: ${results.extrema.moment.min.value.toFixed(2)} kNm`,
                              position: 'insideBottom',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                        </>
                      )}

                      <Area
                        type="monotone"
                        dataKey="moment"
                        stroke="#ff7300"
                        fill="#fff7ed"
                        strokeWidth={1.5}
                        name="Mô-men"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* REPORT: SHEAR CHART */}
                <div className="h-48 report-chart border border-gray-100 rounded p-2 avoid-break">
                  <h4 className="text-xs font-bold text-center mb-1">Lực Cắt (Shear) [kN]</h4>
                  <ResponsiveContainer width={printMode ? 700 : '100%'} height="100%">
                    <AreaChart
                      data={results.chartData}
                      margin={{ top: 8, right: 36, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="x"
                        type="number"
                        domain={[0, 'dataMax']}
                        ticks={results.supportLocs}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        reversed
                        width={60}
                        unit="kN"
                        tick={{ fontSize: 10 }}
                        tickMargin={6}
                      />

                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                      <Legend
                        className="report-legend"
                        verticalAlign="top"
                        height={22}
                        iconSize={10}
                        wrapperStyle={{ fontSize: 10 }}
                      />

                      <ReferenceLine y={0} stroke="#000" />
                      {results.supportLocs.map((loc, idx) => (
                        <ReferenceLine key={idx} x={loc} stroke="#e5e7eb" strokeDasharray="3 3" />
                      ))}

                      {results.extrema?.shear && (
                        <>
                          <ReferenceLine
                            x={results.extrema.shear.max.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Max: ${results.extrema.shear.max.value.toFixed(2)} kN`,
                              position: 'insideTop',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                          <ReferenceLine
                            x={results.extrema.shear.min.x}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            label={{
                              value: `Min: ${results.extrema.shear.min.value.toFixed(2)} kN`,
                              position: 'insideBottom',
                              fontSize: 10,
                              fill: '#0f172a',
                              offset: 8,
                            }}
                          />
                        </>
                      )}

                      <Area
                        type="linear"
                        dataKey="shear"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.25}
                        name="Lực Cắt"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* REPORT: REACTION CHART */}
                <div className="h-48 report-chart border border-gray-100 rounded p-2 avoid-break">
                  <h4 className="text-xs font-bold text-center mb-1">Phản Lực Gối (Reaction) [kN]</h4>
                  <ResponsiveContainer width={printMode ? 700 : '100%'} height="100%">
                    <BarChart
                      data={results.reactionData}
                      margin={{ top: 8, right: 36, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis width={60} unit="kN" tick={{ fontSize: 10 }} tickMargin={6} />

                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                      <Legend
                        className="report-legend"
                        verticalAlign="top"
                        height={22}
                        iconSize={10}
                        wrapperStyle={{ fontSize: 10 }}
                      />

                      <Bar dataKey="R_Ed" name="Phản lực" barSize={30} isAnimationActive={!printMode}>
                        {results.reactionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.status === 'fail' ? '#ef4444' : '#3b82f6'} />
                        ))}
                      </Bar>

                      <Bar
                        dataKey="F_Rd"
                        name="Giới hạn"
                        fill="#e5e7eb"
                        stroke="#9ca3af"
                        strokeDasharray="3 3"
                        barSize={30}
                        isAnimationActive={!printMode}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded border border-slate-200 report-section report-conclusion">
              <h3 className="text-sm font-bold uppercase mb-2 text-slate-700 flex items-center gap-2"><Info size={14} /> 5. Kết luận & Kiến nghị</h3>
              <div className="space-y-2">
                <div className={`font-bold text-sm ${results.status === 'pass' ? 'text-green-700' : 'text-red-700'}`}>
                  {results.status === 'pass' ? 'KẾT CẤU ĐẢM BẢO KHẢ NĂNG CHỊU LỰC' : 'KẾT CẤU KHÔNG ĐẠT YÊU CẦU - CẦN ĐIỀU CHỈNH'}
                </div>
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  {results.advice.map((item, i) => (<li key={i}>{item}</li>))}
                </ul>
              </div>
            </div>

            <div className="mt-8 flex justify-center print:hidden">
              <button
                onClick={handlePrint}
                className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-red-700 flex items-center gap-2 transition-colors"
              >
                <Printer size={20} />Xuất PDF / Lưu Báo Cáo
              </button>
            </div>

            <div className="mt-8 text-[10px] text-center text-slate-400 italic">
              Báo cáo được tạo tự động bởi phần mềm Greenpan Design
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }

          html, body { height: auto !important; overflow: visible !important; }
          .app-root { height: auto !important; overflow: visible !important; }
          main { height: auto !important; overflow: visible !important; padding: 0 !important; }

          body { background: white !important; }
          header, nav, button { display: none !important; }

          #tab-input, #tab-charts { display: none !important; }
          #tab-report { display: block !important; position: static !important; }

          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          .report-sheet { padding: 6mm !important; }
          .report-section { margin-bottom: 12px !important; }
          .report-chart {
            height: 170px !important;
            padding: 6px 14px 6px 6px !important;
            overflow: visible !important;
          }
          .report-chart .recharts-responsive-container {
            width: 96% !important;
            margin: 0 auto !important;
          }
          .report-legend { display: none !important; }
          .recharts-text { font-size: 8px !important; }
          .recharts-cartesian-axis-tick-value { font-size: 8px !important; }
          .report-conclusion { margin-top: 6px !important; }
        }
      `}</style>
    </div>
  );
}
