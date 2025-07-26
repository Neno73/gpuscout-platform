// Market Data Types based on our validated test data
export interface GPUMarketStat {
  model: string
  total_all_count: number
  total_all_median: number
  total_all_min: number
  total_all_max: number
  available_all_count: number
  available_all_median: number
  rented_all_count: number
  rented_all_median: number
  dlperf_per_dollar: number
  created_at: string
}

export interface GPUProvider {
  host_id: number
  host_name: string
  country: string
  region: string
  total_machines: number
  total_tflops: number
  avg_dlperf_per_dollar: number
  verification_status: 'verified' | 'unverified'
  created_at: string
}

export interface MarketplaceOffer {
  id: number
  provider_id: number
  model: string
  price_base_per_hour: number
  price_total_per_hour: number
  dlperf: number
  dlperf_per_dollar: number
  availability_status: 'available' | 'rented' | 'offline'
  verification_status: 'verified' | 'unverified'
  created_at: string
}

export interface AvailabilityMetric {
  gpu_name: string
  rented: boolean
  verified: boolean
  count: number
  timestamp: string
}

// Chart Configuration Types
export interface ChartConfig {
  [key: string]: {
    label: string
    color: string
  }
}

// Dashboard State Types
export interface DashboardState {
  timeRange: '1h' | '24h' | '7d' | '30d'
  autoRefresh: boolean
  lastUpdated: Date | null
}

// API Response Types
export interface APIResponse<T> {
  success: boolean
  data: T
  meta?: {
    timestamp: string
    total?: number
    page?: number
    pageSize?: number
  }
  error?: string
}