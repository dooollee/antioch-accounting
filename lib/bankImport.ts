import type { Member } from './utils/dataHelpers';

// 은행 거래내역 엑셀 → 거래 목록.
// 은행마다 머리말 줄 수와 컬럼 이름이 달라서, 머리글 줄을 찾아 이름으로 컬럼을 맞춥니다.
export interface BankRow {
  key: string; // 같은 거래를 두 번 반영하지 않기 위한 식별값
  year: number;
  month: number;
  day: number;
  text: string; // 보낸분/받는분 + 메모
  note: string; // 적요 (거래 종류)
  deposit: number;
  withdrawal: number;
}

// 앞에 있을수록 우선
const COLUMNS = {
  date: ['거래일시', '거래일자', '거래일', '일시', '날짜'],
  time: ['거래시간', '시간'],
  deposit: ['입금액', '입금금액', '입금', '맡기신금액'],
  withdrawal: ['출금액', '출금금액', '출금', '찾으신금액', '지급금액'],
  amount: ['거래금액', '금액'], // 입금·출금이 한 컬럼(+/-)인 은행
  balance: ['잔액', '거래후잔액'],
  // 국민은행처럼 '적요'가 거래 종류인 은행이 있어 적요는 맨 뒤
  who: ['보낸분/받는분', '의뢰인/수취인', '기재내용', '거래내용', '내용', '적요'],
  memo: ['송금메모', '메모'],
  note: ['적요'],
};
type Field = keyof typeof COLUMNS;

const clean = (v: unknown) => String(v ?? '').replace(/\s|\(원\)/g, '');
const num = (v: unknown) => Math.round(Number(String(v ?? '').replace(/[^0-9.-]/g, ''))) || 0;

function findColumns(row: unknown[]) {
  const cells = row.map(clean);
  const col = {} as Record<Field, number>;
  for (const field of Object.keys(COLUMNS) as Field[]) {
    col[field] = COLUMNS[field].map((name) => cells.indexOf(name)).find((i) => i >= 0) ?? -1;
  }
  const hasAmount = (col.deposit >= 0 && col.withdrawal >= 0) || col.amount >= 0;
  return col.date >= 0 && hasAmount ? col : null;
}

// grid: 시트를 2차원 배열로 읽은 것. 거래내역 표를 못 찾으면 null
export function parseBankRows(grid: unknown[][]): { rows: BankRow[]; unreadable: number } | null {
  const headerIndex = grid.slice(0, 30).findIndex((row) => findColumns(row));
  if (headerIndex < 0) return null;
  const col = findColumns(grid[headerIndex])!;

  const rows: BankRow[] = [];
  const seen = new Map<string, number>();
  let unreadable = 0;

  for (const row of grid.slice(headerIndex + 1)) {
    const cell = (i: number) => (i >= 0 ? String(row[i] ?? '').trim() : '');
    const dateText = cell(col.date);
    if (!dateText) continue; // 합계 줄, 빈 줄

    const date = dateText.match(/(\d{4})\D?(\d{1,2})\D?(\d{1,2})/);
    const signed = num(cell(col.amount));
    const deposit = col.deposit >= 0 ? num(cell(col.deposit)) : Math.max(signed, 0);
    const withdrawal = col.withdrawal >= 0 ? num(cell(col.withdrawal)) : Math.max(-signed, 0);
    if (!date || (!deposit && !withdrawal)) {
      unreadable++;
      continue;
    }

    // 잔액·시간이 없는 은행은 같은 날 같은 금액이 겹칠 수 있어 순번을 붙입니다
    const base = [dateText, cell(col.time), deposit, withdrawal, num(cell(col.balance))].join('|');
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);

    rows.push({
      key: count ? `${base}#${count}` : base,
      year: Number(date[1]),
      month: Number(date[2]),
      day: Number(date[3]),
      text: [cell(col.who), cell(col.memo)].filter(Boolean).join(' '),
      note: col.note !== col.who ? cell(col.note) : '',
      deposit,
      withdrawal,
    });
  }

  // 은행 파일은 보통 최신순. 회비를 이른 달부터 채우려면 오래된 거래부터 처리해야 합니다
  const order = (r: BankRow) => r.year * 10000 + r.month * 100 + r.day;
  if (rows.length && order(rows[0]) > order(rows[rows.length - 1])) rows.reverse();
  return { rows: rows.sort((a, b) => order(a) - order(b)), unreadable };
}

// 회계연도는 11월 시작: 2025.11 ~ 2026.10 이 2026 회계연도, 인덱스 0 = 11월
export const fiscalYearOf = (r: Pick<BankRow, 'year' | 'month'>) => (r.month >= 11 ? r.year + 1 : r.year);
export const fiscalMonthIndex = (r: Pick<BankRow, 'month'>) => (r.month + 1) % 12;

// 입금자명에 회원 이름이 들어 있으면 그 회원 ("대청회비홍길동" → 홍길동).
// 동명이인처럼 후보가 갈리면 null 을 돌려주고 사람이 고릅니다
export function matchMember<T extends Pick<Member, 'name'>>(text: string, members: T[]): T | null {
  const t = clean(text);
  const hits = members
    .filter((m) => clean(m.name) && t.includes(clean(m.name)))
    .sort((a, b) => b.name.length - a.name.length);
  return hits.length && hits[0].name.length !== hits[1]?.name.length ? hits[0] : null;
}

// 입금액을 월 회비로 나눠 가장 이른 미납 월부터 채웁니다. 회비로 볼 수 없는 금액이면 null
export function duesMonths(amount: number, fee: number, status: boolean[]): number[] | null {
  if (!fee || amount <= 0 || amount % fee !== 0) return null;
  const unpaid = status.flatMap((paid, i) => (paid ? [] : [i]));
  const n = amount / fee;
  return n <= unpaid.length ? unpaid.slice(0, n) : null;
}

// 반영한 거래 식별값과 거래처별 항목 기억 (settings 테이블에 JSON으로 저장)
// ponytail: 거래가 한 해 수백 건이라 통째로 저장. 수천 건을 넘기면 transactions 에 식별값 컬럼 + unique 제약으로 옮기기
export const BANK_IMPORT_KEY = 'bank_import';
export type BankImportState = { keys: string[]; categories: Record<string, string> };

export function parseBankImport(value: unknown): BankImportState | null {
  try {
    const v = typeof value === 'string' ? JSON.parse(value) : value;
    const ok = Array.isArray(v?.keys) && v.categories && typeof v.categories === 'object';
    return ok ? v : null;
  } catch {
    return null;
  }
}
