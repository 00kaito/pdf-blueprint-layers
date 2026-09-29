import React, {useEffect, useState} from 'react';
import {X} from 'lucide-react';
import {MeasureCalibration, UIState} from '@/lib/types';
import {MeasureLine} from '@/hooks/useMeasure';
import {feetPerUnit, formatFeet, formatFeetInches, parseFeet, Point, segmentLength} from '@/core/measure';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';

export const MEASURE_COLOR = '#dc2626';
const CALIBRATION_COLOR = '#d97706';
/** Half-length of the end ticks, in screen px. */
const TICK = 7;

interface MeasureLayerProps {
  tool: string;
  scale: number;
  calibration: MeasureCalibration | null;
  /** Line being dragged right now (calibration or a new measurement). */
  line: MeasureLine | null;
  /** Measuring tape left on the blueprint. */
  tape: UIState['measureTape'];
  pendingCalibration: MeasureLine | null;
  onCalibrate: (calibration: MeasureCalibration) => void;
  onCancelCalibration: () => void;
  onRemoveTape: () => void;
}

/** A dimension line in screen px: the segment plus perpendicular end ticks and a label at its middle. */
export const DimensionLine = ({ a, b, scale, color, label, dashed, markStart, onRemove }: {
  a: Point; b: Point; scale: number; color: string; label: string; dashed?: boolean;
  /** Dot at `a`, showing the direction the tape was pulled out in (distances count from here). */
  markStart?: boolean;
  onRemove?: () => void;
}) => {
  const ax = a.x * scale, ay = a.y * scale, bx = b.x * scale, by = b.y * scale;
  const len = Math.hypot(bx - ax, by - ay) || 1;
  // Unit normal, for the end ticks.
  const nx = -(by - ay) / len, ny = (bx - ax) / len;
  const ticks = [[ax, ay], [bx, by]].map(([x, y], i) => (
    <line key={i} x1={x - nx * TICK} y1={y - ny * TICK} x2={x + nx * TICK} y2={y + ny * TICK} stroke={color} strokeWidth={2} />
  ));
  return (
    <>
      <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{ width: '100%', height: '100%' }}>
        {/* White halo keeps the line readable over dark blueprint lines. */}
        <line x1={ax} y1={ay} x2={bx} y2={by} stroke="white" strokeWidth={5} strokeLinecap="round" opacity={0.8} />
        <line x1={ax} y1={ay} x2={bx} y2={by} stroke={color} strokeWidth={2} strokeLinecap="round" strokeDasharray={dashed ? '6 4' : undefined} />
        {ticks}
        {markStart && <circle cx={ax} cy={ay} r={4} fill={color} stroke="white" strokeWidth={1.5} />}
      </svg>
      <div
        className="absolute pointer-events-none flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold text-white shadow-md"
        style={{ left: (ax + bx) / 2, top: (ay + by) / 2, transform: 'translate(-50%, calc(-100% - 8px))', backgroundColor: color }}
      >
        {label}
        {onRemove && (
          <button
            type="button"
            className="pointer-events-auto -mr-1 rounded p-0.5 hover:bg-white/25"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            title="Remove measuring tape"
            data-testid="remove-tape"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </>
  );
};

const CalibrationDialog = ({ line, onConfirm, onCancel }: {
  line: MeasureLine | null;
  onConfirm: (feet: number) => void;
  onCancel: () => void;
}) => {
  const [text, setText] = useState('');
  useEffect(() => { if (line) setText(''); }, [line]);
  const feet = parseFeet(text);

  return (
    <Dialog open={!!line} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Set measuring scale</DialogTitle>
          <DialogDescription>How long is the line you just drew in reality?</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-2"
          onSubmit={(e) => { e.preventDefault(); if (feet) onConfirm(feet); }}
        >
          <Label htmlFor="calibration-length">Length</Label>
          <Input
            id="calibration-length"
            autoFocus
            inputMode="decimal"
            placeholder={`e.g. 20  ·  12.5 ft  ·  12' 6"`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            data-testid="calibration-length"
          />
          <p className="text-xs text-muted-foreground h-4">
            {text && (feet ? `= ${formatFeet(feet)} (${formatFeetInches(feet)})` : 'Enter feet, e.g. 20 or 12\' 6"')}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={!feet} data-testid="calibration-save">Set scale</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/** Calibration reference and measuring-tape lines, drawn over the blueprint. */
export const MeasureLayer = ({
  tool, scale, calibration, line, tape, pendingCalibration, onCalibrate, onCancelCalibration, onRemoveTape,
}: MeasureLayerProps) => {
  const ftPerUnit = feetPerUnit(calibration);
  const lengthLabel = (l: MeasureLine) => {
    if (!ftPerUnit) return 'Set the scale first';
    const feet = segmentLength(l.a, l.b) * ftPerUnit;
    return `${formatFeet(feet)} · ${formatFeetInches(feet)}`;
  };
  const lineLabel = !line ? '' : tool === 'calibrate'
    ? (pendingCalibration ? 'Enter length…' : 'Reference')
    : lengthLabel(line);
  // While a new measurement is being dragged it takes the place of the old tape.
  const showTape = tape && !(line && tool === 'measure');

  return (
    <>
      {(tool === 'calibrate' || line || showTape) && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 35 }}>
          {showTape && (
            <DimensionLine
              a={tape.a}
              b={tape.b}
              scale={scale}
              color={MEASURE_COLOR}
              label={lengthLabel(tape)}
              markStart
              onRemove={onRemoveTape}
            />
          )}
          {/* The reference is only shown while re-calibrating, not while measuring. */}
          {calibration && tool === 'calibrate' && !line && (
            <DimensionLine
              a={{ x: calibration.x1, y: calibration.y1 }}
              b={{ x: calibration.x2, y: calibration.y2 }}
              scale={scale}
              color={CALIBRATION_COLOR}
              label={`Scale ref: ${formatFeet(calibration.feet)}`}
              dashed
            />
          )}
          {line && (
            <DimensionLine
              a={line.a}
              b={line.b}
              scale={scale}
              color={tool === 'calibrate' ? CALIBRATION_COLOR : MEASURE_COLOR}
              label={lineLabel}
              markStart={tool === 'measure'}
            />
          )}
        </div>
      )}
      <CalibrationDialog
        line={pendingCalibration}
        onCancel={onCancelCalibration}
        onConfirm={(feet) => pendingCalibration && onCalibrate({
          x1: pendingCalibration.a.x,
          y1: pendingCalibration.a.y,
          x2: pendingCalibration.b.x,
          y2: pendingCalibration.b.y,
          feet,
        })}
      />
    </>
  );
};
