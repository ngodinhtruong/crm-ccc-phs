import { Search } from "lucide-react";

import { ChatbotFaqItem } from "@/types/chatbot-dashboard.type";
import { formatDateTime } from "@/utils/date.util";

export function FaqTab({
  faqs,
  count,
  keyword,
  onKeywordChange,
  onSearch,
}: {
  faqs: ChatbotFaqItem[];
  count: number;
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
}) {
  const totalHits = faqs.reduce((sum, item) => sum + item.hit_count, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            FAQ được hỏi nhiều nhất
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Xếp hạng chủ đề (category) khách hàng hỏi nhiều nhất. Không tính câu
            chào hỏi và câu không liên quan.
          </p>
        </div>

        <div className="text-xs text-slate-500">
          Chủ đề: <span className="font-bold text-slate-800">{count}</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 border-b border-slate-100 bg-[#f8fafc] px-4 py-3">
        <div className="col-span-12 md:col-span-8">
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Tìm kiếm
          </label>

          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSearch();
              }
            }}
            placeholder="Nhập chủ đề, câu hỏi hoặc câu trả lời..."
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
          />
        </div>

        <div className="col-span-12 flex items-end md:col-span-4">
          <button
            type="button"
            onClick={onSearch}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#0097cf] px-4 text-xs font-semibold text-white transition hover:bg-[#0089bd]"
          >
            <Search size={14} />
            Tìm kiếm
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-11 border-b bg-white text-slate-700">
              <th className="w-[70px] px-3 font-semibold">STT</th>
              <th className="px-3 font-semibold">Chủ đề</th>
              <th className="w-[130px] px-3 font-semibold">Số lượt hỏi</th>
              <th className="w-[110px] px-3 font-semibold">Số phiên</th>
              <th className="w-[120px] px-3 font-semibold">Tỉ trọng</th>
              <th className="w-[170px] px-3 font-semibold">Lần hỏi gần nhất</th>
            </tr>
          </thead>

          <tbody>
            {faqs.length === 0 && (
              <tr>
                <td colSpan={6} className="h-24 text-center text-slate-500">
                  Chưa có câu hỏi nào được chatbot gán chủ đề.
                </td>
              </tr>
            )}

            {faqs.map((item, index) => (
              <tr
                key={item.category}
                className={`h-14 border-b border-slate-100 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"
                } hover:bg-sky-50`}
              >
                <td className="px-3">{index + 1}</td>

                <td className="px-3 font-medium text-slate-700">
                  {item.category}
                </td>

                <td className="px-3">
                  <span className="rounded-full bg-sky-100 px-3 py-1 font-semibold text-sky-700">
                    {item.hit_count}
                  </span>
                </td>

                <td className="px-3">{item.session_count}</td>

                <td className="px-3 text-slate-600">
                  {totalHits
                    ? `${Math.round((item.hit_count / totalHits) * 100)}%`
                    : "-"}
                </td>

                <td className="px-3">{formatDateTime(item.latest_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
