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

function getSectionRootPath(path: string): string {
  const normalized = normalizePathname(path);
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return "/";
  return `/${segments[0]}`;
}

function getStorageKey(homeHref: string) {
  return `${STORAGE_PREFIX}:${normalizePathname(homeHref)}`;
}

function isChildPath(parentPath: string, candidatePath: string): boolean {
  if (parentPath === candidatePath) return false;

  // 1. Nếu trang candidate nằm trong đường dẫn con của parentPath
  if (candidatePath.startsWith(`${parentPath}/`)) return true;

  // 2. Nếu cùng thuộc một nhóm route (vd: parent = /customers, candidate = /customers/360)
  const parentSeg = parentPath.split("/").filter(Boolean)[0];
  const candidateSeg = candidatePath.split("/").filter(Boolean)[0];
  if (parentSeg && candidateSeg && parentSeg === candidateSeg) {
    return candidatePath.length > parentPath.length;
  }

  return false;
}

const MAIN_SECTION_LIST_ROUTES = new Set([
  "/tickets",
  "/customers",
  "/chatbots/dashboard",
  "/external-errors",
  "/external-errors/dashboard",
  "/surveys",
  "/accounts/users",
  "/sale-admin/records",
  "/sale-admin/dashboard",
  "/sale-admin/inactive-customers",
  "/sale-admin/kpis/personal",
  "/sale-admin/kpis/admin",
  "/sla",
  "/ekyc",
  "/failed-ekyc",
  "/ccc/dashboard",
  "/dashboard",
  "/workspace",
]);

function isMainSectionListPage(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  if (MAIN_SECTION_LIST_ROUTES.has(normalized)) return true;
  const segments = normalized.split("/").filter(Boolean);
  return segments.length <= 1;
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

    // Kiểm tra nếu trang mới là trang danh mục cha của các trang con trước đó trong lịch sử
    // (ví dụ: đang ở trang con như /customers/360, /tickets/123 mà bấm về trang cha như /customers, /tickets)
    // thì lập tức cắt bỏ toàn bộ các nhánh con ra khỏi lịch sử.
    const childIndex = validStoredHistory.findIndex(
      (item) =>
        item.pathname !== normalizedHomePath &&
        isChildPath(pathname, item.pathname)
    );

    const currentSectionRoot = getSectionRootPath(pathname);
    const lastItemPath =
      validStoredHistory.length > 1
        ? validStoredHistory[validStoredHistory.length - 1].pathname
        : null;
    const lastSectionRoot = lastItemPath
      ? getSectionRootPath(lastItemPath)
      : currentSectionRoot;
    const isDifferentSection = lastSectionRoot !== currentSectionRoot;
    const isMainList = isMainSectionListPage(pathname);

    let nextHistory: StoredBreadcrumbItem[];

    if (isMainList || isDifferentSection) {
      // Khi truy cập bất kỳ trang danh sách cha chính nào (vd: /tickets, /customers, /surveys, /external-errors,...):
      // XÓA SẠCH hoàn toàn lịch sử cũ và khởi tạo lại từ Trang chủ + Trang mới.
      if (declaredItems && declaredItems.length > 1) {
        nextHistory = declaredItems.map((item, idx) => ({
          label: item.label,
          href: item.href || (idx === 0 ? homeHref : currentHref),
          pathname: idx === 0 ? normalizedHomePath : pathname,
        }));
      } else {
        nextHistory = [homeItem, currentItem];
      }
    } else if (existingIndex >= 0) {
      // Quay lại một breadcrumb cũ hoặc dùng nút Back của trình duyệt:
      // cắt bỏ các trang nằm sau vị trí vừa quay về.
      nextHistory = validStoredHistory.slice(0, existingIndex + 1);
      nextHistory[existingIndex] = currentItem;
    } else if (childIndex >= 0) {
      // Quay lại trang danh sách cha từ trang con: cắt bỏ các trang con đứng sau.
      nextHistory = validStoredHistory.slice(0, childIndex);
      nextHistory.push(currentItem);
    } else {
      // Route mới trong cùng phân hệ: nối sau trang người dùng vừa đứng trước đó.
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
