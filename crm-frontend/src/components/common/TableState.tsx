"use client";

type TableStateProps = {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  colSpan: number;
  emptyText?: string;
};

export function TableState({
  loading,
  error,
  empty,
  colSpan,
  emptyText = "Không có dữ liệu.",
}: TableStateProps) {
  if (loading) {
    return (
      <tr>
        <td colSpan={colSpan} className="h-28 text-center text-slate-500">
          Đang tải dữ liệu...
        </td>
      </tr>
    );
  }

  if (error) {
    return (
      <tr>
        <td colSpan={colSpan} className="h-28 text-center text-red-600">
          {error}
        </td>
      </tr>
    );
  }

  if (empty) {
    return (
      <tr>
        <td colSpan={colSpan} className="h-28 text-center text-slate-500">
          {emptyText}
        </td>
      </tr>
    );
  }

  return null;
}