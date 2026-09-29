'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return setError(data?.error ?? '로그인에 실패했습니다.');
    }
    router.replace('/admin');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-bold">관리자 로그인</h1>
        <p className="mt-1 text-sm text-slate-500">회계 장부와 회원 정보는 관리자만 볼 수 있습니다.</p>

        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-5 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button
          disabled={pending || !password}
          className="mt-4 w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? '확인 중' : '로그인'}
        </button>
        <Link href="/" className="mt-4 block text-center text-sm text-slate-500 hover:text-slate-800">
          대시보드로 돌아가기
        </Link>
      </form>
    </div>
  );
}
