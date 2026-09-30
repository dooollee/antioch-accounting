'use client';

import { useState } from 'react';
import { Header, MonthSelect } from '@/components/Header';
import { FinanceChart } from '@/components/FinanceChart';
import { MonthReportCard } from '@/components/MonthReportCard';
import {
  CONFIG,
  CategoryAmount,
  FISCAL_MONTHS,
  TX_LABEL,
  Transaction,
  buildMonthlyReports,
  formatWon,
  getCurrentFiscalMonthIndex,
  signedWon,
} from '@/lib/utils/dataHelpers';

interface FinanceViewProps {
  dues: number[]; // 회계월별 회비 수입 (12개)
  transactions: Transaction[];
  carryover: number;
}

export function FinanceView({ dues, transactions, carryover }: FinanceViewProps) {
  const [monthIndex, setMonthIndex] = useState(getCurrentFiscalMonthIndex);
  const reports = buildMonthlyReports(dues, transactions, carryover);
  const r = reports[monthIndex];
  const m = FISCAL_MONTHS[monthIndex];

  // 연간 합계 (11월 ~ 10월)
  const yearIncome = mergeCategories(reports.map((x) => x.income));
  const yearExpense = mergeCategories(reports.map((x) => x.expense));
  const yearIncomeTotal = yearIncome.reduce((s, c) => s + c.amount, 0);
  const yearExpenseTotal = yearExpense.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-6">
      <Header
        title="수입 · 지출"
        description={`${CONFIG.year} 회계연도 (11월 ~ 10월) · 전년도 이월금 ${signedWon(carryover)}`}
      />

      <section className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">연간 합계</h2>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="총 수입" value={formatWon(yearIncomeTotal)} />
          <Stat label="총 지출" value={formatWon(yearExpenseTotal)} />
          <Stat
            label="올해 남은 금액"
            value={signedWon(yearIncomeTotal - yearExpenseTotal)}
            negative={yearIncomeTotal < yearExpenseTotal}
            sub="총 수입 − 총 지출"
          />
          <Stat
            label="현재 잔액"
            value={signedWon(reports[reports.length - 1].closing)}
            negative={reports[reports.length - 1].closing < 0}
            sub={`전년도 이월금 ${signedWon(carryover)} 포함`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CategoryTable title="항목별 수입" items={yearIncome} total={yearIncomeTotal} barClass="bg-blue-700" />
          <CategoryTable title="항목별 지출" items={yearExpense} total={yearExpenseTotal} barClass="bg-orange-600" />
        </div>
      </section>

      <div className="flex items-end justify-between gap-2 border-t border-slate-200 pt-8">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">월별 결산</h2>
        <MonthSelect value={monthIndex} onChange={setMonthIndex} />
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={monthIndex === 0 ? '전년도 이월금' : '전월 잔액'} value={signedWon(r.opening)} />
        <Stat label={`${m}월 수입`} value={formatWon(r.incomeTotal)} />
        <Stat label={`${m}월 지출`} value={formatWon(r.expenseTotal)} />
        <Stat label={`${m}월 말 잔액`} value={signedWon(r.closing)} negative={r.closing < 0} />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[24rem_1fr]">
        <MonthReportCard report={r} monthIndex={monthIndex} />

        <div className="space-y-4">
          <FinanceChart
            data={reports.map((x, i) => ({ name: `${FISCAL_MONTHS[i]}월`, income: x.incomeTotal, expense: x.expenseTotal }))}
          />

          <div className="rounded-xl border border-slate-200 bg-white">
            <h3 className="border-b border-slate-200 px-5 py-4 text-sm font-semibold text-slate-700">{m}월 상세 내역</h3>
            {r.items.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                {r.incomeTotal > 0 ? '회비 외 입력된 내역이 없습니다.' : '입력된 내역이 없습니다.'}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {r.items.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <TypeBadge type={t.type} />
                    <span className="shrink-0 text-slate-800">{t.category}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-500">{t.description}</span>
                    <span className="tabular-nums text-slate-900">
                      {t.type === 'expense' ? '-' : '+'}
                      {formatWon(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-5 py-3 text-left font-medium">월</th>
              <th className="px-3 py-3 text-right font-medium">전월 잔액</th>
              <th className="px-3 py-3 text-right font-medium">수입</th>
              <th className="px-3 py-3 text-right font-medium">지출</th>
              <th className="px-5 py-3 text-right font-medium">월말 잔액</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 whitespace-nowrap tabular-nums">
            {reports.map((x, i) => (
              <tr
                key={i}
                onClick={() => setMonthIndex(i)}
                className={`cursor-pointer ${i === monthIndex ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                <td className="px-5 py-2 text-slate-600">{FISCAL_MONTHS[i]}월</td>
                <td className="px-3 py-2 text-right text-slate-500">{signedWon(x.opening)}</td>
                <td className="px-3 py-2 text-right">{formatWon(x.incomeTotal)}</td>
                <td className="px-3 py-2 text-right">{formatWon(x.expenseTotal)}</td>
                <td className={`px-5 py-2 text-right font-medium ${x.closing < 0 ? 'text-orange-700' : ''}`}>
                  {signedWon(x.closing)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 월별 항목 목록을 합쳐 연간 항목별 합계로 (금액 큰 순)
function mergeCategories(lists: CategoryAmount[][]): CategoryAmount[] {
  const map = new Map<string, number>();
  for (const c of lists.flat()) map.set(c.category, (map.get(c.category) ?? 0) + c.amount);
  return [...map].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

function CategoryTable({
  title,
  items,
  total,
  barClass,
}: {
  title: string;
  items: CategoryAmount[];
  total: number;
  barClass: string;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
      <h3 className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-700">{title}</h3>
      {items.length === 0 ? (
        <p className="py-10 text-center text-slate-500">내역이 없습니다.</p>
      ) : (
        <table className="w-full">
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {items.map((c) => {
              const pct = total > 0 ? Math.round((c.amount / total) * 100) : 0;
              return (
                <tr key={c.category}>
                  <td className="w-28 px-5 py-2.5 text-slate-700">{c.category}</td>
                  <td className="px-2 py-2.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full ${barClass}`} style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="w-12 py-2.5 text-right text-xs text-slate-500">{pct}%</td>
                  <td className="w-32 px-5 py-2.5 text-right text-slate-900">{formatWon(c.amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {/* 합계는 카드 맨 아래에 고정 → 나란한 두 표의 합계 위치가 같아짐 */}
      <div className="mt-auto flex justify-between border-t border-slate-200 bg-slate-50 px-5 py-2.5 font-semibold tabular-nums">
        <span>합계</span>
        <span>{formatWon(total)}</span>
      </div>
    </div>
  );
}

export function TypeBadge({ type }: { type: Transaction['type'] }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
        type === 'income' ? 'bg-blue-50 text-blue-800' : 'bg-orange-50 text-orange-800'
      }`}
    >
      {TX_LABEL[type]}
    </span>
  );
}

function Stat({ label, value, negative, sub }: { label: string; value: string; negative?: boolean; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums tracking-tight sm:text-2xl ${negative ? 'text-orange-700' : 'text-slate-900'}`}>
        {value}
      </p>
      {sub && <p className="mt-2 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
