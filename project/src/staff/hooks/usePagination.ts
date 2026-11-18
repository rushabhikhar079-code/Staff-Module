import { useCallback, useState } from 'react';

export function usePagination<T>(items: T[]) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount);
  const pageItems = items.slice((current - 1) * pageSize, current * pageSize);

  const onPageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  return {
    pageItems,
    page: current,
    pageSize,
    total: items.length,
    onPageChange: setPage,
    onPageSizeChange,
  };
}
