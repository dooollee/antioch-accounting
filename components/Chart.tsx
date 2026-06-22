import { PaymentChart } from "@/components/PaymentChart";
import { RevenueChart } from "@/components/RevenueChart";
import { getYearlyChartData, Member, Config } from "@/lib/utils/dataHelpers";

// 💡 부모에게 받을 Props 타입 정의
interface ChartProps {
  members: Member[];
  config: Config;
  type?: 'total' | 'univ' | 'youth';
}

export function Chart({ members, config, type = 'total' }: ChartProps) {
  // 💡 전달받은 데이터를 함수에 그대로 넣어줍니다.
  const chartData = getYearlyChartData(members, config, type); 

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <PaymentChart data={chartData} />
      <RevenueChart data={chartData} />
    </section>
  );
};