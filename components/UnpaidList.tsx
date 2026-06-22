import { getMonthlyStats, Member, Config, FISCAL_MONTHS } from "@/lib/utils/dataHelpers";

interface UnpaidListProps {
  members: Member[];
  config: Config;
  type?: 'total' | 'univ' | 'youth';
  monthIndex?: number; // 💡 선택적 Props 추가
}

export function UnpaidList({ members, config, type = 'total', monthIndex }: UnpaidListProps) {
  
  // 💡 여기도 monthIndex를 넣어줍니다.
  const stats = getMonthlyStats(members, config, monthIndex);
  const data = stats[type];

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          {/* 💡 헤더에 몇 월인지 표시해주면 더 친절하겠죠? */}
          <h3 className="font-bold text-slate-800 text-lg">⚠️ {FISCAL_MONTHS[stats.monthIndex]}월 미납 회원 명단</h3>
          <span className="text-sm text-slate-400">총 {data.unpaidMembers.length}명</span>
        </div>
        <div className="divide-y divide-slate-50">
          {data.unpaidMembers.length > 0 ? (
            data.unpaidMembers.map((m) => (
              <div key={m.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-500">
                    {m.name[0]}
                  </div>
                  <span className="font-medium text-slate-700">{m.name}</span>
                </div>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">
                  {m.dept === 'univ' ? '대학부' : '청년부'}
                </span>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-slate-400">모두 납부했습니다! 🎉</div>
          )}
        </div>
      </section>
  );
};