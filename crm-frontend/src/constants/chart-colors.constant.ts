/**
 * Bảng màu biểu đồ của CRM PHS — màu chủ đạo #00713d.
 *
 * Mọi giá trị ở đây đã chạy qua bộ kiểm màu (dải sáng OKLCH, sàn chroma, độ
 * tách màu cho người mù màu protan/deutan, sàn thị lực thường, tương phản với
 * nền) trên nền trắng `#ffffff` — đúng nền mà thẻ biểu đồ đang render. Đừng
 * đặt hex mới trực tiếp trong component: thêm vào đây rồi mới dùng, nếu không
 * sẽ lại rơi vào tình trạng mỗi biểu đồ một tông như trước.
 *
 * Kết quả kiểm (OKLab ΔE ×100, ngưỡng CVD ≥ 8, thị lực thường ≥ 15):
 *   - 8 slot định danh : CVD 14.1 · thường 17.5 · tương phản tất cả ≥ 3:1
 *   - 4 nhóm xử lý     : CVD  8.2 · thường 19.2 · tương phản tất cả ≥ 3:1
 */

/** Nền thẻ biểu đồ — mọi phép kiểm tương phản đo trên nền này. */
export const CHART_SURFACE = "#ffffff";

/**
 * Mực chữ và đường kẻ.
 *
 * Số liệu và nhãn mặc mực chữ chứ không mặc màu của chuỗi: cột đứng ngay dưới
 * nhãn đã đủ nói nhãn đó thuộc chuỗi nào, tô nhãn theo màu chuỗi chỉ làm chữ
 * khó đọc (nhiều màu chuỗi không đạt tương phản chữ 4.5:1).
 */
export const CHART_INK = {
  /** Tiêu đề trục, nhãn quan trọng — 17.9:1 */
  primary: "#0f172a",
  /** Nhãn số trên đầu cột, chữ trong tooltip — 10.4:1 */
  secondary: "#334155",
  /** Vạch chia trục, chú thích phụ — 4.8:1 */
  muted: "#64748b",
  /** Lưới nền, phải chìm hẳn xuống dưới dữ liệu */
  grid: "#e2e8f0",
  /** Vùng sáng khi rê chuột qua một cột */
  hover: "#f1f5f9",
} as const;

/**
 * 8 slot màu định danh, dùng theo đúng thứ tự này và không bao giờ quay vòng.
 *
 * Thứ tự chính là cơ chế an toàn cho người mù màu — nó được chọn bằng cách
 * duyệt toàn bộ hoán vị rồi lấy phương án có ΔE nhỏ nhất giữa hai slot kề
 * nhau lớn nhất, không phải xếp theo cảm quan. Đổi thứ tự là phải kiểm lại.
 *
 * Chuỗi thứ 9 không sinh thêm màu mới: gộp vào nhóm "Khác" hoặc tách biểu đồ.
 */
export const CHART_SERIES = [
  "#00713d", // 1 — xanh PHS (màu chủ đạo)
  "#0079b0", // 2 — xanh dương
  "#a87700", // 3 — vàng đất
  "#b02a63", // 4 — hồng sẫm
  "#d4611a", // 5 — cam
  "#12968a", // 6 — xanh ngọc
  "#5b3fbe", // 7 — tím
  "#d03b3b", // 8 — đỏ
] as const;

/**
 * Bốn nhóm kết quả xử lý phiên chat.
 *
 * Đây là màu mang nghĩa chứ không phải màu định danh tùy ý: xanh = bot lo
 * xong, vàng = phải đẩy sang người thật, xanh dương = đang chờ khách, đỏ =
 * bỏ đi. Giữ đúng bốn mã này ở mọi biểu đồ để cùng một nhóm không đổi màu
 * giữa các thẻ.
 */
export const OUTCOME_COLORS = {
  bot_done: "#00713d",
  ccc: "#a87700",
  pending: "#0079b0",
  spam: "#d03b3b",
} as const;

/**
 * Cặp màu hai chiều cho biến động tăng / giảm so với kỳ trước.
 *
 * Xanh tăng – đỏ giảm là quy ước của thị trường chứng khoán Việt Nam nên giữ
 * nguyên, dù đây đúng là cặp màu người mù màu đỏ-lục khó tách. Bù lại: mọi
 * cột đều in sẵn mức tăng giảm kèm dấu (`+12,3%` / `-8,1%`), nên chiều biến
 * động đọc được bằng chữ chứ không chỉ bằng màu. Nếu bỏ nhãn đó đi thì phải
 * đổi sang cặp xanh dương – đỏ.
 */
