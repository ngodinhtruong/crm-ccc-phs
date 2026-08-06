"use client";
import { useState } from "react";
import axios from "axios";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { failedEkycApi } from "@/apis/failed-ekyc.api";
import { FailedEkycImportResponse } from "@/types/failed-ekyc.type";

export function FailedEkycImport() {
  const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[result,setResult]=useState<FailedEkycImportResponse|null>(null),[error,setError]=useState("");
  const upload=async()=>{if(!file)return;setBusy(true);setError("");try{setResult(await failedEkycApi.importExcel(file));}catch(e:unknown){const message=axios.isAxiosError(e)?e.response?.data?.detail:undefined;setError(message||"Import thất bại.");}finally{setBusy(false);}};
  return <div className="mx-auto max-w-3xl space-y-5"><div className="rounded-xl border bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">IMPORT FAILED eKYC</h2><p className="text-xs text-slate-500">Hỗ trợ file Excel .xlsx, tối đa 10 MB</p></div><button onClick={()=>failedEkycApi.downloadTemplate()} className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700"><Download size={14}/>Tải file mẫu</button></div>
    {error&&<div className="mb-4 rounded bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed bg-slate-50 p-10"><FileSpreadsheet size={36} className="mb-3 text-emerald-600"/><span className="text-sm font-bold">{file?.name||"Chọn file Excel"}</span><input type="file" accept=".xlsx" className="hidden" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><div className="mt-5 text-right"><button disabled={!file||busy} onClick={upload} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"><Upload size={14}/>{busy?"Đang import...":"Import"}</button></div></div>
    {result&&<div className="rounded-xl border bg-white p-6"><h3 className="font-bold">KẾT QUẢ</h3><div className="my-4 grid grid-cols-2 gap-3"><div className="rounded bg-emerald-50 p-4 text-emerald-800">Thành công: <b>{result.success_count}</b></div><div className="rounded bg-rose-50 p-4 text-rose-800">Lỗi: <b>{result.error_count}</b></div></div>{result.errors.length>0&&<ul className="max-h-56 overflow-auto rounded bg-slate-50 p-3 text-xs text-rose-700">{result.errors.map((v,i)=><li key={i}>{v}</li>)}</ul>}</div>}
  </div>;
}
