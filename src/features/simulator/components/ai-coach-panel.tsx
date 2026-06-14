"use client";

import { useMemo } from "react";
import { BrainCircuit, Cpu, HelpCircle } from "lucide-react";
import { useSimulationStore } from "../store";
import { Typewriter } from "./typewriter";
import { CoachAnalysis } from "../types";

const initialAnalysis: CoachAnalysis = {
  ecological_status: "Stable",
  detected_anomalies: [
    {
      name: "None",
      year_of_onset: 0,
      description: "Awaiting live ecological telemetry from the simulator.",
    },
  ],
  socratic_questions: [
    "Which population is most sensitive to a change in carrying capacity?",
    "What indirect effect might appear if the apex predator count is raised?",
  ],
  provider: "fallback",
};

export function AICoachPanel() {
  const { analysis: storeAnalysis, quizPassed } = useSimulationStore();

  const analysis = storeAnalysis ?? initialAnalysis;
  const passedCount = Object.keys(quizPassed).filter((k) => quizPassed[k] === true).length;
  const totalLabs = 8;

  const anomaly = analysis.detected_anomalies[0] ?? initialAnalysis.detected_anomalies[0];
  const diagnosticText = useMemo(
    () => `${analysis.ecological_status.toUpperCase()} // ${anomaly.name}: ${anomaly.description}`,
    [analysis.ecological_status, anomaly.description, anomaly.name]
  );

  return (
    <aside className="rounded-lg border border-hairline bg-surface-card p-4 flex flex-col justify-between">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
              Socratic Lab Partner
            </div>
            <div className="mt-1 flex items-center gap-1 text-[9px] font-mono text-primary">
              <Cpu className="size-3" /> API Core Hydrated
            </div>
          </div>
          <BrainCircuit className="size-5 text-primary" />
        </div>

        <div className="relative border border-hairline bg-surface-soft p-3 text-[11px] leading-5 font-mono text-body min-h-[90px]">
          <Typewriter text={diagnosticText} speed={30} />
        </div>

        <div className="mt-5 space-y-4">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted">
            Socratic Diagnostics
          </div>
          <div className="space-y-3">
            {analysis.socratic_questions.slice(0, 2).map((q, idx) => (
              <div key={idx} className="flex gap-2.5 items-start text-xs text-body hover:text-white transition">
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
          <div 
            className="bg-primary h-full transition-all duration-500" 
            style={{ width: `${(passedCount / totalLabs) * 100}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
