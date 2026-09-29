export type Dept = 'univ' | 'youth';
export type Scope = 'total' | Dept;

export interface Member {
  id: string;
  name: string;
  dept: Dept;
  phone: string;
  monthlyStatus: boolean[];
  status?: string;
  affiliation?: string | null;
}

// 소속 필터: '' = 전체, AFFILIATION_NONE = 소속 미입력
export const AFFILIATION_NONE = '__none__';

export function getAffiliations(members: Member[]) {
  const names = members.map((m) => m.affiliation?.trim()).filter((a): a is string => !!a);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'ko'));
}

export function matchAffiliation(m: Member, filter: string) {
  const a = m.affiliation?.trim() ?? '';
  return filter === '' || (filter === AFFILIATION_NONE ? a === '' : a === filter);
}

// 수입/지출 내역 (transactions 테이블). month_index 는 회계월 인덱스(0 = 11월)
export type TxType = 'income' | 'expense';
export const TX_LABEL: Record<TxType, string> = { income: '수입', expense: '지출' };

export interface Transaction {
  id: number;
  fiscal_year: number;
  month_index: number;
  type: TxType;
  category: string;
  description: string | null;
  amount: number;
}

// 회비는 회계 장부에서 자동 집계되는 수입 항목
export const DUES_CATEGORY = '회비';
export const carryoverKey = (year: number) => `carryover_${year}`;

export interface CategoryAmount {
  category: string;
  amount: number;
}

export interface MonthReport {
  opening: number; // 전월 잔액 (11월은 전년도 이월금)
  income: CategoryAmount[];
  incomeTotal: number;
  expense: CategoryAmount[];
  expenseTotal: number;
  closing: number; // 월말 잔액
  items: Transaction[];
}

