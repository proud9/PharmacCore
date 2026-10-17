"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SalesChart({ data }: { data: { day: string; total: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16554c" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#16554c" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#12211f14" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #12211f22" }}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, "Sales"]}
          />
          <Area type="monotone" dataKey="total" stroke="#0f3d37" fill="url(#salesFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
