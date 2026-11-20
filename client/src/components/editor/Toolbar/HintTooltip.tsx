import React from 'react';
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';

/**
 * Tooltip that also shows on a disabled control: a disabled button gets no pointer events, so the
 * hover is taken by a wrapper — a disabled tool can still say why it is disabled.
 * Needs a TooltipProvider above it (the toolbar has one).
 */
export const HintTooltip = ({ hint, children }: { hint: React.ReactNode; children: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex">{children}</span>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">{hint}</TooltipContent>
  </Tooltip>
);
