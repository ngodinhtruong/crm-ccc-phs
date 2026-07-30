"use client";

import { useMemo } from "react";
import type { FunnelStepItem } from "@/types/chatbot-dashboard.type";

const STEP_COLORS = [
  "#0097cf", // 1. Total Sessions (PHS Sky Blue)
  "#f59e0b", // 2. Bot unresolved (Amber)
  "#8b5cf6", // 3. Requested info (Purple)
  "#06b6d4", // 4. Provided info (Cyan)
  "#10b981", // 5. Ticket created (Fresh Green)
  "#10b981", // 6. CCC processed (Emerald)
];

export function FunnelChartComponent({ data }: { data?: FunnelStepItem[] | null }) {
  const steps = useMemo(() => {
    if (Array.isArray(data) && data.length > 0) return data;
    return [
      { step: 1, name: "1. Tổng Session", count: 245 },
      { step: 2, name: "2. BOT không xử lý được", count: 186 },
      { step: 3, name: "3. Hỏi xin thông tin KH", count: 128 },
      { step: 4, name: "4. KH đã cung cấp thông tin", count: 95 },
      { step: 5, name: "5. Tạo Ticket thành công", count: 70 },
      { step: 6, name: "6. CCC đã xử lý xong", count: 62 },
    ];
  }, [data]);

  const maxCount = useMemo(() => Math.max(...steps.map((s) => s.count), 1), [steps]);

  // Compute trapezoid dimensions for SVG Funnel
  const funnelShapes = useMemo(() => {
    const totalWidth = 480;
    const minWidth = 140;
    const stageHeight = 44;
    const gap = 5;

    // Calculate widths for each level based on count proportion
    const widths = steps.map((s) => {
      const ratio = s.count / maxCount;
      return Math.max(minWidth, Math.round(ratio * totalWidth));
    });

    return steps.map((item, idx) => {
      const topW = idx === 0 ? totalWidth : widths[idx - 1];
      const botW = widths[idx];

      const yTop = idx * (stageHeight + gap);
      const yBot = yTop + stageHeight;

      const xTopLeft = (500 - topW) / 2;
      const xTopRight = (500 + topW) / 2;
      const xBotLeft = (500 - botW) / 2;
      const xBotRight = (500 + botW) / 2;

      const points = `${xTopLeft},${yTop} ${xTopRight},${yTop} ${xBotRight},${yBot} ${xBotLeft},${yBot}`;

      const prevCount = idx > 0 ? steps[idx - 1].count : null;
      const convRate = prevCount && prevCount > 0 ? ((item.count / prevCount) * 100).toFixed(1) : "100.0";
      const dropRate = prevCount && prevCount > 0 ? (((prevCount - item.count) / prevCount) * 100).toFixed(1) : "0.0";

      return {
        ...item,
        points,
        yCenter: yTop + stageHeight / 2,
        color: STEP_COLORS[idx % STEP_COLORS.length],
        convRate,
        dropRate,
      };
    });
  }, [steps, maxCount]);

  return (
    <div className="w-full max-w-[540px] flex flex-col items-center py-2">
      <svg viewBox="0 0 500 295" className="w-full h-auto overflow-visible">
        {funnelShapes.map((shape, idx) => (
          <g key={shape.step} className="group cursor-pointer transition-all duration-300">
            {/* Trapezoid Polygon Body */}
            <polygon
              points={shape.points}
              fill={shape.color}
              className="transition-opacity duration-200 group-hover:opacity-90 shadow-md"
            />

            {/* Left Label: Step Name */}
            <text
              x="250"
              y={shape.yCenter - 3}
              textAnchor="middle"
              fill="#ffffff"
              className="text-[12px] font-bold select-none drop-shadow-sm"
            >
              {shape.name}
            </text>

            {/* Sub-label: Count & Conversion rate */}
            <text
              x="250"
              y={shape.yCenter + 12}
              textAnchor="middle"
              fill="#ffffff"
              className="text-[11px] font-extrabold select-none opacity-95"
            >
              {shape.count.toLocaleString("vi-VN")} phiên {idx > 0 ? `(${shape.convRate}%)` : ""}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
