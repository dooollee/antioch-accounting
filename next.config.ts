import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 대학부·청년부 현황은 대시보드 필터로 합쳤습니다. 예전에 공유된 주소는 대시보드로 보냅니다
  redirects: async () =>
    ['/univ', '/youth'].map((source) => ({ source, destination: '/', permanent: false })),
};

export default nextConfig;
