"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X, ChevronRight, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface DemoStep {
  id: string;
  title: string;
  description: string;
  targetId: string; // data-demo-id value
  /** Optional: called when this step becomes active */
  onActivate?: () => void;
  /** Preferred tooltip side: top | bottom | left | right */
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

const PADDING = 12; // spotlight padding around element

export function DemoTour({ steps, onClose }: DemoTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const scrollRef = useRef<number>(0);

  const step = steps[currentStep];

  const measureTarget = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-demo-id="${step.targetId}"]`) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }

    // Scroll the element into view smoothly
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // Small delay to allow scroll to settle before measuring
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      const spotlight: SpotlightRect = {
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      };
      setRect(spotlight);

      // Compute tooltip position
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

  // Fire onActivate and measure whenever step changes
  useEffect(() => {
    if (!step) return;
    step.onActivate?.();
    // Allow state changes from onActivate to render first
    const t = setTimeout(measureTarget, 200);
    return () => clearTimeout(t);
  }, [currentStep, step, measureTarget]);

  // Remeasure on window resize
  useEffect(() => {
    window.addEventListener("resize", measureTarget);
    return () => window.removeEventListener("resize", measureTarget);
  }, [measureTarget]);

  // D key exits tour
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

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
      {/* Full-screen backdrop with spotlight cutout */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        {rect ? (
          <>
            {/* Top band */}
            <div
              className="absolute bg-black/75 backdrop-blur-[1px]"
              style={{ top: 0, left: 0, right: 0, height: rect.top }}
            />
            {/* Bottom band */}
            <div
              className="absolute bg-black/75 backdrop-blur-[1px]"
              style={{ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }}
            />
            {/* Left band */}
            <div
              className="absolute bg-black/75 backdrop-blur-[1px]"
              style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }}
            />
            {/* Right band */}
            <div
              className="absolute bg-black/75 backdrop-blur-[1px]"
              style={{
                top: rect.top,
                left: rect.left + rect.width,
                right: 0,
                height: rect.height,
              }}
            />
            {/* Spotlight border ring */}
            <div
              className="absolute rounded-xl pointer-events-none"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                boxShadow: "0 0 0 2px #faff69, 0 0 24px 4px rgba(250,255,105,0.18)",
              }}
            />
          </>
        ) : (
          /* Fallback: full dark overlay if element not found */
          <div className="absolute inset-0 bg-black/75 backdrop-blur-[1px]" />
        )}
      </div>

      {/* Click-through interceptor — enables clicking Next but blocks other clicks */}
      <div className="fixed inset-0 z-[9997]" onClick={(e) => e.stopPropagation()} />

      {/* Tooltip card */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="fixed z-[9999] w-[320px]"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        <div className="rounded-xl border border-[#faff69]/30 bg-[#111111] p-4 shadow-2xl shadow-black/60">
          {/* Step counter + close */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="size-3 text-[#faff69]" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#faff69]">
                Step {currentStep + 1} / {steps.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-white/10 text-[#888] hover:text-white transition"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-[2px] bg-[#222] rounded-full mb-3 overflow-hidden">
            <motion.div
              className="h-full bg-[#faff69] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>

          <h3 className="text-sm font-semibold text-white mb-1.5">{step?.title}</h3>
          <p className="text-[11px] text-[#aaa] leading-[1.6] font-mono">{step?.description}</p>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            {/* Dot indicators */}
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === currentStep ? 16 : 5,
                    height: 5,
                    background: i === currentStep ? "#faff69" : "#333",
                  }}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#faff69] text-[#0a0a0a] font-mono text-[11px] font-bold uppercase tracking-wider hover:bg-[#f0f050] transition"
            >
              {isLast ? "Finish" : "Next"}
              {!isLast && <ChevronRight className="size-3.5" />}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Skip button — always bottom right */}
      <div className="fixed bottom-5 right-5 z-[9999]">
        <button
          onClick={onClose}
          className="text-[#555] hover:text-[#888] font-mono text-[10px] uppercase tracking-wider transition"
        >
          Skip Tour
        </button>
      </div>
    </AnimatePresence>
  );
}
