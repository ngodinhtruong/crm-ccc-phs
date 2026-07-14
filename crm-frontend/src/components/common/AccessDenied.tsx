import { ShieldAlert } from "lucide-react";

export function AccessDenied({
  title = "Không có quyền truy cập",
  description = "Tài khoản của bạn chưa được cấp quyền để sử dụng chức năng này.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-md border border-slate-200 bg-white p-6">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <ShieldAlert size={24} />
        </div>

        <h2 className="mt-3 text-sm font-semibold text-slate-800">
          {title}
        </h2>

        <p className="mt-1 max-w-md text-xs text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}