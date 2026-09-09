import { useState, useCallback } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
}

export function usePagination({ initialPage = 1, initialLimit = 20 }: UsePaginationOptions = {}) {
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const nextPage = useCallback(() => {
    setPage(p => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage(p => Math.max(p - 1, 1));
  }, []);

  const goToPage = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }, [totalPages]);

  const updateFromResponse = useCallback((totalItems: number, totalPagesCount: number) => {
    setTotal(totalItems);
    setTotalPages(totalPagesCount);
  }, []);

  return {
    page,
    limit,
    totalPages,
    total,
    nextPage,
    prevPage,
    goToPage,
    updateFromResponse,
    setPage
  };
}
