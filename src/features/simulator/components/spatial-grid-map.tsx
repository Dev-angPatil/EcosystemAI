"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Map as MapIcon, Satellite } from "lucide-react";
import { useSimulationStore } from "../store";

export function SpatialGridMap() {
  const {
    isLoading,
    timeline,
    currentYear,
    selectedCell,
    hoveredCell,
    selectedTool,
    disturbanceCells,
    corridorY,
    disturbanceType,
    species,
    setSelectedCell,
    setHoveredCell,
    setCorridorY,
    setIsPlaying,
    setDisturbanceCells,
    setDisturbanceType,
    setSelectedTool,
  } = useSimulationStore();

  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);

  // Derived state
  const activePoint = timeline[currentYear] ?? timeline[timeline.length - 1] ?? { cells: [], populations: {}, nutrients: {} };
  const selectedCellData = selectedCell ? activePoint.cells?.find(c => c.x === selectedCell.x && c.y === selectedCell.y) : null;
  const activeSpecies = species.filter(s => s.active);

  const paintCell = (x: number, y: number) => {
    if (selectedTool === "None") return;
    const exists = disturbanceCells.some(([cx, cy]) => cx === x && cy === y);
    if (exists) return;
    setDisturbanceCells([...disturbanceCells, [x, y]]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 focus:outline-none mt-0">
      <div className="flex-1 flex flex-col md:flex-row gap-4 h-full min-h-0">
        {/* SVG Visualization Grid */}
        <div className="flex-1 flex items-center justify-center p-3 bg-canvas border border-hairline rounded-lg relative min-h-[340px]">
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 grid place-items-center bg-canvas/70 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3 rounded border border-hairline bg-surface-card px-4 py-3 font-mono text-xs uppercase tracking-[0.18em] text-primary">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Solving ecosystem matrix
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <svg 
            viewBox="0 0 100 100" 
            className="w-full max-w-[420px] aspect-square rounded select-none animate-fade-in"
            onMouseDown={() => setIsMouseDown(true)}
            onMouseUp={() => setIsMouseDown(false)}
            onMouseLeave={() => setIsMouseDown(false)}
          >
            {Array.from({ length: 10 }).map((_, y) => 
              Array.from({ length: 10 }).map((_, x) => {
                const cells = activePoint?.cells || [];
                const cell = cells.find(c => c.x === x && c.y === y) || { 
                  plants: 0, 
                  rabbits: 0, 
                  wolves: 0, 
                  populations: {} as Record<string, number>, 
                  nutrients: {} as Record<string, number>, 
                  x, 
                  y, 
                  toxin_concentration: 0, 
                  hypoxic: false 
                };
                const plantVal = cell.plants;
                const rabbitVal = cell.rabbits;
                const wolfVal = cell.wolves;

                // Color Mix Formula
                const r = Math.min(220, Math.floor(wolfVal * 160 + rabbitVal * 25));
                const g = Math.min(220, Math.floor(plantVal * 16 + rabbitVal * 15));
                const b = Math.min(240, Math.floor(rabbitVal * 70));
                
                const totalMass = plantVal + rabbitVal + wolfVal;
                const opacity = Math.min(0.95, Math.max(0.12, totalMass / 25.0));
                
                const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
                const isDisturbed = disturbanceCells.some(([cx, cy]) => cx === x && cy === y);
                
                return (
                  <g key={`${x}-${y}`}>
                    <rect
                      x={x * 10}
                      y={y * 10}
                      width={9.2}
                      height={9.2}
                      rx={1}
                      fill={`rgb(${r}, ${g}, ${b})`}
                      fillOpacity={opacity}
                      stroke={isSelected ? "#22d3ee" : isHovered ? "rgba(34, 211, 238, 0.4)" : "rgba(34, 211, 238, 0.08)"}
                      strokeWidth={isSelected ? 0.8 : isHovered ? 0.6 : 0.2}
                      className="cursor-pointer transition-all duration-300 hover:fill-opacity-90"
                      onMouseEnter={() => {
                        setHoveredCell({ 
                          x, 
                          y, 
                          populations: cell.populations || {}, 
                          nutrients: cell.nutrients || {},
                          toxin_concentration: cell.toxin_concentration,
                          hypoxic: cell.hypoxic 
                        });
                        if (selectedTool !== "None" && isMouseDown) {
                          paintCell(x, y);
                        }
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                      onMouseDown={(e) => {
                        if (selectedTool !== "None") {
                          e.stopPropagation();
                          setIsMouseDown(true);
                          paintCell(x, y);
                        }
                      }}
                      onClick={() => {
                        if (selectedTool !== "None") {
                          paintCell(x, y);
                        } else {
                          setSelectedCell({ x, y });
                          setIsPlaying(false);
                          if (x === 4 || x === 5) {
                            setCorridorY(y);
                          }
                        }
                      }}
                    />
                    {isDisturbed && (
                      <rect
                        x={x * 10 + 0.5}
                        y={y * 10 + 0.5}
                        width={8.2}
                        height={8.2}
                        rx={0.5}
                        fill="none"
                        stroke={
                          selectedTool === "fire" || disturbanceType === "fire" ? "#f97316" :
                          selectedTool === "logging" || disturbanceType === "logging" ? "#b45309" :
                          "#22c55e"
                        }
                        strokeWidth={0.8}
                        strokeDasharray={selectedTool !== "None" ? "1 0.5" : "none"}
                        className="pointer-events-none"
                      />
                    )}
                    {cell.hypoxic && (
                      <rect
                        x={x * 10}
                        y={y * 10}
                        width={9.2}
                        height={9.2}
                        rx={1}
                        fill="rgba(100, 116, 139, 0.65)"
                        className="pointer-events-none animate-pulse"
                      />
                    )}
                    {cell.toxin_concentration > 1.0 && (
                      <rect
                        x={x * 10}
                        y={y * 10}
                        width={9.2}
                        height={9.2}
                        rx={1}
                        fill="none"
                        stroke="#84cc16"
                        strokeWidth="0.8"
                        className="pointer-events-none"
                      />
                    )}
                    {rabbitVal > 0.5 && !cell.hypoxic && (
                      <circle cx={x * 10 + 2.5} cy={y * 10 + 2.5} r={0.7} fill="#22d3ee" className="pointer-events-none animate-pulse" />
                    )}
                    {wolfVal > 0.2 && !cell.hypoxic && (
                      <circle cx={x * 10 + 7.5} cy={y * 10 + 2.5} r={0.7} fill="#f59e0b" className="pointer-events-none" />
                    )}
                  </g>
                );
              })
            )}

            {/* Metapopulation Rescue: highway column at X=5 */}
            <line x1="49.6" y1="0" x2="49.6" y2="100" stroke="#f43f5e" strokeWidth="0.8" strokeDasharray="3 3" opacity={0.6} />
            
            {/* Corridor placement */}
            {corridorY !== null && (
              <rect
                x="48.5"
                y={corridorY * 10 + 2}
                width="2.2"
                height="5.2"
                fill="#10b981"
                rx="0.5"
                className="animate-pulse"
                style={{ filter: "drop-shadow(0 0 3px #10b981)" }}
              />
            )}
          </svg>
        </div>
        
        {/* Telemetry sidebar */}
        <div className="w-full md:w-[200px] flex flex-col justify-between border-t md:border-t-0 md:border-l border-hairline p-4 bg-surface-soft rounded-r-lg">
          <div className="overflow-y-auto max-h-[360px]">
            <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-primary mb-3">
              <Satellite className="size-3.5 text-primary animate-pulse" />
              Spatial Telemetry
            </div>
            {hoveredCell || selectedCell ? (
              <div className="space-y-4">
                <div>
                  <div className="font-semibold text-sm text-body">
                    Coordinate: <span className="font-mono text-primary">[{hoveredCell?.x ?? selectedCell?.x}, {hoveredCell?.y ?? selectedCell?.y}]</span>
                  </div>
                  <div className="text-[10px] text-muted font-mono mt-0.5 uppercase tracking-wider">
                    {hoveredCell ? "Hover Focus" : "Selected Target"}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {activeSpecies.map((sp) => {
                    const val = (hoveredCell?.populations?.[sp.id] ?? selectedCellData?.populations?.[sp.id]);
                    return (
                      <div key={sp.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-900">
                        <span className="capitalize text-slate-400">{sp.name.slice(0, 12)}:</span>
                        <span className="font-mono text-slate-100 font-bold">{val !== undefined ? val.toFixed(2) : "0.0"}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-900 space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hypoxic Zone:</span>
                    <span className={(hoveredCell?.hypoxic ?? selectedCellData?.hypoxic) ? "text-rose-400 font-bold animate-pulse" : "text-slate-400"}>
                      {(hoveredCell?.hypoxic ?? selectedCellData?.hypoxic) ? "YES (DEAD)" : "NO"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mercury (Hg):</span>
                    <span className={(hoveredCell?.toxin_concentration ?? selectedCellData?.toxin_concentration ?? 0) > 1.5 ? "text-lime-400 font-bold" : "text-slate-400"}>
                      {(hoveredCell?.toxin_concentration ?? selectedCellData?.toxin_concentration ?? 0).toFixed(3)} units
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-6 leading-5">
                Hover or click cells to analyze localized population metrics. Click column 4 or 5 to build a wildlife bridge.
              </div>
            )}
          </div>
          
          {selectedCell && (
            <button 
              onClick={() => setSelectedCell(null)}
              className="w-full text-center text-[10px] font-mono uppercase tracking-[0.16em] border border-slate-700 hover:border-slate-500 rounded p-2 text-slate-400 hover:text-slate-200 transition mt-4"
            >
              Reset Selection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
