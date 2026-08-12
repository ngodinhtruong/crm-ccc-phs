"use client";

function SkeletonCard({ height = 220 }: { height?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
      <div className="border-b px-4 py-3">
        <div className="h-4 w-48 rounded bg-slate-200" />
      </div>
      <div className="p-4">
        <div
          className="rounded-lg bg-slate-100"
          style={{ height }}
        />
      </div>
    </div>
  );
}

export function CccDashboardChartSkeleton() {
  return (
    <div className="space-y-4" aria-label="Đang tải biểu đồ Dashboard CCC">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
