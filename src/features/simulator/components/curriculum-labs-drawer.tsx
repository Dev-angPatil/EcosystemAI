"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  FlaskConical, 
  CheckCircle2, 
  ShieldAlert, 
  Activity, 
  HelpCircle 
} from "lucide-react";
import { useSimulationStore } from "../store";
import { defaultSpecies, defaultControls } from "../presets";
import { HysteresisPoint, SpeciesConfig } from "../types";

interface CurriculumLabsDrawerProps {
  triggerSimulation: (
    overrideControls?: any,
    overrideBiome?: string,
    overrideSpecies?: SpeciesConfig[],
    overrideLinkStrength?: number,
    overrideCorridorY?: number | null,
    overridePresetId?: string,
    overrideEutroph?: boolean,
    overrideWarming?: number,
    overrideToxin?: number
  ) => Promise<void>;
  hysteresisData: HysteresisPoint[];
  setHysteresisData: (data: HysteresisPoint[]) => void;
  isHysteresisLoading: boolean;
  setIsHysteresisLoading: (loading: boolean) => void;
}

export function CurriculumLabsDrawer({
  triggerSimulation,
  hysteresisData,
  setHysteresisData,
  isHysteresisLoading,
  setIsHysteresisLoading,
}: CurriculumLabsDrawerProps) {
  const {
    biome,
    setBiome,
    species,
    setSpecies,
    linkStrength,
    setLinkStrength,
    corridorY,
    setCorridorY,
    setControls,
    controls,
    eutrophicationPulse,
    setEutrophicationPulse,
    climateWarmingRate,
    setClimateWarmingRate,
    toxinInfluxRate,
    setToxinInfluxRate,
    setActivePreset,
    selectedLab,
    setSelectedLab,
    setCurriculumTab,
    timeline,
    stability,
    quizAnswers,
    setQuizAnswers,
    quizSubmitted,
    setQuizSubmitted,
    quizPassed,
    setQuizPassed,
  } = useSimulationStore();

  const startLab = (labId: string) => {
    let nextBiome = biome;
    let nextSpecies = species;
    let nextLinkStrength = linkStrength;
    let nextCorridorY = corridorY;
    let nextControls = { ...controls };
    let nextEutroph = eutrophicationPulse;
    let nextWarming = climateWarmingRate;
    let nextToxin = toxinInfluxRate;

    if (labId === "may-stability") {
      nextBiome = "forest";
      nextSpecies = defaultSpecies.forest.map(s => ({ ...s, active: true, initial_pop: s.initial_pop }));
      nextLinkStrength = 1.2;
      nextCorridorY = null;
      nextControls = defaultControls;
      nextEutroph = false;
      nextWarming = 0.0;
      nextToxin = 0.0;
    } else if (labId === "competitive") {
      nextBiome = "forest";
      nextSpecies = defaultSpecies.forest.map(s => {
        if (s.id === "grass" || s.id === "rabbits" || s.id === "deer") {
          return { ...s, active: true, initial_pop: s.id === "grass" ? 180 : s.id === "rabbits" ? 120 : 100 };
        }
        return { ...s, active: false };
      });
      nextLinkStrength = 1.0;
      nextCorridorY = null;
      nextControls = defaultControls;
      nextEutroph = false;
      nextWarming = 0.0;
      nextToxin = 0.0;
    } else if (labId === "rescue") {
      nextBiome = "forest";
      nextSpecies = defaultSpecies.forest.map(s => {
        if (s.id === "grass" || s.id === "rabbits" || s.id === "wolves") {
          return { ...s, active: true, initial_pop: s.initial_pop };
        }
        return { ...s, active: false };
      });
      nextLinkStrength = 1.0;
      nextCorridorY = null;
      nextControls = {
        rainfall: 250,
        temperature: 34,
        nitrogen: 20,
        co2: 420.0,
        relative_humidity: 65.0,
        light_intensity: 800.0,
      };
      nextEutroph = false;
      nextWarming = 0.0;
      nextToxin = 0.0;
    } else if (labId === "eutrophication") {
      nextBiome = "forest";
      nextSpecies = defaultSpecies.forest.map(s => {
        if (s.id === "grass" || s.id === "ferns" || s.id === "rabbits" || s.id === "deer") {
          return { ...s, active: true, initial_pop: s.id === "grass" ? 150 : s.id === "ferns" ? 100 : s.initial_pop };
        }
        return { ...s, active: false };
      });
      nextLinkStrength = 1.0;
      nextCorridorY = null;
      nextControls = defaultControls;
      nextEutroph = true;
      nextWarming = 0.0;
      nextToxin = 0.0;
    } else if (labId === "climate-toxins") {
      nextBiome = "forest";
      nextSpecies = defaultSpecies.forest.map(s => {
        if (s.id === "grass" || s.id === "rabbits" || s.id === "wolves") {
          return { ...s, active: true, initial_pop: s.initial_pop };
        }
        return { ...s, active: false };
      });
      nextLinkStrength = 1.0;
      nextCorridorY = null;
      nextControls = defaultControls;
      nextEutroph = false;
      nextWarming = 0.2;
      nextToxin = 0.1;
    } else if (labId === "physiology-wue") {
      nextBiome = "forest";
      nextSpecies = defaultSpecies.forest.map(s => {
        if (s.id === "grass") {
          return { ...s, active: true, photosynthetic_pathway: "C3" };
        }
        return { ...s, active: s.trophic_level === "Producer" };
      });
      setCurriculumTab("physiology");
      nextControls = {
        temperature: 34.0,
        co2: 420.0,
        relative_humidity: 40.0,
        light_intensity: 1200.0,
        rainfall: controls.rainfall,
        nitrogen: controls.nitrogen,
      };
      nextEutroph = false;
      nextWarming = 0.0;
      nextToxin = 0.0;
    } else if (labId === "lake-hysteresis") {
      nextBiome = "forest";
      setCurriculumTab("hysteresis");
      setHysteresisData([]);
    } else if (labId === "som-kinetics") {
      nextBiome = "forest";
      setCurriculumTab("biogeochem");
      nextControls = {
        rainfall: 800,
        temperature: 24,
        nitrogen: controls.nitrogen,
        co2: controls.co2,
        relative_humidity: controls.relative_humidity,
        light_intensity: controls.light_intensity,
      };
    }

    setBiome(nextBiome);
    setSpecies(nextSpecies);
    setLinkStrength(nextLinkStrength);
    setCorridorY(nextCorridorY);
    setControls(nextControls);
    setEutrophicationPulse(nextEutroph);
    setClimateWarmingRate(nextWarming);
    setToxinInfluxRate(nextToxin);
    setActivePreset("custom");

    if (labId !== "lake-hysteresis") {
      triggerSimulation(
        nextControls,
        nextBiome,
        nextSpecies,
        nextLinkStrength,
        nextCorridorY,
        "custom",
        nextEutroph,
        nextWarming,
        nextToxin
      );
    }
  };

  // Lab Success evaluations
  const labEvaluations = useMemo(() => {
    const finalPoint = timeline[timeline.length - 1];
    
    // Lab 1: May's Complexity Limit
    const activeCount = species.filter(s => s.active).length;
    const mayCond1 = activeCount >= 6;
    const mayCond2 = stability?.stable === true;
    const mayCond3 = linkStrength <= 0.6;
    const maySuccess = mayCond1 && mayCond2 && mayCond3;

    // Lab 2: Competitive Exclusion
    const rabbitActive = species.find(s => s.id === "rabbits")?.active ?? false;
    const deerActive = species.find(s => s.id === "deer")?.active ?? false;
    const finalRabbits = finalPoint?.populations?.["rabbits"] ?? 0;
    const finalDeer = finalPoint?.populations?.["deer"] ?? 0;
    const compCond1 = biome === "forest" && rabbitActive && deerActive;
    const compCond2 = finalRabbits < 5.0 || finalDeer < 5.0;
    const compSuccess = compCond1 && compCond2;

    // Lab 3: Metapopulation Rescue
    let rightConsumers = 0;
    if (finalPoint && finalPoint.cells) {
      finalPoint.cells.forEach(c => {
        if (c.x >= 5) {
          rightConsumers += ((c.populations?.["rabbits"] ?? 0) + (c.populations?.["wolves"] ?? 0));
        }
      });
    }
    const rescueCond1 = corridorY !== null;
    const rescueCond2 = rightConsumers > 10.0;
    const rescueSuccess = rescueCond1 && rescueCond2;

    // Lab 4: Eutrophication Dead Zones
    const eutrophPulse = eutrophicationPulse === true;
    let hadBloom = false;
    let hadHypoxia = false;
    timeline.forEach(pt => {
      pt.cells.forEach(c => {
        if (c.hypoxic) hadHypoxia = true;
        const prodSum = Object.entries(c.populations).filter(([spId]) => 
          species.find(s => s.id === spId)?.trophic_level === "Producer"
        ).reduce((sum, [_, v]) => sum + v, 0);
        if (prodSum > 400.0) hadBloom = true;
      });
    });
    const eutrophSuccess = eutrophPulse && hadBloom && hadHypoxia;

    // Lab 5: Climate Shifts & Biomagnification
    const isWarming = climateWarmingRate >= 0.15;
    const isToxic = toxinInfluxRate >= 0.08;
    let hadHighToxin = false;
    timeline.forEach(pt => {
      pt.cells.forEach(c => {
        if (c.toxin_concentration > 0.5) hadHighToxin = true;
      });
    });
    const climateSuccess = isWarming && isToxic && hadHighToxin;

    // Lab 6: Canopy Physiology & WUE
    const selectedPath = species.find(s => s.id === "grass")?.photosynthetic_pathway || "C3";
    const physCond1 = selectedPath === "C4" || selectedPath === "CAM";
    const physCond2 = controls.temperature >= 30.0;
    const physSuccess = physCond1 && physCond2;

    // Lab 7: Lake Hysteresis
    const hystCond1 = hysteresisData.length > 0;
    const hystSuccess = hystCond1;

    // Lab 8: Soil Carbon Kinetics
    const activeC = finalPoint?.cells?.length ? finalPoint.cells.reduce((sum, c) => sum + (c.som_active_c ?? 0), 0) / finalPoint.cells.length : 0;
    const slowC = finalPoint?.cells?.length ? finalPoint.cells.reduce((sum, c) => sum + (c.som_slow_c ?? 0), 0) / finalPoint.cells.length : 0;
    const soilCond1 = activeC > 5.0 || slowC > 15.0;
    const soilSuccess = soilCond1;

    return {
      may: { activeCount, cond1: mayCond1, cond2: mayCond2, cond3: mayCond3, success: maySuccess },
      comp: { cond1: compCond1, cond2: compCond2, success: compSuccess, finalRabbits, finalDeer },
      rescue: { cond1: rescueCond1, cond2: rescueCond2, success: rescueSuccess, rightConsumers },
      eutroph: { success: eutrophSuccess, pulse: eutrophPulse, bloom: hadBloom, hypoxia: hadHypoxia },
      climate: { success: climateSuccess, warming: isWarming, toxic: isToxic, bioconc: hadHighToxin },
      phys: { success: physSuccess, cond1: physCond1, cond2: physCond2, path: selectedPath },
      hyst: { success: hystSuccess, cond1: hystCond1 },
      soil: { success: soilSuccess, cond1: soilCond1, activeC, slowC }
    };
  }, [timeline, species, stability, linkStrength, biome, corridorY, eutrophicationPulse, climateWarmingRate, toxinInfluxRate, controls, hysteresisData]);

  const passedCount = Object.keys(quizPassed).filter(k => quizPassed[k] === true).length;
  const totalLabs = 8;

  const renderQuiz = (labId: string, questions: Array<{ q: string; opts: string[]; ans: number }>) => {
    const isSubmitted = quizSubmitted[labId] === true;
    const isPassed = quizPassed[labId] === true;
    const answers = quizAnswers[labId] || {};

    const handleSelect = (qIdx: number, oIdx: number) => {
      if (isSubmitted) return;
      const currentAnswers = quizAnswers[labId] || {};
      setQuizAnswers({
        ...quizAnswers,
        [labId]: {
          ...currentAnswers,
          [qIdx]: oIdx
        }
      });
    };

    const handleSubmitQuiz = () => {
      let correctCount = 0;
      questions.forEach((q, qIdx) => {
        if (answers[qIdx] === q.ans) correctCount++;
      });
      const passed = correctCount === questions.length;
      setQuizSubmitted({ ...quizSubmitted, [labId]: true });
      setQuizPassed({ ...quizPassed, [labId]: passed });
    };

    const handleResetQuiz = () => {
      setQuizAnswers({ ...quizAnswers, [labId]: {} });
      setQuizSubmitted({ ...quizSubmitted, [labId]: false });
      setQuizPassed({ ...quizPassed, [labId]: false });
    };

    return (
      <div className="space-y-4 bg-surface-soft border border-hairline p-3.5 rounded-lg mt-3">
        <div className="font-mono text-[9px] text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-hairline pb-1.5">
          <Activity className="size-3" /> Lab Assessment Quiz
        </div>
        {questions.map((q, qIdx) => {
          const selectedOption = answers[qIdx];
          return (
            <div key={qIdx} className="space-y-1.5">
              <div className="text-body-strong font-semibold text-xs leading-4">{qIdx + 1}. {q.q}</div>
              <div className="space-y-1">
                {q.opts.map((opt, oIdx) => {
                  const isCurrent = selectedOption === oIdx;
                  return (
                    <button
                      key={oIdx}
                      disabled={isSubmitted}
                      onClick={() => handleSelect(qIdx, oIdx)}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded border transition-all ${
                        isCurrent
                          ? isSubmitted
                            ? oIdx === q.ans
                              ? "bg-success/10 border-success/30 text-success"
                              : "bg-error/10 border-error/30 text-error"
                            : "bg-primary/10 border-primary/30 text-primary"
                          : "bg-surface-soft border-hairline text-muted hover:border-hairline-strong hover:text-ink"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!isSubmitted ? (
          <button
            onClick={handleSubmitQuiz}
            disabled={Object.keys(answers).length < questions.length}
            className={`w-full py-1.5 rounded font-mono text-xs uppercase tracking-wider transition-all border ${
              Object.keys(answers).length < questions.length
                ? "bg-primary-disabled text-muted border-hairline cursor-not-allowed opacity-50"
                : "bg-primary hover:bg-primary-active border-primary text-on-primary font-semibold"
            }`}
          >
            Submit Quiz
          </button>
        ) : (
          <div className="space-y-2">
            {isPassed ? (
              <div className="bg-accent-emerald/10 border border-accent-emerald/30 p-2.5 rounded text-accent-emerald text-xs font-mono text-center uppercase tracking-wider flex items-center justify-center gap-1.5 animate-pulse">
                <CheckCircle2 className="size-4 text-accent-emerald" /> Passed! Quiz Certified.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-accent-rose/10 border border-accent-rose/30 p-2.5 rounded text-accent-rose text-xs font-mono text-center uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <ShieldAlert className="size-4 text-accent-rose" /> Failed. Review and retry.
                </div>
                <button
                  onClick={handleResetQuiz}
                  className="w-full py-1.5 rounded bg-surface-card border border-hairline text-ink font-mono text-xs uppercase tracking-wider hover:bg-surface-elevated transition"
                >
                  Retry Quiz
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {selectedLab && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLab(null)}
            className="fixed inset-0 z-40 bg-black"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.35 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-hairline bg-canvas/95 p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between"
          >
            <div className="flex flex-col gap-6 overflow-y-auto flex-1 pr-1">
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="size-5 text-emerald-400" />
                  <span className="font-mono text-sm font-semibold text-body-strong">Lab Missions Drawer</span>
                </div>
                <button onClick={() => setSelectedLab(null)} className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-body-strong transition">
                  <X className="size-4" />
                </button>
              </div>

              {/* Lab Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-muted">Active Challenge</label>
                <select
                  value={selectedLab ?? "physiology-wue"}
                  onChange={(e) => {
                    const lab = e.target.value;
                    setSelectedLab(lab);
                    startLab(lab);
                  }}
                  className="w-full bg-canvas border border-hairline rounded p-2 text-sm text-primary font-mono focus:outline-none"
                >
                  <option value="may-stability">1. May's Complexity Limit</option>
                  <option value="competitive">2. Competitive Exclusion</option>
                  <option value="rescue">3. Metapopulation Rescue</option>
                  <option value="eutrophication">4. Eutrophication Dead Zones</option>
                  <option value="climate-toxins">5. Climate & Biomagnification</option>
                  <option value="physiology-wue">6. Canopy Physiology & WUE</option>
                  <option value="lake-hysteresis">7. Shallow Lake Hysteresis</option>
                  <option value="som-kinetics">8. Soil Carbon Kinetics</option>
                </select>
              </div>

              {/* Lab Details */}
              {selectedLab === "may-stability" && (
                <div className="space-y-4 text-body text-xs leading-5">
                  <div>
                    <h4 className="font-semibold text-sm text-cyan-200 mb-1">Robert May&apos;s Complexity Limit</h4>
                    <p className="opacity-90">
                      In 1972, Robert May mathematically proved that complex food webs (high species count S and connectance C) become unstable if interaction strength exceeds a threshold.
                    </p>
                  </div>

                  <div className="bg-surface-soft border border-hairline p-3 rounded space-y-2">
                    <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                    <p className="opacity-90">
                      Activate 6 or more species in the Temperate Forest, observe the instability, and reduce the link strength modifier to restore system stability.
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-hairline pt-3">
                    <div className="font-mono text-[10px] text-muted uppercase tracking-wider mb-2">Progress Checklist</div>
                    {[
                      [`Activate at least 6 species (${labEvaluations.may.activeCount}/6)`, labEvaluations.may.cond1],
                      ["Set Interspecific Link Strength <= 0.6", labEvaluations.may.cond3],
                      ["Coexistence stable (All Eigenvalues Re < 0)", labEvaluations.may.cond2],
                    ].map(([lbl, active], i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className={`size-4 ${active ? "text-success" : "text-muted-soft"}`} />
                        <span className={active ? "text-body-strong" : "text-muted"}>{lbl as string}</span>
                      </div>
                    ))}
                  </div>

                  {labEvaluations.may.success && (
                    <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                      🎉 Checklist completed! You can now take the assessment quiz below to earn your certification.
                    </div>
                  )}

                  {labEvaluations.may.success && renderQuiz("may-stability", [
                    {
                      q: "What happens to a complex food web as interspecific link strength increases?",
                      opts: [
                        "It stabilizes and reaches a higher equilibrium.",
                        "It destabilizes and causes population oscillations or extinctions.",
                        "Carrying capacity rises due to mutual assistance."
                      ],
                      ans: 1
                    },
                    {
                      q: "According to Robert May's stability theorem, what is the correct boundary condition?",
                      opts: [
                        "sigma * sqrt(S * C) < 1",
                        "S * C > 10",
                        "sigma * r_i > 1"
                      ],
                      ans: 0
                    },
                    {
                      q: "What type of interaction strengths are crucial for maintaining stability in highly connected webs?",
                      opts: [
                        "Extremely strong and dominant predator-prey couplings.",
                        "Weak interspecific links that cushion fluctuations.",
                        "Purely mutualistic interactions."
                      ],
                      ans: 1
                    }
                  ])}
                </div>
              )}

              {selectedLab === "competitive" && (
                <div className="space-y-4 text-body text-xs leading-5">
                  <div>
                    <h4 className="font-semibold text-sm text-cyan-200 mb-1">Competitive Exclusion Principle</h4>
                    <p className="opacity-90">
                      Gause&apos;s Law states that two species competing for the exact same limiting resource cannot coexist. One will eventually dominate, forcing the other to extinction.
                    </p>
                  </div>

                  <div className="bg-surface-soft border border-hairline p-3 rounded space-y-2">
                    <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                    <p className="opacity-90">
                      Observe Gause&apos;s Law. With both Rabbits and Deer active in the Temperate Forest, simulate their competition for grass until one species is driven to extinction.
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-hairline pt-3">
                    <div className="font-mono text-[10px] text-muted uppercase tracking-wider mb-2">Progress Checklist</div>
                    {[
                      ["Select Temperate Forest biome", biome === "forest"],
                      ["Activate both Rabbits and Deer", labEvaluations.comp.cond1],
                      ["Simulate competitive exclusion (Rabbits or Deer density < 5.0)", labEvaluations.comp.cond2],
                    ].map(([lbl, active], i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className={`size-4 ${active ? "text-success" : "text-muted-soft"}`} />
                        <span className={active ? "text-body-strong" : "text-muted"}>{lbl as string}</span>
                      </div>
                    ))}
                  </div>

                  {labEvaluations.comp.success && (
                    <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                      🎉 Checklist completed! You can now take the assessment quiz below to earn your certification.
                    </div>
                  )}

                  {labEvaluations.comp.success && renderQuiz("competitive", [
                    {
                      q: "What does Gause's Competitive Exclusion Principle state?",
                      opts: [
                        "Competitors always coexist in stable numbers.",
                        "Two species competing for the exact same limiting resource cannot coexist.",
                        "Predators always eliminate resource competition."
                      ],
                      ans: 1
                    },
                    {
                      q: "Under Liebig's Law of the Minimum, how is growth rate scaled?",
                      opts: [
                        "By the sum of all nutrients in the environment.",
                        "By the concentration of the scarcest limiting resource.",
                        "By the ambient temperature alone."
                      ],
                      ans: 1
                    },
                    {
                      q: "How can two competing species avoid exclusion in a natural setting?",
                      opts: [
                        "Niche differentiation or resource partitioning.",
                        "Sharing the exact same thermal optimum.",
                        "Increasing their intraspecific competition."
                      ],
                      ans: 0
                    }
                  ])}
                </div>
              )}

              {selectedLab === "rescue" && (
                <div className="space-y-4 text-body text-xs leading-5">
                  <div>
                    <h4 className="font-semibold text-sm text-cyan-200 mb-1">Source-Sink Metapopulations</h4>
                    <p className="opacity-90">
                      Metapopulations exist across fragmented patches. High-quality habitat &ldquo;sources&rdquo; supply excess individuals that disperse and rescue populations in low-quality &ldquo;sinks&rdquo; which would otherwise go extinct.
                    </p>
                  </div>

                  <div className="bg-surface-soft border border-hairline p-3 rounded space-y-2">
                    <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                    <p className="opacity-90">
                      The right-side sink of the grid (X &ge; 5) is separated by a highway barrier. Build a wildlife overpass (corridor) to rescue the sink from complete extinction.
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-hairline pt-3">
                    <div className="font-mono text-[10px] text-muted uppercase tracking-wider mb-2">Progress Checklist</div>
                    {[
                      ["Simulate dry/fragmented habitat", controls.rainfall < 400],
                      ["Place Wildlife Corridor (Click column 4 or 5 at any row)", labEvaluations.rescue.cond1],
                      ["Rescue sink consumers (Right-side consumers > 10.0)", labEvaluations.rescue.cond2],
                    ].map(([lbl, active], i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className={`size-4 ${active ? "text-success" : "text-muted-soft"}`} />
                        <span className={active ? "text-body-strong" : "text-muted"}>{lbl as string}</span>
                      </div>
                    ))}
                  </div>

                  {labEvaluations.rescue.success && (
                    <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                      🎉 Checklist completed! You can now take the assessment quiz below to earn your certification.
                    </div>
                  )}

                  {labEvaluations.rescue.success && renderQuiz("rescue", [
                    {
                      q: "In source-sink dynamics, how is a sink patch defined?",
                      opts: [
                        "A high-quality habitat with positive net reproduction.",
                        "A low-quality habitat where local mortality exceeds reproduction.",
                        "An isolated patch with zero migration."
                      ],
                      ans: 1
                    },
                    {
                      q: "What is the 'Rescue Effect' in metapopulation theory?",
                      opts: [
                        "Predators rescuing prey from starvation.",
                        "Immigration from a source patch preventing local extinction in a sink patch.",
                        "Human conservationists artificial feeding."
                      ],
                      ans: 1
                    },
                    {
                      q: "How do wildlife corridors influence metapopulation survival?",
                      opts: [
                        "By increasing fragmentation.",
                        "By restoring connectivity and enabling the rescue effect.",
                        "By raising predator efficiency."
                      ],
                      ans: 1
                    }
                  ])}
                </div>
              )}

              {selectedLab === "eutrophication" && (
                <div className="space-y-4 text-body text-xs leading-5">
                  <div>
                    <h4 className="font-semibold text-sm text-cyan-200 mb-1">4. Eutrophication & Hypoxic Dead Zones</h4>
                    <p className="opacity-90">
                      Agricultural nutrient runoff (N & P) causes explosions in primary producers (algal blooms). As this biomass dies, decomposers consume oxygen, creating hypoxic dead zones.
                    </p>
                  </div>

                  <div className="bg-surface-soft border border-hairline p-3 rounded space-y-2">
                    <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                    <p className="opacity-90">
                      Enable Eutrophication runoff. Run the simulation and observe the algal bloom in Year 1 followed by hypoxic dead zones (shaded cell overlays) and consumer suffocation.
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-hairline pt-3">
                    <div className="font-mono text-[10px] text-muted uppercase tracking-wider mb-2">Progress Checklist</div>
                    {[
                      ["Enable Eutrophication Pulse setting", labEvaluations.eutroph.pulse],
                      ["Observe primary producer bloom (>400 units in a cell)", labEvaluations.eutroph.bloom],
                      ["Detect hypoxic dead zones (flashing gray cells)", labEvaluations.eutroph.hypoxia],
                    ].map(([lbl, active], i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className={`size-4 ${active ? "text-success" : "text-muted-soft"}`} />
                        <span className={active ? "text-body-strong" : "text-muted"}>{lbl as string}</span>
                      </div>
                    ))}
                  </div>

                  {labEvaluations.eutroph.success && (
                    <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                      🎉 Checklist completed! You can now take the assessment quiz below to earn your certification.
                    </div>
                  )}

                  {labEvaluations.eutroph.success && renderQuiz("eutrophication", [
                    {
                      q: "What primary trigger initiates eutrophication in aquatic ecosystems?",
                      opts: [
                        "Heavy metal toxicity.",
                        "High Nitrogen and Phosphorus nutrient pulses from agricultural runoff.",
                        "Depletion of carbon dioxide."
                      ],
                      ans: 1
                    },
                    {
                      q: "What causes the hypoxia (oxygen depletion) in eutrophication dead zones?",
                      opts: [
                        "Algae breathing too much oxygen.",
                        "Microbial decomposers consuming oxygen as they break down dead algal blooms.",
                        "Direct evaporation of oxygen by heat."
                      ],
                      ans: 1
                    },
                    {
                      q: "What is the biological impact of hypoxic conditions on consumer species?",
                      opts: [
                        "They grow larger and reproduce faster.",
                        "They experience catastrophic mortality due to suffocation.",
                        "They switch to feeding on Nitrogen."
                      ],
                      ans: 1
                    }
                  ])}
                </div>
              )}

              {selectedLab === "climate-toxins" && (
                <div className="space-y-4 text-body text-xs leading-5">
                  <div>
                    <h4 className="font-semibold text-sm text-cyan-200 mb-1">5. Climate warming & Biomagnification</h4>
                    <p className="opacity-90">
                      Methylmercury (Hg) bioaccumulates in producers and biomagnifies up trophic levels. Climate warming drifts push species out of their thermal niche bounds.
                    </p>
                  </div>

                  <div className="bg-surface-soft border border-hairline p-3 rounded space-y-2">
                    <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                    <p className="opacity-90">
                      Trigger climate warming rate &ge; 0.2°C/yr and toxin influx &ge; 0.1 units/yr. Monitor bioaccumulation and observe the apex predator crash in later years.
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-hairline pt-3">
                    <div className="font-mono text-[10px] text-muted uppercase tracking-wider mb-2">Progress Checklist</div>
                    {[
                      ["Enable Climate Warming rate >= 0.2°C/yr", labEvaluations.climate.warming],
                      ["Set Toxin Influx rate >= 0.1 units/yr", labEvaluations.climate.toxic],
                      ["Accumulate toxin in cells (>0.5 units concentration)", labEvaluations.climate.bioconc],
                    ].map(([lbl, active], i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className={`size-4 ${active ? "text-success" : "text-muted-soft"}`} />
                        <span className={active ? "text-body-strong" : "text-muted"}>{lbl as string}</span>
                      </div>
                    ))}
                  </div>

                  {labEvaluations.climate.success && (
                    <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                      🎉 Checklist completed! You can now take the assessment quiz below to earn your certification.
                    </div>
                  )}

                  {labEvaluations.climate.success && renderQuiz("climate-toxins", [
                    {
                      q: "How does Methylmercury (Hg) accumulate and concentrate up a trophic food chain?",
                      opts: [
                        "It dissipates at each trophic step due to metabolic waste.",
                        "It bioaccumulates in producers and biomagnifies up trophic levels because consumers cannot excrete it.",
                        "It only affects plant roots."
                      ],
                      ans: 1
                    },
                    {
                      q: "Which trophic level experiences the highest concentration of toxic heavy metals?",
                      opts: [
                        "Primary producers.",
                        "Herbivores.",
                        "Apex predators."
                      ],
                      ans: 2
                    },
                    {
                      q: "How does climate warming affect species growth under Gaussian thermal niche models?",
                      opts: [
                        "It increases growth rates of all species uniformly.",
                        "It shifts temperature away from species optima, reducing fitness and survival.",
                        "It has no impact on growth."
                      ],
                      ans: 1
                    }
                  ])}
                </div>
              )}

              {selectedLab === "physiology-wue" && (
                <div className="space-y-4 text-body text-xs leading-5">
                  <div>
                    <h4 className="font-semibold text-sm text-cyan-200 mb-1">Canopy Physiology & WUE</h4>
                    <p className="opacity-90">
                      Plants adapt to drought/heat by choosing C4 or CAM pathways. This optimizes stomatal conductance and water-use efficiency (WUE).
                    </p>
                  </div>

                  <div className="bg-surface-soft border border-hairline p-3 rounded space-y-2">
                    <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                    <p className="opacity-90">
                      Set Wild Grass photosynthetic pathway to C4 or CAM under temperature &gt;= 30°C to restrict stomatal conductance water loss.
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-hairline pt-3">
                    <div className="font-mono text-[10px] text-muted uppercase tracking-wider mb-2">Progress Checklist</div>
                    {[
                      ["Select C4 or CAM pathway for Wild Grass", labEvaluations.phys.cond1],
                      ["Ensure Temperature is >= 30.0°C", labEvaluations.phys.cond2],
                    ].map(([lbl, active], i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className={`size-4 ${active ? "text-success" : "text-muted-soft"}`} />
                        <span className={active ? "text-body-strong" : "text-muted"}>{lbl as string}</span>
                      </div>
                    ))}
                  </div>

                  {labEvaluations.phys.success && (
                    <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                      🎉 Checklist completed! Take the quiz below to pass the physiology course.
                    </div>
                  )}

                  {labEvaluations.phys.success && renderQuiz("physiology-wue", [
                    {
                      q: "What is the main physiological advantage of the C4 photosynthetic pathway over C3 under high temperature?",
                      opts: [
                        "C4 plants concentrate CO2 around RuBisCO, minimizing photorespiration and saving water.",
                        "C4 plants open stomata only at night.",
                        "C4 plants do not require sunlight."
                      ],
                      ans: 0
                    },
                    {
                      q: "How is Water-Use Efficiency (WUE) defined at the leaf level?",
                      opts: [
                        "Ratio of transpiration rate to root respiration.",
                        "Ratio of net carbon assimilation (A_net) to stomatal conductance (gs) water loss.",
                        "Total volume of water stored in vacuoles."
                      ],
                      ans: 1
                    }
                  ])}
                </div>
              )}

              {selectedLab === "lake-hysteresis" && (
                <div className="space-y-4 text-body text-xs leading-5">
                  <div>
                    <h4 className="font-semibold text-sm text-cyan-200 mb-1">Shallow Lake Hysteresis & Alternative Stable States</h4>
                    <p className="opacity-90">
                      Shallow lakes shift between oligotrophic (clear water, macrophytes) and eutrophic (turbid water, algae) states. Restoring the clear state requires reducing nutrients far below the initial trigger threshold.
                    </p>
                  </div>

                  <div className="bg-surface-soft border border-hairline p-3 rounded space-y-2">
                    <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                    <p className="opacity-90">
                      Run the Hysteresis batch scan using the simulation controllers to trace the forward and backward transition curves.
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-hairline pt-3">
                    <div className="font-mono text-[10px] text-muted uppercase tracking-wider mb-2">Progress Checklist</div>
                    {[
                      ["Execute Hysteresis simulation sweep", labEvaluations.hyst.cond1],
                    ].map(([lbl, active], i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className={`size-4 ${active ? "text-success" : "text-muted-soft"}`} />
                        <span className={active ? "text-body-strong" : "text-muted"}>{lbl as string}</span>
                      </div>
                    ))}
                  </div>

                  {labEvaluations.hyst.success && (
                    <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                      🎉 Checklist completed! Take the quiz below to pass the hysteresis course.
                    </div>
                  )}

                  {labEvaluations.hyst.success && renderQuiz("lake-hysteresis", [
                    {
                      q: "What does 'Hysteresis' mean in alternative stable states theory?",
                      opts: [
                        "The forward and backward transition thresholds between states are identical.",
                        "The state of the system depends on its history, and critical transitions occur at different thresholds.",
                        "Extinction of predators is irreversible."
                      ],
                      ans: 1
                    },
                    {
                      q: "What ecological feedback maintains the turbid water state in shallow lakes?",
                      opts: [
                        "Macrophytes locking up nutrients.",
                        "Algal blooms shading out benthic light, preventing macrophyte growth, and wind resuspending phosphorus.",
                        "Predator fish eating phytoplankton."
                      ],
                      ans: 1
                    }
                  ])}
                </div>
              )}

              {selectedLab === "som-kinetics" && (
                <div className="space-y-4 text-body text-xs leading-5">
                  <div>
                    <h4 className="font-semibold text-sm text-cyan-200 mb-1">Soil Carbon Multi-Pool Kinetics</h4>
                    <p className="opacity-90">
                      Decomposition cycles organic carbon through labile (active), slow, and passive pools under microbial stoichiometry.
                    </p>
                  </div>

                  <div className="bg-surface-soft border border-hairline p-3 rounded space-y-2">
                    <div className="font-mono text-[10px] text-cyan-400 uppercase tracking-wider">Mission Target</div>
                    <p className="opacity-90">
                      Simulate the decomposition loop and accumulate active or slow soil organic carbon in cells.
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-hairline pt-3">
                    <div className="font-mono text-[10px] text-muted uppercase tracking-wider mb-2">Progress Checklist</div>
                    {[
                      [`Accumulate Active/Slow soil carbon pools (>15 total units avg)`, labEvaluations.soil.cond1],
                    ].map(([lbl, active], i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className={`size-4 ${active ? "text-success" : "text-muted-soft"}`} />
                        <span className={active ? "text-body-strong" : "text-muted"}>{lbl as string}</span>
                      </div>
                    ))}
                  </div>

                  {labEvaluations.soil.success && (
                    <div className="bg-emerald-500/10 border border-emerald-400/30 p-3 rounded text-emerald-300 font-mono text-[10px] uppercase tracking-wider">
                      🎉 Checklist completed! Take the quiz below to pass the soil biogeochemistry course.
                    </div>
                  )}

                  {labEvaluations.soil.success && renderQuiz("som-kinetics", [
                    {
                      q: "In Century-style models, which pool has the fastest decay rate?",
                      opts: [
                        "Active/Labile Pool",
                        "Slow/Cellular Pool",
                        "Passive/Recalcitrant Pool"
                      ],
                      ans: 0
                    },
                    {
                      q: "Under what condition is Denitrification enhanced?",
                      opts: [
                        "High oxygen concentrations.",
                        "Saturated, anoxic/hypoxic soils.",
                        "Very low temperature."
                      ],
                      ans: 1
                    }
                  ])}
                </div>
              )}

              {passedCount === 8 && (
                <div className="bg-emerald-500/15 border border-emerald-400/40 p-3.5 rounded-lg text-emerald-300 font-mono text-[10px] uppercase tracking-wider text-center flex flex-col gap-2 mt-4">
                  <span>🎓 All labs certified! Curriculum Complete!</span>
                  <button 
                    onClick={() => {
                      alert("🎓 ECOCHAIN-AI LMS CERTIFICATE OF COMPLETION\n\nStudent has successfully passed all university-level ecology laboratory examinations:\n1. Complexity Limit & Stability Theory (Certified)\n2. Competitive Exclusion Principle (Certified)\n3. Metapopulation Rescue Effect (Certified)\n4. Eutrophication & Hypoxic Dead Zones (Certified)\n5. Climate Shifts & Biomagnification (Certified)\n6. Canopy Physiology & Water Use Efficiency (Certified)\n7. Shallow Lake Phosphorus Hysteresis (Certified)\n8. Soil Organic Carbon Kinetics (Certified)\n\nGPA: 4.0 / 4.0\nEcosystemAI Registrar.");
                    }}
                    className="px-2 py-1 bg-success text-canvas font-bold hover:bg-emerald-400 rounded transition"
                  >
                    Download Transcript
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-hairline pt-4 flex gap-2">
              <button
                onClick={() => startLab(selectedLab)}
                className="flex-1 text-center font-mono text-xs uppercase tracking-wider border border-hairline hover:border-primary/45 rounded py-2 hover:bg-surface-elevated text-body transition"
              >
                Restart Mission
              </button>
              <button
                onClick={() => setSelectedLab(null)}
                className="flex-1 text-center font-mono text-xs uppercase tracking-wider bg-canvas border border-hairline rounded py-2 text-muted hover:text-body transition"
              >
                Close Drawer
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
