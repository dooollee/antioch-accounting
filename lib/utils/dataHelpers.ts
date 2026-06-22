// 💡 1. 타입 정의 추가
export interface Member {
  id: string;
  name: string;
  dept: 'univ' | 'youth';
  phone: string;
  monthlyStatus: boolean[];
  status?: string;
}

export interface Config {
  year: number;
  fees: {
    univ: number;
    youth: number;
  };
}

// 💡 2. 혹시 모를 에러를 막기 위한 기본 설정값 (Fallback) 생성
const DEFAULT_CONFIG: Config = { 
  year: 2026, 
  fees: { univ: 5000, youth: 10000 } 
};

export const FISCAL_MONTHS = [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 💡 2. 오늘 날짜를 기준으로 이번 달의 회계 인덱스를 찾아주는 함수
export const getCurrentFiscalMonthIndex = () => (new Date().getMonth() + 2) % 12;

// 💡 3. members와 config 모두 기본값을 줘서 TS 에러 해결
export function getMonthlyStats(
  members: Member[] = [], 
  config: Config = DEFAULT_CONFIG, 
  monthIndex = getCurrentFiscalMonthIndex()
) {
  // 프론트엔드에서 데이터를 불러오기 전 null이 넘어올 때를 대비한 최종 안전장치
  const safeMembers = members || [];
  const safeConfig = config || DEFAULT_CONFIG;

  const univMembers = safeMembers.filter( m => m.dept === "univ");
  const youthMembers = safeMembers.filter( m => m.dept === "youth");

  const paidUniv = univMembers.filter( m => m.monthlyStatus[monthIndex]);
  const paidYouth = youthMembers.filter( m => m.monthlyStatus[monthIndex]);

  const unpaidMembers = safeMembers.filter(m => !(m.monthlyStatus[monthIndex]));
  const unpaidUnivs = safeMembers.filter(m => !(m.monthlyStatus[monthIndex]) && m.dept === "univ");
  const unpaidYouths = safeMembers.filter(m => !(m.monthlyStatus[monthIndex]) && m.dept === "youth");

  return {
    monthIndex,
    total: {
      count: safeMembers.length,
      paidCount: paidUniv.length + paidYouth.length,
      revenue: (paidUniv.length * safeConfig.fees.univ) + (paidYouth.length * safeConfig.fees.youth),
      unpaidMembers: unpaidMembers
    },
    univ: {
      count: univMembers.length,
      paidCount: paidUniv.length,
      rate: calculateRate(paidUniv.length, safeMembers.length),
      unpaidMembers: unpaidUnivs,
    },
    youth: {
      count: youthMembers.length,
      paidCount: paidYouth.length,
      rate: calculateRate(paidYouth.length, safeMembers.length),
      unpaidMembers: unpaidYouths,
    },
  };
};

// 💡 4. 차트 함수도 동일하게 방어막 추가
export function getYearlyChartData(
  members: Member[] = [], 
  config: Config = DEFAULT_CONFIG, 
  type: 'total' | 'univ' | 'youth' = 'total'
) {
  const safeMembers = members || [];
  const safeConfig = config || DEFAULT_CONFIG;

  return Array.from({ length: 12 }, (_, i) => {
    // 💡 안전한 변수(safeMembers, safeConfig)를 토스!
    const stats = getMonthlyStats(safeMembers, safeConfig, i);
    const target = stats[type]
    return {
      name: `${FISCAL_MONTHS[i]}월`,
      rate: stats.total.count > 0
      ? Math.round((target.paidCount / target.count) * 100)
      : 0,
      revenue: stats.total.revenue,
    };
  });
}

function calculateRate(paid: number, total: number): number{
  return total > 0 ? Math.round((paid / total) * 100) : 0;
}