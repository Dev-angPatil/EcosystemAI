import React from "react";

export function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border border-hairline bg-surface-card p-3">
      <div className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-primary">Year {label}</div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-6 text-xs">
            <span style={{ color: entry.color }}>{entry.name}</span>
            <span className="font-mono text-body-strong">{Math.round(entry.value).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
