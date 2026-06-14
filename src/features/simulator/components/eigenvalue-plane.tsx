import React from "react";
import type { ComplexNumber } from "../types";

export function EigenvaluePlane({ eigenvalues }: { eigenvalues: ComplexNumber[] }) {
  const mapRealToX = (val: number) => 120 + val * 65;
  const mapImagToY = (val: number) => 120 - val * 65;

  return (
    <div className="relative border border-hairline bg-surface-card rounded-lg p-4 flex flex-col items-center">
      <div className="text-xs font-mono text-primary mb-2 uppercase tracking-wider">Complex Eigenvalue Plane</div>
      <svg width="240" height="240" className="border border-hairline bg-canvas rounded select-none">
        {/* Grid lines */}
        <line x1="120" y1="0" x2="120" y2="240" stroke="#222222" />
        <line x1="0" y1="120" x2="240" y2="120" stroke="#222222" />
        
        {/* Helper grids */}
        <circle cx="120" cy="120" r="65" stroke="#1a1a1a" fill="none" strokeDasharray="2 4" />
        
        {/* Axis labels */}
        <text x="220" y="115" fill="#5a5a5a" fontSize="8" fontFamily="monospace">Re</text>
        <text x="125" y="15" fill="#5a5a5a" fontSize="8" fontFamily="monospace">Im</text>

        {/* Boundary of stability: dashed line at Re=0 */}
        <line x1="120" y1="0" x2="120" y2="240" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" opacity={0.85} />
        
        {/* Eigenvalues */}
        {eigenvalues.map((ev, i) => {
          const cx = Math.min(235, Math.max(5, mapRealToX(ev.real)));
          const cy = Math.min(235, Math.max(5, mapImagToY(ev.imag)));
          const isStable = ev.real < 0;
          const color = isStable ? "#22c55e" : "#ef4444";
          return (
            <g key={i}>
              <circle
                cx={cx}
                cy={cy}
                r={6}
                fill={color}
                className="cursor-pointer hover:scale-125 transition-transform"
                style={{ filter: `drop-shadow(0 0 5px ${color})` }}
              />
              <title>{`λ = ${ev.real.toFixed(3)} + ${ev.imag.toFixed(3)}i`}</title>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex gap-4 text-[10px] font-mono">
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-success" /> Stable (Re &lt; 0)</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-error" /> Unstable (Re &ge; 0)</span>
      </div>
    </div>
  );
}
