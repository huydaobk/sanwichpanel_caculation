import React from 'react';
import { ArrowHead, DimLine, LoadArrow } from './svg/SvgPrimitives';
import { ResponsiveContainer, ComposedChart, Line, AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceArea } from 'recharts';
import { Settings, Thermometer, TrendingUp, AlertCircle, Printer, BookOpen, Activity, Info, FileJson, Download, FileText, Upload, RefreshCw, Save, RefreshCcw, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { 
  DEFAULT_REDISTRIBUTION_MODE,
  DEFAULT_WRINKLING_MODE,
  APP_SNAPSHOT_KIND,
  CAPACITY_CHECK_KEYS,
  CAPACITY_CHECK_LABELS,
  CAPACITY_GOVERNING_CASE_KEYS,
  CAPACITY_GOVERNING_CASE_LABELS,
  buildExportFileName
} from '../calc';
import * as Constants from '../utils/appLogic';

// We alias them for convenience, since the file uses them directly
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
  safeJsonClone,
  cloneConfig,
  sanitizeText,
  normalizeIsoTimestamp,
  isPlainObject,
  getSafeLocalStorage,
  formatArtifactScopeLabel,
  summarizeVariantLabels,
  buildImportSuccessMessage,
  STORAGE_KEYS,
  PRESET_LIMIT,
  createSnapshotTemplate,
  normalizeSnapshotVariantLabel,
  normalizeSnapshotVariantId,
  normalizeCompareVariantsForSnapshot,
  normalizeImportedSnapshot,
  downloadJsonFile,
  buildSafeExportFileName,
  buildDefaultPresetName,
  buildPresetSummary,
  normalizePresetLibrary,
  loadPresetLibrary,
  persistPresetLibrary,
  createVariant,
  normalizeVariantLabel,
  formatRatioPercent,
  buildCompareDeltaText,
  buildCompareMetricRows,
  TRANSPARENCY_RELIABILITY_LABELS,
  TRANSPARENCY_CLASSIFICATION_LABELS,
  getTransparencyLabel,
  getTransparencyTone,
  TRANSPARENCY_TONE_CLASSNAMES
} = Constants;

