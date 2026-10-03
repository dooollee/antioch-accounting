'use client';

import { useEffect, useRef, useState } from 'react';
import { Header, MonthSelect, Segmented } from '@/components/Header';
import { MonthReportCard } from '@/components/MonthReportCard';
import { TypeBadge } from '@/components/FinanceView';
import { api, errorText, useMembers } from '@/lib/useMembers';
import {
  CONFIG,
  DUES_CATEGORY,
  FISCAL_MONTHS,
  FIXED_EXPENSES_KEY,
  FixedExpense,
  Transaction,
  TxType,
  buildMonthlyReports,
  buildMonthlyStats,
  carryoverKey,
  formatWon,
  getCurrentFiscalMonthIndex,
  parseFixedExpenses,
  signedWon,
} from '@/lib/utils/dataHelpers';

// id 가 있으면 수정 중
type TxForm = { id?: number; type: TxType; category: string; description: string; amount: string };
const emptyForm = (type: TxType = 'expense'): TxForm => ({ type, category: '', description: '', amount: '' });

const TYPES: { value: TxType; label: string }[] = [
  { value: 'income', label: '수입' },
  { value: 'expense', label: '지출' },
];

const inputClass = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900';
const toDigits = (v: string, allowMinus = false) => {
  const minus = allowMinus && v.trim().startsWith('-');
  const digits = v.replace(/[^0-9]/g, '');
  return digits ? `${minus ? '-' : ''}${Number(digits).toLocaleString('ko-KR')}` : minus ? '-' : '';
};
const parseAmount = (v: string) => Number(v.replace(/[^0-9-]/g, '')) || 0;

