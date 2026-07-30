import { HomeTicket } from "@/types/dashboard.type";

export function HomeLatestTicketsTable({
  rows,
}: {
  rows: HomeTicket[];
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex h-12 items-center justify-between border-b bg-white px-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Ticket mới chưa xử lý
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Danh sách ticket mới nhất cần được tiếp nhận hoặc xử lý.
          </p>
        </div>

        <button
          type="button"
          className="text-xs font-semibold text-[#059669] hover:underline"
        >
          Xem thêm
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead>
            <tr className="h-11 border-b-2 border-slate-200 bg-slate-50 text-slate-700">
              <th className="w-[140px] px-4 font-semibold">Mã Ticket</th>
              <th className="w-[170px] px-4 font-semibold">Chi nhánh xử lý</th>
              <th className="w-[160px] px-4 font-semibold">Phân loại</th>
              <th className="w-[180px] px-4 font-semibold">Công ty</th>
              <th className="w-[140px] px-4 font-semibold">Tình trạng</th>
              <th className="w-[350px] px-4 font-semibold">Mô tả</th>
              <th className="w-[150px] px-4 font-semibold">Nguồn Ticket</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="h-28 text-center text-slate-500">
                  Chưa có ticket mới chưa xử lý.
                </td>
              </tr>
            )}

            {rows.map((ticket, index) => {
              const rowBg = index % 2 === 0 ? "bg-white" : "bg-slate-50/60";

              return (
                <tr
                  key={ticket.id}
                  className={`h-[46px] border-b border-slate-200 ${rowBg} hover:bg-sky-50`}
                >
                  <td className="px-4 font-semibold text-sky-600">
                    #{ticket.ticket_code}
                  </td>

                  <td className="px-4 text-slate-700">{ticket.branch_name || "-"}</td>
                  <td className="px-4 text-slate-700">{ticket.classification_name || "-"}</td>
                  <td className="px-4 text-slate-700">{ticket.company_name || "-"}</td>
                  <td className="px-4 text-slate-700">{ticket.status_name || "-"}</td>

                  <td className="max-w-[350px] truncate px-3">
                    {ticket.description || "-"}
                  </td>

                  <td className="px-4 text-slate-700">{ticket.source_name || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}