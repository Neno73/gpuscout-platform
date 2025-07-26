import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';

export interface MarketplaceOffer {
  offer_id: number;
  gpu_name: string;
  num_gpus: number;
  price_base_per_hour: number;
  dlperf: number;
  dlperf_per_dollar: number;
  reliability_score: number;
  country: string;
  location: string;
  rentable: number;
  verified: number;
}

interface UseMarketplaceOffersState {
  data: MarketplaceOffer[];
  loading: boolean;
  error: string | null;
}

export function useMarketplaceOffers() {
  const [state, setState] = useState<UseMarketplaceOffersState>({
    data: [],
    loading: true,
    error: null
  });

  const fetchOffers = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiClient.get<MarketplaceOffer[]>('/portfolios/marketplace-offers');
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
          error: result.error || 'Failed to load marketplace offers' 
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
    fetchOffers();
  }, [fetchOffers]);

  const getOfferById = useCallback((offerId: number) => {
    return state.data.find(offer => offer.offer_id === offerId);
  }, [state.data]);

  const getBestOffers = useCallback((limit: number = 10) => {
    return state.data
      .filter(offer => offer.rentable === 1 && offer.verified === 1)
      .sort((a, b) => b.dlperf_per_dollar - a.dlperf_per_dollar)
      .slice(0, limit);
  }, [state.data]);

  return {
    offers: state.data,
    loading: state.loading,
    error: state.error,
    refetch: fetchOffers,
    getOfferById,
    getBestOffers
  };
}