import React from "react";
import { Hexagon, FlaskConical } from "lucide-react";
import { useSimulationStore } from "../store";

export function DashboardHeader() {
  const curriculumTab = useSimulationStore((state) => state.curriculumTab || "physiology");
  const setCurriculumTab = useSimulationStore((state) => state.setCurriculumTab || (() => {}));
  const selectedLab = useSimulationStore((state) => state.selectedLab);
  const setSelectedLab = useSimulationStore((state) => state.setSelectedLab);
  const startLab = useSimulationStore((state) => state.startLab || (() => {}));

  return (
    <header className="border-b border-hairline bg-surface-soft px-4 py-3 md:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg border border-hairline bg-surface-card">
            <Hexagon className="size-5 text-primary" />
          </div>
          <div>
            <div className="font-mono text-caption-uppercase text-primary">
              EcoChain-AI / Degree-Level Ecology LMS
            </div>
            <h1 className="mt-1 text-title-lg text-ink md:text-display-sm">
              Ecosystem Sandbox & Research Desk
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-surface-soft border border-hairline p-1 rounded-lg">
          {[
            ["physiology", "Canopy Physiology"],
            ["hysteresis", "Lake Hysteresis Lab"],
            ["literature", "Literature Corner"],
          ].map(([tabKey, label]) => {
            return (
              <button
                key={tabKey}
                onClick={() => setCurriculumTab(tabKey)}
                className={`px-3 py-1.5 rounded-md text-nav-link transition-all ${
                  curriculumTab === tabKey
                    ? "bg-surface-card border border-hairline/40 text-ink"
                    : "text-muted hover:text-ink border border-transparent"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedLab(selectedLab ? null : "physiology-wue");
              if (!selectedLab) {
                startLab("physiology-wue");
              }
            }}
            className={`px-3 py-2 rounded-md border text-caption-uppercase flex items-center gap-2 transition ${
              selectedLab
                ? "bg-primary border-primary text-on-primary font-semibold"
                : "border-hairline bg-surface-card hover:bg-surface-elevated text-ink"
            }`}
          >
            <FlaskConical className="size-4" />
            {selectedLab ? "Drawer Active" : "Guided Lab Missions"}
          </button>
        </div>
      </div>
    </header>
  );
}
