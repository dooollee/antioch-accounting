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

// 관리자 API 공용 호출. 실패하면 서버가 준 메시지로 throw
export async function api(url: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: object) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) toLogin();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? '요청에 실패했습니다.');
  return data;
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : '');

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
