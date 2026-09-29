import { NextResponse } from 'next/server';
import { checkPassword, createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

// 로그인
export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({}));

  if (typeof password !== 'string' || !checkPassword(password)) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

// 로그아웃
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
