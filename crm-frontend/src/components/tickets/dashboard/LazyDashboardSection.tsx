"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export function LazyDashboardSection({
  children,
  minHeight = 320,
  rootMargin = "320px 0px",
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;

    const element = containerRef.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return (
    <div ref={containerRef} style={!visible ? { minHeight } : undefined}>
      {visible ? (
        children
      ) : (
        <div
          className="h-full min-h-[240px] animate-pulse rounded-md border border-slate-200 bg-slate-50"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
