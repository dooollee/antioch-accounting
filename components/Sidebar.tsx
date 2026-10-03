'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const MENUS = {
  public: [
    { name: '대시보드', href: '/' },
    { name: '수입 · 지출', href: '/finance' },
  ],
  admin: [
    { name: '미납 현황', href: '/admin' },
    { name: '회계 장부', href: '/admin/ledger' },
    { name: '수입 · 지출 입력', href: '/admin/finance' },
    { name: '통장 내역 가져오기', href: '/admin/import' },
    { name: '회원 관리', href: '/admin/members' },
  ],
};

const footerButton =
  'rounded-md border border-slate-700 px-3 py-1.5 text-slate-300 transition-colors hover:border-slate-500 hover:text-white md:w-full md:text-center';

export function Sidebar({ variant }: { variant: 'public' | 'admin' }) {
  const pathname = usePathname();
  const router = useRouter();
  const menu = MENUS[variant];

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.replace('/');
    router.refresh();
  };

  const footer =
    variant === 'admin' ? (
      <>
        <Link href="/" className={footerButton}>대시보드</Link>
        <button onClick={logout} className={footerButton}>로그아웃</button>
      </>
    ) : (
      <Link href="/admin" className={footerButton}>관리자 페이지</Link>
    );

  const link = (item: { name: string; href: string }, mobile = false) => {
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={
          mobile
            ? `shrink-0 rounded-md px-3 py-1.5 text-sm ${active ? 'bg-white/10 text-white' : 'text-slate-400'}`
            : `block rounded-md px-3 py-2 text-sm transition-colors ${
                active ? 'bg-white/10 font-medium text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`
        }
      >
        {item.name}
      </Link>
    );
  };

  const brand = (
    <div>
      <p className="font-semibold tracking-tight text-white">Antioch</p>
      <p className="text-xs text-slate-500">{variant === 'admin' ? '관리자' : '회비 현황'}</p>
    </div>
  );

  return (
    <>
      {/* 데스크톱 */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-slate-900 md:flex">
        <div className="px-6 py-7">{brand}</div>
        <nav className="flex-1 space-y-0.5 px-3">{menu.map((item) => link(item))}</nav>
        <div className="flex flex-col items-start gap-2 border-t border-slate-800 px-4 py-5 text-xs">
          {footer}
        </div>
      </aside>

      {/* 모바일 */}
      <header className="sticky top-0 z-40 bg-slate-900 md:hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          {brand}
          <div className="flex gap-2 text-xs">{footer}</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 py-2">{menu.map((item) => link(item, true))}</nav>
      </header>
    </>
  );
}
