"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { BreadcrumbItem } from "@/types/common.type";

type StoredBreadcrumbItem = Required<BreadcrumbItem> & {
  pathname: string;
};

const STORAGE_PREFIX = "crm_navigation_breadcrumb_history_v1";
const MAX_BREADCRUMB_ITEMS = 8;

function normalizePathname(value: string) {
  const path = value.split("?")[0]?.split("#")[0] || "/";

  if (path === "/") return path;

  return path.replace(/\/+$/, "");
}

function getStorageKey(homeHref: string) {
  return `${STORAGE_PREFIX}:${normalizePathname(homeHref)}`;
}

function readStoredHistory(storageKey: string): StoredBreadcrumbItem[] {
  if (typeof window === "undefined") return [];

  try {
    const value = window.sessionStorage.getItem(storageKey);
    if (!value) return [];

    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is StoredBreadcrumbItem => {
      if (!item || typeof item !== "object") return false;

      const candidate = item as Partial<StoredBreadcrumbItem>;

      return Boolean(
        candidate.label &&
          typeof candidate.label === "string" &&
          candidate.href &&
          typeof candidate.href === "string" &&
          candidate.pathname &&
          typeof candidate.pathname === "string"
      );
    });
  } catch {
    return [];
  }
}

function writeStoredHistory(
  storageKey: string,
  history: StoredBreadcrumbItem[]
) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(history));
  } catch {
    // Trình duyệt có thể chặn storage trong chế độ riêng tư hoặc policy nội bộ.
  }
}

function limitHistory(history: StoredBreadcrumbItem[]) {
  if (history.length <= MAX_BREADCRUMB_ITEMS) return history;

  return [history[0], ...history.slice(-(MAX_BREADCRUMB_ITEMS - 1))];
}

function getCurrentPageLabel(items: BreadcrumbItem[]) {
  if (items.length === 0) return "";

  const lastItem = items[items.length - 1];
  const label = lastItem?.label?.trim() || "";

  if (items.length === 1 && /^(trang chủ|home)$/i.test(label)) {
    return "";
  }

  return label;
}

export function useNavigationBreadcrumbs({
  declaredItems,
  homeHref,
  enabled = true,
}: {
  declaredItems: BreadcrumbItem[];
  homeHref: string;
  enabled?: boolean;
}) {
  const pathname = normalizePathname(usePathname() || "/");
  const normalizedHomePath = normalizePathname(homeHref);
  const currentLabel = getCurrentPageLabel(declaredItems);

  const homeItem = useMemo<StoredBreadcrumbItem>(
    () => ({
      label: "TRANG CHỦ",
      href: homeHref,
      pathname: normalizedHomePath,
    }),
    [homeHref, normalizedHomePath]
  );

  const fallbackItems = useMemo<StoredBreadcrumbItem[]>(() => {
    if (pathname === normalizedHomePath || !currentLabel) {
      return [homeItem];
    }

    return [
      homeItem,
      {
        label: currentLabel,
        href: pathname,
        pathname,
      },
    ];
  }, [currentLabel, homeItem, normalizedHomePath, pathname]);

  const [history, setHistory] = useState<StoredBreadcrumbItem[]>(fallbackItems);

  useEffect(() => {
    if (!enabled) return;

    const storageKey = getStorageKey(homeHref);
    const storedHistory = readStoredHistory(storageKey);

    if (pathname === normalizedHomePath) {
      const nextHistory = [homeItem];
      writeStoredHistory(storageKey, nextHistory);
      setHistory(nextHistory);
      return;
    }

    // Một số trang chi tiết chỉ truyền breadcrumb "TRANG CHỦ" trong lúc tải.
    // Khi đó giữ nguyên lịch sử cũ, chờ nhãn trang thật được tải xong.
    if (!currentLabel) {
      const nextHistory = storedHistory.length > 0 ? storedHistory : [homeItem];
      setHistory(nextHistory);
      return;
    }

    const currentHref = `${window.location.pathname}${window.location.search}`;
    const currentItem: StoredBreadcrumbItem = {
      label: currentLabel,
      href: currentHref,
      pathname,
    };

    const validStoredHistory =
      storedHistory.length > 0 &&
      storedHistory[0]?.pathname === normalizedHomePath
        ? storedHistory
        : [homeItem];

    const existingIndex = validStoredHistory.findIndex(
      (item) => item.pathname === pathname
    );

    let nextHistory: StoredBreadcrumbItem[];

    if (existingIndex >= 0) {
      // Quay lại một breadcrumb cũ hoặc dùng nút Back của trình duyệt:
      // cắt bỏ các trang nằm sau vị trí vừa quay về.
      nextHistory = validStoredHistory.slice(0, existingIndex + 1);
      nextHistory[existingIndex] = currentItem;
    } else {
      // Route mới luôn được nối sau trang người dùng vừa đứng trước đó.
      nextHistory = [...validStoredHistory, currentItem];
    }

    nextHistory = limitHistory(nextHistory);
    writeStoredHistory(storageKey, nextHistory);
    setHistory(nextHistory);
  }, [
    currentLabel,
    enabled,
    homeHref,
    homeItem,
    normalizedHomePath,
    pathname,
  ]);

  const truncateAt = useCallback(
    (index: number) => {
      const storageKey = getStorageKey(homeHref);
      const nextHistory = history.slice(0, index + 1);

      writeStoredHistory(storageKey, nextHistory);
      setHistory(nextHistory);
    },
    [history, homeHref]
  );

  return {
    items: history.map(({ label, href }) => ({ label, href })),
    truncateAt,
  };
}
