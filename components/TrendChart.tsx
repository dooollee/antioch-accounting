'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface TrendChartProps {
  title: string;
  data: { name: string; value: number }[];
  highlight: number;
  format: (v: number) => string;
  domain?: [number, number];
}

export function TrendChart({ title, data, highlight, format, domain }: TrendChartProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <div className="mt-4 h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis
              domain={domain}
              width={52}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => format(Number(v))}
            />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              formatter={(v) => [format(Number(v)), title]}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
            />
            <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={28}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === highlight ? '#1e40af' : '#93c5fd'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
