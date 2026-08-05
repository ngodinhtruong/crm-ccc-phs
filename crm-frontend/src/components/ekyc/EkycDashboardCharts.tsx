"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { EkycDailyTrend } from "@/types/ekyc.type";

// ──────────────────────────────────────────
// Colour palette matching the screenshots
// ──────────────────────────────────────────
const C_GREEN   = "#2e7d32";   // dark green  – "Liên hệ thành công / Kết nối"
const C_ORANGE  = "#e65100";   // deep orange – "Không liên hệ / Không kết nối"
const C_BLUE    = "#1565c0";   // blue        – "Khác"
const C_GREEN2  = "#43a047";   // lighter green (bar chart totals)
const C_RED     = "#c62828";   // dark red    – "KH bấm nút" (problems)
const C_GREY    = "#78909c";   // grey        – "KH Tắt máy ngang"
const C_LIME    = "#7cb342";   // lime green  – "KH không kết nối"
const C_SURVEY_GREEN = "#558b2f"; // olive green – "Gọi khảo sát"
const C_SURVEY_RED   = "#b71c1c"; // deep red    – "Không gọi"

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-green-800">
        {title}
      </h3>
      {children}
    </div>
  );
}

interface EkycChartsProps {
  trends: EkycDailyTrend[];
}

