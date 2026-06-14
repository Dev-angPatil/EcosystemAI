"use client";

import { useSimulationStore } from "../store";
import { EigenvaluePlane } from "./eigenvalue-plane";
import { JacobianMatrix } from "./jacobian-matrix";
import { StabilityAnalysis } from "../types";

const initialStability: StabilityAnalysis = {
  jacobian: [],
  eigenvalues: [],
  stable: true,
  equilibrium: [],
};

export function TrophicStabilityCharts() {
  const { stability: storeStability, species } = useSimulationStore();
  const stability = storeStability ?? initialStability;
  const activeSpecies = species.filter((s) => s.active);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
      <div className="flex items-center justify-center">
        <EigenvaluePlane eigenvalues={stability.eigenvalues} />
      </div>
      <div className="flex items-center justify-center">
        <JacobianMatrix matrix={stability.jacobian} activeSpecies={activeSpecies} />
      </div>
    </div>
  );
}
