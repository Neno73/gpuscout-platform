import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';

export interface GpuModel {
  name: string;
  info: {
    vram: number;
    dlperf: number;
    tflops: number;
  };
  stats: {
    all: {
      all: Array<{
        count: number;
        price_median: number;
        price_10th_percentile: number;
        price_90th_percentile: number;
      }>;
    };
  };
}

interface GpuDataResponse {
  models: GpuModel[];
  timestamp: string;
  note: string;
}

interface UseGpuDataState {
  data: GpuModel[];
  loading: boolean;
  error: string | null;
}

export function useGpuData() {
  const [state, setState] = useState<UseGpuDataState>({
    data: [],
    loading: true,
    error: null
  });

  const fetchGpuData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiClient.get<GpuDataResponse>('/market/gpu-stats');
      if (result.success && result.data) {
        setState({ 
          data: result.data.models, 
          loading: false, 
          error: null 
        });
      } else {
        setState({ 
          data: [], 
          loading: false, 
          error: result.error || 'Failed to load GPU data' 
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
    fetchGpuData();
  }, [fetchGpuData]);

  const getGpuByName = useCallback((name: string) => {
    return state.data.find(gpu => gpu.name === name);
  }, [state.data]);

  const getPopularGpus = useCallback((limit: number = 10) => {
    return state.data
      .filter(gpu => gpu.stats.all.all[0]?.count > 0)
      .sort((a, b) => (b.stats.all.all[0]?.count || 0) - (a.stats.all.all[0]?.count || 0))
      .slice(0, limit);
  }, [state.data]);

  return {
    gpus: state.data,
    loading: state.loading,
    error: state.error,
    refetch: fetchGpuData,
    getGpuByName,
    getPopularGpus
  };
}