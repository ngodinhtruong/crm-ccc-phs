"use client";

import { useMemo } from "react";
import { Crown } from "lucide-react";

import { TablePagination } from "@/components/common";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { useCustomers } from "@/hooks/useCustomers";

/**
 * Hạng hiện sẵn khi mở trang. Người dùng đổi sang hạng khác bằng ô lọc
 * "Phân loại VIP" ngay trên bảng.
 *
 * Đối chiếu theo TÊN hạng chứ không hardcode id: id là dữ liệu môi trường,
 * seed lại một phát là lệch, còn tên hạng thì hiện ngay trên giao diện nên sai
 * là thấy liền.
 */
const DEFAULT_TIER_NAME = "VIP Gold";

/**
 * Danh sách khách hàng tiềm năng, hiển thị đầy đủ như trang /customers.
 *
 * Dùng lại nguyên ``useCustomers`` + ``CustomerTable`` thay vì dựng bảng riêng:
 * toàn bộ cột, hàng lọc và phân trang của màn khách hàng có sẵn ở đó, chép lại
 * một bản rút gọn thì mỗi lần thêm cột phải sửa hai nơi.
 *
 * Khác biệt duy nhất: lọc sẵn theo hạng mặc định, và bấm một dòng thì mở số
 * liệu 360 ngay tại chỗ thay vì điều hướng sang trang chi tiết.
 */
export function PotentialCustomerTable({
  onSelect,
}: {
  onSelect: (customerId: number) => void;
}) {
  const customerState = useCustomers({
    defaultMembershipTierName: DEFAULT_TIER_NAME,
  });

  const defaultTierId = useMemo(
    () =>
      customerState.membershipTiers
        .find((tier) => tier.tier_name === DEFAULT_TIER_NAME)
        ?.id.toString() ?? "",
    [customerState.membershipTiers]
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Crown size={15} className="text-amber-500" />
        <h3 className="text-xs font-black tracking-wide text-[#00713d]">
          KHÁCH HÀNG TIỀM NĂNG
        </h3>
        <span className="text-[11px] text-slate-400">
          bấm một dòng để xem 360 của khách đó; đổi hạng ở ô Phân loại VIP
        </span>

        <div className="ml-auto flex items-center gap-2">
          <TablePagination
            fromRecord={customerState.fromRecord}
            toRecord={customerState.toRecord}
            count={customerState.count}
            page={customerState.page}
            totalPages={customerState.totalPages}
            loading={customerState.loading}
            onPrevious={customerState.previousPage}
            onNext={customerState.nextPage}
          />

          <button
            type="button"
            onClick={() => {
              customerState.clearFilter();
              // clearFilter xóa cả hạng VIP, đặt lại để danh sách quay về
              // đúng mặc định chứ không bung ra thành toàn bộ khách hàng.
              customerState.setMembershipTier(defaultTierId);
            }}
            className="h-8 shrink-0 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Xóa lọc
          </button>
        </div>
      </div>

      <CustomerTable customerState={customerState} onRowClick={onSelect} />
    </section>
  );
}
