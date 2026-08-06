"use client";
import { ReactNode } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { FailedEkycHeaderNav } from "./FailedEkycHeaderNav";

export function FailedEkycShell({ title, children }: { title: string; children: ReactNode }) {
  return <DashboardLayout breadcrumbs={[{ label: "TRANG CHỦ", href: "/workspace" }, { label: "FAILED eKYC", href: "/failed-ekyc" }, { label: title }]} sidebarDefaultExpandedGroupKey="failed-ekyc" sidebarDefaultActiveChildKey={`failed-ekyc-${title === "Dashboard" ? "dashboard" : title === "Danh sách" ? "list" : title === "Nhập mới" ? "create" : "import"}`} rightAction={<FailedEkycHeaderNav/>}><div className="p-2">{children}</div></DashboardLayout>;
}
