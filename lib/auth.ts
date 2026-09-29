import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'admin_session';
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12시간

// 관리자 비밀번호는 .env.local 의 ADMIN_PASSWORD 로 설정합니다.
// 배포 환경변수에 붙여넣다 섞인 앞뒤 공백은 무시
const password = () => (process.env.ADMIN_PASSWORD ?? '').trim();

export const isPasswordConfigured = () => password() !== '';

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const sign = (value: string) => createHmac('sha256', password()).update(value).digest('hex');

export function checkPassword(input: string) {
  return password() !== '' && safeEqual(input, password());
}

// 토큰 = 만료시각.서명  (비밀번호를 바꾸면 기존 세션은 모두 무효화됩니다)
export function createSessionToken() {
  const exp = String(Date.now() + SESSION_MAX_AGE * 1000);
  return `${exp}.${sign(exp)}`;
}

export async function isAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || password() === '') return false;
  const [exp, sig = ''] = token.split('.');
  return Number(exp) > Date.now() && safeEqual(sig, sign(exp));
}
