"use client";

import React, { useState, useMemo } from "react";
import { useSimulationStore } from "../store";
import { Info, HelpCircle, AlertTriangle } from "lucide-react";

// Static mapping of predator-prey relationships across biomes
const FOOD_WEB_LINKS: Record<string, Record<string, string[]>> = {
  forest: {
    wolves: ["rabbits", "deer"],
    owls: ["rabbits", "frogs"],
    frogs: ["insects"],
    rabbits: ["grass", "ferns", "berries", "clover", "dandelions"],
    deer: ["grass", "ferns", "oak", "pine", "berries", "birch", "ivy"],
    insects: ["grass", "ferns", "oak", "pine", "berries", "moss", "dandelions", "mushrooms", "clover", "ivy", "birch", "orchids"],
  },
  marine: {
    sharks: ["small_fish", "tuna", "crabs"],
    tuna: ["krill", "small_fish"],
    small_fish: ["zooplankton", "krill"],
    crabs: ["krill", "zooplankton"],
    zooplankton: ["phytoplankton", "seaweed", "diatoms", "dinoflagellates", "green_algae"],
    krill: ["phytoplankton", "seaweed", "diatoms", "green_algae"],
  },
  desert: {
    coyotes: ["rats", "lizards", "roadrunners"],
    roadrunners: ["insects", "lizards", "scorpions"],
    scorpions: ["insects"],
    lizards: ["insects"],
    rats: ["cactus", "shrubs", "prickly_pear", "mesquite", "marigold", "agave", "yucca", "barrel_cactus"],
    insects: ["cactus", "shrubs", "prickly_pear", "mesquite", "marigold", "verbena", "brittlebush", "sage"],
  },
  tropical: {
    jaguar: ["howler_monkey"],
    harpy_eagle: ["howler_monkey"],
    boa: ["howler_monkey", "poison_dart_frog"],
    poison_dart_frog: ["insects_tr"],
    howler_monkey: ["canopy_trees", "palms", "epiphytes", "ficus", "cacao", "bamboo"],
    insects_tr: ["canopy_trees", "epiphytes", "palms", "heliconias", "bamboo", "orchids_tr"],
  },
  freshwater: {
    pike: ["roach", "perch"],
    heron: ["roach", "perch", "zooplankton_fw"],
    perch: ["invertebrates", "zooplankton_fw"],
    roach: ["invertebrates", "zooplankton_fw"],
    zooplankton_fw: ["phytoplankton_fw", "macrophytes", "periphyton", "cyanobacteria_fw"],
    invertebrates: ["phytoplankton_fw", "macrophytes", "periphyton", "submerged_plants"],
  },
};

