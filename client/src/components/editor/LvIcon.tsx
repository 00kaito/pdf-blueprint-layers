import React from 'react';
import {LV_ICON_GRID, LV_ICONS} from '@/core/lv-icons';

/** Low-voltage device icon, drawn like a lucide icon (currentColor outline). */
export const LvIcon = ({ type, className, style }: { type: string; className?: string; style?: React.CSSProperties }) => {
  const icon = LV_ICONS[type];
  if (!icon) return null;
  return (
    <svg
      viewBox={`0 0 ${LV_ICON_GRID} ${LV_ICON_GRID}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d={icon.d} />
    </svg>
  );
};
