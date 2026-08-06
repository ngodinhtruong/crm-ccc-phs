"use client";
import { FormEvent, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { failedEkycApi } from "@/apis/failed-ekyc.api";
import { FAILED_EKYC_CALL_RESULTS, FAILED_EKYC_CALL_STATUSES, FAILED_EKYC_STEPS, FailedEkycPayload } from "@/types/failed-ekyc.type";

const empty: FailedEkycPayload = { step:"EKYC", branch_name:"", account_number:"", customer_name:"", email:"", phone:"", failed_at:"", error_message:"", pic:"", call_date:"", follow_count:0, call_status:"KHÔNG CALL", call_result:"", cs_comment:"" };
export function FailedEkycForm() {
  const router = useRouter(), [form, setForm] = useState(empty), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const field = (key: keyof FailedEkycPayload, value: unknown) => setForm(v => ({...v, [key]: value}));
  const lookup = async () => { if (!form.account_number) return; try { const d = await failedEkycApi.lookupCustomer(form.account_number); setForm(v => ({...v, customer:d.customer_id, customer_account:d.customer_account_id, customer_name:d.customer_name || "", branch_name:d.branch_name || v.branch_name, email:d.email || v.email, phone:d.phone || v.phone})); } catch { setError("Không tìm thấy tài khoản; bạn vẫn có thể nhập thủ công."); } };
  const submit = async (e: FormEvent) => { e.preventDefault(); setSaving(true); setError(""); try { await failedEkycApi.createRecord(form); router.push("/failed-ekyc"); } catch (err: unknown) { const message = axios.isAxiosError(err) ? err.response?.data?.non_field_errors?.[0] : undefined; setError(message || "Không thể lưu bản ghi."); } finally { setSaving(false); } };
  const input = "mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm";
  return <form onSubmit={submit} className="mx-auto max-w-5xl rounded-xl border bg-white p-6 shadow-sm"><h2 className="mb-5 text-lg font-bold">TẠO BẢN GHI FAILED eKYC</h2>{error && <div className="mb-4 rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<div className="grid gap-4 md:grid-cols-2">
    <label className="text-xs font-bold">Step<select value={form.step} onChange={e=>field("step",e.target.value)} className={input}>{FAILED_EKYC_STEPS.map(v=><option key={v}>{v}</option>)}</select></label>
    <label className="text-xs font-bold">Account<div className="mt-1 flex gap-2"><input value={form.account_number} onChange={e=>field("account_number",e.target.value)} className="h-10 flex-1 rounded-lg border px-3 text-sm"/><button type="button" onClick={lookup} className="rounded-lg border px-3 text-xs font-bold">Tra cứu</button></div></label>
    {[ ["branch_name","Branch"],["customer_name","Tên khách hàng"],["email","Email"],["phone","Phone number"],["pic","PIC"] ].map(([k,l])=><label key={k} className="text-xs font-bold">{l}<input value={String(form[k as keyof FailedEkycPayload] || "")} onChange={e=>field(k as keyof FailedEkycPayload,e.target.value)} className={input}/></label>)}
    <label className="text-xs font-bold">Created date<input type="date" value={form.failed_at || ""} onChange={e=>field("failed_at",e.target.value)} className={input}/></label>
    <label className="text-xs font-bold md:col-span-2">Error<textarea required value={form.error_message} onChange={e=>field("error_message",e.target.value)} rows={4} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
    <label className="text-xs font-bold">Ngày gọi<input type="date" value={form.call_date || ""} onChange={e=>field("call_date",e.target.value)} className={input}/></label><label className="text-xs font-bold">Số lần follow<input type="number" min="0" value={form.follow_count} onChange={e=>field("follow_count",Number(e.target.value))} className={input}/></label>
    <label className="text-xs font-bold">Tình trạng<select value={form.call_status} onChange={e=>field("call_status",e.target.value)} className={input}><option value="">—</option>{FAILED_EKYC_CALL_STATUSES.map(v=><option key={v}>{v}</option>)}</select></label><label className="text-xs font-bold">Kết quả<select value={form.call_result} onChange={e=>field("call_result",e.target.value)} className={input}><option value="">—</option>{FAILED_EKYC_CALL_RESULTS.map(v=><option key={v}>{v}</option>)}</select></label>
    <label className="text-xs font-bold md:col-span-2">CS comment<textarea value={form.cs_comment} onChange={e=>field("cs_comment",e.target.value)} rows={3} className="mt-1 w-full rounded-lg border p-3 text-sm"/></label>
  </div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={()=>router.push("/failed-ekyc")} className="rounded-lg border px-5 py-2.5 text-xs font-bold">Hủy</button><button disabled={saving} className="rounded-lg bg-rose-600 px-6 py-2.5 text-xs font-bold text-white disabled:opacity-50">{saving?"Đang lưu...":"Lưu bản ghi"}</button></div></form>;
}
