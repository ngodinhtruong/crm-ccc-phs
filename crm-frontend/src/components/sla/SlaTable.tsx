import { Edit, Lock, MoreVertical } from "lucide-react";

import { SlaPolicyItem } from "@/types/sla.type";

function getPolicyName(item: SlaPolicyItem) {
  return item.sla_name || "-";
}

function getCategoryName(item: SlaPolicyItem) {
  return item.support_category_name || "-";
}

function getProcessingUnitName(item: SlaPolicyItem) {
  return item.processing_unit_name || "-";
}

function getAssignedToName(item: SlaPolicyItem) {
  return item.assigned_to_user_name || "-";
}

function getStatusLabel(status?: string | null) {
  if (status === "DRAFT") return "Nháp";
  if (status === "PENDING_APPROVAL") return "Chờ duyệt";
  if (status === "ACTIVE") return "Hoạt động";
  if (status === "INACTIVE") return "Ngừng hoạt động";
  if (status === "REJECTED") return "Từ chối";

  return status || "-";
}

function SlaStatusBadge({
  status,
  isActive,
}: {
  status?: string | null;
  isActive?: boolean | null;
}) {
  if (status === "ACTIVE" || isActive) {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        {getStatusLabel(status)}
      </span>
    );
  }

  if (status === "PENDING_APPROVAL") {
    return (
      <span className="inline-flex rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
        {getStatusLabel(status)}
      </span>
    );
  }

  if (status === "REJECTED") {
    return (
      <span className="inline-flex rounded-md bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
        {getStatusLabel(status)}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      {getStatusLabel(status)}
    </span>
  );
}

export function SlaTable({
  items,
  loading,
  error,
}: {
  items: SlaPolicyItem[];
  loading: boolean;
  error: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
        <thead>
          <tr className="h-11 border-b-2 border-slate-200 bg-slate-50 text-slate-700">
            <th className="sticky left-0 z-10 w-[110px] bg-slate-50 px-4 font-semibold">
              Thao tác
            </th>
            <th className="w-[130px] px-4 font-semibold">Mã SLA</th>
            <th className="w-[260px] px-4 font-semibold">Tên SLA</th>
            <th className="w-[180px] px-4 font-semibold">Danh mục Ticket</th>
            <th className="w-[160px] px-4 font-semibold">Thời gian xử lý</th>
            <th className="w-[170px] px-4 font-semibold">Phân công xử lý</th>
            <th className="w-[200px] px-4 font-semibold">Giao cho</th>
            <th className="w-[300px] px-4 font-semibold">Mô tả</th>
            <th className="w-[150px] px-4 font-semibold">Trạng thái</th>
          </tr>
        </thead>

        <tbody>
          {loading && (
            <tr>
              <td colSpan={9} className="h-28 text-center text-slate-500">
                Đang tải dữ liệu...
              </td>
            </tr>
          )}

          {error && (
            <tr>
              <td colSpan={9} className="h-28 px-4 text-center text-red-600">
                {error}
              </td>
            </tr>
          )}

          {!loading && !error && items.length === 0 && (
            <tr>
              <td colSpan={9} className="h-28 text-center text-slate-500">
                Không có dữ liệu SLA.
              </td>
            </tr>
          )}

          {!loading &&
            !error &&
            items.map((item, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/60";

              return (
                <tr
                  key={item.id}
                  className={`h-[46px] border-b border-slate-200 ${rowBg} hover:bg-emerald-50`}
                >
                  <td className={`sticky left-0 z-10 px-3 ${rowBg}`}>
                    <div className="flex items-center gap-3 text-slate-400">
                      <button
                        type="button"
                        title="Sửa"
                        className="hover:text-emerald-600"
                      >
                        <Edit size={15} />
                      </button>

                      <button
                        type="button"
                        title="Khóa / kích hoạt"
                        className="hover:text-emerald-600"
                      >
                        <Lock size={15} />
                      </button>

                      <button
                        type="button"
                        title="Thêm"
                        className="hover:text-emerald-600"
                      >
                        <MoreVertical size={15} />
                      </button>
                    </div>
                  </td>

                  <td className="px-4 text-[#059669]">
                    {item.sla_code || `SLA-${item.id}`}
                  </td>

                  <td className="px-4 font-semibold text-[#059669]">
                    {getPolicyName(item)}
                  </td>

                  <td className="px-4 text-slate-700">{getCategoryName(item)}</td>

                  <td className="px-4 text-slate-700">
                    {item.resolution_time_minutes
                      ? `${item.resolution_time_minutes} phút`
                      : "-"}
                  </td>

                  <td className="px-4 text-slate-700">{getProcessingUnitName(item)}</td>

                  <td className="px-4 text-slate-700">{getAssignedToName(item)}</td>

                  <td className="max-w-[300px] truncate px-3">
                    {item.description || "-"}
                  </td>

                  <td className="px-4 text-slate-700">
                    <SlaStatusBadge
                      status={item.status}
                      isActive={item.is_active}
                    />
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}