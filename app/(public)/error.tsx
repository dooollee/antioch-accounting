'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="py-24 text-center">
      <p className="text-slate-600">데이터를 불러오지 못했습니다.</p>
      <button onClick={reset} className="mt-4 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">
        다시 시도
      </button>
    </div>
  );
}
