import React from 'react';

export const REACTION_PASS_COLOR = '#22c55e';
export const REACTION_FAIL_COLOR = '#ef4444';
export const REACTION_LIMIT_COLOR = '#e5e7eb';
export const REACTION_LIMIT_BORDER = '#9ca3af';

export const CustomTooltip = ({ active, payload, label }) => {
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

export const ReactionLegend = () => (
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
