"use client";

function SkeletonCard({ height = 260 }: { height?: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="p-4">
        <div
          className="animate-pulse rounded bg-slate-100"
          style={{ height }}
        />
      </div>
    </div>
  );
}

export function CccDashboardChartSkeleton() {
  return (
    <div className="space-y-5" aria-label="Đang tải biểu đồ Dashboard CCC">
      <div className="grid gap-4 xl:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <SkeletonCard height={300} />
        <SkeletonCard height={300} />
      </div>
    </div>
  );
}
