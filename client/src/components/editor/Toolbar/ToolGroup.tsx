import React from 'react';
import {cn} from '@/lib/utils';

/**
 * A labelled group of domain tools (cables, CCTV) in the tool row: kept apart from the universal
 * tools so the group can come and go at the end of the row without moving anything else.
 */
export const ToolGroup = ({ label, children, className, ...rest }: React.HTMLAttributes<HTMLDivElement> & { label: string }) => (
  <div
    className={cn("flex items-center gap-0.5 rounded-md border border-border/60 bg-muted/40 pl-1.5 pr-0.5 py-0.5 shrink-0", className)}
    role="group"
    aria-label={label}
    {...rest}
  >
    <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground mr-1 select-none">{label}</span>
    {children}
  </div>
);
