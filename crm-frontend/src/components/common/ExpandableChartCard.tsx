"use client";

import React, { useState, useEffect, ReactNode } from "react";
import { Maximize2, X } from "lucide-react";

export interface ExpandableChartCardProps {
  title: string;
  description?: string;
  children: ReactNode | ((isExpanded: boolean) => ReactNode);
  className?: string;
  headerRight?: ReactNode;
  allowExpand?: boolean;
  expandedHeightClass?: string;
}

export function ExpandableChartCard({
  title,
  description,
  children,
  className = "",
  headerRight,
  allowExpand = true,
  expandedHeightClass = "h-[68vh]",
}: ExpandableChartCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Close modal when pressing Escape key
  useEffect(() => {
    if (!isExpanded) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExpanded(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  // Lock body scroll without layout shift (scrollbar jump) when modal is open
  useEffect(() => {
    if (isExpanded) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isExpanded]);

  const renderContent = (expanded: boolean) => {
    if (typeof children === "function") {
      return children(expanded);
    }
    return children;
  };

  return (
    <>
      {/* Standard Inline Chart Card */}
      <div
        className={`group relative rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md ${className}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <div className="flex-1 pr-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#059669]">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {headerRight}

            {allowExpand && (
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Phóng to biểu đồ"
                aria-label="Phóng to biểu đồ"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-5">{renderContent(false)}</div>
      </div>

      {/* Expanded Modal Overlay & Container */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 md:p-8 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="relative flex w-full max-w-6xl max-h-[92vh] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#059669]">
                  {title}
                </h3>
                {description && (
                  <p className="mt-1 text-xs text-slate-500">{description}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {headerRight}
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-200/80 hover:text-slate-900 transition-colors"
                  title="Đóng (Esc)"
                  aria-label="Đóng biểu đồ"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className={`p-6 overflow-y-auto ${expandedHeightClass}`}>
              {renderContent(true)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ExpandableChartCard;