export default function FinanceAdminPage() {
  const { members, isLoading: membersLoading } = useMembers();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [carryover, setCarryover] = useState(0);
  const [carryoverInput, setCarryoverInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [monthIndex, setMonthIndex] = useState(getCurrentFiscalMonthIndex);
  const [form, setForm] = useState<TxForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [applyingFixed, setApplyingFixed] = useState(false);
  const categoryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([api('/api/transactions', 'GET'), api('/api/settings', 'GET')])
      .then(([tx, s]) => {
        setTransactions(tx.transactions);
        const c = Number(s.settings?.[carryoverKey(CONFIG.year)] ?? 0) || 0;
        setCarryover(c);
        setCarryoverInput(c ? c.toLocaleString('ko-KR') : '');
        setFixedExpenses(parseFixedExpenses(s.settings?.[FIXED_EXPENSES_KEY] ?? '[]') ?? []);
      })
      .catch((e) => setLoadError(errorText(e)))
      .finally(() => setIsLoading(false));
  }, []);

  const dues = buildMonthlyStats(members).map((m) => m.total.revenue);
  const reports = buildMonthlyReports(dues, transactions, carryover);
  const monthItems = reports[monthIndex].items;
  const categories = [
    ...new Set([...transactions.filter((t) => t.type === form.type).map((t) => t.category)]),
  ].sort((a, b) => a.localeCompare(b, 'ko'));
  const m = FISCAL_MONTHS[monthIndex];

  const saveCarryover = async () => {
    const value = parseAmount(carryoverInput);
    try {
      await api('/api/settings', 'PUT', { key: carryoverKey(CONFIG.year), value: String(value) });
      setCarryover(value);
      setCarryoverInput(value ? value.toLocaleString('ko-KR') : '');
    } catch (e) {
      alert(`이월금 저장에 실패했습니다.\n${errorText(e)}`);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseAmount(form.amount);
    if (!form.category.trim()) return alert('항목을 입력해주세요.');
    if (amount <= 0) return alert('금액을 입력해주세요.');

    const payload = { type: form.type, category: form.category, description: form.description, amount, month_index: monthIndex };
    setSaving(true);
    try {
      if (form.id) {
        const { transaction } = await api('/api/transactions', 'PATCH', { id: form.id, ...payload });
        setTransactions((prev) => prev.map((t) => (t.id === form.id ? transaction : t)));
      } else {
        const { transaction } = await api('/api/transactions', 'POST', payload);
        setTransactions((prev) => [...prev, transaction]);
      }
      setForm(emptyForm(form.type));
      categoryRef.current?.focus();
    } catch (err) {
      alert(`저장에 실패했습니다.\n${errorText(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const saveFixedExpenses = async (list: FixedExpense[]) => {
    try {
      await api('/api/settings', 'PUT', { key: FIXED_EXPENSES_KEY, value: JSON.stringify(list) });
      setFixedExpenses(list);
      return true;
    } catch (e) {
      alert(`고정지출 저장에 실패했습니다.
${errorText(e)}`);
      return false;
    }
  };

  // 이 달에 아직 없는 고정지출만 추가 (같은 항목·내용·금액이 이미 있으면 건너뜀)
  const isFixedInMonth = (f: FixedExpense) =>
    monthItems.some(
      (t) => t.type === 'expense' && t.category === f.category && (t.description ?? '') === f.description && t.amount === f.amount
    );
  const pendingFixed = fixedExpenses.filter((f) => !isFixedInMonth(f));

  const applyFixedExpenses = async () => {
    setApplyingFixed(true);
    try {
      for (const f of pendingFixed) {
        const { transaction } = await api('/api/transactions', 'POST', { type: 'expense', ...f, month_index: monthIndex });
        setTransactions((prev) => [...prev, transaction]);
      }
    } catch (e) {
      alert(`고정지출 추가 중 실패했습니다.
${errorText(e)}`);
    } finally {
      setApplyingFixed(false);
    }
  };

  const remove = async (t: Transaction) => {
    if (!window.confirm(`'${t.category} ${formatWon(t.amount)}' 내역을 삭제할까요?`)) return;
    try {
      await api('/api/transactions', 'DELETE', { id: t.id });
      setTransactions((prev) => prev.filter((x) => x.id !== t.id));
      if (form.id === t.id) setForm(emptyForm(form.type));
    } catch (err) {
      alert(`삭제에 실패했습니다.\n${errorText(err)}`);
    }
  };

  if (isLoading || membersLoading) return <p className="py-20 text-center text-sm text-slate-500">불러오는 중</p>;
  if (loadError) return <p className="py-20 text-center text-sm text-red-600">{loadError}</p>;

  return (
    <div className="space-y-6">
      <Header title="수입 · 지출 입력" description="회비는 회계 장부에서 자동 집계됩니다. 그 외 수입과 지출을 월별로 기록하세요.">
        <MonthSelect
          value={monthIndex}
          onChange={(i) => {
            setMonthIndex(i);
            setForm(emptyForm(form.type));
          }}
        />
      </Header>

      {monthIndex === 0 && (
        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm">
          <span className="font-medium text-slate-700">{CONFIG.year} 회계연도 전년도 이월금</span>
          <input
            inputMode="numeric"
            placeholder="0"
            value={carryoverInput}
            onChange={(e) => setCarryoverInput(toDigits(e.target.value, true))}
            onKeyDown={(e) => e.key === 'Enter' && saveCarryover()}
            className="w-40 rounded-md border border-slate-300 px-3 py-1.5 text-right tabular-nums outline-none focus:border-slate-900"
          />
          <span className="text-slate-500">원</span>
          <button
            onClick={saveCarryover}
            disabled={parseAmount(carryoverInput) === carryover}
            className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700 disabled:opacity-40"
          >
            저장
          </button>
          <span className="text-xs text-slate-500">11월의 전월 잔액으로 들어갑니다.</span>
        </section>
      )}

      <FixedExpensesPanel list={fixedExpenses} onSave={saveFixedExpenses} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-700">{form.id ? `${m}월 내역 수정` : `${m}월 내역 추가`}</h3>
              <Segmented options={TYPES} value={form.type} onChange={(type) => setForm({ ...form, type })} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[9rem_1fr_8rem]">
              <input
                ref={categoryRef}
                list="tx-categories"
                placeholder={form.type === 'income' ? '항목 (예: 헌금)' : '항목 (예: 간식비)'}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
              />
              <datalist id="tx-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <input
                placeholder="내용 (선택)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputClass}
              />
              <input
                inputMode="numeric"
                placeholder="금액"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: toDigits(e.target.value) })}
                className={`${inputClass} text-right tabular-nums`}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                내용은 공개 페이지에도 보입니다.
                {form.type === 'income' && form.category.trim() === DUES_CATEGORY && (
                  <span className="text-orange-700"> 회비는 자동 집계되니 중복 입력에 주의하세요.</span>
                )}
              </p>
              <div className="flex gap-2">
                {form.id && (
                  <button
                    type="button"
                    onClick={() => setForm(emptyForm(form.type))}
                    className="rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200"
                  >
                    취소
                  </button>
                )}
                <button
                  disabled={saving}
                  className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {form.id ? '저장' : '추가'}
                </button>
              </div>
            </div>
          </form>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-700">{m}월 입력 내역</h3>
              {fixedExpenses.length > 0 &&
                (pendingFixed.length > 0 ? (
                  <button
                    onClick={applyFixedExpenses}
                    disabled={applyingFixed}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-500 disabled:opacity-50"
                  >
                    {applyingFixed ? '추가 중' : `고정지출 넣기 (${pendingFixed.length}건)`}
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">고정지출 반영됨</span>
                ))}
            </div>
            <ul className="divide-y divide-slate-100 text-sm">
              {dues[monthIndex] > 0 && (
                <li className="flex items-center gap-3 px-5 py-3 text-slate-500">
                  <TypeBadge type="income" />
                  <span className="shrink-0">{DUES_CATEGORY}</span>
                  <span className="min-w-0 flex-1 truncate text-xs">회계 장부 자동 집계</span>
                  <span className="tabular-nums">+{formatWon(dues[monthIndex])}</span>
                  <span className="w-16" />
                </li>
              )}
              {monthItems.map((t) => (
                <li key={t.id} className={`flex items-center gap-3 px-5 py-3 ${form.id === t.id ? 'bg-blue-50' : ''}`}>
                  <TypeBadge type={t.type} />
                  <span className="shrink-0 text-slate-800">{t.category}</span>
                  <span className="min-w-0 flex-1 truncate text-slate-500">{t.description}</span>
                  <span className="tabular-nums font-medium text-slate-900">
                    {t.type === 'expense' ? '-' : '+'}
                    {formatWon(t.amount)}
                  </span>
                  <span className="flex w-16 justify-end gap-2">
                    <button
                      onClick={() =>
                        setForm({
                          id: t.id,
                          type: t.type,
                          category: t.category,
                          description: t.description ?? '',
                          amount: t.amount.toLocaleString('ko-KR'),
                        })
                      }
                      className="text-slate-500 hover:text-slate-900 hover:underline"
                    >
                      수정
                    </button>
                    <button onClick={() => remove(t)} className="text-red-600 hover:underline">
                      삭제
                    </button>
                  </span>
                </li>
              ))}
              {monthItems.length === 0 && dues[monthIndex] === 0 && (
                <li className="py-12 text-center text-slate-500">입력된 내역이 없습니다.</li>
              )}
            </ul>
          </section>
        </div>

        <div className="space-y-2">
          <MonthReportCard report={reports[monthIndex]} monthIndex={monthIndex} />
          <p className="px-1 text-xs text-slate-500">
            10월 말(회계연도 말) 잔액 {signedWon(reports[reports.length - 1].closing)} · 현재 입력 기준
          </p>
        </div>
      </div>
    </div>
  );
}

function FixedExpensesPanel({ list, onSave }: { list: FixedExpense[]; onSave: (list: FixedExpense[]) => Promise<boolean> }) {
  const EMPTY = { category: '', description: '', amount: '' };
  const [draft, setDraft] = useState(EMPTY);
  const [editing, setEditing] = useState<number | null>(null); // 수정 중인 항목 순번
  const [saving, setSaving] = useState(false);
  const total = list.reduce((sum, f) => sum + f.amount, 0);

  const reset = () => {
    setDraft(EMPTY);
    setEditing(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseAmount(draft.amount);
    if (!draft.category.trim()) return alert('항목을 입력해주세요.');
    if (amount <= 0) return alert('금액을 입력해주세요.');
    const item = { category: draft.category.trim(), description: draft.description.trim(), amount };
    setSaving(true);
    const ok = await onSave(editing === null ? [...list, item] : list.map((f, i) => (i === editing ? item : f)));
    setSaving(false);
    if (ok) reset();
  };

  const remove = async (i: number) => {
    if (!(await onSave(list.filter((_, j) => j !== i)))) return;
    if (editing === i) reset();
    else if (editing !== null && editing > i) setEditing(editing - 1);
  };

  return (
    <details className="group rounded-xl border border-slate-200 bg-white text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3 [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-slate-700">
          고정지출
          <span className="ml-2 font-normal text-slate-500">
            {list.length > 0 ? `${list.length}건 · 월 ${formatWon(total)}` : '등록된 항목 없음'}
          </span>
        </span>
        <svg viewBox="0 0 16 16" className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </summary>

      <p className="border-t border-slate-200 px-5 py-2.5 text-xs text-slate-500">
        매달 나가는 지출을 등록해 두면, 각 달의 입력 내역에서 <b className="font-medium">고정지출 넣기</b>로 한 번에 추가됩니다.
      </p>

      {list.length > 0 && (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {list.map((f, i) => (
            <li key={i} className={`flex items-center gap-3 px-5 py-2.5 ${editing === i ? 'bg-blue-50' : ''}`}>
              <span className="shrink-0 text-slate-800">{f.category}</span>
              <span className="min-w-0 flex-1 truncate text-slate-500">{f.description}</span>
              <span className="tabular-nums text-slate-900">{formatWon(f.amount)}</span>
              <button
                onClick={() => {
                  setEditing(i);
                  setDraft({ category: f.category, description: f.description, amount: f.amount.toLocaleString('ko-KR') });
                }}
                className="text-slate-500 hover:text-slate-900 hover:underline"
              >
                수정
              </button>
              <button onClick={() => remove(i)} className="text-red-600 hover:underline">
                삭제
              </button>
            </li>
          ))}
          <li className="flex justify-between bg-slate-50 px-5 py-2.5 font-medium">
            <span className="text-slate-600">월 합계</span>
            <span className="tabular-nums">{formatWon(total)}</span>
          </li>
        </ul>
      )}

      <form onSubmit={submit} className="grid gap-2 border-t border-slate-100 px-5 py-3 sm:grid-cols-[9rem_1fr_8rem_auto]">
        <input
          placeholder="항목 (예: 월세)"
          value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          className={inputClass}
        />
        <input
          placeholder="내용 (선택)"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          className={inputClass}
        />
        <input
          inputMode="numeric"
          placeholder="금액"
          value={draft.amount}
          onChange={(e) => setDraft({ ...draft, amount: toDigits(e.target.value) })}
          className={`${inputClass} text-right tabular-nums`}
        />
        <div className="flex gap-2">
          {editing !== null && (
            <button type="button" onClick={reset} className="rounded-md bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-200">
              취소
            </button>
          )}
          <button
            disabled={saving}
            className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:border-slate-500 disabled:opacity-50"
          >
            {editing === null ? '등록' : '저장'}
          </button>
        </div>
      </form>
    </details>
  );
}
