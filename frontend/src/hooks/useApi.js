/**
 * useApi — Thin wrapper around useQuery that standardizes
 * loading/error/success states across all API-connected components.
 *
 * Usage:
 *   const { data, loading, error } = useApi(
 *     ['equipment', id],
 *     () => getEquipmentById(id).then(r => r.data.equipment)
 *   );
 */
import { useQuery } from '@tanstack/react-query';

const useApi = (queryKey, queryFn, options = {}) => {
  const result = useQuery({
    queryKey,
    queryFn,
    retry: (count, error) => {
      const status = error?.response?.status;
      if (status && status >= 400 && status < 500) return false;
      return count < 2;
    },
    ...options,
  });

  return {
    data: result.data,
    loading: result.isLoading,
    fetching: result.isFetching,
    error: result.error?.message || (result.isError ? 'Failed to load data' : null),
    refetch: result.refetch,
    isSuccess: result.isSuccess,
  };
};

export default useApi;
