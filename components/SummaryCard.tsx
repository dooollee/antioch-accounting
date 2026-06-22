import { getMonthlyStats, Member, Config, FISCAL_MONTHS } from "@/lib/utils/dataHelpers";

interface SummaryCardProps {
  members: Member[];
  config: Config;
  type?: 'total' | 'univ' | 'youth';
  title?: '대학부 & 청년부 합계' | '대학부' | '청년부';
  monthIndex?: number; // 💡 선택적 Props 추가
}

export function SummaryCard({ 
  members, 
  config, 
  type = 'total', 
  title = "대학부 & 청년부 합계",
  monthIndex // 💡 전달받기
}: SummaryCardProps) {

  // 💡 전달받은 monthIndex를 함수 세 번째 인자로 쏙 넣어줍니다!
  const stats = getMonthlyStats(members, config, monthIndex);
  const target = stats[type];

  const paidRate = target.count > 0 
    ? Math.round((target.paidCount / target.count) * 100) 
    : 0;

  return(
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* ... (아래 UI 코드는 기존과 100% 동일합니다) ... */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <p className="text-slate-500 text-sm">전체 납부율 ({FISCAL_MONTHS[stats.monthIndex]}월)</p>
        <p className="text-3xl font-bold text-blue-600">{paidRate}%</p>
        <div className="w-full bg-slate-100 h-2 mt-4 rounded-full overflow-hidden">
          <div className="bg-blue-500 h-full" style={{ width: `${paidRate}%` }} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <p className="text-slate-500 text-sm">총 회원 수</p>
        <p className="text-3xl font-bold text-slate-800">{target.count}명</p>
        <p className="text-xs text-slate-400 mt-2">{title}</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <p className="text-slate-500 text-sm">이번 달 미납 회원</p>
        <p className="text-3xl font-bold text-rose-500">{ target.unpaidMembers.length}명</p>
        <p className="text-xs text-slate-400 mt-2">빠른 독촉이 필요합니다 📢</p>
      </div>
    </section>
  );
};