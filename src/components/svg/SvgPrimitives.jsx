/**
 * src/components/svg/SvgPrimitives.jsx
 *
 * Shared SVG primitive components dùng chung giữa
 * CeilingSchematic, BeamDiagram và các diagram khác.
 *
 * Tất cả components ở đây là PURE (không có closure dependencies)
 * → dễ test, dễ tái sử dụng.
 */

import React from 'react';

/**
 * ArrowHead — đầu mũi tên tam giác
 * @param {number} x - tọa độ x đỉnh
 * @param {number} y - tọa độ y đỉnh
 * @param {'down'|'up'|'left'|'right'} dir - hướng mũi tên
 * @param {number} w - chiều rộng
 * @param {number} h - chiều cao
 * @param {string} fill - màu fill
 */
export const ArrowHead = ({ x, y, dir = 'down', w = 6, h = 6, fill = '#64748b' }) => {
  let pts = '';
  if (dir === 'down')  pts = `${x},${y} ${x - w / 2},${y - h} ${x + w / 2},${y - h}`;
  if (dir === 'up')    pts = `${x},${y} ${x - w / 2},${y + h} ${x + w / 2},${y + h}`;
  if (dir === 'left')  pts = `${x},${y} ${x + h},${y - w / 2} ${x + h},${y + w / 2}`;
  if (dir === 'right') pts = `${x},${y} ${x - h},${y - w / 2} ${x - h},${y + w / 2}`;
  return <polygon points={pts} fill={fill} />;
};

/**
 * DimLine — đường đo kích thước với 2 mũi tên 2 đầu
 * @param {number} x1 - điểm bắt đầu
 * @param {number} x2 - điểm kết thúc
 * @param {number} y  - vị trí y
 */
export const DimLine = ({ x1, x2, y }) => {
  const stroke = '#64748b';
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={stroke} strokeWidth="1.4" />
      <ArrowHead x={x1} y={y} dir="right" w={6} h={6} fill={stroke} />
      <ArrowHead x={x2} y={y} dir="left"  w={6} h={6} fill={stroke} />
    </g>
  );
};

/**
 * LoadArrow — mũi tên có thân thẳng đứng (generic)
 * @param {number} x      - tọa độ x
 * @param {number} y1     - điểm bắt đầu thân (phía tải)
 * @param {number} y2     - điểm kết thúc / đầu mũi tên
 * @param {boolean} up    - true = mũi tên hướng lên (hút), false = xuống (nén)
 * @param {string} color  - màu stroke
 */
export const LoadArrow = ({ x, y1, y2, up = false, color = '#16a34a' }) => (
  <g>
    <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth="1.4" />
    <ArrowHead x={x} y={y2} dir={up ? 'up' : 'down'} w={6} h={6} fill={color} />
  </g>
);
