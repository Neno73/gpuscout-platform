import { useState, useEffect, useCallback } from 'react';
import { apiClient, Portfolio } from '@/lib/api';

interface UsePortfoliosState {
  data: Portfolio[];
  loading: boolean;
  error: string | null;
}

export function usePortfolios() {
  const [state, setState] = useState<UsePortfoliosState>({
    data: [],
    loading: true,
    error: null
  });

  const fetchPortfolios = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiClient.get<Portfolio[]>('/portfolios');
      if (result.success && result.data) {
        setState({ 
          data: result.data, 
          loading: false, 
          error: null 
        });
      } else {
        setState({ 
          data: [], 
          loading: false, 
          error: result.error || 'Failed to load portfolios' 
        });
      }
    } catch (err) {
      setState({ 
        data: [], 
        loading: false, 
        error: err instanceof Error ? err.message : 'Network error' 
      });
    }
  }, []);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  const addPortfolio = useCallback((newPortfolio: Portfolio) => {
    setState(prev => ({
      ...prev,
      data: [newPortfolio, ...prev.data]
    }));
  }, []);

  const removePortfolio = useCallback((portfolioId: string) => {
    setState(prev => ({
      ...prev,
      data: prev.data.filter(p => p.id !== portfolioId)
    }));
  }, []);

  return {
    portfolios: state.data,
    loading: state.loading,
    error: state.error,
    refetch: fetchPortfolios,
    addPortfolio,
    removePortfolio
  };
}