import './App.css';
import React, { useMemo, useRef } from 'react';
import { useAppState } from './hooks/useAppState';
import { useCalculation } from './hooks/useCalculation';
import { APP_DISPLAY_NAME, APP_VERSION, buildReleaseStamp, resolveReleaseChannel, resolveRuntimeAppVersion } from './releaseMeta';
import {
  SECTION_CONSTANTS,
  DEFAULT_REDISTRIBUTION_MODE,
  DEFAULT_WRINKLING_MODE,
  buildResultPackage,
  buildAppSnapshotPackage,
  APP_SNAPSHOT_KIND,
  CAPACITY_CHECK_KEYS,
  CAPACITY_CHECK_LABELS,
  CAPACITY_GOVERNING_CASE_KEYS,
  CAPACITY_GOVERNING_CASE_LABELS,
} from './calc';
import {
  ComposedChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell
} from 'recharts';
import {
  Settings, Thermometer, TrendingUp, AlertCircle, Printer, BookOpen, Activity, Info, FileJson
} from 'lucide-react';

import * as Constants from './utils/appLogic';
const {
  WRINKLING_MODE_LABELS,
  WRINKLING_SOURCE_LABELS,
  REDISTRIBUTION_MODE_LABELS,
  WIND_DIRECTION_LABELS,
  CAPACITY_REPORT_ROW_KEYS,
  CAPACITY_REPORT_ROW_LABELS,
  getModeLabel,
  getCapacityLabel,
  COMPARE_VARIANT_LIMIT,
  COMPARE_VARIANT_LABELS,
  COMPARE_STATUS_LABELS,
  REPORT_BADGE_TONE_CLASSNAMES,
  createDefaultConfig,
  cloneConfig,
  getSafeLocalStorage,
  formatArtifactScopeLabel,
  summarizeVariantLabels,
  buildImportSuccessMessage,
  STORAGE_KEYS,
  PRESET_LIMIT,
  normalizeCompareVariantsForSnapshot,
  normalizeImportedSnapshot,
  downloadJsonFile,
  buildSafeExportFileName,
  buildDefaultPresetName,
  buildPresetSummary,
  normalizePresetLibrary,
  persistPresetLibrary,
  createVariant,
  normalizeVariantLabel,
  formatRatioPercent,
  TRANSPARENCY_RELIABILITY_LABELS,
  TRANSPARENCY_CLASSIFICATION_LABELS,
  TRANSPARENCY_TONE_CLASSNAMES
} = Constants;
import {
  TransparencyBadge,
  ReportBadge,
  ExecutiveSummaryPanel,
  AssumptionsAndLimitationsPanel,
  formatSpanLoadSummary,
  buildPerSpanLoadRows,
  PER_SPAN_ROW_TONE,
  buildPerSpanLoadSummary,
  LOAD_WARNING_TONE,
  buildLoadWorkflowGuardrails,
  TransparencyPanel,
  CeilingSchematic,
  BeamDiagram
} from './components/ReportUI';
import {
  CustomTooltip,
  ReactionLegend,
  REACTION_PASS_COLOR,
  REACTION_FAIL_COLOR,
  REACTION_LIMIT_COLOR,
  REACTION_LIMIT_BORDER,
} from './components/ChartTooltip';
export default function GreenpanDesign_Final() {
  const {
    state,
    setConfig, setCompareVariants, setCompareModeEnabled, setCompareActiveVariantId,
    setSnapshotWorkflowMessage, setPresetLibraryWarning, setPresetLibrary,
    setPresetDraftName, setPresetDraftNote, setActiveTab, setPrintMode,
    setUpdateStatus, setAppVersion, setOutputMode
  } = useAppState();

  const {
    config, compareVariants, compareModeEnabled, compareActiveVariantId,
    snapshotWorkflowMessage, presetLibraryWarning, presetLibrary,
    presetDraftName, presetDraftNote, activeTab, printMode,
    updateStatus, appVersion, outputMode
  } = state;
  const fallbackAppVersion = typeof window !== 'undefined'
    ? resolveRuntimeAppVersion(window?.electronAPI?.appVersion, window?.appVersion, APP_VERSION)
    : APP_VERSION;
  const resolvedAppVersion = resolveRuntimeAppVersion(updateStatus?.appVersion, appVersion, fallbackAppVersion);
  const resolvedReleaseChannel = resolveReleaseChannel(resolvedAppVersion);
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    setCompareVariants((prev) => prev.map((variant) => (
      variant.id === compareActiveVariantId
        ? { ...variant, config: cloneConfig(config) }
        : variant
    )));
  }, [compareActiveVariantId, config]);

  React.useEffect(() => {
    persistPresetLibrary(presetLibrary);
  }, [presetLibrary]);

  React.useEffect(() => {
    const storage = getSafeLocalStorage();
    if (!storage) return;
    const raw = storage.getItem(STORAGE_KEYS.presetLibrary);
    if (!raw) return;
    try {
      normalizePresetLibrary(JSON.parse(raw));
    } catch (error) {
      console.warn('Preset library recovery warning', error);
      try {
        storage.removeItem(STORAGE_KEYS.presetLibrary);
      } catch (cleanupError) {
        console.warn('Failed to clear corrupted preset library after warning', cleanupError);
      }
      setPresetLibrary([]);
      setPresetLibraryWarning('Đã bỏ qua preset cục bộ bị lỗi/legacy để app khởi động an toàn. Có thể lưu lại preset mới từ trạng thái hiện tại.');
    }
  }, []);

  const { compareResults, compareExecutiveSummary, compareMetricRows, results } = useCalculation(
    state.config || config,
    compareModeEnabled,
    compareVariants
  );

  const handleRenameCompareVariant = (variantId, rawLabel) => {
    const fallback = compareVariants.find((variant) => variant.id === variantId)?.name
      || compareVariants.find((variant) => variant.id === variantId)?.label
      || 'Phương án';
    const nextLabel = normalizeVariantLabel(rawLabel, fallback);
    setCompareVariants((prev) => prev.map((variant) => (
      variant.id === variantId
        ? { ...variant, label: nextLabel, name: nextLabel }
        : variant
    )));
  };

  const handleSelectCompareVariant = (variantId) => {
    const target = compareVariants.find((variant) => variant.id === variantId);
    if (!target) return;
    setCompareActiveVariantId(variantId);
    setConfig(cloneConfig(target.config));
  };

  const handleAddCompareVariant = () => {
    setCompareVariants((prev) => {
      if (prev.length >= COMPARE_VARIANT_LIMIT) return prev;
      const nextIndex = prev.length;
      const nextVariant = createVariant(`variant-${nextIndex + 1}`, COMPARE_VARIANT_LABELS[nextIndex], config);
      return [...prev, nextVariant];
    });
    setCompareModeEnabled(true);
  };

  const handleCloneCompareVariant = (variantId) => {
    setCompareVariants((prev) => {
      if (prev.length >= COMPARE_VARIANT_LIMIT) return prev;
      const source = prev.find((variant) => variant.id === variantId) || prev[0];
      const nextIndex = prev.length;
      const nextVariant = createVariant(`variant-${nextIndex + 1}`, COMPARE_VARIANT_LABELS[nextIndex], source?.config || config);
      return [...prev, nextVariant];
    });
    setCompareModeEnabled(true);
  };

  const handleResetCompareVariant = (variantId) => {
    const nextConfig = cloneConfig(config);
    setCompareVariants((prev) => prev.map((variant) => (
      variant.id === variantId
        ? { ...variant, config: nextConfig }
        : variant
    )));
  };

  const handleRemoveCompareVariant = (variantId) => {
    setCompareVariants((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((variant) => variant.id !== variantId);
      const fallback = next[0];
      if (compareActiveVariantId === variantId && fallback) {
        setCompareActiveVariantId(fallback.id);
        setConfig(cloneConfig(fallback.config));
      }
      if (next.length < 2) setCompareModeEnabled(false);
      return next;
    });
  };

  const applyPresetToWorkflow = (preset) => {
    if (!preset) return;
    const nextVariants = normalizeCompareVariantsForSnapshot(preset.compareVariants, preset.configSnapshot);
    const nextActiveId = nextVariants.find((variant) => variant.id === preset.compareActiveVariantId)?.id || nextVariants[0]?.id || 'variant-a';
    const activeVariant = nextVariants.find((variant) => variant.id === nextActiveId) || nextVariants[0];
    setCompareVariants(nextVariants);
    setCompareModeEnabled(preset.compareModeEnabled === true || nextVariants.length >= 2);
    setCompareActiveVariantId(nextActiveId);
    setConfig(cloneConfig(activeVariant?.config || preset.configSnapshot || createDefaultConfig()));
    setActiveTab('input');
    setSnapshotWorkflowMessage(`Đã nạp preset “${preset.name}”. ${buildPresetSummary(activeVariant?.config || preset.configSnapshot, preset.compareModeEnabled, nextVariants)}.`);
  };

  const handleSaveCurrentAsPreset = () => {
    const savedAt = new Date().toISOString();
    const nextName = String(presetDraftName || '').trim() || buildDefaultPresetName(config, compareModeEnabled, presetLibrary.length + 1);
    const nextNote = String(presetDraftNote || '').trim();
    const nextPreset = {
      id: `preset-${Date.now()}`,
      name: nextName,
      note: nextNote,
      configSnapshot: cloneConfig(config),
      compareModeEnabled,
      compareActiveVariantId,
      compareVariants: compareVariants.map((variant) => ({
        id: variant.id,
        label: variant.label,
        name: variant.name || variant.label,
        config: cloneConfig(variant.config),
      })),
      savedAt,
    };

    setPresetLibrary((prev) => [nextPreset, ...prev].slice(0, PRESET_LIMIT));
    setPresetDraftName(nextName);
    setSnapshotWorkflowMessage(`Đã lưu preset “${nextName}”. Có thể quick-load lại ngay trong app.`);
  };

  const handleDeletePreset = (presetId) => {
    setPresetLibrary((prev) => prev.filter((preset) => preset.id !== presetId));
    setSnapshotWorkflowMessage('Đã xoá preset khỏi thư viện cục bộ của app.');
  };

  React.useEffect(() => {
    const api = window?.electronAPI;
    if (!api) return; // Chạy trong browser dev — bỏ qua

    // Đăng ký listener auto-update qua preload bridge (contextIsolation-safe)
    api.onAutoUpdate((payload) => {
      setUpdateStatus({
        event: payload?.event,
        version: payload?.version,
        percent: payload?.percent,
        message: payload?.message,
        appVersion: payload?.appVersion,
        ts: Date.now(),
      });
    });

    const loadVersion = async () => {
      try {
        const [version, releaseMeta] = await Promise.all([
          api.getAppVersion().catch(() => null),
          api.getReleaseMeta().catch(() => null),
        ]);
        const resolvedVersion = resolveRuntimeAppVersion(releaseMeta?.appVersion, version);
        if (resolvedVersion) setAppVersion(resolvedVersion);
      } catch (err) {
        console.warn('Failed to load app version', err);
      }
    };

    loadVersion();
    return () => api.removeAutoUpdateListener?.();
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

  const handleDistributedLoadSpanChange = (kind, index, value) => {
    const key = kind === 'dead' ? 'deadLoadBySpan_kPa' : 'liveLoadBySpan_kPa';
    const nextValues = [...(config[key] || [])];
    const parsed = parseFloat(value);
    nextValues[index] = Number.isNaN(parsed) ? '' : parsed;
    setConfig(prev => ({ ...prev, [key]: nextValues }));
  };

  const handleSupportWidthChange = (index, value) => {
    const newSupportWidths = [...config.supportWidths];
    const parsed = parseFloat(value);
    newSupportWidths[index] = Number.isNaN(parsed) ? '' : parsed;
    setConfig(prev => ({ ...prev, supportWidths: newSupportWidths }));
  };

  const addSpan = () => {
    if (config.spans.length < 5) {
      setConfig(prev => ({
        ...prev,
        spans: [...prev.spans, 3.0],
        supportWidths: [...prev.supportWidths, 60],
        deadLoadBySpan_kPa: [...(prev.deadLoadBySpan_kPa || []), prev.deadLoadMode === 'manual' ? (Number(prev.deadLoadManual_kPa) || 0) : 0],
        liveLoadBySpan_kPa: [...(prev.liveLoadBySpan_kPa || []), Number(prev.liveLoad_kPa) || 0],
      }));
    }
  };

  const removeSpan = () => {
    if (config.spans.length > 1) {
      const newSpans = [...config.spans]; newSpans.pop();
      const newSupportWidths = [...config.supportWidths]; newSupportWidths.pop();
      const newDeadLoadBySpan = [...(config.deadLoadBySpan_kPa || [])]; newDeadLoadBySpan.pop();
      const newLiveLoadBySpan = [...(config.liveLoadBySpan_kPa || [])]; newLiveLoadBySpan.pop();
      setConfig(prev => ({
        ...prev,
        spans: newSpans,
        supportWidths: newSupportWidths,
        deadLoadBySpan_kPa: newDeadLoadBySpan,
        liveLoadBySpan_kPa: newLiveLoadBySpan,
      }));
    }
  };

  const setCoreThickness = (val) => setConfig(prev => ({ ...prev, coreThickness: val }));

  const isCustomerMode = outputMode === 'customer';

  const handlePrint = () => {
    setActiveTab('report');
    setPrintMode(true);
    // Chờ font và chart render xong trước khi in
    // để PDF ra dạng text vector, không bị mờ
    const doPrint = () => {
      window.print();
      setPrintMode(false);
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        // Thêm delay nhỏ cho Recharts render ở kích thước print
        setTimeout(doPrint, 400);
      });
    } else {
      setTimeout(doPrint, 600);
    }
  };

  const handleExportPackage = () => {
    const exportedAt = new Date().toISOString();
    const packagePayload = buildResultPackage({
      config,
      summary: results,
      compareModeEnabled,
      compareVariants,
      compareResults,
      compareSummary: compareExecutiveSummary,
      appVersion,
      fallbackAppVersion,
      exportedAt,
    });
    const filename = packagePayload.exportMeta?.fileName || buildSafeExportFileName({
      projectName: config.projectName,
      packageKind: packagePayload.packageKind,
      compareModeEnabled,
      exportedAt,
    });
    downloadJsonFile(filename, packagePayload);
    setSnapshotWorkflowMessage(`Đã xuất ${formatArtifactScopeLabel(packagePayload.exportMeta?.artifactScope)} để audit/kết quả. File này không dùng để nạp lại form.`);
  };

  const handleExportSnapshot = () => {
    const exportedAt = new Date().toISOString();
    const snapshotPayload = buildAppSnapshotPackage({
      config,
      compareModeEnabled,
      compareVariants,
      compareActiveVariantId,
      appVersion,
      fallbackAppVersion,
      exportedAt,
    });
    const filename = snapshotPayload.exportMeta?.fileName || buildSafeExportFileName({
      projectName: config.projectName,
      packageKind: snapshotPayload.packageKind,
      compareModeEnabled,
      exportedAt,
    });
    downloadJsonFile(filename, snapshotPayload);
    setSnapshotWorkflowMessage(`Đã xuất ${snapshotPayload.importSummary?.packageLabel || formatArtifactScopeLabel(snapshotPayload.exportMeta?.artifactScope)}. Có thể nạp lại form sau này${snapshotPayload.importSummary?.variantCount ? ` · ${snapshotPayload.importSummary.variantCount} phương án` : ''}.`);
  };

  const handleTriggerSnapshotImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportSnapshot = async (event) => {
    const [file] = Array.from(event.target?.files || []);
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const imported = normalizeImportedSnapshot(parsed);
      const inferredVersion = imported.importSummary?.appVersion || String(parsed?.appVersion || parsed?.exportMeta?.appVersion || '').trim();
      if (inferredVersion) setAppVersion(inferredVersion);
      setCompareVariants(imported.compareVariants);
      setCompareModeEnabled(imported.appState.compareModeEnabled);
      setCompareActiveVariantId(imported.appState.compareActiveVariantId);
      setConfig(imported.configSnapshot);
      setActiveTab('input');
      setSnapshotWorkflowMessage(buildImportSuccessMessage(imported.importSummary));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không đọc được file snapshot.';
      setSnapshotWorkflowMessage(message);
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(message);
      } else {
        console.error(message);
      }
    } finally {
      if (event.target) event.target.value = '';
    }
  };



  const distributedLoadRows = useMemo(() => buildPerSpanLoadRows(results), [results]);
  const perSpanSummaryItems = useMemo(() => buildPerSpanLoadSummary(distributedLoadRows), [distributedLoadRows]);

  const loadWorkflowGuardrails = useMemo(() => buildLoadWorkflowGuardrails(config, results), [config, results]);

  const governingCaseRows = [
    CAPACITY_GOVERNING_CASE_KEYS.MOMENT,
    CAPACITY_GOVERNING_CASE_KEYS.SHEAR,
    CAPACITY_GOVERNING_CASE_KEYS.CRUSHING,
    CAPACITY_GOVERNING_CASE_KEYS.DEFLECTION,
    CAPACITY_GOVERNING_CASE_KEYS.UPLIFT,
    CAPACITY_GOVERNING_CASE_KEYS.OVERALL,
  ]
    .map((caseKey) => ({ caseKey, item: results.governingCases?.[caseKey] }))
    .filter(({ caseKey, item }) => item && (caseKey !== CAPACITY_GOVERNING_CASE_KEYS.UPLIFT || item.key !== 'na'));

  const capacityReportRows = CAPACITY_REPORT_ROW_KEYS
    .filter((rowKey) => rowKey !== CAPACITY_CHECK_KEYS.UPLIFT || config.panelType !== 'ceiling')
    .map((rowKey) => {
      switch (rowKey) {
        case CAPACITY_CHECK_KEYS.BENDING_STRESS:
          return {
            key: rowKey,
            label: CAPACITY_REPORT_ROW_LABELS[rowKey],
            demand: `${results.stress_span.toFixed(1)} MPa`,
            resistance: `${results.sigma_limit.toFixed(1)} MPa`,
            ratio: results.ratios.bending,
          };
        case 'supportStress':
          return {
            key: rowKey,
            label: CAPACITY_REPORT_ROW_LABELS[rowKey],
            demand: `${results.stress_support.toFixed(1)} MPa`,
            resistance: `${results.sigma_limit.toFixed(1)} MPa`,
            ratio: results.ratios.support,
          };
        case CAPACITY_CHECK_KEYS.SHEAR_CAPACITY:
          return {
            key: rowKey,
            label: CAPACITY_REPORT_ROW_LABELS[rowKey],
            demand: `${(results.maxShear / 1000).toFixed(2)} kN`,
            resistance: `${(results.V_Rd / 1000).toFixed(2)} kN`,
            ratio: results.ratios.shear,
          };
        case CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING:
          return {
            key: rowKey,
            label: CAPACITY_REPORT_ROW_LABELS[rowKey],
            demand: `${(results.maxReaction / 1000).toFixed(2)} kN`,
            resistance: `${(results.F_Rd_Worst / 1000).toFixed(2)} kN`,
            ratio: results.ratios.crushing,
          };
        case CAPACITY_CHECK_KEYS.UPLIFT:
          return {
            key: rowKey,
            label: CAPACITY_REPORT_ROW_LABELS[rowKey],
            demand: `${(results.maxUplift / 1000).toFixed(2)} kN`,
            resistance: `${(results.T_Rd_Worst / 1000).toFixed(2)} kN`,
            ratio: results.ratios.uplift,
          };
        case CAPACITY_CHECK_KEYS.DEFLECTION:
          return {
            key: rowKey,
            label: CAPACITY_REPORT_ROW_LABELS[rowKey],
            demand: `${results.maxDeflection.toFixed(1)} mm`,
            resistance: `${results.w_limit.toFixed(1)} mm (L/${results.limitDenom})`,
            ratio: results.ratios.deflection,
          };
        default:
          return null;
      }
    })
    .filter(Boolean);

  // CustomTooltip, ReactionLegend, REACTION_* colors imported from ./components/ChartTooltip

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
          <div className="text-sm font-bold text-slate-500">DỰ ÁN</div>
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
          <img src="./logo_app.jpg" alt={APP_DISPLAY_NAME} className="h-10 w-10 object-contain" />
          <div>
            <h1 className="text-xl font-bold leading-none">{APP_DISPLAY_NAME} — Panel calculation</h1>
            <div className="text-[11px] text-slate-300">{buildReleaseStamp(resolvedAppVersion)} · {resolvedReleaseChannel}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* ── Phiên bản hiện tại ── */}
          {(updateStatus?.appVersion || appVersion) && (
            <span className="text-[11px] text-slate-400">
              v{updateStatus?.appVersion || appVersion}
            </span>
          )}

          {/* ── Thông báo cập nhật ── */}
          {updateStatus?.event === 'checking' && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <span className="animate-spin inline-block w-3 h-3 border border-slate-400 border-t-transparent rounded-full" />
              Đang kiểm tra cập nhật...
            </div>
          )}

          {updateStatus?.event === 'available' && (
            <div className="flex items-center gap-1.5 bg-blue-600/80 text-white text-[11px] px-3 py-1 rounded-full">
              <span>🔄</span>
              <span>Có bản mới {updateStatus.version} — Đang tải...</span>
            </div>
          )}

          {updateStatus?.event === 'download-progress' && (
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <div className="w-24 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round(updateStatus.percent || 0)}%` }}
                />
              </div>
              <span>Đang tải {Math.round(updateStatus.percent || 0)}%</span>
            </div>
          )}

          {updateStatus?.event === 'downloaded' && (
            <button
              onClick={() => window.electronAPI?.installUpdate?.()}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors cursor-pointer animate-pulse"
              title="Nhấp để cài đặt và khởi động lại"
            >
              <span>✅</span>
              <span>Cài ngay v{updateStatus.version} & Khởi động lại</span>
            </button>
          )}

          {updateStatus?.event === 'not-available' && (
            <span className="text-[11px] text-slate-400">✓ Mới nhất</span>
          )}

          {updateStatus?.event === 'error' && (
            <span className="text-[11px] text-red-400" title={updateStatus.message}>
              ⚠ Lỗi cập nhật
            </span>
          )}

          <div className="flex gap-2">
            <button className={`px-4 py-1 rounded text-sm ${activeTab === 'input' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setActiveTab('input')}>Nhập liệu</button>
            <button className={`px-4 py-1 rounded text-sm ${activeTab === 'charts' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setActiveTab('charts')}>Biểu đồ</button>
            <button className={`px-4 py-1 rounded text-sm ${activeTab === 'report' ? 'bg-blue-600' : 'bg-slate-700'}`} onClick={() => setActiveTab('report')}>Báo cáo</button>
          </div>
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 print:p-0 print:overflow-visible bg-gray-100"
        style={{ scrollbarGutter: 'stable' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportSnapshot}
        />
        <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 print:hidden">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <div className="text-sm font-bold text-violet-900">Snapshot / compare workflow</div>
              <div className="mt-1 text-xs text-violet-800">
                Dùng <strong>Snapshot dự án</strong> để lưu/nạp lại đúng form đang làm. Khi bật compare mode, app sẽ lưu thành <strong>Snapshot compare set</strong> để giữ cả bộ phương án. <strong>Result package</strong> chỉ dùng để audit/kết quả, không dùng để import lại form.
              </div>
              <div className="mt-2 grid gap-2 text-[11px] text-violet-900 md:grid-cols-3">
                <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                  <div className="font-bold uppercase tracking-wide text-violet-700">Snapshot hiện tại</div>
                  <div className="mt-1">{compareModeEnabled ? 'Snapshot compare set' : 'Snapshot dự án'} · {compareVariants.length} phương án</div>
                  <div className="text-slate-600">Active: {compareVariants.find((variant) => variant.id === compareActiveVariantId)?.label || '—'}</div>
                </div>
                <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                  <div className="font-bold uppercase tracking-wide text-violet-700">Compare persistence</div>
                  <div className="mt-1">Baseline: {compareVariants[0]?.label || '—'}</div>
                  <div className="text-slate-600">Trong snapshot: {summarizeVariantLabels(compareVariants)}</div>
                </div>
                <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                  <div className="font-bold uppercase tracking-wide text-violet-700">Import guide</div>
                  <div className="mt-1">Chỉ chọn file “Snapshot dự án” hoặc “Snapshot compare set”.</div>
                  <div className="text-slate-600">Nếu chọn nhầm result package, app sẽ báo rõ lý do.</div>
                </div>
              </div>
              {presetLibraryWarning && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {presetLibraryWarning}
                </div>
              )}
              {snapshotWorkflowMessage && (
                <div className="mt-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs text-violet-900">
                  {snapshotWorkflowMessage}
                </div>
              )}

              <div className="mt-3 rounded-lg border border-violet-200 bg-white px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-violet-700">Preset quick-pick</div>
                    <div className="mt-1 text-[11px] text-slate-600">Lưu nhanh cấu hình đang mở vào app để mở lại project/snapshot hay dùng mà không cần đi qua file JSON.</div>
                  </div>
                  <div className="text-[11px] text-slate-500">Tối đa {PRESET_LIMIT} preset cục bộ trên máy này</div>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                  <label className="text-xs text-slate-600">
                    <div className="mb-1 font-semibold">Tên preset</div>
                    <input
                      type="text"
                      value={presetDraftName}
                      onChange={(e) => setPresetDraftName(e.target.value)}
                      className="w-full rounded border border-violet-200 px-2 py-1.5 text-sm text-slate-900"
                      placeholder={buildDefaultPresetName(config, compareModeEnabled, presetLibrary.length + 1)}
                    />
                  </label>
                  <label className="text-xs text-slate-600">
                    <div className="mb-1 font-semibold">Ghi chú nhanh</div>
                    <input
                      type="text"
                      value={presetDraftNote}
                      onChange={(e) => setPresetDraftNote(e.target.value)}
                      className="w-full rounded border border-violet-200 px-2 py-1.5 text-sm text-slate-900"
                      placeholder="Ví dụ: cold room 100 mm / case demo nội bộ"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleSaveCurrentAsPreset}
                      className="w-full rounded-full border border-violet-300 bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                    >
                      Lưu preset đang mở
                    </button>
                  </div>
                </div>

                {presetLibrary.length > 0 ? (
                  <div className="mt-3 grid gap-2 lg:grid-cols-2">
                    {presetLibrary.map((preset) => (
                      <div key={preset.id} className="rounded-lg border border-violet-200 bg-violet-50/40 px-3 py-3 text-xs text-slate-700">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-violet-900">{preset.name}</div>
                            <div className="mt-1 text-[11px] text-slate-600">{buildPresetSummary(preset.configSnapshot, preset.compareModeEnabled, preset.compareVariants)}</div>
                            {preset.note && <div className="mt-1 text-[11px] text-slate-500">{preset.note}</div>}
                            <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">Lưu {new Date(preset.savedAt).toLocaleString('vi-VN')}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => applyPresetToWorkflow(preset)}
                              className="rounded-full border border-violet-300 bg-white px-3 py-1 font-semibold text-violet-900"
                            >
                              Nạp ngay
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePreset(preset.id)}
                              className="rounded-full border border-rose-300 bg-white px-3 py-1 font-semibold text-rose-700"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-violet-200 bg-violet-50/30 px-3 py-3 text-[11px] text-slate-500">
                    Chưa có preset nào. Lưu một cấu hình hay dùng để lần sau mở nhanh hơn thay vì export/import snapshot file.
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleExportSnapshot}
                className="rounded-full border border-violet-300 bg-white px-3 py-1 text-sm font-semibold text-violet-900 hover:border-violet-400"
              >
                Xuất {compareModeEnabled ? 'Snapshot compare set' : 'Snapshot dự án'}
              </button>
              <button
                type="button"
                onClick={handleTriggerSnapshotImport}
                className="rounded-full border border-violet-300 bg-white px-3 py-1 text-sm font-semibold text-violet-900 hover:border-violet-400"
              >
                Nạp snapshot vào form
              </button>
              <label className="inline-flex items-center gap-2 rounded-full border border-violet-300 bg-white px-3 py-1 text-sm font-semibold text-violet-900">
                <input
                  type="checkbox"
                  checked={compareModeEnabled}
                  onChange={(e) => setCompareModeEnabled(e.target.checked)}
                />
                Bật compare mode
              </label>
            </div>
          </div>

          {compareModeEnabled && (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {compareVariants.map((variant) => {
                  const isActive = variant.id === compareActiveVariantId;
                  const summary = compareResults.find((item) => item.id === variant.id)?.summary;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => handleSelectCompareVariant(variant.id)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition ${isActive ? 'border-violet-500 bg-violet-600 text-white shadow-sm' : 'border-violet-200 bg-white text-violet-900 hover:border-violet-400'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold">{variant.label}</div>
                        {compareExecutiveSummary.bestVariantId === variant.id && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>Đọc trước</span>
                        )}
                      </div>
                      <div className={`text-[11px] ${isActive ? 'text-violet-100' : 'text-violet-700'}`}>
                        {summary?.status === 'pass' ? 'Đạt' : 'Không đạt'} · max ratio {formatRatioPercent(summary?.governingCases?.overall?.ratio || 0)}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-lg border border-violet-200 bg-white p-3">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-violet-700">Đổi tên compare set để snapshot/load dễ nhận diện</div>
                <div className="grid gap-2 md:grid-cols-3">
                  {compareVariants.map((variant, idx) => (
                    <label key={`compare-rename-${variant.id}`} className="text-xs text-slate-600">
                      <div className="mb-1 font-semibold">{COMPARE_VARIANT_LABELS[idx] || `PA ${idx + 1}`}</div>
                      <input
                        type="text"
                        value={variant.label}
                        onChange={(e) => handleRenameCompareVariant(variant.id, e.target.value)}
                        className="w-full rounded border border-violet-200 px-2 py-1.5 text-sm text-slate-900"
                        placeholder={variant.name || variant.label}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <button type="button" onClick={handleAddCompareVariant} disabled={compareVariants.length >= COMPARE_VARIANT_LIMIT} className="rounded border border-violet-300 bg-white px-3 py-1.5 font-semibold text-violet-900 disabled:cursor-not-allowed disabled:opacity-50">
                  + Thêm phương án mới từ form đang mở
                </button>
                <button type="button" onClick={handleExportSnapshot} className="rounded border border-violet-300 bg-white px-3 py-1.5 font-semibold text-violet-900">
                  Xuất snapshot compare set này
                </button>
                <button type="button" onClick={() => handleCloneCompareVariant(compareActiveVariantId)} disabled={compareVariants.length >= COMPARE_VARIANT_LIMIT} className="rounded border border-violet-300 bg-white px-3 py-1.5 font-semibold text-violet-900 disabled:cursor-not-allowed disabled:opacity-50">
                  Nhân bản {compareVariants.find((item) => item.id === compareActiveVariantId)?.label || 'PA hiện tại'} thành PA mới
                </button>
                <button type="button" onClick={() => handleResetCompareVariant(compareActiveVariantId)} className="rounded border border-violet-300 bg-white px-3 py-1.5 font-semibold text-violet-900">
                  Ghi đè {compareVariants.find((item) => item.id === compareActiveVariantId)?.label || 'PA hiện tại'} bằng form đang mở
                </button>
                {compareVariants.length > 1 && (
                  <button type="button" onClick={() => handleRemoveCompareVariant(compareActiveVariantId)} className="rounded border border-rose-300 bg-white px-3 py-1.5 font-semibold text-rose-700">
                    Xóa {compareVariants.find((item) => item.id === compareActiveVariantId)?.label || 'PA hiện tại'} khỏi compare set
                  </button>
                )}
              </div>

              {compareMetricRows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-violet-200 bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-violet-100 text-violet-950">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold">Chỉ tiêu</th>
                        {compareResults.map((variant) => (
                          <th key={`compare-head-${variant.id}`} className="px-3 py-2 text-left font-bold">{variant.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compareMetricRows.map((row) => (
                        <tr key={row.key} className="border-t border-violet-100 align-top">
                          <td className="px-3 py-2 font-medium text-slate-700">{row.label}</td>
                          {row.values.map((cell) => {
                            const toneClass = cell.tone === 'pass'
                              ? 'text-emerald-700'
                              : cell.tone === 'fail'
                                ? 'text-rose-700'
                                : cell.tone === 'muted'
                                  ? 'text-slate-400'
                                  : 'text-slate-800';
                            return (
                              <td key={`${row.key}-${cell.variantId}`} className={`px-3 py-2 font-semibold ${cell.isBest ? 'bg-emerald-50/70' : ''} ${toneClass}`.trim()}>
                                <div className="flex items-center gap-2">
                                  <span>{cell.value}</span>
                                  {cell.isBest && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Best</span>}
                                </div>
                                {cell.subValue && <div className="text-[11px] font-medium text-slate-500">{cell.subValue}</div>}
                                {cell.diffHint && <div className="text-[10px] font-medium text-slate-500">{cell.diffHint}</div>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* INPUT TAB */}
        <div id="tab-input" className={activeTab === 'input' ? 'block' : 'hidden'}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-blue-700"><Settings size={20} /> 1. Sơ Đồ & Kích Thước</h2>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 mb-1">Tên dự án</label>
                <input type="text" name="projectName" value={config.projectName} onChange={handleInputChange} className="w-full border p-2 rounded" />
              </div>

              <div className="mb-4 bg-blue-50 p-3 rounded border border-blue-100">
                <div className="flex flex-wrap gap-4 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="panelType" value="external" checked={config.panelType === 'external'} onChange={handleInputChange} />
                    <span className="text-sm">Vách ngoài</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="panelType" value="internal" checked={config.panelType === 'internal'} onChange={handleInputChange} />
                    <span className="text-sm">Vách trong</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="panelType" value="ceiling" checked={config.panelType === 'ceiling'} onChange={handleInputChange} />
                    <span className="text-sm">Tấm trần</span>
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
                  <label className="text-xs font-bold">Giới hạn độ võng:</label>
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
                  <label className="text-sm block font-bold">Độ dày lõi (mm):</label>
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
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-orange-600"><Thermometer size={20} /> 2. Thông số kỹ thuật</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs block">Tôn ngoài (mm)</label><input type="number" step="0.05" name="skinOut" value={config.skinOut} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Tôn trong (mm)</label><input type="number" step="0.05" name="skinIn" value={config.skinIn} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block font-bold">Bề rộng panel (mm)</label><input type="number" step="10" name="panelWidth" value={config.panelWidth} onChange={handlePanelWidthChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Nhiệt độ ngoài (°C)</label><input type="number" name="tempOut" value={config.tempOut} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Nhiệt độ trong (°C)</label><input type="number" name="tempIn" value={config.tempIn} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Hệ số nhiệt γT</label><input type="number" step="0.1" name="gammaF_thermal" value={config.gammaF_thermal} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block font-bold">Áp lực gió (kPa)</label><input type="number" step="0.1" name="windPressure" value={config.windPressure} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block font-bold text-red-600">Thép Fy (MPa)</label><input type="number" name="steelYield" value={config.steelYield} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Cường độ cắt lõi (MPa)</label><input type="number" step="0.01" name="coreShearStrength" value={config.coreShearStrength} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Mô đun cắt lõi Gc (MPa)</label><input type="number" step="0.1" name="coreShearModulus" value={config.coreShearModulus} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Mô đun nén lõi Ec (MPa)</label><input type="number" step="0.1" name="compressiveModulus" value={config.compressiveModulus} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Hệ số kappa cắt</label><input type="number" step="0.05" name="kappaShear" value={config.kappaShear} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                <div><label className="text-xs block">Chế độ kiểm tra nhăn</label><select name="wrinklingMode" value={config.wrinklingMode} onChange={handleInputChange} className="w-full border p-2 rounded"><option value="declared">Khai báo trực tiếp</option><option value="approx">Xấp xỉ kỹ thuật</option><option value="yield-only">Theo giới hạn chảy</option></select></div>
                <div className="col-span-2 rounded border border-amber-200 bg-amber-50/40 p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs block">Ứng suất nhăn khai báo</label>
                      <input type="number" step="0.1" name="wrinklingStress" value={config.wrinklingStress} onChange={handleInputChange} className="w-full border p-2 rounded" />
                    </div>
                    <div>
                      <label className="text-xs block">Đơn vị / basis hiển thị</label>
                      <input type="text" name="wrinklingStressUnit" value={config.wrinklingStressUnit} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="MPa" />
                    </div>
                    <div>
                      <label className="text-xs block">Semantic của giá trị khai báo</label>
                      <select name="wrinklingStressBasis" value={config.wrinklingStressBasis} onChange={handleInputChange} className="w-full border p-2 rounded">
                        <option value="design-resistance">Giá trị thiết kế dùng trực tiếp</option>
                        <option value="characteristic-resistance">Giá trị đặc trưng</option>
                        <option value="test-result">Kết quả thử nghiệm</option>
                        <option value="vendor-table">Giá trị từ bảng vendor/datasheet</option>
                        <option value="user-note">Ghi chú nội bộ / user note</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs block">Loại nguồn</label>
                      <select name="wrinklingStressSourceType" value={config.wrinklingStressSourceType} onChange={handleInputChange} className="w-full border p-2 rounded">
                        <option value="unknown">Chưa rõ nguồn</option>
                        <option value="vendor">Vendor datasheet/manual</option>
                        <option value="test">Test report</option>
                        <option value="worksheet">Worksheet nội bộ đã lưu</option>
                        <option value="manual">Nhập tay / nhớ lại</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs block">Nguồn tham chiếu / product context</label>
                    <input type="text" name="wrinklingStressSourceRef" value={config.wrinklingStressSourceRef} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="Ví dụ: datasheet XYZ rev.B / worksheet 2025-11 / PIR 50 mm" />
                  </div>
                  <div>
                    <label className="text-xs block">Ghi chú nguồn / giả định</label>
                    <textarea name="wrinklingStressSourceNote" value={config.wrinklingStressSourceNote} onChange={handleInputChange} className="w-full border p-2 rounded min-h-[72px]" placeholder="Ghi rõ nếu đây là characteristic value, kết quả test chưa quy đổi, hoặc note nội bộ chưa có citation cứng." />
                  </div>
                  <div>
                    <label className="text-xs block">Context sản phẩm áp dụng</label>
                    <input type="text" name="wrinklingStressProductContext" value={config.wrinklingStressProductContext} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="Panel line / core density / thickness / facing..." />
                  </div>
                  <p className="text-[11px] text-slate-600">Giá trị này hiện được hiểu là <b>khai báo sức kháng/ứng suất wrinkling theo nguồn do người dùng cung cấp</b>. Hệ thống vẫn tính như cũ, nhưng sẽ mang theo basis + provenance để tránh nhập một con số mơ hồ.</p>
                  <p className="text-[11px] text-slate-500">Repo hiện đã gắn được <b>guidance cấp product-family</b> từ vendor technical guide có nêu “wrinkling of the face layer…”, nên nếu nhập theo panel family tương ứng hãy ưu tiên khai rõ <b>basis</b> + <b>source ref</b>. Tuy vậy, sau đợt artifact hunt hiện tại repo vẫn <b>chưa có vendor table/test/worksheet/manual line chứa con số MPa cụ thể</b> cho declared path này, nên giá trị số vẫn chỉ được coi là source-backed khi chính table/test/worksheet chứa đúng giá trị đó được đính kèm.</p>
                  {config.wrinklingMode === 'declared' && !(Number(config.wrinklingStress) > 0) && (
                    <p className="text-[11px] text-amber-700">Thiếu ứng suất wrinkling khai báo hợp lệ; báo cáo sẽ gắn cờ thiếu dữ liệu và fallback tạm sang kiểm tra theo giới hạn chảy.</p>
                  )}
                </div>
                <div><label className="text-xs block">Chế độ phân phối nội lực</label><select name="redistributionMode" value={config.redistributionMode} onChange={handleInputChange} className="w-full border p-2 rounded"><option value="elastic">Đàn hồi</option><option value="simplified">Đơn giản hóa</option></select></div>
                {config.panelType !== 'ceiling' && (
                  <>
                    <div><label className="text-xs block">Khả năng chịu kéo vít (kN)</label><input type="number" step="0.1" name="screwStrength" value={config.screwStrength} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                    <div><label className="text-xs block">Bước vít (mm)</label><input type="number" step="10" name="screwSpacing" value={config.screwSpacing} onChange={handleInputChange} className="w-full border p-2 rounded" /></div>
                    <div><label className="text-xs block">Basis sức kháng vít</label><select name="screwStrengthBasis" value={config.screwStrengthBasis} onChange={handleInputChange} className="w-full border p-2 rounded"><option value="design-resistance-per-fastener">Design resistance / mỗi vít</option><option value="characteristic-resistance-per-fastener">Characteristic resistance / mỗi vít</option><option value="vendor-allowable-per-fastener">Vendor allowable / mỗi vít</option><option value="test-result-per-fastener">Test result / mỗi vít</option><option value="user-note-per-fastener">User note / mỗi vít</option></select></div>
                    <div><label className="text-xs block">Loại nguồn sức kháng vít</label><select name="screwStrengthSourceType" value={config.screwStrengthSourceType} onChange={handleInputChange} className="w-full border p-2 rounded"><option value="unknown">Chưa rõ nguồn</option><option value="vendor">Vendor datasheet / manual</option><option value="schedule">Project fastening schedule</option><option value="test">Test report / lab sheet</option><option value="worksheet">Archived worksheet / calc note</option><option value="manual">Manual user entry</option></select></div>
                    <div><label className="text-xs block">Đơn vị hiển thị</label><input type="text" name="screwStrengthUnit" value={config.screwStrengthUnit} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="kN" /></div>
                    <div><label className="text-xs block">Source ref</label><input type="text" name="screwStrengthSourceRef" value={config.screwStrengthSourceRef} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="Ví dụ: fastener datasheet ABC / schedule rev.2 / worksheet uplift-01" /></div>
                    <div className="col-span-2"><label className="text-xs block">Fastener / application context</label><input type="text" name="screwStrengthFastenerContext" value={config.screwStrengthFastenerContext} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="Fastener type / substrate / sheet thickness / embedment / washer / support line..." /></div>
                    <div className="col-span-2"><label className="text-xs block">Source note</label><textarea name="screwStrengthSourceNote" value={config.screwStrengthSourceNote} onChange={handleInputChange} className="w-full border p-2 rounded min-h-[72px]" placeholder="Ghi rõ nếu đây là characteristic value, vendor allowable chưa quy đổi, hoặc note nội bộ chưa có citation cứng." /></div>
                    <div className="col-span-2"><label className="text-xs block">Diễn giải spacing-to-count (tuỳ chọn)</label><input type="text" name="screwStrengthSpacingMeaning" value={config.screwStrengthSpacingMeaning} onChange={handleInputChange} className="w-full border p-2 rounded" placeholder="Mặc định: spacing across panelWidth for simplified count estimate" /></div>
                    <div className="col-span-2 text-[11px] text-slate-600 space-y-1"><p>Giá trị <b>screwStrength</b> hiện được hiểu là <b>sức kháng nhổ / pull-out khai báo trên mỗi vít</b>. Hệ thống giữ nguyên công thức uplift hiện có, nhưng sẽ mang theo basis + provenance để tránh nhập một con số kN mơ hồ.</p><p className="text-slate-500">Repo hiện <b>chưa có documented datasheet/schedule/test/worksheet</b> chứng minh sẵn con số kN cụ thể cho từng case. Nếu chưa gắn <b>source ref</b> hoặc <b>source note</b>, báo cáo sẽ nói rõ đây vẫn là <b>user-declared fastener resistance</b>. Quy tắc <b>round(panelWidth / screwSpacing)</b> và <b>γM,screw</b> cũng đang được exposed minh bạch như source-gap/provisional metadata, không phải cited rule.</p></div>
                  </>
                )}

                <div className="col-span-2">
                  <label className="flex items-center gap-4 text-sm mt-2">
                    <input type="radio" name="windDirection" value="pressure" checked={config.windDirection === 'pressure'} onChange={handleInputChange} /> Gió đẩy
                    <input type="radio" name="windDirection" value="suction" checked={config.windDirection === 'suction'} onChange={handleInputChange} /> Gió hút
                  </label>
                </div>

                {config.panelType === 'ceiling' && (
                  <div className="col-span-2 mt-2 bg-emerald-50 p-3 rounded border border-emerald-200 space-y-2">
                    <div className="text-xs font-bold text-emerald-800">TẢI TRỌNG TÁC DỤNG LÊN TRẦN</div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 rounded border border-emerald-200 bg-white/70 p-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                          <input
                            type="checkbox"
                            checked={config.enableSpanDistributedLoads === true}
                            onChange={(e) => setConfig(prev => ({ ...prev, enableSpanDistributedLoads: e.target.checked }))}
                          />
                          Nhập tải phân bố riêng cho từng nhịp
                        </label>
                        <div className="text-[10px] text-gray-600 mt-1">
                          Tắt tuỳ chọn này để dùng 1 bộ qG/qQ chung như flow cũ. Bật để khai báo qG và qQ riêng cho từng nhịp ở bảng bên dưới.
                        </div>
                      </div>

                      <div>
                        <label className="text-xs block font-bold">Tĩnh tải</label>
                        <select
                          name="deadLoadMode"
                          value={config.deadLoadMode}
                          onChange={handleInputChange}
                          className="w-full border rounded p-1 text-sm"
                        >
                          <option value="auto">Tự động (tự trọng panel)</option>
                          <option value="manual">Nhập tay (kPa)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs block font-bold">Hoạt tải (kPa)</label>
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
                          <label className="text-xs block font-bold">Tĩnh tải nhập tay (kPa)</label>
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

                      <div className="col-span-2 space-y-2">
                        {loadWorkflowGuardrails.map((item) => (
                          <div key={item.id} className={`rounded border p-3 ${LOAD_WARNING_TONE[item.tone] || LOAD_WARNING_TONE.info}`}>
                            <div className="text-xs font-semibold">{item.title}</div>
                            <div className="mt-1 text-[11px] leading-relaxed">{item.message}</div>
                          </div>
                        ))}
                      </div>

                      {config.enableSpanDistributedLoads === true && (
                        <div className="col-span-2 rounded border border-emerald-200 bg-white/80 p-3 space-y-3">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <div className="text-xs font-bold text-emerald-800">BẢNG TẢI PHÂN BỐ THEO TỪNG NHỊP (kPa)</div>
                              <div className="text-[10px] text-gray-600 mt-1">Mỗi dòng là một nhịp độc lập. qG = tĩnh tải, qQ = hoạt tải dùng cho nhịp đó.</div>
                            </div>
                            <div className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800">Mode đang bật: Theo từng nhịp</div>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-[11px] font-semibold text-gray-600">
                            <div>Nhịp</div>
                            <div>Chiều dài</div>
                            <div>Tĩnh tải qG</div>
                            <div>Hoạt tải qQ</div>
                          </div>
                          {config.spans.map((span, idx) => {
                            const rawDead = config.deadLoadBySpan_kPa?.[idx];
                            const rawLive = config.liveLoadBySpan_kPa?.[idx];
                            const deadMissing = rawDead === '' || rawDead === null || typeof rawDead === 'undefined';
                            const liveMissing = rawLive === '' || rawLive === null || typeof rawLive === 'undefined';
                            const qG = Number(rawDead || 0);
                            const qQ = Number(rawLive || 0);
                            const isNegative = qG < 0 || qQ < 0;
                            const isZeroDead = qG === 0;
                            const isEmptySpan = qG === 0 && qQ === 0;
                            const rowTone = isNegative ? 'rose' : (deadMissing || liveMissing || isZeroDead) ? 'amber' : 'emerald';
                            const rowClass = rowTone === 'rose'
                              ? 'border-rose-200 bg-rose-50/80'
                              : rowTone === 'amber'
                                ? 'border-amber-200 bg-amber-50/80'
                                : 'border-emerald-100 bg-emerald-50/40';
                            const inputClass = rowTone === 'rose'
                              ? 'border-rose-300 bg-white text-rose-900 focus:border-rose-400 focus:ring-rose-100'
                              : rowTone === 'amber'
                                ? 'border-amber-300 bg-white text-amber-900 focus:border-amber-400 focus:ring-amber-100'
                                : 'border-slate-200 bg-white text-slate-900 focus:border-emerald-400 focus:ring-emerald-100';
                            const helperText = isNegative
                              ? 'Có tải âm, nên kiểm tra lại dấu nhập.'
                              : deadMissing || liveMissing
                                ? 'Ô trống hiện bị hiểu là 0.'
                                : isEmptySpan
                                  ? 'Cả qG và qQ đang về 0 ở nhịp này.'
                                  : isZeroDead
                                    ? 'Nhịp này đang có qG = 0.'
                                    : 'Dòng này đã đủ dữ liệu để solver dùng trực tiếp.';

                            return (
                              <div key={`distributed-span-${idx}`} className={`grid grid-cols-4 gap-2 items-center rounded border p-2 transition-colors ${rowClass}`}>
                                <div>
                                  <div className="text-sm font-semibold text-gray-800">Nhịp {idx + 1}</div>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {isNegative && <span className="rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800">Kiểm tra dấu</span>}
                                    {!isNegative && (deadMissing || liveMissing) && <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Ô trống → 0</span>}
                                    {!isNegative && !deadMissing && !liveMissing && isEmptySpan && <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Nhịp đang không tải</span>}
                                    {!isNegative && !deadMissing && !liveMissing && !isEmptySpan && isZeroDead && <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">qG = 0</span>}
                                  </div>
                                </div>
                                <div className="text-sm text-gray-700">
                                  <div>{Number(span || 0).toFixed(2)} m</div>
                                  <div className="mt-1 text-[10px] text-gray-500">{helperText}</div>
                                </div>
                                <div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={config.deadLoadBySpan_kPa?.[idx] ?? 0}
                                    onChange={(e) => handleDistributedLoadSpanChange('dead', idx, e.target.value)}
                                    className={`w-full rounded border p-2 text-sm focus:outline-none focus:ring-2 ${inputClass}`}
                                  />
                                  <div className="mt-1 text-[10px] text-gray-500">qG của nhịp {idx + 1}</div>
                                </div>
                                <div>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={config.liveLoadBySpan_kPa?.[idx] ?? 0}
                                    onChange={(e) => handleDistributedLoadSpanChange('live', idx, e.target.value)}
                                    className={`w-full rounded border p-2 text-sm focus:outline-none focus:ring-2 ${inputClass}`}
                                  />
                                  <div className="mt-1 text-[10px] text-gray-500">qQ của nhịp {idx + 1}</div>
                                </div>
                              </div>
                            );
                          })}
                          <div className="rounded border border-emerald-100 bg-emerald-50 p-2 text-[10px] text-gray-700 space-y-1">
                            <div><b>Cách hiểu:</b> hệ sẽ tính nội lực theo đúng bộ qG/qQ của từng nhịp; không còn giả định mọi nhịp nhận cùng một giá trị tải phân bố.</div>
                            <div><b>Lưu ý hiện tại:</b> tải gió vẫn đang áp đều theo toàn dầm như flow hiện hữu.</div>
                          </div>
                        </div>
                      )}

                      {/* ✅ NEW: Creep factor cho trần */}
                      <div className="col-span-2">
                        <label className="text-xs block font-bold">Hệ số từ biến φ</label>
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
                        <div className="text-xs font-bold text-emerald-800">Tải treo (tải tập trung) — tọa độ X theo toàn dầm</div>
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
                              <label className="text-[10px] block text-gray-600">Nhóm tải</label>
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
                                <option value="permanent">G (dài hạn)</option>
                                <option value="variable">Q (ngắn hạn)</option>
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
                        Ví dụ kiểm tra nhanh: nhịp 3m + 3m, X=1.5m P=0.30kN và X=4.5m P=0.30kN (biểu đồ lực cắt sẽ nhảy 0.30kN đúng tại vị trí đặt tải).
                      </div>
                    </div>
                  </div>
                )}

                {config.panelType === 'internal' && config.internalWallType === 'cold_storage' && (
                  <div className="col-span-2 mt-2 bg-blue-50 p-2 rounded border border-blue-200">
                    <label className="text-xs block mb-1 font-bold text-blue-700 flex items-center gap-1"><TrendingUp size={12} /> Hệ số từ biến</label>
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
              {config.panelType === 'ceiling' ? 'Sơ đồ tính trần (X toàn dầm)' : 'Sơ đồ tính (tải + gối)'}
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
            <h3 className="font-bold text-center mb-2">Biểu đồ chuyển vị</h3>
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
            <h3 className="font-bold text-center mb-2">Biểu đồ mô-men uốn</h3>
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
            <h3 className="font-bold text-center mb-2">Biểu đồ lực cắt</h3>
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
            <h3 className="font-bold text-center mb-2">Biểu đồ phản lực gối</h3>
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

          {/* ── Output Mode Switcher ── */}
          <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm print:hidden">
            <div>
              <div className="text-sm font-bold text-slate-800">Chế độ xuất PDF</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {isCustomerMode
                  ? 'Bản khách hàng — ẩn ghi chú kỹ thuật nội bộ, hiển thị khuyến nghị rõ ràng'
                  : 'Bản kỹ sư — đầy đủ chi tiết kỹ thuật, ghi chú provenance & validation'}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOutputMode('engineer')}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  !isCustomerMode
                    ? 'bg-slate-800 text-white'
                    : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                🔧 Bản kỹ sư
              </button>
              <button
                type="button"
                onClick={() => setOutputMode('customer')}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  isCustomerMode
                    ? 'bg-blue-600 text-white'
                    : 'border border-blue-300 text-blue-700 hover:bg-blue-50'
                }`}
              >
                👤 Bản khách hàng
              </button>
            </div>
          </div>

          <div className="w-full mx-auto bg-white p-8 shadow-lg print:shadow-none print:w-full print:max-w-none report-sheet">
            <ReportHeader />
            <ExecutiveSummaryPanel results={results} compareSummary={results.compareSummary} isCustomerMode={isCustomerMode} />
            {!isCustomerMode && <AssumptionsAndLimitationsPanel results={results} />}

            <div className="mb-6 report-section">
              <h3 className="text-sm font-bold border-b border-gray-400 mb-2 uppercase flex items-center gap-2">
                <Settings size={14} /> 1. Thông số đầu vào
              </h3>

              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                <div className="flex justify-between"><span>Loại panel:</span> <b>{config.panelType === 'external' ? 'Vách ngoài' : config.panelType === 'internal' ? 'Vách trong' : 'Tấm trần'}</b></div>
                <div className="flex justify-between"><span>Độ dày lõi:</span> <b>{config.coreThickness} mm</b></div>
                <div className="flex justify-between"><span>Tôn mặt (Ngoài/Trong):</span> <b>{config.skinOut} / {config.skinIn} mm</b></div>
                <div className="flex justify-between"><span>Bề rộng panel:</span> <b>{config.panelWidth} mm</b></div>
                <div className="flex justify-between"><span>Cường độ thép (Fy):</span> <b>{config.steelYield} MPa</b></div>
                <div className="flex justify-between"><span>Tỷ trọng lõi:</span> <b>{config.coreDensity} kg/m3</b></div>
                <div className="flex justify-between"><span>Cường độ cắt lõi:</span> <b>{config.coreShearStrength} MPa</b></div>
                <div className="flex justify-between"><span>Mô đun cắt lõi Gc:</span> <b>{config.coreShearModulus} MPa</b></div>
                <div className="flex justify-between"><span>Mô đun nén lõi Ec:</span> <b>{config.compressiveModulus} MPa</b></div>
                <div className="flex justify-between"><span>Hệ số kappa:</span> <b>{config.kappaShear}</b></div>
                <div className="flex justify-between"><span>Chế độ kiểm tra wrinkling:</span> <b>{getModeLabel(results.wrinklingMode, WRINKLING_MODE_LABELS)}</b></div>
                <div className="flex justify-between"><span>Phân phối nội lực:</span> <b>{getModeLabel(results.redistributionMode, REDISTRIBUTION_MODE_LABELS)}</b></div>
                <div className="flex justify-between"><span>Tải trọng gió/áp suất:</span> <b>{config.windPressure} kPa ({getModeLabel(config.windDirection, WIND_DIRECTION_LABELS)})</b></div>
                <div className="flex justify-between"><span>Chênh lệch nhiệt độ:</span> <b>{Math.abs(config.tempOut - config.tempIn)} °C</b></div>
                <div className="flex justify-between"><span>Hệ số nhiệt γT:</span> <b>{config.gammaF_thermal}</b></div>
                <div className="flex justify-between"><span>Sơ đồ nhịp:</span> <b>{config.spans.join(' + ')} m</b></div>
                <div className="flex justify-between"><span>Bề rộng gối đỡ:</span> <b>{config.supportWidths.join(' + ')} mm</b></div>
                {config.panelType !== 'ceiling' && (
                  <div className="flex justify-between"><span>Khoảng cách vít:</span> <b>{config.screwSpacing} mm</b></div>
                )}
                <div className="flex justify-between"><span>Giới hạn độ võng:</span> <b>L/{results.limitDenom}</b></div>
                {config.panelType === 'ceiling' && (
                  <div className="flex justify-between"><span>Chế độ tải phân bố:</span> <b>{results.distributedLoadMode === 'per-span' ? 'Theo từng nhịp' : 'Một giá trị chung'}</b></div>
                )}
                {config.panelType === 'ceiling' && results.distributedLoadMode === 'per-span' && (
                  <div className="col-span-2 rounded border border-sky-200 bg-sky-50 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-xs font-bold text-sky-800">TÓM TẮT TẢI THEO TỪNG NHỊP</div>
                      <div className="text-[10px] font-semibold text-sky-700">Đang dùng dữ liệu per-span để tính nội lực</div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="text-[11px] text-slate-700">qG theo nhịp: <b>{formatSpanLoadSummary(results.qDeadBySpan_kPa).join(' · ')}</b></div>
                      <div className="text-[11px] text-slate-700">qQ theo nhịp: <b>{formatSpanLoadSummary(results.qLiveBySpan_kPa).join(' · ')}</b></div>
                    </div>
                  </div>
                )}

                {(config.panelType === 'ceiling' || (config.panelType === 'internal' && config.internalWallType === 'cold_storage')) && (
                  <div className="flex justify-between"><span>Hệ số từ biến (φ/φb):</span> <b>{config.creepFactor} / {config.creepFactorBending}</b></div>
                )}
              </div>
            </div>

            <div className={`mb-6 report-section${isCustomerMode ? ' hidden print:hidden' : ''}`}>
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

                <h4 className="font-bold text-blue-800 mt-3">2.3 Tổ hợp tải trọng</h4>
                <table className="w-full text-[10px] border-collapse border border-gray-300 mt-1 font-mono">
                  <thead className="bg-gray-100 font-bold">
                    <tr>
                      <th className="border p-1 text-left">Nhóm tải</th>
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
                  {results.distributedLoadMode === 'per-span' ? (
                    <>
                      <p><strong>Chế độ tải phân bố:</strong> đang dùng <b>theo từng nhịp</b>; mỗi nhịp có bộ qG/qQ riêng trước khi lập tổ hợp.</p>
                      <div className="overflow-x-auto mt-2">
                        <table className="w-full border-collapse border border-blue-200 text-[10px]">
                          <thead className="bg-blue-100">
                            <tr>
                              <th className="border border-blue-200 p-1 text-left">Nhịp</th>
                              <th className="border border-blue-200 p-1 text-center">qG (kPa)</th>
                              <th className="border border-blue-200 p-1 text-center">qQ (kPa)</th>
                              <th className="border border-blue-200 p-1 text-center">qSLS = qG + qQ</th>
                              <th className="border border-blue-200 p-1 text-center">qULS = γG·qG + γQ·qQ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {distributedLoadRows.map((row) => {
                              const tone = PER_SPAN_ROW_TONE[row.tone] || PER_SPAN_ROW_TONE.neutral;
                              return (
                                <tr key={row.spanLabel} className={tone.row}>
                                  <td className={`border border-blue-200 p-1 font-semibold ${tone.emphasis}`}>
                                    <div className="flex flex-wrap items-center gap-1">
                                      <span>{row.spanLabel}</span>
                                      {row.badges.map((badge) => {
                                        const badgeTone = PER_SPAN_ROW_TONE[badge.tone] || PER_SPAN_ROW_TONE.neutral;
                                        return (
                                          <span key={`${row.spanLabel}-${badge.label}`} className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${badgeTone.badge}`}>
                                            {badge.label}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </td>
                                  <td className={`border border-blue-200 p-1 text-center ${tone.cell}`}>{row.qG.toFixed(3)}</td>
                                  <td className={`border border-blue-200 p-1 text-center ${tone.cell}`}>{row.qQ.toFixed(3)}</td>
                                  <td className={`border border-blue-200 p-1 text-center font-semibold ${tone.emphasis}`}>{row.qSLS.toFixed(3)}</td>
                                  <td className={`border border-blue-200 p-1 text-center font-semibold ${tone.emphasis}`}>{row.qULS.toFixed(3)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-2 rounded border border-blue-200 bg-white/70 p-2 space-y-1">
                        <div className="text-[10px] font-semibold text-blue-800">Nhịp nào nên kiểm tra lại</div>
                        <ul className="space-y-1">
                          {perSpanSummaryItems.map((item, idx) => {
                            const toneClass = item.tone === 'danger'
                              ? 'text-rose-700'
                              : item.tone === 'warning'
                                ? 'text-amber-700'
                                : item.tone === 'info'
                                  ? 'text-sky-700'
                                  : 'text-slate-700';
                            return (
                              <li key={`per-span-summary-${idx}`} className={`flex gap-2 text-[10px] leading-relaxed ${toneClass}`}>
                                <span className="mt-[2px] h-1.5 w-1.5 rounded-full bg-current" />
                                <span>{item.text}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <p className="mt-2"><strong>Giá trị điều khiển đang dùng cho báo cáo tổng:</strong> q<sub>ULS,max</sub> = <b>{results.qULS_kPa.toFixed(3)} kPa</b>; q<sub>SLS,max</sub> = <b>{results.qSLS_kPa.toFixed(3)} kPa</b>.</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Tổ hợp ULS:</strong> q<sub>ULS</sub> = {results.gammaG}×{results.qDead_kPa.toFixed(3)} + {results.gammaQ}×{results.qLive_kPa.toFixed(2)} + 2.1×{Math.abs(results.qWind_kPa).toFixed(2)} = <b>{results.qULS_kPa.toFixed(3)} kPa</b></p>
                      <p><strong>Tổ hợp SLS:</strong> q<sub>SLS</sub> = {results.qDead_kPa.toFixed(3)} + {results.qLive_kPa.toFixed(2)} + {Math.abs(results.qWind_kPa).toFixed(2)} = <b>{results.qSLS_kPa.toFixed(3)} kPa</b></p>
                    </>
                  )}
                  <p><strong>Mô-men nhiệt (ULS):</strong> M<sub>t</sub> = EI·α·ΔT·γ<sub>T</sub>/e = {(results.EI / 1e9).toFixed(2)}×10⁹ × 1.2×10⁻⁵ × {Math.abs(results.dT_deg)} × {results.gammaThermal} / {results.e.toFixed(1)} = <b>{results.Mt_ULS_kNm.toFixed(3)} kNm/m</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.4 Kiểm tra ứng suất uốn & wrinkling (ULS)</h4>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Chế độ kiểm tra wrinkling:</strong> {getModeLabel(results.wrinklingMode, WRINKLING_MODE_LABELS)} {results.sigma_w_source ? `(nguồn: ${getModeLabel(results.sigma_w_source, WRINKLING_SOURCE_LABELS)})` : ''}</p>
                  {results.wrinklingDeclaredMissing && (
                    <p className="text-amber-700"><strong>Cảnh báo dữ liệu đầu vào:</strong> đã chọn chế độ khai báo trực tiếp nhưng thiếu ứng suất wrinkling hợp lệ; hệ thống đang fallback tạm sang <b>{getModeLabel(results.wrinklingFallbackMode, WRINKLING_MODE_LABELS)}</b>.</p>
                  )}
                  <p><strong>Ứng suất wrinkling xấp xỉ:</strong> σ<sub>w,approx</sub> = 0.5√(E<sub>f</sub>·E<sub>c</sub>·G<sub>c</sub>) = 0.5×√(210000×{results.compressiveModulus}×{config.coreShearModulus}) = <b>{results.sigma_w_approx.toFixed(1)} MPa</b></p>
                  {/* Ghi chú provenance nội bộ — ẩn khi in */}
                  <p className="text-slate-500 print:hidden"><strong>Ghi chú provenance approx:</strong> hệ số <b>0.5</b> và bộ biến <b>E<sub>f</sub>, E<sub>c</sub>, G<sub>c</sub></b> hiện đã được externalize là <b>xấp xỉ kỹ thuật nội bộ</b>; repo <b>chưa có citation trực tiếp</b> để nâng thành công thức source-backed.</p>
                  <p><strong>Ứng suất wrinkling khai báo:</strong> σ<sub>w,declared</sub> = <b>{results.sigma_w_declared.toFixed(1)} {results?.wrinklingMeta?.declaredInput?.unit || 'MPa'}</b></p>
                  {/* Semantic basis — ẩn khi in */}
                  <p className="print:hidden"><strong>Cơ sở giá trị khai báo:</strong> {results?.wrinklingMeta?.declaredInput?.basis || 'design-resistance'} / {results?.wrinklingMeta?.declaredInput?.sourceType || 'unknown'} {results?.wrinklingMeta?.declaredInput?.sourceRef ? `(ref: ${results.wrinklingMeta.declaredInput.sourceRef})` : ''}</p>
                  {results?.wrinklingMeta?.declaredInput?.productContext && (
                    <p><strong>Context sản phẩm:</strong> {results.wrinklingMeta.declaredInput.productContext}</p>
                  )}
                  {results?.wrinklingMeta?.declaredInput?.sourceNote && (
                    <p><strong>Ghi chú nguồn:</strong> {results.wrinklingMeta.declaredInput.sourceNote}</p>
                  )}
                  {/* Ghi chú provenance nội bộ — ẩn khi in */}
                  <p className="text-slate-500 print:hidden"><strong>Ghi chú provenance declared:</strong> khi chọn <b>Khai báo trực tiếp</b>, repo giữ con số MPa ở trạng thái <b>user-declared</b> trừ khi có đúng table/test/worksheet chứa giá trị đó. Repo hiện đã có thêm một vendor technical guide cấp product-family nêu rõ failure mode <b>“wrinkling of the face layer in the span and at an intermediate support”</b>, nên basis/source framing đỡ mơ hồ hơn; nhưng đợt hunt artifact hiện tại vẫn <b>chưa tìm được</b> vendor MPa table, test report, archived worksheet, hay product-manual numeric line đủ mạnh để nâng con số MPa declared này thành source-backed.</p>
                  <p><strong>Ứng suất wrinkling dùng trong kiểm tra:</strong> σ<sub>w</sub> = <b>{results.sigma_w.toFixed(1)} MPa</b></p>
                  <p><strong>Ứng suất thiết kế wrinkling:</strong> σ<sub>w,d</sub> = σ<sub>w</sub>/γ<sub>M,w</sub> = {results.sigma_w.toFixed(1)}/{results?.wrinklingMeta?.factorProvenance?.value || 1.2} = <b>{results.sigma_w_design.toFixed(1)} MPa</b></p>
                  <p className="text-slate-500 print:hidden"><strong>Ghi chú provenance γ<sub>M,w</sub>:</strong> repo hiện áp dụng γ<sub>M,w</sub> = <b>{results?.wrinklingMeta?.factorProvenance?.value || 1.2}</b> nhất quán, nhưng chưa source-link được giá trị này tới clause/vendor/worksheet chấp nhận.</p>
                  <p><strong>Thiết kế chảy:</strong> σ<sub>y,d</sub> = f<sub>y</sub>/γ<sub>M,y</sub> = {config.steelYield}/1.1 = <b>{results.sigma_y_design.toFixed(1)} MPa</b></p>
                  <p><strong>Giới hạn:</strong> {results?.effectiveWrinklingMode === 'yield-only'
                    ? <>σ<sub>limit</sub> = σ<sub>y,d</sub> = <b>{results.sigma_limit.toFixed(1)} MPa</b></>
                    : <>σ<sub>limit</sub> = min(σ<sub>w,d</sub>, σ<sub>y,d</sub>) = min({results.sigma_w_design.toFixed(1)}, {results.sigma_y_design.toFixed(1)}) = <b>{results.sigma_limit.toFixed(1)} MPa</b></>}</p>
                  <p><strong>Ứng suất tính toán (Nhịp):</strong> σ<sub>Ed</sub> = M<sub>Ed</sub>·z<sub>max</sub>/I<sub>eq</sub> = <b>{results.stress_span.toFixed(1)} MPa</b> → Tỷ lệ = <b>{(results.ratios.bending * 100).toFixed(0)}%</b></p>
                  <p><strong>Ứng suất tính toán (Gối):</strong> σ<sub>Ed</sub> = <b>{results.stress_support.toFixed(1)} MPa</b> → Tỷ lệ = <b>{(results.ratios.support * 100).toFixed(0)}%</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.5 Kiểm tra lực cắt (ULS)</h4>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Chế độ phân phối nội lực:</strong> {getModeLabel(results.redistributionMode, REDISTRIBUTION_MODE_LABELS)} {results.redistributionEnabled ? '(đã bật tái phân phối nội lực theo cơ chế khớp)' : '(chỉ dùng bao nội lực đàn hồi)'}</p>
                  <p><strong>Khả năng chịu cắt:</strong> V<sub>Rd</sub> = f<sub>Cv</sub>·A<sub>c</sub>/γ<sub>M</sub> = {config.coreShearStrength}×{results.Ac.toFixed(0)}/1.25 = <b>{(results.V_Rd / 1000).toFixed(2)} kN/m</b></p>
                  <p><strong>Lực cắt tính toán:</strong> V<sub>Ed,max</sub> = <b>{(results.maxShear / 1000).toFixed(2)} kN/m</b></p>
                  <p><strong>Tỷ lệ:</strong> V<sub>Ed</sub>/V<sub>Rd</sub> = {(results.maxShear / 1000).toFixed(2)}/{(results.V_Rd / 1000).toFixed(2)} = <b>{(results.ratios.shear * 100).toFixed(0)}%</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.6 Kiểm tra độ võng (SLS)</h4>
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Giới hạn:</strong> w<sub>limit</sub> = L/{results.limitDenom} = {(Math.max(...config.spans) * 1000).toFixed(0)}/{results.limitDenom} = <b>{results.w_limit.toFixed(1)} mm</b></p>
                  <p><strong>Độ võng tính toán:</strong> w<sub>total</sub> = w<sub>mech</sub> + w<sub>thermal</sub> + w<sub>creep</sub> = <b>{results.maxDeflection.toFixed(1)} mm</b></p>
                  <p><strong>Tỷ lệ:</strong> w<sub>total</sub>/w<sub>limit</sub> = {results.maxDeflection.toFixed(1)}/{results.w_limit.toFixed(1)} = <b>{(results.ratios.deflection * 100).toFixed(0)}%</b></p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.7 Kiểm tra lực nhổ / liên kết chống nhổ (ULS)</h4>
                {/* 2.7 Công thức tính — luôn hiện */}
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1">
                  <p><strong>Phạm vi kiểm tra uplift:</strong> {results.upliftEnabled ? 'Áp dụng (panel vách, có khai báo screwStrength).' : 'Không áp dụng cho case hiện tại.'}</p>
                  <p><strong>Sức kháng mỗi liên kết:</strong> F<sub>Rd,1</sub> = <b>{Number(results?.technicalTransparency?.uplift?.declaredInput?.value || 0).toFixed(2)} {results?.technicalTransparency?.uplift?.declaredInput?.unit || 'kN'}</b> / vít</p>
                  <p><strong>Số lượng liên kết:</strong> n = round(B / s<sub>screw</sub>) = <b>{results.screwCount}</b> vít / nhịp</p>
                  <p><strong>Hệ số vật liệu:</strong> γ<sub>M,screw</sub> = <b>{results?.technicalTransparency?.uplift?.factor?.value || 1.33}</b></p>
                  <p><strong>Sức kháng thiết kế uplift:</strong> T<sub>Rd</sub> = F<sub>Rd,1</sub> × n / γ<sub>M,screw</sub> = {Number(results?.technicalTransparency?.uplift?.declaredInput?.value || 0).toFixed(2)} × {results.screwCount} / {results?.technicalTransparency?.uplift?.factor?.value || 1.33} = <b>{(results.T_Rd_Worst / 1000).toFixed(2)} kN</b></p>
                </div>

                {/* 2.7 Debug notes — chỉ hiện trên màn hình, ẩn khi in */}
                <div className="p-2 bg-gray-50 rounded border border-gray-200 mt-1 text-[10px] font-mono space-y-1 print:hidden">
                  <p className="text-slate-400 font-bold uppercase tracking-wide text-[9px]">Ghi chú nội bộ (ẩn khi in)</p>
                  <p><strong>Quy tắc đếm vít:</strong> {results?.technicalTransparency?.uplift?.declaredInput?.spacingMeaning || 'spacing across panelWidth for simplified count estimate'} → screwCount = <b>{results.screwCount}</b></p>
                  <p><strong>Semantic nguồn:</strong> {results?.technicalTransparency?.uplift?.declaredInput?.basis || 'design-resistance-per-fastener'} / {results?.technicalTransparency?.uplift?.declaredInput?.sourceType || 'unknown'} {results?.technicalTransparency?.uplift?.declaredInput?.sourceRef ? `(ref: ${results.technicalTransparency.uplift.declaredInput.sourceRef})` : ''}</p>
                  {results?.technicalTransparency?.uplift?.declaredInput?.fastenerContext && (
                    <p><strong>Context vít/liên kết:</strong> {results.technicalTransparency.uplift.declaredInput.fastenerContext}</p>
                  )}
                  <p className="text-slate-500"><strong>Provenance γ<sub>M,screw</sub>:</strong> implementation-visible source gap; chưa có clause được attach.</p>
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.8 Trường hợp chi phối</h4>
                <div className="p-2 bg-amber-50 rounded border border-amber-200 mt-1 text-[10px] font-mono space-y-1">
                  {governingCaseRows.map(({ caseKey, item }) => (
                    <p key={caseKey}>
                      <strong>{caseKey === CAPACITY_GOVERNING_CASE_KEYS.OVERALL ? 'Tổng thể' : getCapacityLabel(caseKey, caseKey)}:</strong> {item.label} — {(item.ratio * 100).toFixed(0)}%
                    </p>
                  ))}
                </div>

                <h4 className="font-bold text-blue-800 mt-3">2.9 Kết quả tổng hợp</h4>
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
                    {capacityReportRows.map((row) => (
                      <tr key={row.key}>
                        <td className="border p-2">{row.label}</td>
                        <td className="border p-2 text-center">{row.demand}</td>
                        <td className="border p-2 text-center">{row.resistance}</td>
                        <td className={`border p-2 text-center font-bold ${row.ratio > 1 ? 'text-red-600' : 'text-green-600'}`}>{(row.ratio * 100).toFixed(0)}%</td>
                        <td className={`border p-2 text-center font-bold ${row.ratio <= 1 ? 'text-green-600' : 'text-red-600'}`}>{row.ratio <= 1 ? 'ĐẠT' : 'KHÔNG ĐẠT'}</td>
                      </tr>
                    ))}
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
                    {config.panelType === 'ceiling' ? 'Sơ đồ tính trần (X toàn dầm)' : 'Sơ đồ tính (tải + gối)'}
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
                  <h4 className="text-xs font-bold text-center mb-1">Chuyển vị [mm]</h4>
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
                              value: `Lớn nhất: ${results.extrema.deflectionTotal.max.value.toFixed(1)} mm`,
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
                              value: `Nhỏ nhất: ${results.extrema.deflectionTotal.min.value.toFixed(1)} mm`,
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
                  <h4 className="text-xs font-bold text-center mb-1">Mô-men uốn [kNm]</h4>
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
                              value: `Lớn nhất: ${results.extrema.moment.max.value.toFixed(2)} kNm`,
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
                              value: `Nhỏ nhất: ${results.extrema.moment.min.value.toFixed(2)} kNm`,
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
                  <h4 className="text-xs font-bold text-center mb-1">Lực cắt [kN]</h4>
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
                              value: `Lớn nhất: ${results.extrema.shear.max.value.toFixed(2)} kN`,
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
                              value: `Nhỏ nhất: ${results.extrema.shear.min.value.toFixed(2)} kN`,
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
                  <h4 className="text-xs font-bold text-center mb-1">Biểu đồ phản lực gối (Reaction) [kN]</h4>
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

            {compareModeEnabled && compareMetricRows.length > 0 && (
              <div className="mb-6 report-section">
                <h3 className="text-sm font-bold border-b border-gray-400 mb-3 uppercase flex items-center gap-2">
                  <Activity size={14} /> 4. So sánh phương án
                </h3>
                <div className="rounded border border-violet-200 bg-violet-50 p-3">
                  <div className="text-xs text-violet-900 mb-3">Bảng này gom ngắn gọn các chỉ tiêu quyết định để so 2–3 phương án song song, không thay flow báo cáo chi tiết của phương án đang mở.</div>
                  {results.compareSummary?.available && (
                    <div className="mb-3 grid gap-2 md:grid-cols-3 text-xs">
                      <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                        <div className="text-violet-500">Phương án nên đọc trước</div>
                        <div className="mt-1 font-bold text-violet-900">{results.compareSummary.bestVariantLabel || '—'}</div>
                        <div className="text-[11px] text-slate-500">{results.compareSummary.bestStatus === 'pass' ? 'Đạt' : 'Không đạt'} · {results.compareSummary.bestRatio != null ? formatRatioPercent(results.compareSummary.bestRatio) : '—'}{results.compareSummary.bestMarginPercent != null ? ` · margin ${results.compareSummary.bestMarginPercent.toFixed(1)}%` : ''}</div>
                      </div>
                      <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                        <div className="text-violet-500">Tổng số phương án đạt</div>
                        <div className="mt-1 font-bold text-violet-900">{results.compareSummary.passCount}/{results.compareSummary.variantCount}</div>
                        <div className="text-[11px] text-slate-500">{results.compareSummary.allPass ? 'Tất cả phương án đều đạt.' : results.compareSummary.mixedStatus ? 'Có phương án đạt, có phương án không đạt.' : 'Chưa có phương án nào đạt hoàn toàn.'}</div>
                      </div>
                      <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
                        <div className="text-violet-500">Case chi phối của PA ưu tiên</div>
                        <div className="mt-1 font-bold text-violet-900">{results.compareSummary.bestGoverningLabel || '—'}</div>
                        <div className="text-[11px] text-slate-500">{results.compareSummary.rationale || 'Tóm tắt để chốt shortlist trước khi xem bảng chi tiết.'}</div>
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs bg-white">
                      <thead>
                        <tr className="bg-violet-100 text-violet-950">
                          <th className="border border-violet-200 p-2 text-left">Chỉ tiêu</th>
                          {compareResults.map((variant) => (
                            <th key={`report-compare-${variant.id}`} className="border border-violet-200 p-2 text-left">{variant.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {compareMetricRows.map((row) => (
                          <tr key={`report-row-${row.key}`}>
                            <td className="border border-violet-200 p-2 font-semibold text-slate-700">{row.label}</td>
                            {row.values.map((cell) => {
                              const toneClass = cell.tone === 'pass'
                                ? 'text-emerald-700'
                                : cell.tone === 'fail'
                                  ? 'text-rose-700'
                                  : cell.tone === 'muted'
                                    ? 'text-slate-400'
                                    : 'text-slate-800';
                              return (
                                <td key={`report-cell-${row.key}-${cell.variantId}`} className={`border border-violet-200 p-2 font-semibold ${cell.isBest ? 'bg-emerald-50/70' : ''} ${toneClass}`.trim()}>
                                  <div className="flex items-center gap-2">
                                    <span>{cell.value}</span>
                                    {cell.isBest && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Best</span>}
                                  </div>
                                  {cell.subValue && <div className="text-[10px] font-medium text-slate-500">{cell.subValue}</div>}
                                  {cell.diffHint && <div className="text-[10px] font-medium text-slate-500">{cell.diffHint}</div>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded border border-slate-200 report-section report-conclusion">
              <h3 className="text-sm font-bold uppercase mb-2 text-slate-700 flex items-center gap-2"><Info size={14} /> {isCustomerMode ? '2' : '5'}. Kết luận & khuyến nghị</h3>
              <div className="space-y-3">
                <div className={`font-bold text-sm ${results.status === 'pass' ? 'text-green-700' : 'text-red-700'}`}>
                  {results.status === 'pass' ? 'KẾT CẤU ĐẢM BẢO KHẢ NĂNG CHỊU LỰC' : 'KẾT CẤU KHÔNG ĐẠT YÊU CẦU - CẦN ĐIỀU CHỈNH'}
                </div>
                {/* TransparencyPanel: ẩn hoàn toàn ở bản khách hàng, ẩn khi in ở bản kỹ sư */}
                {!isCustomerMode && (
                  <div className="print:hidden">
                    <TransparencyPanel results={results} />
                  </div>
                )}
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  {results.advice.map((item, i) => (<li key={i}>{item}</li>))}
                </ul>

                {/* Box khuyến nghị & liên hệ — luôn hiện ở bản khách hàng, chỉ hiện khi in ở bản kỹ sư */}
                <div className={`mt-4 border border-slate-300 rounded-lg p-4 bg-white ${isCustomerMode ? 'block' : 'hidden print:block'}`}>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">📌 Greenpan Khuyến Nghị</div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Vui lòng liên hệ kỹ sư phụ trách để được tư vấn điều chỉnh thông số và xác nhận phương án phù hợp với yêu cầu công trình.
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-200 text-[11px] text-slate-500 space-y-0.5">
                    <div className="font-semibold text-slate-600">CÔNG TY TNHH GREENPAN</div>
                    <div>🌐 www.greenpan.vn &nbsp;·&nbsp; 📧 info@greenpan.vn</div>
                    <div className="text-[10px] italic text-slate-400 mt-1">Tài liệu tính toán được lập theo tiêu chuẩn EN 14509:2013 &amp; TCVN hiện hành &middot; Lưu hành nội bộ</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
              {!isCustomerMode && (
                <button
                  type="button"
                  onClick={handleExportPackage}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-5 py-2 font-bold text-emerald-800 shadow hover:bg-emerald-100 flex items-center gap-2 transition-colors"
                >
                  <FileJson size={18} />Xuất result package JSON (release-stamped)
                </button>
              )}
              <button
                onClick={handlePrint}
                className={`px-6 py-2 rounded-lg font-bold shadow flex items-center gap-2 transition-colors ${
                  isCustomerMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                <Printer size={20} />
                {isCustomerMode ? 'Xuất PDF Bản Khách Hàng' : 'Xuất PDF / Lưu báo cáo'}
              </button>
            </div>

            <div className="mt-8 text-[10px] text-center text-slate-400 italic space-y-1">
              <div>Báo cáo được tạo tự động bởi phần mềm {APP_DISPLAY_NAME}.</div>
              {!isCustomerMode && <div>{buildReleaseStamp(resolvedAppVersion)} · channel: {resolvedReleaseChannel}</div>}
              {isCustomerMode && <div className="text-slate-300">Tài liệu lưu hành · Liên hệ Greenpan để biết thêm chi tiết</div>}
            </div>
          </div>
        </div>
      </main>


    </div>
  );
}
