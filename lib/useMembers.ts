'use client';

import { useEffect, useState } from 'react';
import type { Member } from '@/lib/utils/dataHelpers';

const toLogin = () => window.location.assign('/login');

// 관리자 페이지 공용: 회원 목록 로드
export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/members')
      .then(async (res) => {
        if (res.status === 401) return toLogin();
        if (!res.ok) throw new Error();
        const data = await res.json();
        setMembers(data.members.map((m: Member) => ({ ...m, status: m.status || 'active' })));
      })
      .catch(() => setError('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'))
      .finally(() => setIsLoading(false));
  }, []);

  return { members, setMembers, isLoading, error };
}

export async function memberApi(method: 'POST' | 'PATCH' | 'DELETE', body: object) {
  const res = await fetch('/api/members', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401) toLogin();
  if (!res.ok) throw new Error(`${method} 실패`);
  return res.json();
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // http 접속 등 clipboard API를 못 쓰는 환경용
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