function sumByCategory(txs: Transaction[]): CategoryAmount[] {
  const map = new Map<string, number>();
  for (const t of txs) map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  return [...map].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

// 12개월 보고서: 전월 잔액 + 수입(회비 + 기타 항목) - 지출 = 월말 잔액 → 다음 달 전월 잔액
export function buildMonthlyReports(duesIncome: number[], txs: Transaction[], carryover: number): MonthReport[] {
  let opening = carryover;
  return FISCAL_MONTHS.map((_, i) => {
    const items = txs.filter((t) => t.month_index === i);
    const otherIncome = sumByCategory(items.filter((t) => t.type === 'income'));
    const income = [
      ...(duesIncome[i] > 0 ? [{ category: DUES_CATEGORY, amount: duesIncome[i] }] : []),
      ...otherIncome,
    ];
    const expense = sumByCategory(items.filter((t) => t.type === 'expense'));
    const incomeTotal = income.reduce((s, c) => s + c.amount, 0);
    const expenseTotal = expense.reduce((s, c) => s + c.amount, 0);
    const report = { opening, income, incomeTotal, expense, expenseTotal, closing: opening + incomeTotal - expenseTotal, items };
    opening = report.closing;
    return report;
  });
}

export const signedWon = (n: number) => (n < 0 ? `-${formatWon(-n)}` : formatWon(n));

// 카톡 공유용 결산 텍스트 (카톡은 고정폭 글꼴이 아니라 줄 단위로 정리)
export function monthReportText(r: MonthReport, monthIndex: number, year = CONFIG.year) {
  const lines = (items: CategoryAmount[]) =>
    items.length ? items.map((c) => ` · ${c.category} ${formatWon(c.amount)}`) : [' · 없음'];
  return [
    `[안디옥 ${year} 회계연도 ${FISCAL_MONTHS[monthIndex]}월 결산]`,
    '',
    `■ ${monthIndex === 0 ? '전년도 이월금' : '전월 잔액'}: ${signedWon(r.opening)}`,
    '',
    `■ 수입: ${formatWon(r.incomeTotal)}`,
    ...lines(r.income),
    '',
    `■ 지출: ${formatWon(r.expenseTotal)}`,
    ...lines(r.expense),
    '',
    `■ 월말 잔액: ${signedWon(r.closing)}`,
  ].join('\n');
}

export interface Config {
  year: number;
  fees: Record<Dept, number>;
}

export const CONFIG: Config = {
  year: 2026,
  fees: { univ: 5000, youth: 10000 },
};

export const DEPT_LABEL: Record<Dept, string> = { univ: '대학부', youth: '청년부' };
export const SCOPE_LABEL: Record<Scope, string> = { total: '전체', ...DEPT_LABEL };
export const STATUS_LABEL: Record<string, string> = {
  active: '활동',
  inactive: '장결',
  military: '군복무',
  graduated: '졸업',
};

// 회계연도는 11월에 시작합니다. 인덱스 0 = 11월
export const FISCAL_MONTHS = [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 서버(UTC)와 브라우저가 같은 달을 가리키도록 한국 시간 기준으로 계산
export const getCurrentFiscalMonthIndex = () =>
  (new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCMonth() + 2) % 12;

export const formatWon = (n: number) => `${n.toLocaleString('ko-KR')}원`;

export interface MonthStat {
  count: number;
  paidCount: number;
  revenue: number;
  expected: number;
}

export type MonthlyStats = Record<Scope, MonthStat>[];

// 공개 대시보드용 집계. 이름·연락처 없이 숫자만 만듭니다.
export function buildMonthlyStats(
  members: Pick<Member, 'dept' | 'monthlyStatus'>[],
  config: Config = CONFIG
): MonthlyStats {
  return FISCAL_MONTHS.map((_, i) => {
    const empty = () => ({ count: 0, paidCount: 0, revenue: 0, expected: 0 });
    const row: Record<Scope, MonthStat> = { total: empty(), univ: empty(), youth: empty() };

    for (const m of members) {
      const fee = config.fees[m.dept] ?? 0;
      for (const key of ['total', m.dept] as Scope[]) {
        if (!row[key]) continue;
        row[key].count++;
        row[key].expected += fee;
        if (m.monthlyStatus?.[i]) {
          row[key].paidCount++;
          row[key].revenue += fee;
        }
      }
    }
    return row;
  });
}

export const paidRate = (s: MonthStat) =>
  s.count > 0 ? Math.round((s.paidCount / s.count) * 100) : 0;

export interface Arrears {
  member: Member;
  months: number[]; // 미납 회계월 인덱스
  amount: number;
}

// 회계연도 첫 달부터 기준 월까지 미납 내역
export function getArrears(members: Member[], uptoIndex: number, config: Config = CONFIG): Arrears[] {
  return members
    .map((member) => {
      const months = FISCAL_MONTHS.slice(0, uptoIndex + 1)
        .map((_, i) => i)
        .filter((i) => !member.monthlyStatus?.[i]);
      return { member, months, amount: months.length * (config.fees[member.dept] ?? 0) };
    })
    .filter((a) => a.months.length > 0)
    .sort((a, b) => b.amount - a.amount || a.member.name.localeCompare(b.member.name, 'ko'));
}

const monthList = (months: number[]) => months.map((i) => `${FISCAL_MONTHS[i]}월`).join(', ');

// 안내 문구 템플릿. 관리자 페이지에서 수정하면 DB(settings 테이블)에 저장됩니다.
export const DEFAULT_MESSAGE_TEMPLATE = [
  '[안디옥 회비 안내]',
  '{이름}님, 아래 회비가 아직 납부 확인되지 않았습니다.',
  '',
  '미납 월: {미납월} ({개월수}개월)',
  '월 회비: {월회비}',
  '합계: {합계}',
  '',
  '이미 납부하셨다면 회계 담당자에게 알려주세요. 감사합니다.',
].join('\n');

export const MESSAGE_FIELDS = ['이름', '부서', '소속', '미납월', '개월수', '월회비', '합계'] as const;

export function arrearsMessage(a: Arrears, template = DEFAULT_MESSAGE_TEMPLATE, config: Config = CONFIG) {
  const values: Record<(typeof MESSAGE_FIELDS)[number], string> = {
    이름: a.member.name,
    부서: DEPT_LABEL[a.member.dept],
    소속: a.member.affiliation?.trim() ?? '',
    미납월: monthList(a.months),
    개월수: String(a.months.length),
    월회비: formatWon(config.fees[a.member.dept]),
    합계: formatWon(a.amount),
  };
  return template.replace(/\{(.+?)\}/g, (match, key: string) =>
    key in values ? values[key as keyof typeof values] : match
  );
}

export function arrearsSummary(list: Arrears[], uptoIndex: number) {
  const total = list.reduce((sum, a) => sum + a.amount, 0);
  return [
    `[회비 미납 현황] ${FISCAL_MONTHS[uptoIndex]}월 기준`,
    `${list.length}명 / 합계 ${formatWon(total)}`,
    '',
    ...list.map(
      (a) => `${a.member.name}(${DEPT_LABEL[a.member.dept]}) ${monthList(a.months)} - ${formatWon(a.amount)}`
    ),
  ].join('\n');
}
