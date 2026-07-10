import { useState } from "react";

export function useTablePagination(count: number, pageSize = 20) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const fromRecord = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRecord = Math.min(page * pageSize, count);

  const getSafePage = (nextPage: number) => {
    return Math.min(Math.max(nextPage, 1), totalPages);
  };

  const setSafePage = (nextPage: number) => {
    const safePage = getSafePage(nextPage);
    setPage(safePage);
    return safePage;
  };

  const resetPage = () => {
    setPage(1);
  };

  return {
    page,
    setPage,
    pageSize,
    totalPages,
    fromRecord,
    toRecord,
    getSafePage,
    setSafePage,
    resetPage,
  };
}