export function TrophicFoodWeb() {
  const { timeline, currentYear, species, biome, isPlaying } = useSimulationStore();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Retrieve current active data point
  const currentPt = useMemo(() => {
    return timeline[currentYear] ?? timeline[timeline.length - 1] ?? null;
  }, [timeline, currentYear]);

  // Filter active species
  const activeSpecies = useMemo(() => {
    return species.filter((s) => s.active);
  }, [species]);

  const activeSpeciesIds = useMemo(() => {
    return new Set(activeSpecies.map((s) => s.id));
  }, [activeSpecies]);

  // Food Web configuration: nodes and links
  const graph = useMemo(() => {
    const biomeLinks = FOOD_WEB_LINKS[biome] || {};
    
    // Group species by trophic levels
    const levels: Record<string, string[]> = {
      Apex: [],
      Carnivore: [],
      Herbivore: [],
      Producer: [],
    };
    
    activeSpecies.forEach((s) => {
      if (levels[s.trophic_level]) {
        levels[s.trophic_level].push(s.id);
      }
    });

    const nodeWidth = 460;
    const nodeHeight = 320;
    const paddingX = 40;
    
    // Determine positions
    const levelY: Record<string, number> = {
      Apex: 40,
      Carnivore: 125,
      Herbivore: 210,
      Producer: 290,
    };

    const nodePositions: Record<string, { x: number; y: number }> = {};
    
    Object.keys(levels).forEach((level) => {
      const sps = levels[level];
      const count = sps.length;
      const y = levelY[level];
      
      sps.forEach((id, index) => {
        let x = nodeWidth / 2;
        if (count > 1) {
          x = paddingX + (index * (nodeWidth - 2 * paddingX)) / (count - 1);
        }
        nodePositions[id] = { x, y };
      });
    });

    // Generate links (directed arrows from prey to predator)
    const links: Array<{ from: string; to: string; active: boolean }> = [];
    Object.entries(biomeLinks).forEach(([predatorId, preyIds]) => {
      if (activeSpeciesIds.has(predatorId)) {
        preyIds.forEach((preyId) => {
          if (activeSpeciesIds.has(preyId)) {
            links.push({
              from: preyId,
              to: predatorId,
              active: true,
            });
          }
        });
      }
    });

    return {
      nodes: activeSpecies.map((s) => {
        const pop = currentPt?.populations[s.id] ?? s.initial_pop;
        // Scale radius
        let r = 7;
        if (s.trophic_level === "Producer") {
          r = 6 + Math.sqrt(pop) * 0.8;
          r = Math.min(22, r);
        } else {
          r = 8 + Math.sqrt(pop) * 1.6;
          r = Math.min(25, r);
        }
        return {
          ...s,
          r,
          x: nodePositions[s.id]?.x ?? 0,
          y: nodePositions[s.id]?.y ?? 0,
          pop,
        };
      }),
      links: links.map((l) => ({
        ...l,
        fromPos: nodePositions[l.from],
        toPos: nodePositions[l.to],
      })),
    };
  }, [activeSpecies, activeSpeciesIds, biome, currentPt]);

  // Compute Biomass Pyramid data
  const pyramidData = useMemo(() => {
    if (!currentPt) return null;
    
    const levels = ["Apex", "Carnivore", "Herbivore", "Producer"];
    const biomassPerLevel = levels.map((lvl) => {
      const levelSpecies = activeSpecies.filter((s) => s.trophic_level === lvl);
      const sum = levelSpecies.reduce((tot, s) => tot + (currentPt.populations[s.id] ?? 0), 0);
      return { level: lvl, biomass: sum };
    });

    const maxBiomass = Math.max(...biomassPerLevel.map((d) => d.biomass), 1);
    
    // Compute efficiencies: level(i) / level(i-1)
    const efficiencies = [];
    for (let i = 0; i < biomassPerLevel.length - 1; i++) {
      const lower = biomassPerLevel[i + 1].biomass;
      const upper = biomassPerLevel[i].biomass;
      const eff = lower > 0 ? (upper / lower) * 100 : 0;
      efficiencies.push(eff);
    }

    return {
      levels: biomassPerLevel,
      maxBiomass,
      efficiencies, // index 0: Herbivore/Producer, 1: Carnivore/Herbivore, 2: Apex/Carnivore
    };
  }, [activeSpecies, currentPt]);

  // Colors based on Trophic Level
  const getTrophicColor = (level: string) => {
    switch (level) {
      case "Apex": return "#f43f5e"; // Pink/Rose
      case "Carnivore": return "#f59e0b"; // Orange/Yellow
      case "Herbivore": return "#06b6d4"; // Cyan
      case "Producer": return "#10b981"; // Emerald
      default: return "#ffffff";
    }
  };

  const hoveredConnectedIds = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const connected = new Set<string>([hoveredNode]);
    graph.links.forEach((l) => {
      if (l.from === hoveredNode) connected.add(l.to);
      if (l.to === hoveredNode) connected.add(l.from);
    });
    return connected;
  }, [hoveredNode, graph.links]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-[380px]">
      {/* Food Web SVG Card */}
      <div className="lg:col-span-2 bg-surface-card border border-hairline p-4 rounded-lg flex flex-col justify-between relative">
        <div>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-mono text-primary uppercase tracking-wider">Trophic Interaction Network</h3>
              <p className="text-[10px] font-mono text-muted mt-0.5">Energy flows upwards from prey to predators. Node sizes reflect biomass.</p>
            </div>
            <div className="flex gap-1.5 items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[9px] font-mono text-muted mr-2">P</span>
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              <span className="text-[9px] font-mono text-muted mr-2">H</span>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-[9px] font-mono text-muted mr-2">C</span>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-[9px] font-mono text-muted">A</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center min-h-[280px]">
          <svg viewBox="0 0 460 320" className="w-full h-full max-w-[480px]">
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="18"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#3a3a3a" />
              </marker>
              <marker
                id="arrow-active"
                viewBox="0 0 10 10"
                refX="18"
                refY="5"
                markerWidth="5.5"
                markerHeight="5.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#faff69" />
              </marker>
            </defs>

            {/* Links / Edges */}
            {graph.links.map((link, idx) => {
              if (!link.fromPos || !link.toPos) return null;
              
              const isHoveredLink = 
                hoveredNode === link.from || hoveredNode === link.to;
              const strokeColor = isHoveredLink ? "#faff69" : "rgba(58, 58, 58, 0.4)";
              const strokeWidth = isHoveredLink ? 1.5 : 0.8;
              const marker = isHoveredLink ? "url(#arrow-active)" : "url(#arrow)";

              // Calculate flow speed based on state
              const dashSpeed = isPlaying ? "8s" : "0s";

              return (
                <g key={`link-${idx}`}>
                  <line
                    x1={link.fromPos.x}
                    y1={link.fromPos.y}
                    x2={link.toPos.x}
                    y2={link.toPos.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    markerEnd={marker}
                    strokeDasharray={isHoveredLink ? "4 4" : undefined}
                    className="transition-all duration-300"
                  />
                  {isHoveredLink && (
                    <line
                      x1={link.fromPos.x}
                      y1={link.fromPos.y}
                      x2={link.toPos.x}
                      y2={link.toPos.y}
                      stroke="#faff69"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      className="animate-flow-particles"
                      style={{
                        animation: `flow-particles ${dashSpeed} linear infinite`,
                        strokeDashoffset: 10,
                      }}
                    />
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {graph.nodes.map((node) => {
              const isSelected = hoveredNode === node.id;
              const isDimmed = hoveredNode !== null && !hoveredConnectedIds.has(node.id);
              const nodeColor = getTrophicColor(node.trophic_level);

              return (
                <g
                  key={node.id}
                  className="cursor-pointer transition-all duration-300"
                  style={{ opacity: isDimmed ? 0.35 : 1 }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Glowing outer ring on hover */}
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.r + 4}
                      fill="none"
                      stroke="#faff69"
                      strokeWidth={1.5}
                      className="animate-pulse"
                    />
                  )}

                  {/* Core Node */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r}
                    fill={nodeColor}
                    stroke={isSelected ? "#faff69" : "#0a0a0a"}
                    strokeWidth={1.5}
                  />

                  {/* Short text labels */}
                  <text
                    x={node.x}
                    y={node.y + node.r + 11}
                    textAnchor="middle"
                    fill={isSelected ? "#faff69" : "#e6e6e6"}
                    className="text-[8px] font-mono font-semibold select-none capitalize"
                  >
                    {node.name.length > 15 ? `${node.name.slice(0, 13)}...` : node.name}
                  </text>
                  
                  <text
                    x={node.x}
                    y={node.y - node.r - 4}
                    textAnchor="middle"
                    fill="#888888"
                    className="text-[8px] font-mono select-none"
                  >
                    {node.pop.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Dynamic Details Overlay */}
        <div className="border-t border-hairline pt-3 mt-2 min-h-[46px] flex items-center">
          {hoveredNode ? (
            (() => {
              const nd = graph.nodes.find((n) => n.id === hoveredNode);
              if (!nd) return null;
              return (
                <div className="w-full flex justify-between items-center text-xs font-mono">
                  <div>
                    <span className="font-bold uppercase" style={{ color: getTrophicColor(nd.trophic_level) }}>
                      {nd.name}
                    </span>
                    <span className="text-muted ml-2">({nd.trophic_level})</span>
                  </div>
                  <div className="flex gap-4">
                    <span>
                      Biomass: <strong className="text-white">{nd.pop.toFixed(2)}</strong>
                    </span>
                    {nd.thermal_optimum && (
                      <span>
                        Optimum Temp: <strong className="text-amber-400">{nd.thermal_optimum}°C</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-[10px] font-mono text-muted flex items-center gap-1">
              <Info className="size-3 text-primary" />
              Hover over species nodes to trace food web links and review ecological parameters.
            </div>
          )}
        </div>
      </div>

      {/* Trophic Pyramid Card */}
      <div className="bg-surface-card border border-hairline p-4 rounded-lg flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-mono text-primary uppercase tracking-wider">Trophic Biomass Pyramid</h3>
          <p className="text-[10px] font-mono text-muted mt-0.5">Ecological scaling showing energy transfer efficiency across tiers.</p>
        </div>

        {pyramidData ? (
          <div className="flex-1 flex flex-col justify-center space-y-4 py-4">
            {/* Pyramid Levels */}
            <div className="space-y-2.5">
              {pyramidData.levels.map((lvl, index) => {
                const percentage = (lvl.biomass / pyramidData.maxBiomass) * 100;
                const color = getTrophicColor(lvl.level);
                
                return (
                  <div key={lvl.level} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-body font-semibold">{lvl.level}</span>
                      <span className="text-white font-bold">{lvl.biomass.toFixed(1)} kg</span>
                    </div>
                    <div className="w-full bg-surface-soft h-5 border border-hairline rounded relative overflow-hidden flex items-center justify-center">
                      <div
                        className="h-full opacity-35 transition-all duration-500"
                        style={{
                          width: `${Math.max(3, percentage)}%`,
                          backgroundColor: color,
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-muted">
                        {percentage.toFixed(1)}% Relative Scale
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Transfer Efficiencies */}
            <div className="border-t border-hairline pt-3 space-y-2">
              <div className="text-[10px] font-mono text-primary uppercase tracking-wider flex items-center gap-1">
                Trophic Efficiencies
              </div>
              <div className="grid grid-cols-3 gap-2 text-[9px] font-mono text-center">
                <div className="bg-surface-soft p-1.5 rounded border border-hairline">
                  <div className="text-muted">T1 → T2</div>
                  <div className="font-bold text-white mt-0.5">{pyramidData.efficiencies[2]?.toFixed(1) ?? "0.0"}%</div>
                </div>
                <div className="bg-surface-soft p-1.5 rounded border border-hairline">
                  <div className="text-muted">T2 → T3</div>
                  <div className="font-bold text-white mt-0.5">{pyramidData.efficiencies[1]?.toFixed(1) ?? "0.0"}%</div>
                </div>
                <div className="bg-surface-soft p-1.5 rounded border border-hairline">
                  <div className="text-muted">T3 → T4</div>
                  <div className="font-bold text-white mt-0.5">{pyramidData.efficiencies[0]?.toFixed(1) ?? "0.0"}%</div>
                </div>
              </div>
            </div>

            {/* Inverted Pyramid Alert */}
            {(() => {
              const hBio = pyramidData.levels[2].biomass;
              const pBio = pyramidData.levels[3].biomass;
              const isInverted = hBio > pBio && pBio > 0;
              
              if (isInverted) {
                return (
                  <div className="bg-red-950/20 border border-red-900/50 p-2 rounded flex items-center gap-2 text-[10px] font-mono text-red-400 animate-pulse">
                    <AlertTriangle className="size-4 shrink-0 text-red-500" />
                    <div>
                      <strong>Inverted Trophic Base!</strong> Herbivore biomass exceeds producers. System unstable.
                    </div>
                  </div>
                );
              }
              return (
                <div className="bg-emerald-950/20 border border-emerald-900/50 p-2 rounded flex items-center gap-2 text-[10px] font-mono text-emerald-400">
                  <HelpCircle className="size-4 shrink-0 text-emerald-500" />
                  <div>
                    Normal energetic scaling (10% transfer rule) maintained.
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="text-center font-mono text-xs text-muted py-8">
            Pyramid data unavailable.
          </div>
        )}
      </div>
    </div>
  );
}
