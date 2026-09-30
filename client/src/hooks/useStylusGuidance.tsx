import React, {useEffect, useRef} from 'react';
import {useUI} from '@/lib/editor-context';
import {useToast} from '@/hooks/use-toast';
import {ToastAction} from '@/components/ui/toast';
import {isStrokeTool, isTapTool} from '@/core/pointer-input';

const SUGGESTED_STORAGE_KEY = 'editor.stylusOnlySuggested';

const wasSuggested = () => {
  try { return localStorage.getItem(SUGGESTED_STORAGE_KEY) === 'true'; } catch { return true; }
};
const markSuggested = () => {
  try { localStorage.setItem(SUGGESTED_STORAGE_KEY, 'true'); } catch { /* storage unavailable */ }
};

/**
 * Keeps stylus-only input discoverable instead of silent:
 * - the first time a stylus touches the canvas (outside stylus-only), offer to turn the mode on — once per device;
 * - in stylus-only mode, a finger on a tool pans instead; say so (once per tool pick) with a way out,
 *   unless a stylus is already being used in this session.
 * Returns the type of the last pointer pressed on the canvas (a click event does not tell it reliably).
 */
export const useStylusGuidance = (scrollRef: React.RefObject<HTMLDivElement>) => {
  const { state: uiState, dispatch } = useUI();
  const { toast } = useToast();
  const lastPointerTypeRef = useRef('');
  const penUsedRef = useRef(false);
  const hintShownForToolRef = useRef(false);
  const latest = useRef({ tool: uiState.tool, stylusOnly: uiState.stylusOnly });
  latest.current = { tool: uiState.tool, stylusOnly: uiState.stylusOnly };

  useEffect(() => { hintShownForToolRef.current = false; }, [uiState.tool, uiState.stylusOnly]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const onPointerDown = (e: PointerEvent) => {
      lastPointerTypeRef.current = e.pointerType;
      const { tool, stylusOnly } = latest.current;
      if (e.pointerType === 'pen') {
        penUsedRef.current = true;
        if (!stylusOnly && !wasSuggested()) {
          markSuggested();
          toast({
            title: 'Stylus detected',
            description: 'Turn on stylus only? The stylus then uses the tools, and fingers only pan, zoom and tap — no stray marks from your palm.',
            action: (
              <ToastAction altText="Turn on stylus only" onClick={() => dispatch({ type: 'SET_STYLUS_ONLY', payload: true })}>
                Turn on
              </ToastAction>
            ),
          });
        }
        return;
      }
      if (e.pointerType === 'touch' && e.isPrimary && stylusOnly && (isStrokeTool(tool) || isTapTool(tool))
          && !penUsedRef.current && !hintShownForToolRef.current) {
        hintShownForToolRef.current = true;
        toast({
          title: 'Stylus only is on',
          description: 'Fingers pan and zoom — use the stylus for this tool, or let fingers use the tools too.',
          action: (
            <ToastAction altText="Turn off stylus only" onClick={() => dispatch({ type: 'SET_STYLUS_ONLY', payload: false })}>
              Turn off
            </ToastAction>
          ),
        });
      }
    };
    scroller.addEventListener('pointerdown', onPointerDown, true);
    return () => scroller.removeEventListener('pointerdown', onPointerDown, true);
  }, [scrollRef, toast, dispatch]);

  return { lastPointerTypeRef };
};
