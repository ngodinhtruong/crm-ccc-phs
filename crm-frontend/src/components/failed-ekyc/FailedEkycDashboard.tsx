"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, PhoneCall, RotateCcw } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { failedEkycApi } from "@/apis/failed-ekyc.api";
import { CompareMode, GranularityMode } from "@/components/tickets/dashboard/CccDashboardUtils";
import { FailedEkycDashboardData } from "@/types/failed-ekyc.type";

const barValueLabel = { position: "top" as const, fontSize: 10, fontWeight: 700, fill: "#334155" };
const formatReportDate = (value: string) => value ? value.split("-").reverse().join("/") : "-";

export function FailedEkycDashboard({granularity="MONTH",compareMode="NONE",dateFrom,dateTo,refreshKey=0}:{granularity?:GranularityMode;compareMode?:CompareMode;dateFrom:string;dateTo:string;refreshKey?:number}){
  const [data,setData]=useState<FailedEkycDashboardData|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const valid=Boolean(dateFrom&&dateTo&&dateFrom<=dateTo);
  useEffect(()=>{
    if(!valid)return;
    // Dashboard data is refreshed whenever its period controls change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    failedEkycApi.getDashboard({failed_date_from:dateFrom,failed_date_to:dateTo,granularity,compare_mode:compareMode})
      .then(setData)
      .catch(()=>setError("Không tải được dashboard Failed eKYC."))
      .finally(()=>setLoading(false));
  },[dateFrom,dateTo,granularity,compareMode,valid,refreshKey]);
  if(loading)return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600"/></div>;
  const total=data?.total_records||0;
  const result=(name:string)=>data?.result_breakdown.find(x=>x.call_result===name)?.count||0;
  const notCalled=data?.status_breakdown.filter(item=>!item.call_status||item.call_status==="KHÔNG CALL").reduce((sum,item)=>sum+item.count,0)||0;
  const called=total-notCalled,success=result("Thành công"),retry=result("KH cần thử lại"),failed=result("Không thành công");
  const contactRatio=[{name:"Đã liên hệ",value:called,color:"#10b981"},{name:"Chưa gọi",value:notCalled,color:"#94a3b8"}];
  return <div className="space-y-5">
    <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-4.5 shadow-xs"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/80"/><h1 className="text-xl font-black uppercase tracking-tight text-slate-900">Dashboard Failed eKYC</h1></div><div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs"><span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-100/80 px-3 py-1 font-bold text-emerald-800">Báo cáo theo {granularity==="MONTH"?"tháng":granularity==="QUARTER"?"quý":"năm"}</span><span className="font-semibold text-slate-600">{formatReportDate(dateFrom)} - {formatReportDate(dateTo)}</span><span className="hidden text-slate-300 md:inline">•</span><span className="text-slate-500">Theo dõi lỗi và hiệu quả chăm sóc khách hàng</span></div></div></div></div>
    {!valid&&<div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600">Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.</div>}{error&&<div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Summary title="Tổng Failed eKYC" value={total} subtitle={data?.comparison?`Kỳ trước: ${data.comparison.prev_total} case`:"Trong kỳ báo cáo"} icon={AlertTriangle} color="emerald" growth={data?.comparison?.total_growth_percent}/><Summary title="Đã liên hệ" value={called} subtitle={`Tỷ lệ liên hệ: ${total?((called/total)*100).toFixed(1):0}%`} icon={PhoneCall} color="teal"/><Summary title="Xử lý thành công" value={success} subtitle={`Tỷ lệ thành công: ${total?((success/total)*100).toFixed(1):0}%`} icon={CheckCircle2} color="blue"/><Summary title="Cần follow lại" value={retry+failed} subtitle={`${retry} cần thử lại · ${failed} thất bại`} icon={RotateCcw} color="amber"/></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ChartCard title="Xu hướng Failed eKYC phát sinh"><ResponsiveContainer width="100%" height={240}><AreaChart data={data?.daily_trends||[]} margin={{top:20,right:10,left:0,bottom:0}}><defs><linearGradient id="failedTrend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.45}/><stop offset="95%" stopColor="#10b981" stopOpacity={0.04}/></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="date" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Area type="monotone" dataKey="count" name="Số case phát sinh" stroke="#059669" strokeWidth={3} fill="url(#failedTrend)" dot={{r:4,fill:"#059669"}} label={barValueLabel} isAnimationActive={false}/></AreaChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Tỷ lệ liên hệ"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={contactRatio} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius={50} outerRadius={80} paddingAngle={3} label isAnimationActive={false}>{contactRatio.map(item=><Cell key={item.name} fill={item.color}/>)}</Pie><Tooltip/><Legend verticalAlign="bottom" wrapperStyle={{fontSize:11}}/></PieChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Top lỗi phổ biến"><ResponsiveContainer width="100%" height={240}><BarChart data={data?.top_errors||[]} layout="vertical" margin={{top:5,right:35,left:15,bottom:5}}><CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis type="number" allowDecimals={false} tick={{fontSize:11}}/><YAxis type="category" dataKey="error" width={110} tick={{fontSize:10}}/><Tooltip/><Bar dataKey="count" name="Số case" fill="#0f766e" radius={[0,4,4,0]} label={{position:"right",fontSize:10,fontWeight:700,fill:"#334155"}} isAnimationActive={false}/></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Hiệu quả xử lý theo PIC">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data?.pic_performance || []} barCategoryGap="25%" margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="pic" tick={{ fontSize: 11 }} padding={{ left: 20, right: 20 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="contacted" name="Đã liên hệ" fill="#0891b2" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="contacted" position="top" style={{ fontSize: 10, fontWeight: 700, fill: "#0891b2" }} />
            </Bar>
            <Bar dataKey="successful" name="Thành công" fill="#10b981" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="successful" position="top" style={{ fontSize: 10, fontWeight: 700, fill: "#10b981" }} />
            </Bar>
            <Line
              type="monotone"
              dataKey="total"
              name="Tổng case"
              stroke="#64748b"
              strokeWidth={3}
              dot={{ fill: "#64748b", r: 5, stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 7 }}
              isAnimationActive={false}
            >
              <LabelList dataKey="total" position="top" style={{ fontSize: 10, fontWeight: 700, fill: "#475569" }} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Tổng số lượng khảo sát"><ResponsiveContainer width="100%" height={240}><BarChart data={data?.daily_trends||[]} margin={{top:20}}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="date" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Bar dataKey="count" name="Tổng số lượng" fill="#43a047" radius={[3,3,0,0]} isAnimationActive={false} label={barValueLabel}/></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Kết quả CS liên hệ"><ResponsiveContainer width="100%" height={240}><BarChart data={data?.daily_trends||[]} margin={{top:20}}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="date" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="contact_success" name="Liên hệ KH thành công" fill="#2e7d32" isAnimationActive={false} label={barValueLabel}/><Bar dataKey="contact_failed" name="Không liên hệ được KH" fill="#e65100" isAnimationActive={false} label={barValueLabel}/><Bar dataKey="not_called" name="Không gọi" fill="#29838a" isAnimationActive={false} label={barValueLabel}/></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Chi tiết kết quả không gọi"><ResponsiveContainer width="100%" height={240}><BarChart data={data?.no_call_details||[]} margin={{top:20}}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="category" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Bar dataKey="count" name="Số lượng" fill="#65951b" radius={[3,3,0,0]} isAnimationActive={false} label={barValueLabel}/></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Kết quả liên hệ thành công"><ResponsiveContainer width="100%" height={240}><BarChart data={data?.daily_trends||[]} margin={{top:20}}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="date" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="guidance_success" name="HD thành công" fill="#46c575" isAnimationActive={false}/><Bar dataKey="guidance_failed" name="HD thất bại" fill="#ef5350" isAnimationActive={false}/><Bar dataKey="retry_later" name="Thử lại sau" fill="#c75b22" isAnimationActive={false}/><Bar dataKey="system_test" name="Test HT" fill="#27b4ca" isAnimationActive={false}/></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="KQ liên hệ không thành công"><ResponsiveContainer width="100%" height={240}><BarChart data={data?.daily_trends||[]} margin={{top:20}}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="date" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="no_answer" name="Không nghe máy" fill="#46c575" isAnimationActive={false}/><Bar dataKey="hung_up" name="Tắt máy ngang" fill="#ef5350" isAnimationActive={false}/><Bar dataKey="invalid_number" name="Thuê bao" fill="#c75b22" isAnimationActive={false}/><Bar dataKey="call_back" name="KH bận" fill="#315d91" isAnimationActive={false}/></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Kết quả sau khi liên hệ"><ResponsiveContainer width="100%" height={240}><BarChart data={data?.daily_trends||[]} margin={{top:20}}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="date" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="customer_completed" name="KH thao tác thành công" fill="#27b4ca" isAnimationActive={false}/><Bar dataKey="customer_no_action" name="KH không thao tác" fill="#ef6c1a" isAnimationActive={false}/></BarChart></ResponsiveContainer></ChartCard>
    </div>
  </div>;
}

