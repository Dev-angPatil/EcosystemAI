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
