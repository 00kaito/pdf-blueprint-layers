import React from 'react';
import {cn} from '@/lib/utils';
import {BLINDSPOT_COLOR, COVERAGE_AREA_COLOR} from '@/core/camera-coverage';

/** Camera blindspot as drawn on the plan and in the add menus: a hatched, see-through rectangle. */
export const BlindspotShape = ({ className, color = BLINDSPOT_COLOR }: { className?: string; color?: string }) => (
  <div
    className={cn("border-2", className)}
    style={{
      borderColor: color,
      backgroundColor: `${color}26`,
      backgroundImage: `repeating-linear-gradient(45deg, ${color}99 0 1.5px, transparent 1.5px 7px)`,
    }}
  />
);

/** Coverage area as drawn on the plan and in the toolbar: a dashed outline over a faint tint. */
export const CoverageAreaShape = ({ className, color = COVERAGE_AREA_COLOR }: { className?: string; color?: string }) => (
  <div className={cn("border-2 border-dashed", className)} style={{ borderColor: color, backgroundColor: `${color}0d` }} />
);
