import { redirect } from 'next/navigation';
import { Shell } from '@/components/Shell';
import { isAdmin } from '@/lib/auth';

// 화면 이동용 가드. 실제 데이터 보호는 /api/members 에서 매 요청마다 확인합니다.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect('/login');
  return <Shell variant="admin">{children}</Shell>;
}
