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

  return (
    <div className="w-full h-full min-h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={timeline}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="year" stroke="#64748b" tickLine={false} tick={{ fontSize: 11 }} />
          <YAxis stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          
          {activeSpecies.map((sp, sIdx) => (
            <Line
              key={sp.id}
              type="monotone"
              dataKey={`populations.${sp.id}`}
              name={sp.name}
              stroke={`hsl(${sIdx * 45}, 70%, 55%)`}
              strokeWidth={2.5}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