// ──────────────────────────────────────────
// 1. Tổng số lượng eKYC (bar - total per period)
// ──────────────────────────────────────────
function ChartTongSoLuong({ trends }: { trends: EkycDailyTrend[] }) {
  if (!trends.length) return <p className="text-center text-xs text-slate-400 py-8">Không có dữ liệu</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={trends} barCategoryGap="40%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip formatter={(v: any) => [v, "Số lượng"]} />
        <Bar dataKey="count" name="Tổng số lượng" fill={C_GREEN2} radius={[3, 3, 0, 0]}>
          <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 700, fill: "#1b5e20" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ──────────────────────────────────────────
// 2. Kết quả CS gọi khảo sát eKYC (grouped bar - liên hệ vs không liên hệ)
// ──────────────────────────────────────────
function ChartKetQuaCSGoi({ trends }: { trends: EkycDailyTrend[] }) {
  if (!trends.length) return <p className="text-center text-xs text-slate-400 py-8">Không có dữ liệu</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={trends} barCategoryGap="30%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="lien_he_thanh_cong" name="Liên hệ KH thành công" fill={C_GREEN} radius={[3, 3, 0, 0]}>
          <LabelList dataKey="lien_he_thanh_cong" position="top" style={{ fontSize: 10, fontWeight: 700, fill: C_GREEN }} />
        </Bar>
        <Bar dataKey="khong_lien_he_duoc" name="Không liên hệ được KH" fill={C_ORANGE} radius={[3, 3, 0, 0]}>
          <LabelList dataKey="khong_lien_he_duoc" position="top" style={{ fontSize: 10, fontWeight: 700, fill: C_ORANGE }} />
        </Bar>
        <Bar dataKey="khac_lien_he" name="Khác" fill={C_BLUE} radius={[3, 3, 0, 0]}>
          <LabelList dataKey="khac_lien_he" position="top" style={{ fontSize: 10, fontWeight: 700, fill: C_BLUE }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ──────────────────────────────────────────
// 3. Tổng số lượng khảo sát (ComposedChart: bar + line)
// ──────────────────────────────────────────
function ChartTongSoKhaoSat({ trends }: { trends: EkycDailyTrend[] }) {
  if (!trends.length) return <p className="text-center text-xs text-slate-400 py-8">Không có dữ liệu</p>;
  const surveyTrends = trends.map((trend) => ({
    ...trend,
    called: Number(trend.called ?? 0),
    not_called: Number(trend.not_called ?? 0),
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={surveyTrends} barCategoryGap="40%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="called" name="Gọi khảo sát" fill={C_SURVEY_GREEN} radius={[3, 3, 0, 0]}>
          <LabelList dataKey="called" position="top" style={{ fontSize: 10, fontWeight: 700, fill: C_SURVEY_GREEN }} />
        </Bar>
        <Bar dataKey="not_called" name="Không gọi" fill={C_SURVEY_RED} radius={[3, 3, 0, 0]}>
          <LabelList dataKey="not_called" position="top" style={{ fontSize: 10, fontWeight: 700, fill: C_SURVEY_RED }} />
        </Bar>
        <Line
          type="monotone"
          dataKey="count"
          name="Tổng"
          stroke="#0891b2"
          strokeWidth={3}
          dot={{ fill: "#0891b2", r: 5, stroke: "#fff", strokeWidth: 2 }}
          activeDot={{ r: 7 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ──────────────────────────────────────────
// 4. Kết quả kết nối (grouped bar)
// ──────────────────────────────────────────
function ChartKetQuaKetNoi({ trends }: { trends: EkycDailyTrend[] }) {
  if (!trends.length) return <p className="text-center text-xs text-slate-400 py-8">Không có dữ liệu</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={trends} barCategoryGap="30%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="ket_noi_thanh_cong" name="Kết nối KH thành công" fill={C_GREEN} radius={[3, 3, 0, 0]}>
          <LabelList dataKey="ket_noi_thanh_cong" position="top" style={{ fontSize: 10, fontWeight: 700, fill: C_GREEN }} />
        </Bar>
        <Bar dataKey="khong_ket_noi_duoc" name="Không kết nối được KH" fill={C_ORANGE} radius={[3, 3, 0, 0]}>
          <LabelList dataKey="khong_ket_noi_duoc" position="top" style={{ fontSize: 10, fontWeight: 700, fill: C_ORANGE }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ──────────────────────────────────────────
// 5. Kết quả KH phản hồi (grouped bar - 4 series)
// ──────────────────────────────────────────
function ChartKetQuaKhPhanHoi({ trends }: { trends: EkycDailyTrend[] }) {
  if (!trends.length) return <p className="text-center text-xs text-slate-400 py-8">Không có dữ liệu</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={trends} barCategoryGap="25%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="bam_phim" name="KH bấm nút 1 (Không gặp trở ngại)" fill={C_SURVEY_GREEN} radius={[3, 3, 0, 0]}>
          <LabelList dataKey="bam_phim" position="top" style={{ fontSize: 10, fontWeight: 700, fill: C_SURVEY_GREEN }} />
        </Bar>
        <Bar dataKey="khong_bam_phim" name="KH không bấm nút" fill={C_RED} radius={[3, 3, 0, 0]}>
          <LabelList dataKey="khong_bam_phim" position="top" style={{ fontSize: 10, fontWeight: 700, fill: C_RED }} />
        </Bar>
        <Bar dataKey="tat_may_ngang" name="KH Tắt máy ngang" fill={C_GREY} radius={[3, 3, 0, 0]}>
          <LabelList dataKey="tat_may_ngang" position="top" style={{ fontSize: 10, fontWeight: 700, fill: C_GREY }} />
        </Bar>
        <Bar dataKey="khong_ket_noi_result" name="KH không kết nối" fill={C_LIME} radius={[3, 3, 0, 0]}>
          <LabelList dataKey="khong_ket_noi_result" position="top" style={{ fontSize: 10, fontWeight: 700, fill: C_LIME }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ──────────────────────────────────────────
// Main export
// ──────────────────────────────────────────
export function EkycDashboardCharts({ trends }: EkycChartsProps) {
  if (!trends || trends.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-sm text-slate-400">
        Chưa có dữ liệu biểu đồ trong khoảng thời gian đã chọn
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Tổng số lượng eKYC">
          <ChartTongSoLuong trends={trends} />
        </ChartCard>
        <ChartCard title="Kết quả CS gọi khảo sát eKYC">
          <ChartKetQuaCSGoi trends={trends} />
        </ChartCard>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Tổng số lượng khảo sát">
          <ChartTongSoKhaoSat trends={trends} />
        </ChartCard>
        <ChartCard title="Kết quả kết nối">
          <ChartKetQuaKetNoi trends={trends} />
        </ChartCard>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Kết quả KH phản hồi">
          <ChartKetQuaKhPhanHoi trends={trends} />
        </ChartCard>
      </div>
    </div>
  );
}