export const CHART_DIVERGING = {
  up: "#00713d",
  down: "#d03b3b",
  /** Không có kỳ trước để so — không phải tăng, cũng không phải giảm. */
  neutral: "#94a3b8",
} as const;

/**
 * Thang màu một sắc cho các chuỗi CÓ THỨ TỰ — các kỳ thời gian.
 *
 * Tháng/quý/năm là dữ liệu có thứ tự, không phải các nhóm ngang hàng. Trước
 * đây mỗi kỳ lấy một màu trong bảng định danh (xanh, cam, đỏ, tím...) nên
 * nhìn vào biểu đồ không đọc được đâu là kỳ cũ đâu là kỳ mới. Thang một sắc
 * đi từ nhạt (kỳ cũ) tới đậm (kỳ mới) đưa luôn chiều thời gian vào màu.
 *
 * Các bảng 2–6 bước đều đạt kiểm ordinal (một sắc, độ sáng đơn điệu, chênh
 * lệch sáng ≥ 0.06, đầu nhạt ≥ 2:1 trên nền trắng). Từ 7 bước trở lên hai
 * bước cạnh nhau sát ngưỡng — lúc đó thang đọc như một dải liên tục, vẫn
 * đúng chiều nhưng khó tách từng kỳ; đó là giới hạn thật của mắt, không phải
 * lỗi bảng màu.
 */
const PERIOD_RAMPS: Record<number, readonly string[]> = {
  1: ["#00713d"],
  2: ["#8cb99a", "#004614"],
  3: ["#8cb99a", "#3c7e55", "#004614"],
  4: ["#8cb99a", "#57916b", "#1d6b3f", "#004614"],
  5: ["#8cb99a", "#649b76", "#3c7e55", "#046134", "#004614"],
  6: ["#8cb99a", "#6ca17d", "#4d8962", "#2b7248", "#005c2e", "#004614"],
  7: ["#8cb99a", "#72a582", "#57916b", "#3c7e55", "#1d6b3f", "#00582a", "#004614"],
  8: [
    "#8cb99a",
    "#75a885",
    "#5f9772",
    "#48865e",
    "#30764b",
    "#116539",
    "#005527",
    "#004614",
  ],
};

const PERIOD_RAMP_MAX = 8;

/**
 * Thang màu cho `count` kỳ, nhạt → đậm theo chiều thời gian.
 *
 * Quá 8 kỳ thì lặp lại thang 8 bước: nhiều hơn 8 sắc độ của cùng một màu là
 * mắt không tách nổi, nên thay vì sinh thêm màu, hãy lọc hẹp lại khoảng thời
 * gian hoặc đổi sang mốc thống kê lớn hơn (quý / năm).
 */
export function periodRamp(count: number): readonly string[] {
  if (count <= 0) return [];
  if (count <= PERIOD_RAMP_MAX) return PERIOD_RAMPS[count];

  const base = PERIOD_RAMPS[PERIOD_RAMP_MAX];
  return Array.from({ length: count }, (_, index) => base[index % base.length]);
}

/** Màu của kỳ thứ `index` trong tổng số `total` kỳ. */
export function periodColor(index: number, total: number): string {
  const ramp = periodRamp(Math.max(total, 1));
  return ramp[Math.min(index, ramp.length - 1)];
}

/**
 * Sáu bước của phễu chuyển đổi — cũng là chuỗi có thứ tự nên dùng thang một
 * sắc, bước cuối (đã xử lý xong) đậm nhất.
 */
export const FUNNEL_RAMP = PERIOD_RAMPS[6];

/**
 * Mực chữ đặt TRÊN nền màu đậm (nhãn nằm trong khối phễu).
 *
 * Ba bước nhạt đầu không đủ tương phản với chữ trắng (2.2 / 3.0 / 4.1 so với
 * ngưỡng 4.5), nên đổi sang mực xanh đậm thay vì ép chữ trắng cho đồng bộ rồi
 * để người đọc phải căng mắt.
 */
export function inkOnFill(fill: string): string {
  return FUNNEL_RAMP.indexOf(fill) >= 3 ? "#ffffff" : "#0b3d22";
}
