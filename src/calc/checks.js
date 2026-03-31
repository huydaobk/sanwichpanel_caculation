import {
  SECTION_CONSTANTS,
  SUPPORT_CRUSHING_FACTOR,
  SUPPORT_CRUSHING_RESISTANCE,
  stressFromMoment,
} from './section.js';
import {
  CAPACITY_CHECK_KEYS,
  CAPACITY_CHECK_LABELS,
  CAPACITY_GOVERNING_CASE_KEYS,
  CAPACITY_GOVERNING_CASE_LABELS,
} from './capacityTaxonomy.js';

export const getExtrema = (data, key) => {
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

export const buildReactionData = ({ config, reactionEnvelope, panelWidth, upliftEnabled, screwStrength, constants = SECTION_CONSTANTS }) => {
  const screwSpacing = Number(config.screwSpacing) || 0;
  const screwCount = screwSpacing > 0 ? Math.max(1, Math.round(panelWidth / screwSpacing)) : 1;
  const T_Rd_N = screwStrength > 0 ? (screwStrength * 1000 * screwCount) / Math.max(constants.gammaM_screw, 1e-9) : 0;

  let maxReactionCompression = 0;
  let maxReactionTension = 0;
  let maxReactionRatio = 0;
  let maxUpliftRatio = 0;

  const reactionData = (config.supportWidths || []).map((widthVal, idx) => {
    const width = Number(widthVal) || 60;
    const reactionsAtSupport = reactionEnvelope.map((arr) => arr[idx] || 0);
    const R_comp = Math.max(...reactionsAtSupport.map((r) => Math.max(r, 0)));
    const R_tension = Math.max(...reactionsAtSupport.map((r) => Math.max(-r, 0)));

    const crushingResistanceStress = Number(constants.supportCrushingResistance?.value)
      || Number(constants.fCc)
      || SUPPORT_CRUSHING_RESISTANCE.value;
    const crushingFactor = Number(constants.gammaM_crushing)
      || Number(constants.gammaM_shear)
      || SUPPORT_CRUSHING_FACTOR.value;
    const F_Rd = (crushingResistanceStress * panelWidth * width) / crushingFactor;
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
      reqWidth: crushingResistanceStress > 0 ? (R_comp * crushingFactor) / (crushingResistanceStress * panelWidth) : 0,
      R_uplift: parseFloat((R_tension / 1000).toFixed(2)),
      T_Rd: parseFloat((T_Rd_N / 1000).toFixed(2)),
      upliftRatio,
      upliftStatus: upliftEnabled ? (upliftRatio <= 1 ? 'pass' : 'fail') : 'na',
    };
  });

  const worstSupport = reactionData.find((s) => s.ratio === maxReactionRatio) || { F_Rd: 0 };
  const worstUplift = reactionData.find((s) => s.upliftRatio === maxUpliftRatio) || { T_Rd: 0 };

  return {
    screwCount,
    T_Rd_N,
    reactionData,
    maxReactionCompression,
    maxReactionTension,
    maxReactionRatio,
    maxUpliftRatio,
    worstSupport,
    worstUplift,
  };
};

