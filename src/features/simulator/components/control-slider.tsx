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

const toneClasses = {
  green: "text-emerald-200 border-emerald-400/20",
  cyan: "text-cyan-200 border-cyan-400/20",
  amber: "text-amber-200 border-amber-400/20",
  violet: "text-violet-200 border-violet-400/20",
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
    <div className={`rounded-md border bg-slate-950/65 p-4 ${toneClasses[tone]}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">{label}</div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Range {min}-{max} {unit}
          </div>
        </div>
        <div className="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-sm text-slate-100">
          {value}
          <span className="ml-1 text-[10px] text-slate-500">{unit}</span>
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
