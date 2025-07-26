import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';

export interface GpuInstance {
  id: string;
  portfolio_id: string;
  gpu_model: string;
  custom_name: string | null;
  platform_instance_id: string | null;
  settings: object | null;
  created_at: string;
  updated_at: string;
}

interface AddGpuInstanceData {
  offerIds: number[];
  customName?: string;
}

interface UpdateGpuInstanceData {
  customName?: string;
  platformInstanceId?: string;
  settings?: object;
}

export function useGpuInstances() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addGpuInstances = useCallback(async (portfolioId: string, data: AddGpuInstanceData): Promise<GpuInstance[] | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.post<GpuInstance[]>(`/portfolios/${portfolioId}/gpus`, data);
      if (result.success && result.data) {
        setLoading(false);
        return result.data;
      } else {
        setError(result.error || 'Failed to add GPU instances');
        setLoading(false);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  }, []);

  const updateGpuInstance = useCallback(async (portfolioId: string, gpuId: string, data: UpdateGpuInstanceData): Promise<GpuInstance | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.put<GpuInstance>(`/portfolios/${portfolioId}/gpus/${gpuId}`, data);
      if (result.success && result.data) {
        setLoading(false);
        return result.data;
      } else {
        setError(result.error || 'Failed to update GPU instance');
        setLoading(false);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  }, []);

  const deleteGpuInstance = useCallback(async (portfolioId: string, gpuId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiClient.delete(`/portfolios/${portfolioId}/gpus/${gpuId}`);
      if (result.success) {
        setLoading(false);
        return true;
      } else {
        setError(result.error || 'Failed to delete GPU instance');
        setLoading(false);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      setLoading(false);
      return false;
    }
  }, []);

  return {
    loading,
    error,
    addGpuInstances,
    updateGpuInstance,
    deleteGpuInstance,
    clearError: () => setError(null)
  };
}