export const TransparencyBadge = ({ children, tone = 'slate', className = '' }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${TRANSPARENCY_TONE_CLASSNAMES[tone] || TRANSPARENCY_TONE_CLASSNAMES.slate} ${className}`.trim()}>
    {children}
  </span>
);

export const ReportBadge = ({ label, detail, tone = 'neutral' }) => (
  <div className={`rounded-xl border px-3 py-2 ${REPORT_BADGE_TONE_CLASSNAMES[tone] || REPORT_BADGE_TONE_CLASSNAMES.neutral}`}>
    <div className="text-[10px] font-bold uppercase tracking-wide">{label}</div>
    {detail && <div className="mt-1 text-[11px] font-medium normal-case tracking-normal">{detail}</div>}
  </div>
);

export const ExecutiveSummaryPanel = ({ results, compareSummary }) => {
  const badges = results?.reportPresentation?.badges || {};
  const statusTone = badges?.status?.key === 'pass' ? 'pass' : 'fail';
  const validationTone = badges?.validation?.headlineClass === 'external-captured'
    ? 'info'
    : badges?.validation?.headlineClass === 'internal-captured'
      ? 'violet'
      : 'warning';
  const transparencyTone = badges?.transparency?.key === 'high'
    ? 'pass'
    : badges?.transparency?.key === 'medium'
      ? 'info'
      : 'warning';

  return (
    <div className="mb-6 report-section rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Executive technical snapshot</div>
          <h3 className="mt-1 text-lg font-bold text-slate-900">Tóm tắt điều kiện kiểm tra & mức độ tin cậy</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600">
            Khối này gom trạng thái pass/fail, benchmark class, transparency level và case chi phối để người đọc nhìn 30 giây là hiểu mức tin cậy của bản tính.
          </p>
        </div>
        <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${statusTone === 'pass' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {badges?.status?.label || (results?.status === 'pass' ? 'PASS' : 'FAIL')}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <ReportBadge label={badges?.status?.label || 'Status'} detail={badges?.status?.detail || '—'} tone={statusTone} />
        <ReportBadge label={badges?.validation?.headlineLabel || 'Validation'} detail={badges?.validation?.capturedCount != null ? `${badges.validation.capturedCount}/${badges.validation.totalCases} cases captured` : '—'} tone={validationTone} />
        <ReportBadge label={badges?.benchmarkClass?.label || 'Benchmark class'} detail={badges?.benchmarkClass?.detail || '—'} tone={validationTone} />
        <ReportBadge label={badges?.transparency?.label || 'Transparency'} detail={badges?.transparency?.detail || '—'} tone={transparencyTone} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Check highlights</div>
          <div className="mt-3 space-y-2">
            {(results?.reportPresentation?.checkHighlights || []).map((item) => {
              const toneClass = item.tone === 'fail'
                ? 'text-rose-700'
                : item.tone === 'warning'
                  ? 'text-amber-700'
                  : item.tone === 'pass'
                    ? 'text-emerald-700'
                    : 'text-slate-700';
              return (
                <div key={item.key} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500">{item.label}</div>
                    <div className={`text-sm font-semibold ${toneClass}`}>{item.value}</div>
                  </div>
                  {item.ratio != null && (
                    <div className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${item.tone === 'fail' ? 'bg-rose-100 text-rose-800' : item.tone === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {(item.ratio * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Validation coverage</div>
          <div className="mt-3 space-y-2 text-xs text-slate-600">
            {(badges?.validation?.keyCases || []).length > 0 ? (
              (badges.validation.keyCases || []).map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="font-semibold text-slate-800">{item.id} — {item.title}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{item.benchmarkLabel}{item.referenceType ? ` · ${item.referenceType}` : ''}</div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                Chưa có captured benchmark case surfaced cho report snapshot hiện tại.
              </div>
            )}
          </div>
        </div>
      </div>

      {compareSummary?.available && (
        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-violet-700">Compare executive summary</div>
          <div className="mt-2 grid gap-2 md:grid-cols-3 text-xs">
            <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
              <div className="text-violet-500">Phương án ưu tiên</div>
              <div className="mt-1 font-bold text-violet-900">{compareSummary.bestVariantLabel || '—'}</div>
              <div className="text-[11px] text-slate-500">{compareSummary.bestStatus === 'pass' ? 'Đạt' : 'Không đạt'} · {compareSummary.bestRatio != null ? formatRatioPercent(compareSummary.bestRatio) : '—'}{compareSummary.bestMarginPercent != null ? ` · margin ${compareSummary.bestMarginPercent.toFixed(1)}%` : ''}</div>
            </div>
            <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
              <div className="text-violet-500">Tình trạng chung</div>
              <div className="mt-1 font-bold text-violet-900">{compareSummary.allPass ? 'Tất cả đạt' : compareSummary.mixedStatus ? 'Lẫn đạt / không đạt' : 'Chưa có PA nào đạt'}</div>
              <div className="text-[11px] text-slate-500">{compareSummary.passCount}/{compareSummary.variantCount} phương án đạt</div>
            </div>
            <div className="rounded-lg border border-violet-200 bg-white px-3 py-2">
              <div className="text-violet-500">Case chi phối PA tốt nhất</div>
              <div className="mt-1 font-bold text-violet-900">{compareSummary.bestGoverningLabel || '—'}</div>
              <div className="text-[11px] text-slate-500">{compareSummary.rationale || 'Dùng để chốt lựa chọn nhanh trước khi đọc sâu từng bảng.'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AssumptionsAndLimitationsPanel = ({ results }) => {
  const assumptions = results?.reportPresentation?.assumptions || [];
  const limitations = results?.reportPresentation?.limitations || [];

  return (
    <div className="mb-6 report-section grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <div className="text-sm font-bold uppercase text-sky-900">Design assumptions</div>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-sky-900">
          {assumptions.map((item, idx) => (
            <li key={`assumption-${idx}`} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-600 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-sm font-bold uppercase text-amber-900">Limitations / caution</div>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-amber-900">
          {limitations.map((item, idx) => (
            <li key={`limitation-${idx}`} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const formatSpanLoadSummary = (values = [], digits = 3, unit = 'kPa') => (
  (values || []).map((v, idx) => `Nhịp ${idx + 1}: ${Number(v || 0).toFixed(digits)} ${unit}`)
);

export const buildPerSpanLoadRows = (results) => {
  const dead = results?.qDeadBySpan_kPa || [];
  const live = results?.qLiveBySpan_kPa || [];
  const spanCount = Math.max(dead.length, live.length);
  const rows = Array.from({ length: spanCount }, (_, idx) => {
    const qG = Number(dead[idx] || 0);
    const qQ = Number(live[idx] || 0);
    return {
      spanIndex: idx,
      spanLabel: `Nhịp ${idx + 1}`,
      qG,
      qQ,
      qSLS: qG + qQ,
      qULS: (Number(results?.gammaG) || 0) * qG + (Number(results?.gammaQ) || 0) * qQ,
    };
  });

  const nonZeroSls = rows.map((row) => row.qSLS).filter((value) => value > 0);
  const nonZeroUls = rows.map((row) => row.qULS).filter((value) => value > 0);
  const maxSls = rows.length ? Math.max(...rows.map((row) => row.qSLS)) : 0;
  const maxUls = rows.length ? Math.max(...rows.map((row) => row.qULS)) : 0;
  const minNonZeroSls = nonZeroSls.length ? Math.min(...nonZeroSls) : 0;
  const minNonZeroUls = nonZeroUls.length ? Math.min(...nonZeroUls) : 0;

  return rows.map((row) => {
    const flags = [];
    if (row.qG < 0 || row.qQ < 0) flags.push('negative-load');
    if (row.qG === 0) flags.push('zero-dead');
    if (row.qG === 0 && row.qQ === 0) flags.push('empty-span');
    if (maxSls > 0 && row.qSLS === maxSls) flags.push('max-sls');
    if (maxUls > 0 && row.qULS === maxUls) flags.push('max-uls');
    if (minNonZeroSls > 0 && row.qSLS > 0 && row.qSLS === minNonZeroSls && maxSls >= minNonZeroSls * 1.5) flags.push('min-sls');
    if (minNonZeroUls > 0 && row.qULS > 0 && row.qULS === minNonZeroUls && maxUls >= minNonZeroUls * 1.5) flags.push('min-uls');

    const tone = flags.includes('negative-load')
      ? 'danger'
      : flags.includes('empty-span') || flags.includes('zero-dead')
        ? 'warning'
        : flags.includes('max-uls') || flags.includes('max-sls')
          ? 'info'
          : 'neutral';

    const badges = [];
    if (flags.includes('negative-load')) badges.push({ label: 'Tải âm', tone: 'danger' });
    if (flags.includes('empty-span')) badges.push({ label: 'Đang rơi về 0', tone: 'warning' });
    else if (flags.includes('zero-dead')) badges.push({ label: 'qG = 0', tone: 'warning' });
    if (flags.includes('max-uls')) badges.push({ label: 'ULS lớn nhất', tone: 'info' });
    else if (flags.includes('max-sls')) badges.push({ label: 'SLS lớn nhất', tone: 'info' });
    if (flags.includes('min-uls') || flags.includes('min-sls')) badges.push({ label: 'Đầu thấp', tone: 'neutral' });

    return {
      ...row,
      flags,
      tone,
      badges,
    };
  });
};

export const PER_SPAN_ROW_TONE = {
  neutral: {
    row: 'bg-white',
    cell: 'text-slate-700',
    emphasis: 'text-slate-900',
    badge: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  info: {
    row: 'bg-sky-50/70',
    cell: 'text-sky-800',
    emphasis: 'text-sky-900',
    badge: 'border-sky-200 bg-sky-100 text-sky-800',
  },
  warning: {
    row: 'bg-amber-50/80',
    cell: 'text-amber-800',
    emphasis: 'text-amber-900',
    badge: 'border-amber-200 bg-amber-100 text-amber-800',
  },
  danger: {
    row: 'bg-rose-50/90',
    cell: 'text-rose-800',
    emphasis: 'text-rose-900',
    badge: 'border-rose-200 bg-rose-100 text-rose-800',
  },
};

export const buildPerSpanLoadSummary = (rows = []) => {
  if (!rows.length) return [];

  const notes = [];
  const negativeRows = rows.filter((row) => row.flags.includes('negative-load'));
  const emptyRows = rows.filter((row) => row.flags.includes('empty-span'));
  const zeroDeadRows = rows.filter((row) => row.flags.includes('zero-dead') && !row.flags.includes('empty-span'));
  const maxUlsRows = rows.filter((row) => row.flags.includes('max-uls'));
  const minUlsRows = rows.filter((row) => row.flags.includes('min-uls'));

  if (negativeRows.length) {
    notes.push({
      tone: 'danger',
      text: `${negativeRows.map((row) => row.spanLabel).join(', ')} có qG/qQ âm → nên kiểm tra lại dấu nhập trước khi tin kết quả.`,
    });
  }

  if (emptyRows.length) {
    notes.push({
      tone: 'warning',
      text: `${emptyRows.map((row) => row.spanLabel).join(', ')} đang rơi cả qG và qQ về 0. Nếu đây không phải chủ ý, nên nhập lại để tránh thiếu tải.`,
    });
  } else if (zeroDeadRows.length) {
    notes.push({
      tone: 'warning',
      text: `${zeroDeadRows.map((row) => row.spanLabel).join(', ')} có qG = 0. Chỉ giữ vậy nếu bạn thực sự muốn bỏ tĩnh tải ở các nhịp này.`,
    });
  }

  if (maxUlsRows.length) {
    const maxValue = Math.max(...maxUlsRows.map((row) => row.qULS));
    notes.push({
      tone: 'info',
      text: `${maxUlsRows.map((row) => row.spanLabel).join(', ')} đang chi phối tải ULS (${maxValue.toFixed(3)} kPa) — đây là nhịp nên nhìn đầu tiên khi rà workflow per-span.`,
    });
  }

  if (maxUlsRows.length && minUlsRows.length) {
    const maxValue = Math.max(...maxUlsRows.map((row) => row.qULS));
    const minValue = Math.min(...minUlsRows.map((row) => row.qULS));
    if (minValue > 0 && maxValue >= minValue * 1.5) {
      notes.push({
        tone: 'neutral',
        text: `Biên độ đang khá lệch: ${maxUlsRows.map((row) => row.spanLabel).join(', ')} cao hơn khoảng ${(maxValue / minValue).toFixed(1)}× so với ${minUlsRows.map((row) => row.spanLabel).join(', ')}. Nếu lệch này không có chủ ý, nên rà lại input từng nhịp.`,
      });
    }
  }

  if (!notes.length) {
    notes.push({
      tone: 'neutral',
      text: 'Các nhịp đang cùng mặt bằng tải tương đối gọn; chưa thấy nhịp nào nổi bật cần soi lại ngay.',
    });
  }

  return notes.slice(0, 3);
};

export const LOAD_WARNING_TONE = {
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-rose-200 bg-rose-50 text-rose-800',
};

export const buildLoadWorkflowGuardrails = (config = {}, results = {}) => {
  if (config.panelType !== 'ceiling') return [];

  const mode = results?.distributedLoadMode === 'per-span' ? 'per-span' : 'uniform';
  const deadBySpan = (results?.qDeadBySpan_kPa || []).map((v) => Number(v) || 0);
  const liveBySpan = (results?.qLiveBySpan_kPa || []).map((v) => Number(v) || 0);
  const warnings = [];

  warnings.push({
    id: `mode-${mode}`,
    tone: 'info',
    title: mode === 'per-span' ? 'Đang tính theo từng nhịp' : 'Đang dùng 1 bộ tải chung cho mọi nhịp',
    message: mode === 'per-span'
      ? 'Mỗi nhịp đang có bộ qG/qQ riêng. Hãy rà lại từng dòng trong bảng để chắc rằng không bỏ sót nhịp nào.'
      : 'App đang copy cùng một qG/qQ cho tất cả các nhịp. Nếu mỗi nhịp thực tế nhận tải khác nhau, hãy bật chế độ “Nhập tải phân bố riêng cho từng nhịp”.',
  });

  if (mode !== 'per-span') return warnings;

  const missingDead = [];
  const missingLive = [];
  const zeroDead = [];
  const negativeDead = [];
  const negativeLive = [];

  deadBySpan.forEach((value, idx) => {
    const raw = config?.deadLoadBySpan_kPa?.[idx];
    if (raw === '' || raw === null || typeof raw === 'undefined') missingDead.push(idx + 1);
    if (value === 0) zeroDead.push(idx + 1);
    if (value < 0) negativeDead.push(idx + 1);
  });

  liveBySpan.forEach((value, idx) => {
    const raw = config?.liveLoadBySpan_kPa?.[idx];
    if (raw === '' || raw === null || typeof raw === 'undefined') missingLive.push(idx + 1);
    if (value < 0) negativeLive.push(idx + 1);
  });

  if (missingDead.length || missingLive.length) {
    warnings.push({
      id: 'per-span-missing',
      tone: 'warning',
      title: 'Per-span đang bật nhưng còn ô chưa nhập rõ ràng',
      message: `Hãy nhập đủ qG${missingDead.length ? ` cho nhịp ${missingDead.join(', ')}` : ''}${missingDead.length && missingLive.length ? ' và ' : ''}${missingLive.length ? `qQ cho nhịp ${missingLive.join(', ')}` : ''}. Để trống hiện đang bị hiểu như 0, dễ làm kết quả thấp giả tạo.`,
    });
  }

  if (zeroDead.length) {
    warnings.push({
      id: 'dead-zero',
      tone: 'warning',
      title: 'Có nhịp đang có qG = 0',
      message: `Nhịp ${zeroDead.join(', ')} đang có tĩnh tải bằng 0. Chỉ giữ nguyên nếu bạn thực sự muốn bỏ toàn bộ tải thường xuyên trên các nhịp này; nếu không, hãy nhập lại qG hoặc tắt per-span để dùng giá trị chung.`,
    });
  }

  if (negativeDead.length || negativeLive.length) {
    warnings.push({
      id: 'negative-load',
      tone: 'danger',
      title: 'Có tải âm trong qG/qQ cần kiểm tra lại',
      message: `${negativeDead.length ? `qG âm tại nhịp ${negativeDead.join(', ')}` : ''}${negativeDead.length && negativeLive.length ? '; ' : ''}${negativeLive.length ? `qQ âm tại nhịp ${negativeLive.join(', ')}` : ''}. Với workflow này, tải âm thường là nhập sai dấu. Hãy trả qG/qQ về giá trị không âm và dùng trường gió/hút cho tác động đổi dấu.`,
    });
  }

  const compareSpread = (values = [], label) => {
    const positives = values.filter((v) => Number.isFinite(v) && v > 0);
    if (positives.length < 2) return null;
    const min = Math.min(...positives);
    const max = Math.max(...positives);
    if (!(min > 0)) return null;
    const ratio = max / min;
    if (ratio < 3) return null;
    const maxIdx = values.findIndex((v) => v === max) + 1;
    const minIdx = values.findIndex((v) => v === min) + 1;
    return { label, ratio, maxIdx, minIdx, min, max };
  };

  const deadSpread = compareSpread(deadBySpan, 'qG');
  const liveSpread = compareSpread(liveBySpan, 'qQ');
  [deadSpread, liveSpread].filter(Boolean).forEach((spread, idx) => {
    warnings.push({
      id: `spread-${spread.label}-${idx}`,
      tone: 'warning',
      title: `${spread.label} chênh lệch khá lớn giữa các nhịp`,
      message: `${spread.label} lớn nhất ở nhịp ${spread.maxIdx} (${spread.max.toFixed(2)} kPa) đang cao khoảng ${spread.ratio.toFixed(1)} lần so với nhịp ${spread.minIdx} (${spread.min.toFixed(2)} kPa). Đây là warning mềm: hãy kiểm tra lại xem chênh lệch này là chủ ý theo công năng từng nhịp hay do nhập lệch số.`,
    });
  });

  return warnings;
};

export const TransparencyPanel = ({ results }) => {
  const wrinklingMeta = results?.technicalTransparency?.wrinkling || results?.wrinklingMeta || {};
  const sigmaLimitMeta = results?.technicalTransparency?.checks?.sigmaLimit || {};
  const declaredInput = wrinklingMeta?.declaredInput || {};
  const upliftMeta = results?.technicalTransparency?.uplift || {};
  const upliftDeclaredInput = upliftMeta?.declaredInput || {};
  const requestedTone = getTransparencyTone(wrinklingMeta.requestedModeReliability);
  const effectiveTone = getTransparencyTone(wrinklingMeta.effectiveModeReliability || sigmaLimitMeta.reliability);
  const classificationTone = getTransparencyTone(sigmaLimitMeta.classification || wrinklingMeta.sourceClassification);
  const upliftCheckMeta = results?.technicalTransparency?.checks?.uplift || {};
  const upliftTone = getTransparencyTone(upliftCheckMeta?.reliability);

  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Info size={14} /> Minh bạch kỹ thuật</h4>
          <p className="text-xs text-slate-600 mt-1">Hiển thị rõ giá trị nào là khai báo trực tiếp, giá trị nào là xấp xỉ kỹ thuật và khi nào hệ thống phải fallback.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <TransparencyBadge tone={requestedTone}>Yêu cầu: {getModeLabel(results?.wrinklingMode, WRINKLING_MODE_LABELS)}</TransparencyBadge>
          <TransparencyBadge tone={effectiveTone}>Đang dùng: {getModeLabel(results?.effectiveWrinklingMode, WRINKLING_MODE_LABELS)}</TransparencyBadge>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-xs">
        <div className="bg-white rounded border border-slate-200 p-3 space-y-2">
          <div className="font-semibold text-slate-700">Kiểm tra wrinkling / giới hạn nén</div>
          <div className="flex flex-wrap gap-2">
            <TransparencyBadge tone={requestedTone}>{getTransparencyLabel(wrinklingMeta.requestedModeReliability)}</TransparencyBadge>
            <TransparencyBadge tone={effectiveTone}>Độ tin cậy: {getTransparencyLabel(wrinklingMeta.effectiveModeReliability || sigmaLimitMeta.reliability)}</TransparencyBadge>
            <TransparencyBadge tone={classificationTone}>{getTransparencyLabel(wrinklingMeta.sourceClassification, TRANSPARENCY_CLASSIFICATION_LABELS)}</TransparencyBadge>
          </div>
          <div className="space-y-1 text-slate-600">
            <div>σw đang dùng: <b className="text-slate-800">{Number(results?.sigma_w || 0).toFixed(1)} MPa</b></div>
            <div>σw khai báo: <b className="text-slate-800">{Number(results?.sigma_w_declared || 0).toFixed(1)} MPa</b></div>
            <div>σw xấp xỉ: <b className="text-slate-800">{Number(results?.sigma_w_approx || 0).toFixed(1)} MPa</b></div>
          </div>
          {results?.wrinklingDeclaredMissing ? (
            <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              Đã chọn <b>Khai báo trực tiếp</b> nhưng thiếu giá trị hợp lệ, nên hệ thống <b>fallback sang {getModeLabel(results?.wrinklingFallbackMode, WRINKLING_MODE_LABELS)}</b> để tránh hiểu nhầm mức tin cậy.
            </div>
          ) : (
            <div className="text-slate-600 space-y-1">
              <div>
                {results?.sigma_w_source === 'declared'
                  ? 'Giới hạn wrinkling đang bám theo giá trị người dùng khai báo trực tiếp.'
                  : results?.sigma_w_source === 'approx'
                    ? 'Giới hạn wrinkling đang dùng xấp xỉ kỹ thuật từ mô đun vật liệu.'
                    : 'Giới hạn nén đang bám trực tiếp theo giới hạn chảy thiết kế.'}
              </div>
              {results?.sigma_w_source === 'declared' && (
                <div className="text-[11px] text-slate-500 space-y-1">
                  <div>Semantic khai báo: <b>{declaredInput?.basis || 'design-resistance'}</b> · Đơn vị hiển thị: <b>{declaredInput?.unit || 'MPa'}</b></div>
                  <div>Nguồn: <b>{declaredInput?.sourceType || 'unknown'}</b>{declaredInput?.sourceRef ? ` · ref: ${declaredInput.sourceRef}` : ''}</div>
                  {declaredInput?.productContext && <div>Context sản phẩm: <b>{declaredInput.productContext}</b></div>}
                  {declaredInput?.sourceNote && <div>Note: {declaredInput.sourceNote}</div>}
                  {!declaredInput?.isSourceDocumented && <div>Repo đã có schema semantic cho input này, nhưng nếu chưa kèm ref/note thì vẫn chỉ được coi là user-declared chứ chưa nâng độ authority.</div>}
                </div>
              )}
              {results?.sigma_w_source === 'approx' && (
                <div className="text-[11px] text-slate-500">Hệ số <b>0.5</b> trong công thức xấp xỉ hiện mới là công thức nội bộ được externalize minh bạch; repo chưa gắn citation cho hệ số này và bộ biến <b>Ef/Ec/Gc</b>.</div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded border border-slate-200 p-3 space-y-2">
          <div className="font-semibold text-slate-700">Liên kết chống nhổ / screwStrength</div>
          <div className="flex flex-wrap gap-2">
            <TransparencyBadge tone={upliftTone}>Độ tin cậy: {getTransparencyLabel(upliftCheckMeta?.reliability)}</TransparencyBadge>
            <TransparencyBadge tone={getTransparencyTone(upliftCheckMeta?.classification)}>{getTransparencyLabel(upliftCheckMeta?.classification, TRANSPARENCY_CLASSIFICATION_LABELS)}</TransparencyBadge>
          </div>
          <div className="space-y-1 text-slate-600">
            <div>screwStrength khai báo: <b className="text-slate-800">{Number(upliftDeclaredInput?.value || 0).toFixed(2)} {upliftDeclaredInput?.unit || 'kN'}</b></div>
            <div>Semantic: <b>{upliftDeclaredInput?.basis || 'design-resistance-per-fastener'}</b> · Nguồn: <b>{upliftDeclaredInput?.sourceType || 'unknown'}</b></div>
            <div>Diễn giải spacing: <b>{upliftDeclaredInput?.spacingMeaning || upliftMeta?.inputSchema?.spacingMeaning || 'spacing across panel width for simplified count estimate'}</b></div>
            {upliftDeclaredInput?.sourceRef && <div>Ref: <b>{upliftDeclaredInput.sourceRef}</b></div>}
            {upliftDeclaredInput?.fastenerContext && <div>Context vít/liên kết: <b>{upliftDeclaredInput.fastenerContext}</b></div>}
            {upliftDeclaredInput?.sourceNote && <div>Note: {upliftDeclaredInput.sourceNote}</div>}
            {!upliftDeclaredInput?.isSourceDocumented && (
              <div className="text-[11px] text-slate-500">Hiện chưa có documented source gắn vào numeric path này; repo chỉ biết đây là per-fastener resistance input do người dùng/project artifact khai báo, không tự nâng thành source-backed capacity. Artifact hunt T3 chỉ xác nhận được acquisition path ở mức vendor installation guidance: fastening phải chốt theo fastener-manufacturer data / approved project schedule, chứ chưa tìm thấy dòng kN/vít đủ mạnh để attach trực tiếp.</div>
            )}
          </div>
          <div className="text-[11px] text-slate-500 space-y-1">
            <div>Quy tắc đếm vít hiện hành: <b>round(panelWidth / screwSpacing)</b>, tối thiểu 1 — đang được giữ ở trạng thái <b>provisional</b>.</div>
            <div>γM,screw = <b>{upliftMeta?.factor?.value || 1.33}</b> hiện đã externalize minh bạch, nhưng repo vẫn <b>chưa có documented clause / vendor worksheet</b> để source-link giá trị này.</div>
          </div>
        </div>

        <div className="bg-white rounded border border-slate-200 p-3 space-y-2">
          <div className="font-semibold text-slate-700">Độ tin cậy các kiểm tra chính</div>
          <div className="space-y-2">
            {[
              CAPACITY_CHECK_KEYS.SIGMA_LIMIT,
              CAPACITY_CHECK_KEYS.BENDING_STRESS,
              CAPACITY_CHECK_KEYS.SHEAR_CAPACITY,
              CAPACITY_CHECK_KEYS.SUPPORT_CRUSHING,
              CAPACITY_CHECK_KEYS.UPLIFT,
              CAPACITY_CHECK_KEYS.DEFLECTION,
            ].map((checkKey) => {
              const meta = results?.technicalTransparency?.checks?.[checkKey];
              if (!meta?.enabled) return null;
              const label = meta?.label || CAPACITY_CHECK_LABELS[checkKey] || checkKey;
              return (
                <div key={checkKey} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                  <div>
                    <div className="font-medium text-slate-700">{label}</div>
                    <div className="text-[11px] text-slate-500">Phân loại: {getTransparencyLabel(meta?.classification, TRANSPARENCY_CLASSIFICATION_LABELS)}</div>
                  </div>
                  <TransparencyBadge tone={getTransparencyTone(meta?.reliability)} className="shrink-0">Độ tin cậy: {getTransparencyLabel(meta?.reliability)}</TransparencyBadge>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===============================
// ✅ SƠ ĐỒ TÍNH (SVG) - TRẦN: X toàn dầm
// - KHÔNG dùng marker => in PDF/tab Báo cáo chắc chắn hiện mũi tên
// - Dimension đẩy xa gối + né ký hiệu gối
// - Mũi tên nhỏ + bỏ mũi tên đen
// ===============================
export const CeilingSchematic = ({ config, results }) => {
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

  // ArrowHead, LoadArrow, DimLine → imported from ./svg/SvgPrimitives

  const loadBands = [
    {
      key: 'dead',
      label: 'Tĩnh tải',
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

export const BeamDiagram = ({ spansM = [], windDirection = 'pressure', windPressure = 0 }) => {
  const spans = (spansM || []).map((s) => Number(s) || 0).filter((s) => s > 0);
  const supportLocs = (() => {
    let acc = 0;
    const arr = [0];
    spans.forEach((L) => {
      acc += L;
      arr.push(Number(acc.toFixed(3)));
    });
    return arr;
  })();

  const totalM = supportLocs[supportLocs.length - 1] || 0;
  const W = 900;
  const H = 220;
  const marginL = 40;
  const marginR = 40;
  const beamY = 80;
  const supTopY = beamY + 6;
  const supBottomY = 120;
  const dimY = 176;
  const loadTopY = 34;
  const loadBottomY = beamY - 10;
  const nArrows = 14;
  const isSuction = windDirection === 'suction';
  const qWind = Number(windPressure) || 0;

  const xMap = (xm) => {
    if (totalM <= 0) return marginL;
    return marginL + (xm / totalM) * (W - marginL - marginR);
  };

  const supports = supportLocs.map((xm, i) => ({ xm, i, x: xMap(xm) }));

  // ArrowHead, DimLine → imported from ./svg/SvgPrimitives
  // LoadArrow below uses closure vars (isSuction, beamY, loadTopY, loadBottomY) → kept local

  const LoadArrow = ({ x }) => (
    <g>
      <line x1={x} y1={isSuction ? beamY + 34 : loadTopY} x2={x} y2={isSuction ? beamY + 10 : loadBottomY} stroke="#16a34a" strokeWidth="1.4" />
      <ArrowHead x={x} y={isSuction ? beamY + 10 : loadBottomY} dir={isSuction ? 'up' : 'down'} w={6} h={6} fill="#16a34a" />
    </g>
  );

  const arrowXs = Array.from({ length: nArrows }, (_, i) => {
    const t = (i + 0.5) / nArrows;
    return marginL + t * (W - marginL - marginR);
  });

  return (
    <div className="w-full" style={{ overflow: 'visible' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="210" style={{ overflow: 'visible' }}>
        <text x={marginL} y={14} fontSize="12" fill="#0f172a" fontWeight="700">
          Sơ đồ tính — Tấm vách
        </text>

        <line x1={marginL} y1={beamY} x2={W - marginR} y2={beamY} stroke="#0f172a" strokeWidth="4" />

        {supports.map((s) => (
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

        {supports.slice(0, -1).map((s, idx) => {
          const s2 = supports[idx + 1];
          const mid = (s.x + s2.x) / 2;
          return (
            <g key={`dim-${idx}`}>
              <DimLine x1={s.x} x2={s2.x} y={dimY} />
              <text x={mid} y={dimY - 7} fontSize="10" fill="#334155" textAnchor="middle" fontWeight="700">
                L{idx + 1} = {spans[idx].toFixed(2)} m
              </text>
            </g>
          );
        })}

        {qWind !== 0 && (
          <g>
            <text x={marginL - 6} y={isSuction ? beamY + 52 : loadTopY - 6} fontSize="10" fill="#16a34a" textAnchor="end" fontWeight="600">
              {isSuction ? 'Gió hút' : 'Gió đẩy'}
            </text>
            {arrowXs.map((x, i) => <LoadArrow key={`load-${i}`} x={x} />)}
          </g>
        )}

        <rect x={W - marginR - 190} y={dimY + 10} width={170} height={34} rx={8} fill="#f8fafc" stroke="#e2e8f0" />
        <rect x={W - marginR - 178} y={dimY + 22} width={16} height={6} rx={2} fill="#16a34a" />
        <text x={W - marginR - 154} y={dimY + 28} fontSize="10" fill="#0f172a" fontWeight="600">
          Gió: {qWind.toFixed(3)} kPa
        </text>

        <text x={marginL} y={H - 10} fontSize="10" fill="#64748b">
          Trục X: 0 → {totalM.toFixed(2)} m
        </text>
      </svg>
    </div>
  );
};
