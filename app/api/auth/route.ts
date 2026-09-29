import { NextResponse } from 'next/server';
import { checkPassword, createSessionToken, isPasswordConfigured, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

// 로그인
export async function POST(request: Request) {
  // 화면에는 일반 오류만 보여주고, 설정 누락은 서버 로그(Vercel Logs)에서만 확인
  if (!isPasswordConfigured()) console.error('ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.');

  const { password } = await request.json().catch(() => ({}));

  if (typeof password !== 'string' || !checkPassword(password.trim())) {
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
