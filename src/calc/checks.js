import { SECTION_CONSTANTS, stressFromMoment } from './section.js';

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

    const F_Rd = (constants.fCc * panelWidth * width) / constants.gammaM_shear;
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
      reqWidth: constants.fCc > 0 ? (R_comp * constants.gammaM_shear) / (constants.fCc * panelWidth) : 0,
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
  const governing = {
    moment: {
      key: ratios.support >= ratios.bending ? 'support' : 'span',
      ratio: Math.max(ratios.support || 0, ratios.bending || 0),
      label: ratios.support >= ratios.bending ? 'Mô-men/ứng suất tại gối' : 'Mô-men/ứng suất tại nhịp',
    },
    shear: {
      key: 'shear',
      ratio: ratios.shear || 0,
      label: 'Lực cắt lõi',
    },
    deflection: {
      key: 'deflection',
      ratio: ratios.deflection || 0,
      label: 'Độ võng SLS',
    },
    uplift: upliftEnabled
      ? {
        key: 'uplift',
        ratio: ratios.uplift || 0,
        label: 'Liên kết chống nhổ',
      }
      : {
        key: 'na',
        ratio: 0,
        label: 'Không áp dụng uplift',
      },
  };

  const candidates = [governing.moment, governing.shear, governing.deflection];
  if (upliftEnabled) candidates.push(governing.uplift);
  const overall = candidates.reduce((worst, item) => (item.ratio > worst.ratio ? item : worst), { key: 'none', ratio: 0, label: 'Chưa xác định' });

  return {
    ...governing,
    overall: {
      ...overall,
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

  const advice = [];
  advice.push(`Wrinkling mode: ${wrinklingMode || 'approx'}; redistribution mode: ${redistributionMode || 'elastic'}.`);
  if (wrinklingDeclaredMissing) {
    advice.push(`Thiếu wrinkling stress khai báo hợp lệ cho mode declared; đang fallback theo ${wrinklingFallbackMode}.`);
  }
  if (hingeNoteList.length > 0) {
    advice.push(`Đã kích hoạt tái phân phối nội lực (khớp) tại gối: ${hingeNoteList.join(', ')} (ULS).`);
  }
  if (creepMode !== 'none') {
    const creepNote = phiBending > 0 ? `φ = ${phiShear}, φb = ${phiBending}` : `φ = ${phiShear}`;
    advice.push(`SLS đã xét từ biến lõi (${creepNote}). Mode: ${creepMode === 'all' ? 'toàn tải SLS' : 'chỉ tải lâu dài (dead + tải treo)'}.`);
  }
  advice.push(`Governing overall: ${governingCases.overall.label} (${(governingCases.overall.ratio * 100).toFixed(0)}%).`);
  if (ratios.bending > 1) advice.push('Nguy cơ nhăn tôn/chảy thép: Tăng độ dày tôn hoặc giảm nhịp.');
  if (ratios.support > 1) advice.push('Ứng suất tại gối cao: tăng độ dày tôn hoặc tăng bề rộng gối.');
  if (ratios.shear > 1) advice.push('Lực cắt quá lớn: tăng cường độ cắt của lõi hoặc tăng độ dày Panel.');
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
