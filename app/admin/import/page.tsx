'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { api, errorText, memberApi, useMembers } from '@/lib/useMembers';
import {
  BANK_IMPORT_KEY,
  BankImportState,
  BankRow,
  duesMonths,
  fiscalMonthIndex,
  fiscalYearOf,
  matchMember,
  parseBankImport,
  parseBankRows,
} from '@/lib/bankImport';
import { CONFIG, DEPT_LABEL, FISCAL_MONTHS, Member, Transaction, TxType, formatWon } from '@/lib/utils/dataHelpers';

// 거래 한 건을 어떻게 반영할지 (미리보기에서 사람이 고칠 수 있음)
type Choice = { on: boolean; kind: 'dues' | 'tx'; memberId: string; category: string; description: string };
type NewTx = { type: TxType; category: string; description: string; amount: number; month_index: number };
type PlanItem = { r: BankRow; c: Choice; lock: string | null; error?: string; member?: Member; months?: number[]; tx?: NewTx };

const inputClass = 'rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-900';
const txType = (r: BankRow): TxType => (r.deposit ? 'income' : 'expense');
const amountOf = (r: BankRow) => r.deposit || r.withdrawal;

export default function BankImportPage() {
  const { members, setMembers, isLoading: membersLoading, error: membersError } = useMembers();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [saved, setSaved] = useState<BankImportState>({ keys: [], categories: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<BankRow[]>([]);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    Promise.all([api('/api/transactions', 'GET'), api('/api/settings', 'GET')])
      .then(([tx, s]) => {
        setTransactions(tx.transactions);
        setSaved(parseBankImport(s.settings?.[BANK_IMPORT_KEY]) ?? { keys: [], categories: {} });
      })
      .catch((e) => setLoadError(errorText(e)))
      .finally(() => setIsLoading(false));
  }, []);

  const lockReason = (r: BankRow) =>
    saved.keys.includes(r.key) ? '이미 반영됨' : fiscalYearOf(r) !== CONFIG.year ? '다른 회계연도' : null;

  // 손으로 이미 입력한 내역일 수 있음: 같은 달에 같은 구분·금액이 있는 경우
  const hasSameTx = (r: BankRow) =>
    transactions.some((t) => t.month_index === fiscalMonthIndex(r) && t.type === txType(r) && t.amount === amountOf(r));

  const openFile = async (file: File) => {
    setRows([]);
    setFileMessage(null);
    try {
      const XLSX = await import('xlsx');
      const book = XLSX.read(await file.arrayBuffer());
      const grid = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[book.SheetNames[0]], { header: 1, raw: false, defval: '' });
      const parsed = parseBankRows(grid);
      if (!parsed) {
        return setFileMessage('거래내역 표를 찾지 못했습니다. 은행에서 받은 거래내역 엑셀 파일이 맞는지 확인해 주세요.');
      }
      if (parsed.unreadable) setFileMessage(`날짜나 금액을 읽지 못한 줄이 ${parsed.unreadable}건 있어 제외했습니다.`);

      setChoices(
        Object.fromEntries(
          parsed.rows.map((r) => {
            const member = r.deposit ? matchMember(r.text, members) : null;
            const isDues = !!member && !!duesMonths(r.deposit, CONFIG.fees[member.dept], member.monthlyStatus);
            const choice: Choice = {
              on: !lockReason(r) && (isDues || !hasSameTx(r)),
              kind: isDues ? 'dues' : 'tx',
              memberId: member?.id ?? '',
              category: saved.categories[r.text] ?? '',
              description: '',
            };
            return [r.key, choice];
          })
        )
      );
      setRows(parsed.rows);
    } catch (e) {
      setFileMessage(`파일을 읽지 못했습니다. 비밀번호가 걸린 파일이면 엑셀에서 암호를 풀고 다시 저장해 주세요.\n${errorText(e)}`);
    }
  };

  const update = (key: string, patch: Partial<Choice>) =>
    setChoices((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  // 오래된 거래부터 차례로 계산: 같은 회원의 입금이 여러 건이면 앞 건이 채운 다음 달부터 채웁니다
  const status = new Map(members.map((m) => [m.id, m.monthlyStatus]));
  const plan: PlanItem[] = rows.map((r) => {
    const c = choices[r.key];
    const lock = lockReason(r);
    if (lock || !c.on) return { r, c, lock };
    if (c.kind === 'dues') {
      const member = members.find((m) => m.id === c.memberId);
      if (!member) return { r, c, lock, error: '회원을 선택하세요' };
      const months = duesMonths(r.deposit, CONFIG.fees[member.dept], status.get(member.id)!);
      if (!months) return { r, c, lock, error: '금액이 회비·미납 월과 맞지 않습니다' };
      status.set(member.id, status.get(member.id)!.map((paid, i) => paid || months.includes(i)));
      return { r, c, lock, member, months };
    }
    if (!c.category.trim()) return { r, c, lock, error: '항목을 입력하세요' };
    const tx = { type: txType(r), category: c.category.trim(), description: c.description, amount: amountOf(r), month_index: fiscalMonthIndex(r) };
    return { r, c, lock, tx };
  });
  const ready = plan.filter((p) => p.months || p.tx);
  const errors = plan.filter((p) => p.error).length;

  const apply = async () => {
    setApplying(true);
    const done: string[] = [];
    const categories = { ...saved.categories };
    try {
      // 회비: 회원별 최종 납부 상태를 한 번에 저장
      for (const member of members) {
        const mine = plan.filter((p) => p.months && p.member?.id === member.id);
        if (mine.length === 0) continue;
        const monthlyStatus = status.get(member.id)!;
        await memberApi('PATCH', { id: member.id, monthlyStatus });
        setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, monthlyStatus } : m)));
        done.push(...mine.map((p) => p.r.key));
      }
      for (const p of plan) {
        if (!p.tx) continue;
        const { transaction } = await api('/api/transactions', 'POST', p.tx);
        setTransactions((prev) => [...prev, transaction]);
        categories[p.r.text] = p.tx.category;
        done.push(p.r.key);
      }
    } catch (e) {
      alert(`반영 중 실패했습니다. 성공한 건은 '이미 반영됨'으로 표시됩니다.\n${errorText(e)}`);
    } finally {
      // 중간에 실패해도 성공한 건은 기록해야 다시 올렸을 때 두 번 반영되지 않습니다
      const next = { keys: [...saved.keys, ...done], categories };
      try {
        await api('/api/settings', 'PUT', { key: BANK_IMPORT_KEY, value: JSON.stringify(next) });
      } catch (e) {
        alert(`반영 기록 저장에 실패했습니다. 이 파일을 다시 올리면 중복 반영되니 주의하세요.\n${errorText(e)}`);
      }
      setSaved(next);
      setApplying(false);
    }
  };

  if (isLoading || membersLoading) return <p className="py-20 text-center text-sm text-slate-500">불러오는 중</p>;
  if (loadError || membersError) return <p className="py-20 text-center text-sm text-red-600">{loadError || membersError}</p>;

  const categories = (type: TxType) =>
    [...new Set(transactions.filter((t) => t.type === type).map((t) => t.category))].sort((a, b) => a.localeCompare(b, 'ko'));
  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  return (
    <div className="space-y-6">
      <Header
        title="통장 내역 가져오기"
        description="은행에서 받은 거래내역 엑셀을 올리면 회비 납부와 수입·지출을 한 번에 반영합니다."
      />

      <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm">
        <input
          type="file"
          accept=".xls,.xlsx,.csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) openFile(file);
            e.target.value = '';
          }}
          className="text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
        />
        <p className="mt-2 text-xs text-slate-500">
          파일은 이 브라우저에서만 읽고, 아래에서 확인한 내용만 저장됩니다. 한 번 반영한 거래는 다시 올려도 건너뜁니다.
        </p>
        {fileMessage && <p className="mt-2 whitespace-pre-line text-xs text-orange-700">{fileMessage}</p>}
      </section>

      {rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-3" />
                  <th className="p-3 font-medium">날짜</th>
                  <th className="p-3 font-medium">보낸분 / 받는분</th>
                  <th className="p-3 text-right font-medium">금액</th>
                  <th className="p-3 font-medium">반영 방법</th>
                  <th className="p-3 font-medium">결과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plan.map(({ r, c, lock, error, months, tx }) => (
                  <tr key={r.key} className={lock || !c.on ? 'text-slate-400' : 'text-slate-800'}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        aria-label="반영"
                        checked={!lock && c.on}
                        disabled={!!lock}
                        onChange={(e) => update(r.key, { on: e.target.checked })}
                      />
                    </td>
                    <td className="whitespace-nowrap p-3 tabular-nums">
                      {r.month}.{String(r.day).padStart(2, '0')}
                    </td>
                    <td className="p-3">
                      {r.text}
                      {r.note && <span className="ml-2 text-xs text-slate-400">{r.note}</span>}
                    </td>
                    <td className={`whitespace-nowrap p-3 text-right tabular-nums ${!lock && c.on ? (r.deposit ? 'text-blue-700' : 'text-red-600') : ''}`}>
                      {r.deposit ? '+' : '-'}
                      {formatWon(amountOf(r))}
                    </td>
                    <td className="p-3">
                      {!lock && (
                        <div className="flex flex-wrap items-center gap-2">
                          {r.deposit ? (
                            <select
                              value={c.kind}
                              onChange={(e) => update(r.key, { kind: e.target.value as Choice['kind'] })}
                              className={inputClass}
                            >
                              <option value="dues">회비</option>
                              <option value="tx">기타 수입</option>
                            </select>
                          ) : (
                            <span className="text-slate-500">지출</span>
                          )}
                          {c.kind === 'dues' ? (
                            <select
                              value={c.memberId}
                              onChange={(e) => update(r.key, { memberId: e.target.value })}
                              className={inputClass}
                            >
                              <option value="">회원 선택</option>
                              {sortedMembers.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({DEPT_LABEL[m.dept]})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <>
                              <input
                                list={`categories-${txType(r)}`}
                                placeholder="항목"
                                value={c.category}
                                onChange={(e) => update(r.key, { category: e.target.value })}
                                className={`${inputClass} w-28`}
                              />
                              <input
                                placeholder="내용 (선택, 공개됨)"
                                value={c.description}
                                onChange={(e) => update(r.key, { description: e.target.value })}
                                className={`${inputClass} w-40`}
                              />
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap p-3 text-xs">
                      {lock ? (
                        lock
                      ) : error ? (
                        <span className="text-red-600">{error}</span>
                      ) : months ? (
                        <span className="text-slate-600">{months.map((i) => `${FISCAL_MONTHS[i]}월`).join(', ')} 납부</span>
                      ) : tx ? (
                        <span className="text-slate-600">{FISCAL_MONTHS[tx.month_index]}월 {tx.type === 'income' ? '수입' : '지출'}</span>
                      ) : c.kind === 'tx' && hasSameTx(r) ? (
                        <span className="text-orange-700">같은 금액 내역이 이미 있음</span>
                      ) : (
                        '제외'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(['income', 'expense'] as const).map((type) => (
              <datalist key={type} id={`categories-${type}`}>
                {categories(type).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              회비는 가장 이른 미납 월부터 채웁니다. 다른 달로 넣어야 하면 여기서 제외하고 회계 장부에서 직접 체크하세요.
            </p>
            <button
              onClick={apply}
              disabled={applying || errors > 0 || ready.length === 0}
              className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
            >
              {applying ? '반영 중' : errors > 0 ? `확인이 필요한 건 ${errors}개` : `${ready.length}건 반영`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