function Summary({title,value,subtitle,icon:Icon,color,growth}:{title:string;value:number;subtitle:string;icon:typeof AlertTriangle;color:"emerald"|"teal"|"blue"|"amber";growth?:number}){const colors={emerald:"bg-emerald-50 text-emerald-600 ring-emerald-100",teal:"bg-emerald-50 text-emerald-600 ring-emerald-100",blue:"bg-emerald-50 text-emerald-600 ring-emerald-100",amber:"bg-amber-50 text-amber-600 ring-amber-100"};return <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-medium text-slate-500">{title}</p><div className="mt-2 flex items-baseline gap-2"><p className="text-2xl font-bold text-slate-800">{value}</p>{growth!==undefined&&<span className={`text-xs font-bold ${growth>=0?"text-emerald-600":"text-rose-600"}`}>{growth>=0?"+":""}{growth}%</span>}</div><p className="mt-1 text-[11px] leading-4 text-slate-500">{subtitle}</p></div><div className={`flex h-9 w-9 items-center justify-center rounded-md ring-1 ${colors[color]}`}><Icon size={18}/></div></div></div>}
function ChartCard({title,children}:{title:string;children:React.ReactNode}){return <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"><div className="flex min-h-[48px] items-center border-b border-slate-100 px-5 py-3.5"><h3 className="text-xs font-bold uppercase tracking-wider text-[#059669]">{title}</h3></div><div className="p-5">{children}</div></div>}
