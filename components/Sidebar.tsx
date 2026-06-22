import { NavButton } from '@/components/NavButton'

export function Sidebar() {
  const menu = [
    { name: "대시보드", href: '/' },
    { name: "대학부 현황", href: '/univ' },
    { name: "청년부 현황", href: '/youth' },
    { name: "회계 장부", href: '/ledger' },
    { name: "회원 관리", href: '/members' }
  ];

  return (
    // 배치를 위해 w-64와 shrink-0를 꼭 추가했습니다.
    <div className="w-64 min-h-screen bg-slate-900 text-white flex flex-col shrink-0">
      
      {/* 로고 섹션 */}
      <aside className="p-8"> 
        <h1 className="text-xl font-bold tracking-tight bg-linear-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent"> 
          Antioch Accounting 
        </h1>
        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-semibold">
          Finance Management
        </p>
      </aside>

      {/* 메뉴 섹션 */}
      <nav className="flex-1 px-4">
        <ul className="space-y-1">
          {menu.map((item) => (
            <NavButton
              key={item.href}
              name={item.name}
              href={item.href}
            />
          ))}
        </ul>
      </nav>

      {/* 푸터 섹션 (옵션) */}
      <div className="p-6 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
            D
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-200">관리자 계정</span>
            {/* <span className="text-[10px] text-slate-500 font-medium">관리자 계정</span> */}
          </div>
        </div>
      </div>
    </div>
  );
};