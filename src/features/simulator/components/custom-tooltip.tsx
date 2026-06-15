import React from "react";

export function CustomTooltip({
  active,
  payload,
  label,
  labelPrefix = "Year",
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  labelPrefix?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const formatValue = (val: number) => {
    if (val === 0) return "0";
    if (Math.abs(val) < 10) {
      return val.toFixed(3);
    }
    return Math.round(val).toLocaleString();
  };

  return (
    <div className="rounded-md border border-hairline border-l-2 border-l-primary bg-surface-card/95 backdrop-blur-md p-2.5 shadow-xl">
      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-primary">{labelPrefix} {label}</div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-6 text-xs">
            <span className="capitalize font-medium" style={{ color: entry.color }}>{entry.name}</span>
            <span className="font-mono font-semibold text-ink">{formatValue(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