export const buildGoverningCaseSummary = ({ ratios = {}, upliftEnabled = false, hingeNoteList = [] }) => {
  const createCase = ({ categoryKey, key, ratio, label }) => ({
    categoryKey,
    key,
    ratio: ratio || 0,
    label: label || CAPACITY_GOVERNING_CASE_LABELS[key] || CAPACITY_CHECK_LABELS[key] || key,
  });

  const governing = {
    [CAPACITY_GOVERNING_CASE_KEYS.MOMENT]: createCase({
      categoryKey: CAPACITY_GOVERNING_CASE_KEYS.MOMENT,
      key: ratios.support >= ratios.bending ? 'support' : 'span',
      ratio: Math.max(ratios.support || 0, ratios.bending || 0),
    }),
    [CAPACITY_GOVERNING_CASE_KEYS.SHEAR]: createCase({
      categoryKey: CAPACITY_GOVERNING_CASE_KEYS.SHEAR,
      key: CAPACITY_GOVERNING_CASE_KEYS.SHEAR,
      ratio: ratios.shear || 0,
    }),
    [CAPACITY_GOVERNING_CASE_KEYS.CRUSHING]: createCase({
      categoryKey: CAPACITY_GOVERNING_CASE_KEYS.CRUSHING,
      key: CAPACITY_GOVERNING_CASE_KEYS.CRUSHING,
      ratio: ratios.crushing || 0,
    }),
    [CAPACITY_GOVERNING_CASE_KEYS.DEFLECTION]: createCase({
      categoryKey: CAPACITY_GOVERNING_CASE_KEYS.DEFLECTION,
      key: CAPACITY_GOVERNING_CASE_KEYS.DEFLECTION,
      ratio: ratios.deflection || 0,
    }),
    [CAPACITY_GOVERNING_CASE_KEYS.UPLIFT]: upliftEnabled
      ? createCase({
        categoryKey: CAPACITY_GOVERNING_CASE_KEYS.UPLIFT,
        key: CAPACITY_GOVERNING_CASE_KEYS.UPLIFT,
        ratio: ratios.uplift || 0,
      })
      : createCase({
        categoryKey: CAPACITY_GOVERNING_CASE_KEYS.UPLIFT,
        key: 'na',
        ratio: 0,
      }),
  };

  const candidates = [
    governing[CAPACITY_GOVERNING_CASE_KEYS.MOMENT],
    governing[CAPACITY_GOVERNING_CASE_KEYS.SHEAR],
    governing[CAPACITY_GOVERNING_CASE_KEYS.CRUSHING],
    governing[CAPACITY_GOVERNING_CASE_KEYS.DEFLECTION],
  ];
  if (upliftEnabled) candidates.push(governing[CAPACITY_GOVERNING_CASE_KEYS.UPLIFT]);
  const overall = candidates.reduce(
    (worst, item) => (item.ratio > worst.ratio ? item : worst),
    createCase({ categoryKey: CAPACITY_GOVERNING_CASE_KEYS.OVERALL, key: 'none', ratio: 0 }),
  );

  return {
    ...governing,
    [CAPACITY_GOVERNING_CASE_KEYS.OVERALL]: {
      ...overall,
      categoryKey: CAPACITY_GOVERNING_CASE_KEYS.OVERALL,
      hingesTriggered: hingeNoteList.length > 0,
      hingeSupports: [...hingeNoteList],
    },
  };
};

