// import { Search } from "lucide-react";

// import { BranchOption } from "@/types/customer.type";

// function getBranchName(branch: BranchOption) {
//   return branch.branch_name || branch.name || `Chi nhánh ${branch.id}`;
// }

// export function CustomerFilter({
//   q,
//   phone,
//   branch,
//   status,
//   branches,
//   loadingBranches,
//   onQChange,
//   onPhoneChange,
//   onBranchChange,
//   onStatusChange,
//   onSearch,
//   onClear,
// }: {
//   q: string;
//   phone: string;
//   branch: string;
//   status: string;
//   branches: BranchOption[];
//   loadingBranches: boolean;
//   onQChange: (value: string) => void;
//   onPhoneChange: (value: string) => void;
//   onBranchChange: (value: string) => void;
//   onStatusChange: (value: string) => void;
//   onSearch: () => void;
//   onClear: () => void;
// }) {
//   return (
//     <div className="grid grid-cols-12 gap-3 border-b bg-[#f8fafc] px-4 py-3">
//       <div className="col-span-12 md:col-span-3">
//         <label className="mb-1 block text-xs font-medium text-slate-500">
//           Từ khóa
//         </label>
//         <input
//           value={q}
//           onChange={(event) => onQChange(event.target.value)}
//           placeholder="Tên, email, mã KH..."
//           className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
//         />
//       </div>

//       <div className="col-span-12 md:col-span-2">
//         <label className="mb-1 block text-xs font-medium text-slate-500">
//           Di động
//         </label>
//         <input
//           value={phone}
//           onChange={(event) => onPhoneChange(event.target.value)}
//           placeholder="Số điện thoại"
//           className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
//         />
//       </div>

//       <div className="col-span-12 md:col-span-2">
//         <label className="mb-1 block text-xs font-medium text-slate-500">
//           Chi nhánh
//         </label>
//         <select
//           value={branch}
//           onChange={(event) => onBranchChange(event.target.value)}
//           className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
//         >
//           <option value="">
//             {loadingBranches ? "Đang tải..." : "Tất cả chi nhánh"}
//           </option>

//           {branches.map((item) => (
//             <option key={item.id} value={item.id}>
//               {getBranchName(item)}
//             </option>
//           ))}
//         </select>
//       </div>

//       <div className="col-span-12 md:col-span-2">
//         <label className="mb-1 block text-xs font-medium text-slate-500">
//           Tình trạng
//         </label>
//         <select
//           value={status}
//           onChange={(event) => onStatusChange(event.target.value)}
//           className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs outline-none focus:border-sky-400"
//         >
//           <option value="">Tất cả</option>
//           <option value="ACTIVE">Chính thức</option>
//           <option value="INACTIVE">Ngừng hoạt động</option>
//           <option value="POTENTIAL">Tiềm năng</option>
//         </select>
//       </div>

//       <div className="col-span-12 flex items-end gap-2 md:col-span-3">
//         <button
//           type="button"
//           onClick={onSearch}
//           className="flex h-9 items-center gap-1 rounded bg-[#0097cf] px-4 text-xs font-semibold text-white hover:bg-[#0089bd]"
//         >
//           <Search size={14} />
//           Tìm kiếm
//         </button>

//         <button
//           type="button"
//           onClick={onClear}
//           className="h-9 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
//         >
//           Xóa lọc
//         </button>
//       </div>
//     </div>
//   );
// }