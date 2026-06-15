# EcoChain-AI: GitHub Repository Code Showcase

This document showcases the core React, TypeScript, and Zustand code developed and improved for **EcoChain-AI** (Ecosystem Simulation & Socratic LMS). This code powers the interactive dashboard, multi-stage simulations, Socratic coach panel, custom visualizations, and the guided product tour.

---

## 1. Custom Hover Tooltip (`custom-tooltip.tsx`)
This component implements a unified, premium glassmorphic hover tooltip with a brand-aligned electric yellow left accent border. It formats small physiological values (conductance, photosynthesis) and large integer counts dynamically.

```tsx
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
```

---

## 2. Trophic Trajectory Chart (`trophic-trajectory-chart.tsx`)
Renders the 30-year Lotka-Volterra population trajectories. Line colors are customized semantically based on trophic levels (producers in greens, herbivores in blues, carnivores in oranges, apex predators in reds/roses).

```tsx
"use client";

import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from "recharts";
import { useSimulationStore } from "../store";
import { CustomTooltip } from "./custom-tooltip";

export function TrophicTrajectoryChart() {
  const { timeline, species } = useSimulationStore();
  const activeSpecies = species.filter((s) => s.active);

  let producerIdx = 0;
  let herbivoreIdx = 0;
  let carnivoreIdx = 0;
  let apexIdx = 0;

  return (
    <div className="w-full h-full min-h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={timeline}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
          <XAxis dataKey="year" stroke="#5a5a5a" tickLine={false} tick={{ fontSize: 9, fontFamily: "monospace" }} />
          <YAxis stroke="#5a5a5a" tickLine={false} axisLine={false} tick={{ fontSize: 9, fontFamily: "monospace" }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
          
          {activeSpecies.map((sp) => {
            let color = "#faff69";
            if (sp.trophic_level === "Producer") {
              const colors = ["#10b981", "#22c55e", "#059669"];
              color = colors[producerIdx++ % colors.length];
            } else if (sp.trophic_level === "Herbivore") {
              const colors = ["#3b82f6", "#06b6d4", "#60a5fa"];
              color = colors[herbivoreIdx++ % colors.length];
            } else if (sp.trophic_level === "Carnivore") {
              const colors = ["#f97316", "#f59e0b", "#fbbf24"];
              color = colors[carnivoreIdx++ % colors.length];
            } else { // Apex
              const colors = ["#ef4444", "#f43f5e", "#ec4899"];
              color = colors[apexIdx++ % colors.length];
            }

            return (
              <Line
                key={sp.id}
                type="monotone"
                dataKey={`populations.${sp.id}`}
                name={sp.name}
                stroke={color}
                strokeWidth={2.2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## 3. Product Tour Engine (`demo-tour.tsx`)
Implements the interactive walkthrough overlay. It measures the physical bounds of targeted DOM nodes using `getBoundingClientRect()` dynamically, scrolls elements into view smoothly, and draws a highlighted spotlight ring.

```tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, ChevronRight, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface DemoStep {
  id: string;
  title: string;
  description: string;
  targetId: string;
  onActivate?: () => void;
  side?: "top" | "bottom" | "left" | "right";
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface DemoTourProps {
  steps: DemoStep[];
  onClose: () => void;
}

const PADDING = 12;

export function DemoTour({ steps, onClose }: DemoTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const step = steps[currentStep];

  const measureTarget = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-demo-id="${step.targetId}"]`) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    setTimeout(() => {
      const r = el.getBoundingClientRect();
      const spotlight: SpotlightRect = {
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      };
      setRect(spotlight);

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const tooltipW = 320;
      const tooltipH = 140;
      const side = step.side ?? "bottom";

      let top = 0;
      let left = 0;

      if (side === "bottom") {
        top = Math.min(r.bottom + PADDING + 12, vh - tooltipH - 16);
        left = Math.max(16, Math.min(r.left, vw - tooltipW - 16));
      } else if (side === "top") {
        top = Math.max(16, r.top - tooltipH - PADDING - 12);
        left = Math.max(16, Math.min(r.left, vw - tooltipW - 16));
      } else if (side === "right") {
        top = Math.max(16, r.top);
        left = Math.min(r.right + PADDING + 12, vw - tooltipW - 16);
      } else {
        top = Math.max(16, r.top);
        left = Math.max(16, r.left - tooltipW - PADDING - 12);
      }

      setTooltipPos({ top, left });
    }, 380);
  }, [step]);

  useEffect(() => {
    if (!step) return;
    step.onActivate?.();
    const t = setTimeout(measureTarget, 200);
    return () => clearTimeout(t);
  }, [currentStep, step, measureTarget]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onClose();
    }
  };

  const isLast = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        {rect ? (
          <>
            <div className="absolute bg-black/75 backdrop-blur-[1px]" style={{ top: 0, left: 0, right: 0, height: rect.top }} />
            <div className="absolute bg-black/75 backdrop-blur-[1px]" style={{ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }} />
            <div className="absolute bg-black/75 backdrop-blur-[1px]" style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }} />
            <div className="absolute bg-black/75 backdrop-blur-[1px]" style={{ top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height }} />
            <div className="absolute rounded-xl pointer-events-none" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: "0 0 0 2px #faff69, 0 0 24px 4px rgba(250,255,105,0.18)" }} />
          </>
        ) : (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[1px]" />
        )}
      </div>

      <div className="fixed inset-0 z-[9997]" onClick={(e) => e.stopPropagation()} />

      <motion.div key={currentStep} className="fixed z-[9999] w-[320px]" style={{ top: tooltipPos.top, left: tooltipPos.left }}>
        <div className="rounded-xl border border-[#faff69]/30 bg-[#111111] p-4 shadow-2xl shadow-black/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#faff69]">Step {currentStep + 1} / {steps.length}</span>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-[#888]"><X className="size-3.5" /></button>
          </div>

          <h3 className="text-sm font-semibold text-white mb-1.5">{step?.title}</h3>
          <p className="text-[11px] text-[#aaa] leading-[1.6] font-mono">{step?.description}</p>

          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div key={i} className="rounded-full" style={{ width: i === currentStep ? 16 : 5, height: 5, background: i === currentStep ? "#faff69" : "#333" }} />
              ))}
            </div>
            <button onClick={handleNext} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#faff69] text-black font-bold uppercase tracking-wider">{isLast ? "Finish" : "Next"}</button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## 4. Zustand Simulation State Store (`store.ts`)
Houses the central reactive state of the simulation. Sets the default navigation tab to `"trophic"` and handles active presets.

```typescript
import { create } from "zustand";
import { DataPoint, CoachAnalysis, StabilityAnalysis, SpeciesConfig } from "./types";
import { defaultSpecies, defaultControls } from "./presets";

interface SimulationState {
  controls: any;
  biome: string;
  species: SpeciesConfig[];
  timeline: DataPoint[];
  analysis: CoachAnalysis | null;
  stability: StabilityAnalysis | null;
  isLoading: boolean;
  error: string | null;
  currentYear: number;
  curriculumTab: string;
  setCurriculumTab: (tab: string) => void;
  // ... other setters omitted for brevity
}

export const useSimulationStore = create<SimulationState>((set) => ({
  controls: defaultControls,
  biome: "forest",
  species: defaultSpecies,
  timeline: [],
  analysis: null,
  stability: null,
  isLoading: false,
  error: null,
  currentYear: 0,
  curriculumTab: "trophic", // Default to Trophic Dynamics Sandbox on load
  setCurriculumTab: (tab) => set({ curriculumTab: tab }),
  // ... rest of store implementation
}));
```

---

## 5. Socratic AI Coach Component (`ai-coach-panel.tsx`)
Binds to the dashboard layout. Renders real-time telemetry diagnoses and Socratic coaching questions.

```tsx
"use client";

import { useMemo } from "react";
import { BrainCircuit, Cpu, HelpCircle } from "lucide-react";
import { useSimulationStore } from "../store";
import { Typewriter } from "./typewriter";

export function AICoachPanel() {
  const { analysis: storeAnalysis, quizPassed } = useSimulationStore();
  const passedCount = Object.keys(quizPassed).filter((k) => quizPassed[k] === true).length;
  const totalLabs = 8;

  const analysis = storeAnalysis ?? {
    ecological_status: "Stable",
    detected_anomalies: [{ name: "None", description: "Awaiting live telemetry..." }],
    socratic_questions: ["Which population is most sensitive to carrying capacity?"]
  };

  const anomaly = analysis.detected_anomalies[0];
  const diagnosticText = `${analysis.ecological_status.toUpperCase()} // ${anomaly.name}: ${anomaly.description}`;

  return (
    <aside data-demo-id="ai-coach-panel" className="rounded-lg border border-hairline bg-surface-card p-4 flex flex-col justify-between h-full">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">Socratic Lab Partner</div>
            <div className="mt-1 flex items-center gap-1 text-[9px] font-mono text-primary"><Cpu className="size-3" /> API Core Hydrated</div>
          </div>
          <BrainCircuit className="size-5 text-primary" />
        </div>

        <div className="relative border border-hairline bg-surface-soft p-3 text-[11px] leading-5 font-mono text-body min-h-[90px]">
          <Typewriter text={diagnosticText} speed={30} />
        </div>

        <div className="mt-5 space-y-4">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted">Socratic Diagnostics</div>
          <div className="space-y-3">
            {analysis.socratic_questions.slice(0, 2).map((q, idx) => (
              <div key={idx} className="flex gap-2.5 items-start text-xs text-body">
                <HelpCircle className="size-4 text-primary/80 shrink-0 mt-0.5" />
                <span className="leading-5">{q}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-hairline pt-4 mt-6">
        <div className="flex justify-between items-center text-xs font-mono mb-2">
          <span className="text-muted">Academic Status:</span>
          <span className="text-primary font-bold">{passedCount} / {totalLabs} Certified</span>
        </div>
        <div className="w-full bg-surface-soft h-1 rounded-full overflow-hidden">
          <div className="bg-primary h-full transition-all duration-500" style={{ width: `${(passedCount / totalLabs) * 100}%` }} />
        </div>
      </div>
    </aside>
  );
}
```
