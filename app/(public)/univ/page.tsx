import { DashboardView } from '@/components/DashboardView';
import { getPublicStats } from '@/lib/publicStats';

export const dynamic = 'force-dynamic';

export default async function Univ() {
  return <DashboardView title="대학부 현황" scope="univ" months={await getPublicStats()} />;
}
