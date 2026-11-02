import React from 'react';
import {Button} from '@/components/ui/button';
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

/** Picker tile of a low-voltage icon: the icon with its name underneath, for a 3-column grid. */
export const LvIconTile = ({ icon, ...props }: { icon: string } & React.ComponentProps<typeof Button>) => (
  <Button
    variant="outline"
    size="icon"
    className="h-full w-full flex-col justify-start gap-1 whitespace-normal px-1 py-1.5 font-normal"
    title={LV_ICONS[icon].label}
    {...props}
  >
    <LvIcon type={icon} className="w-4 h-4" />
    <span className="line-clamp-2 text-center text-[9px] leading-tight">{LV_ICONS[icon].label}</span>
  </Button>
);
