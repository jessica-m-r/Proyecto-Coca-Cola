"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Stage = { etapa: string; personas: number; pct: number };

export function FunnelChart({ data }: { data: Stage[] }) {
  return (
    <div className="h-80 w-full rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="etapa"
            width={150}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number, _name, item) => [
              `${value} personas (${item.payload.pct}%)`,
              "Total",
            ]}
          />
          <Bar dataKey="personas" fill="#F40009" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
