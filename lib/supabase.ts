import { createClient } from '@supabase/supabase-js';

// 서버(라우트 핸들러, 서버 컴포넌트)에서만 import 합니다.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