export const buildCapacityChecks = ({
  config,
  maxMomentAbs,
  maxSupportMomentAbs,
  maxShear,
  maxDeflectionRatio,
  maxReactionRatio,
  maxUpliftRatio,
  upliftEnabled,
  sigma_limit,
  I_eq,
  zMax,
  Ac,
  reactionData,
  hingeNoteList,
  creepMode,
  phiShear,
  phiBending,
  wrinklingMode,
  wrinklingDeclaredMissing = false,
  wrinklingFallbackMode = wrinklingMode,
  redistributionMode,
  constants = SECTION_CONSTANTS,
}) => {
  const stress_span_val = stressFromMoment(maxMomentAbs, I_eq, zMax);
  const stress_support_val = stressFromMoment(maxSupportMomentAbs, I_eq, zMax);
  const fCv_input = Number(config.coreShearStrength) || 0.12;
  const V_Rd = (fCv_input * Ac) / constants.gammaM_shear;

  const ratios = {
    bending: sigma_limit > 0 ? stress_span_val / sigma_limit : 0,
    support: sigma_limit > 0 ? stress_support_val / sigma_limit : 0,
    shear: V_Rd > 0 ? maxShear / V_Rd : 0,
    crushing: maxReactionRatio,
    deflection: maxDeflectionRatio,
    uplift: upliftEnabled ? maxUpliftRatio : 0,
  };

  const governingCases = buildGoverningCaseSummary({ ratios, upliftEnabled, hingeNoteList });

  let status = 'pass';
  if (
    ratios.bending > 1 ||
    ratios.support > 1 ||
    ratios.shear > 1 ||
    ratios.crushing > 1 ||
    ratios.deflection > 1 ||
    (upliftEnabled && ratios.uplift > 1)
  ) status = 'fail';

  const wrinklingModeLabel = wrinklingMode === 'declared'
    ? 'khai báo trực tiếp'
    : wrinklingMode === 'yield-only'
      ? 'chỉ theo giới hạn chảy'
      : 'xấp xỉ';
  const wrinklingFallbackLabel = wrinklingFallbackMode === 'declared'
    ? 'khai báo trực tiếp'
    : wrinklingFallbackMode === 'yield-only'
      ? 'chỉ theo giới hạn chảy'
      : 'xấp xỉ';
  const redistributionModeLabel = redistributionMode === 'simplified' ? 'đơn giản hóa' : 'đàn hồi';

  const advice = [];
  advice.push(`Chế độ kiểm tra nhăn yêu cầu: ${wrinklingModeLabel}; chế độ đang dùng: ${wrinklingFallbackLabel}; chế độ phân phối nội lực: ${redistributionModeLabel}.`);
  if (wrinklingMode === 'declared' && !wrinklingDeclaredMissing) {
    advice.push('Ứng suất nhăn đang dùng lấy theo giá trị khai báo trực tiếp của người dùng.');
  }
  if (wrinklingDeclaredMissing) {
    advice.push(`Thiếu ứng suất nhăn khai báo hợp lệ cho chế độ khai báo trực tiếp; đã fallback rõ ràng sang ${wrinklingFallbackLabel}.`);
  }
  if (hingeNoteList.length > 0) {
    advice.push(`Đã kích hoạt tái phân phối nội lực (khớp) tại gối: ${hingeNoteList.join(', ')} (ULS).`);
  }
  if (creepMode !== 'none') {
    const creepNote = phiBending > 0 ? `φ = ${phiShear}, φb = ${phiBending}` : `φ = ${phiShear}`;
    advice.push(`SLS đã xét từ biến lõi (${creepNote}). Phạm vi xét: ${creepMode === 'all' ? 'toàn bộ tải SLS' : 'chỉ tải lâu dài (tĩnh tải + tải treo)'}.`);
  }
  advice.push(`Trường hợp chi phối toàn bộ: ${governingCases.overall.label} (${(governingCases.overall.ratio * 100).toFixed(0)}%).`);
  if (ratios.bending > 1) advice.push('Nguy cơ nhăn tôn/chảy thép: Tăng độ dày tôn hoặc giảm nhịp.');
  if (ratios.support > 1) advice.push('Ứng suất tại gối cao: tăng độ dày tôn hoặc tăng bề rộng gối.');
  if (ratios.shear > 1) advice.push('Lực cắt quá lớn: tăng cường độ cắt của lõi hoặc tăng độ dày panel.');
  reactionData.forEach((s) => {
    if (s.status === 'fail') advice.push(`Gối ${s.id} bị quá tải ép dập. Cần tăng bề rộng lên > ${Math.ceil(s.reqWidth)}mm.`);
    if (upliftEnabled && s.upliftStatus === 'fail') advice.push(`Gối ${s.id} bị nhổ (uplift). Cần tăng số lượng/khoảng cách vít hoặc tăng khả năng vít.`);
  });
  if (ratios.deflection > 1) advice.push('Độ võng lớn: tăng độ dày Panel.');
  if (upliftEnabled && ratios.uplift > 1) advice.push('Liên kết chống nhổ không đủ: kiểm tra vít và bố trí liên kết.');
  if (advice.length === 0) advice.push('Thiết kế Đạt yêu cầu và An toàn.');

  return {
    V_Rd,
    stress_span_val,
    stress_support_val,
    ratios,
    status,
    advice,
    governingCases,
  };
};
