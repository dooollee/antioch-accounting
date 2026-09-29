'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatWon } from '@/lib/utils/dataHelpers';

const shortWon = (n: number) => (n >= 10000 ? `${(n / 10000).toLocaleString('ko-KR')}만` : n.toLocaleString('ko-KR'));

export const INCOME_COLOR = '#1e40af';
export const EXPENSE_COLOR = '#ea580c';

export function FinanceChart({ data }: { data: { name: string; income: number; expense: number }[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-700">월별 수입 · 지출</h3>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis
              width={52}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => shortWon(Number(v))}
            />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              formatter={(v) => formatWon(Number(v))}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
            />
            <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="income" name="수입" fill={INCOME_COLOR} radius={[3, 3, 0, 0]} maxBarSize={16} />
            <Bar dataKey="expense" name="지출" fill={EXPENSE_COLOR} radius={[3, 3, 0, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
