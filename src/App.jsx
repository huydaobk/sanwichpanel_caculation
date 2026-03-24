import React, { useState, useMemo } from 'react';
import {
  SECTION_CONSTANTS,
  DEFAULT_REDISTRIBUTION_MODE,
  DEFAULT_WRINKLING_MODE,
  buildSectionProperties,
  runPanelAnalysis,
} from './calc';
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
    compressiveModulus: 4.0,
    wrinklingMode: DEFAULT_WRINKLING_MODE,
    wrinklingStress: 120,
    redistributionMode: DEFAULT_REDISTRIBUTION_MODE,
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
  const [updateStatus, setUpdateStatus] = useState(null);
  const [appVersion, setAppVersion] = useState('');

  React.useEffect(() => {
    const ipcRenderer = window?.require?.('electron')?.ipcRenderer;
    if (!ipcRenderer) return;

    const handler = (_event, payload) => {
      setUpdateStatus({
        event: payload?.event,
        version: payload?.version,
        percent: payload?.percent,
        message: payload?.message,
        appVersion: payload?.appVersion,
        ts: Date.now(),
      });
    };

    const loadVersion = async () => {
      try {
        const version = await ipcRenderer.invoke('app-version');
        if (version) setAppVersion(version);
      } catch (err) {
        console.warn('Failed to load app version', err);
      }
    };

    ipcRenderer.on('auto-update', handler);
    loadVersion();
    return () => ipcRenderer.removeListener('auto-update', handler);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (['panelType', 'windDirection', 'internalWallType', 'projectName', 'deadLoadMode', 'wrinklingMode', 'redistributionMode'].includes(name)) {
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

  const results = useMemo(() => {
    const { summary } = runPanelAnalysis(config, { defaultRedistributionMode: DEFAULT_REDISTRIBUTION_MODE });
    return summary;
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

  const REACTION_PASS_COLOR = '#22c55e';
  const REACTION_FAIL_COLOR = '#ef4444';
  const REACTION_LIMIT_COLOR = '#e5e7eb';
  const REACTION_LIMIT_BORDER = '#9ca3af';

  const ReactionLegend = () => (
    <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: REACTION_PASS_COLOR }} />
        Phản lực đạt
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: REACTION_FAIL_COLOR }} />
        Phản lực không đạt
      </span>
      <span className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-sm border"
          style={{ backgroundColor: REACTION_LIMIT_COLOR, borderColor: REACTION_LIMIT_BORDER }}
        />
        Giới hạn
      </span>
    </div>
  );

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
        <div className="flex items-center gap-3">
          {(updateStatus?.event || updateStatus?.appVersion || appVersion) && (
            <div className="text-[11px] bg-slate-700/70 px-3 py-1 rounded-full whitespace-nowrap">
              {(updateStatus?.appVersion || appVersion) && (
                <span className="mr-2">v{updateStatus?.appVersion || appVersion}</span>
              )}
              {updateStatus?.event === 'checking' && 'Đang kiểm tra cập nhật...'}
              {updateStatus?.event === 'available' && `Có bản mới ${updateStatus.version || ''}`}
              {updateStatus?.event === 'not-available' && 'Không có cập nhật'}
              {updateStatus?.event === 'download-progress' && `Đang tải ${Math.round(updateStatus.percent || 0)}%`}
              {updateStatus?.event === 'downloaded' && `Đã tải xong ${updateStatus.version || ''}. Chuẩn bị cài...`}
              {updateStatus?.event === 'error' && `Lỗi cập nhật: ${updateStatus.message || ''}`}
            </div>
          )}
          <div className="flex gap-2">
            <button className={`px-4 py-1 rounded text-sm ${activeTab === 'input' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setActiveTab('input')}>Nhập Liệu</button>
            <button className={`px-4 py-1 rounded text-sm ${activeTab === 'charts' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setActiveTab('charts')}>Biểu Đồ</button>
            <button className={`px-4 py-1 rounded text-sm ${activeTab === 'report' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setActiveTab('report')}>Báo cáo</button>
          </div>
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
                <div><label className="text-xs block">Mô đun nén lõi Ec (MPa)</label><input type="number" step="0.1" name="compressiveModulus" value={config.compressiveModulus} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Hệ số kappa (shear)</label><input type="number" step="0.05" name="kappaShear" value={config.kappaShear} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Wrinkling mode</label><select name="wrinklingMode" value={config.wrinklingMode} onChange={handleInputChange} className="w-full border p-2 rounded"><option value="declared">declared</option><option value="approx">approx</option><option value="yield-only">yield-only</option></select></div>
                <div>
                  <label className="text-xs block">Wrinkling stress khai báo (MPa)</label>
                  <input type="number" step="0.1" name="wrinklingStress" value={config.wrinklingStress} onChange={handleInputChange} className="w-full border p-2 rounded" />
                  {config.wrinklingMode === 'declared' && !(Number(config.wrinklingStress) > 0) && (
                    <p className="text-[11px] text-amber-700 mt-1">Thiếu giá trị wrinkling declared hợp lệ; báo cáo sẽ gắn cờ declared-missing và fallback theo yield-only.</p>
                  )}
                </div>
                <div><label className="text-xs block">Redistribution mode</label><select name="redistributionMode" value={config.redistributionMode} onChange={handleInputChange} className="w-full border p-2 rounded"><option value="elastic">elastic</option><option value="simplified">simplified</option></select></div>
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
            <div className="mb-3">
              <ReactionLegend />
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={results.reactionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis unit="kN" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="R_Ed" name="Phản lực" barSize={30} isAnimationActive={!printMode}>
                    {results.reactionData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.status === 'fail' ? REACTION_FAIL_COLOR : REACTION_PASS_COLOR}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="F_Rd"
                    name="Giới hạn"
                    fill={REACTION_LIMIT_COLOR}
                    stroke={REACTION_LIMIT_BORDER}
                    strokeDasharray="3 3"
                    barSize={30}
                    isAnimationActive={!printMode}
                  />
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
                <div className="flex justify-between"><span>Mô đun nén lõi Ec:</span> <b>{config.compressiveModulus} MPa</b></div>
                <div className="flex justify-between"><span>Hệ số kappa:</span> <b>{config.kappaShear}</b></div>
                <div className="flex justify-between"><span>Wrinkling mode:</span> <b>{results.wrinklingMode}</b></div>
                <div className="flex justify-between"><span>Redistribution mode:</span> <b>{results.redistributionMode}</b></div>
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
                  <p><strong>Wrinkling mode:</strong> {results.wrinklingMode} {results.sigma_w_source ? `(source: ${results.sigma_w_source})` : ''}</p>
                  {results.wrinklingDeclaredMissing && (
                    <p className="text-amber-700"><strong>Cảnh báo input:</strong> mode declared nhưng thiếu/0 wrinkling stress; check hiện đang fallback theo <b>{results.wrinklingFallbackMode}</b>.</p>
                  )}
                  <p><strong>Ứng suất nhăn xấp xỉ:</strong> σ<sub>w,approx</sub> = 0.5√(E<sub>f</sub>·E<sub>c</sub>·G<sub>c</sub>) = 0.5×√(210000×{results.compressiveModulus}×{config.coreShearModulus}) = <b>{results.sigma_w_approx.toFixed(1)} MPa</b></p>
                  <p><strong>Ứng suất nhăn khai báo:</strong> σ<sub>w,declared</sub> = <b>{results.sigma_w_declared.toFixed(1)} MPa</b></p>
                  <p><strong>Ứng suất nhăn dùng trong kiểm tra:</strong> σ<sub>w</sub> = <b>{results.sigma_w.toFixed(1)} MPa</b></p>
                  <p><strong>Thiết kế nhăn:</strong> σ<sub>w,d</sub> = σ<sub>w</sub>/γ<sub>M,w</sub> = {results.sigma_w.toFixed(1)}/1.2 = <b>{results.sigma_w_design.toFixed(1)} MPa</b></p>
                  <p><strong>Thiết kế chảy:</strong> σ<sub>y,d</sub> = f<sub>y</sub>/γ<sub>M,y</sub> = {config.steelYield}/1.1 = <b>{results.sigma_y_design.toFixed(1)} MPa</b></p>
                  <p><strong>Giới hạn:</strong> σ<sub>limit</sub> = min(σ<sub>w,d</sub>, σ<sub>y,d</sub>) = min({results.sigma_w_design.toFixed(1)}, {results.sigma_y_design.toFixed(1)}) = <b>{results.sigma_limit.toFixed(1)} MPa</b></p>
                  <p><strong>Ứng suất tính toán (Nhịp):</strong> σ<sub>Ed</sub> = M<sub>Ed</sub>·z<sub>max</sub>/I<sub>eq</sub> = <b>{results.stress_span.toFixed(1)} MPa</b> → Tỷ lệ = <b>{(results.ratios.bending * 100).toFixed(0)}%</b></p>
                  <p><strong>Ứng suất tính toán (Gối):</strong> σ<sub>Ed</sub> = <b>{results.stress_support.toFixed(1)} MPa</b> → Tỷ lệ = <b>{(results.ratios.support * 100).toFixed(0)}%</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.5 Kiểm tra lực cắt (Shear Check - ULS)</h4>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Redistribution mode:</strong> {results.redistributionMode} {results.redistributionEnabled ? '(hinge-based simplified redistribution enabled)' : '(pure elastic envelope)'}</p>
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

                <h4 className="font-bold text-blue-800 mt-3">2.7 Governing cases</h4>
                <div className="p-2 bg-amber-50 rounded border border-amber-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Moment:</strong> {results.governingCases?.moment?.label} — {(results.governingCases?.moment?.ratio * 100).toFixed(0)}%</p>
                  <p><strong>Shear:</strong> {results.governingCases?.shear?.label} — {(results.governingCases?.shear?.ratio * 100).toFixed(0)}%</p>
                  <p><strong>Deflection:</strong> {results.governingCases?.deflection?.label} — {(results.governingCases?.deflection?.ratio * 100).toFixed(0)}%</p>
                  <p><strong>Uplift:</strong> {results.governingCases?.uplift?.label} — {(results.governingCases?.uplift?.ratio * 100).toFixed(0)}%</p>
                  <p><strong>Overall:</strong> {results.governingCases?.overall?.label} — {(results.governingCases?.overall?.ratio * 100).toFixed(0)}%</p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.8 Kết quả tổng hợp</h4>
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
                  <div className="mb-2">
                    <ReactionLegend />
                  </div>
                  <ResponsiveContainer width={printMode ? 700 : '100%'} height="100%">
                    <BarChart
                      data={results.reactionData}
                      margin={{ top: 8, right: 36, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis width={60} unit="kN" tick={{ fontSize: 10 }} tickMargin={6} />

                      <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                      <Bar dataKey="R_Ed" name="Phản lực" barSize={30} isAnimationActive={!printMode}>
                        {results.reactionData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.status === 'fail' ? REACTION_FAIL_COLOR : REACTION_PASS_COLOR}
                          />
                        ))}
                      </Bar>

                      <Bar
                        dataKey="F_Rd"
                        name="Giới hạn"
                        fill={REACTION_LIMIT_COLOR}
                        stroke={REACTION_LIMIT_BORDER}
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
