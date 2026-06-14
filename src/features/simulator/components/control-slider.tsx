"use client";

import { Slider } from "@/shared/components/ui/slider";

type ControlSliderProps = {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  tone: "green" | "cyan" | "amber" | "violet";
  onChange: (value: number) => void;
};

export function ControlSlider({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  tone,
  onChange,
}: ControlSliderProps) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-card p-4 text-body">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-title-sm text-ink">{label}</div>
          <div className="mt-1 font-mono text-caption-uppercase text-muted">
            Range {min}-{max} {unit}
          </div>
        </div>
        <div className="rounded border border-hairline bg-surface-elevated px-2 py-1 font-mono text-body-sm text-ink">
          {value}
          <span className="ml-1 text-caption-uppercase text-muted">{unit}</span>
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange(next[0] ?? value)}
      />
    </div>
  );
}
