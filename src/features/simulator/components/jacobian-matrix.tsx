import React from "react";
import type { SpeciesConfig } from "../types";

export function JacobianMatrix({ matrix, activeSpecies }: { matrix: number[][]; activeSpecies: SpeciesConfig[] }) {
  if (!matrix || matrix.length === 0) return null;
  return (
    <div className="border border-hairline bg-surface-card rounded-lg p-4 flex flex-col w-full">
      <div className="text-xs font-mono text-primary mb-3 uppercase tracking-wider">Jacobian Interaction Coefficients</div>
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr>
              <th className="p-1 text-[9px] font-mono text-muted"></th>
              {activeSpecies.map(sp => (
                <th key={sp.id} className="p-1.5 text-[9px] font-mono text-body capitalize max-w-[50px] truncate" title={sp.name}>
                  {sp.id.slice(0, 4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-white/[0.02]">
                <td className="p-1.5 text-[9px] font-mono text-body text-left capitalize max-w-[50px] truncate" title={activeSpecies[rIdx]?.name}>
                  {activeSpecies[rIdx]?.id.slice(0, 4)}
                </td>
                {row.map((val, cIdx) => {
                  const isDiag = rIdx === cIdx;
                  const colorClass = val > 0 ? "text-success" : val < 0 ? "text-error" : "text-muted";
                  return (
                    <td
                      key={cIdx}
                      className={`p-1.5 text-[10px] font-mono border border-hairline ${colorClass} ${isDiag ? "bg-canvas" : ""}`}
                    >
                      {val.toFixed(4)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
