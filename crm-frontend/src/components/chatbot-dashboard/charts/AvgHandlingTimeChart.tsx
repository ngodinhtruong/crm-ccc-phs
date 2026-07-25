"use client";

import type { AvgHandlingTimes } from "@/types/chatbot-dashboard.type";

const decimalFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 1,
});

function MetricCard({
  title,
  minutes,
  icon,
  description,
  badgeColor,
}: {
  title: string;
  minutes: number;
  icon: string;
  description: string;
  badgeColor: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${badgeColor}`}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {decimalFormatter.format(minutes)}
          </span>
          <span className="text-xs font-medium text-slate-500">phút</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function AvgHandlingTimeChart({
  data,
}: {
  data?: AvgHandlingTimes | null;
}) {
  const times = data || {
    avg_bot_duration_min: 0,
    avg_response_time_min: 0,
    avg_resolution_time_min: 0,
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">
          Chỉ số thời gian phản hồi & giải quyết (Resolution Speed)
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Thời gian trung bình ở từng công đoạn trong vòng đời xử lý yêu cầu.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          title="Thời gian Chatbot"
          minutes={times.avg_bot_duration_min}
          icon="🤖"
          description="Thời gian KH tương tác trung bình với Bot"
          badgeColor="bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
        />

        <MetricCard
          title="Thời gian CCC Tiếp Nhận"
          minutes={times.avg_response_time_min}
          icon="⚡"
          description="Thời gian từ khi sinh Ticket đến khi NV tiếp nhận"
          badgeColor="bg-sky-50 text-sky-600 ring-1 ring-sky-100"
        />

        <MetricCard
          title="Thời gian Giải Quyết"
          minutes={times.avg_resolution_time_min}
          icon="✅"
          description="Thời gian từ khi tạo đến khi Đóng/Hoàn thành"
          badgeColor="bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"
        />
      </div>
    </div>
  );
}
