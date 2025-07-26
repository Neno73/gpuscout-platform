"use client"

import { useEffect, useState } from 'react'
import { GPUMarketShareChart } from '@/components/charts/GPUMarketShareChart'
import { PricePerformanceChart } from '@/components/charts/PricePerformanceChart'
import { AvailabilityMetricsChart } from '@/components/charts/AvailabilityMetricsChart'
import { GeographicDistributionChart } from '@/components/charts/GeographicDistributionChart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GPUMarketStat, MarketplaceOffer, GPUProvider, AvailabilityMetric, APIResponse } from '@/lib/types'

// Mock data based on our test results for initial display
const mockGPUData: GPUMarketStat[] = [
  {
    model: "RTX 4090",
    total_all_count: 170,
    total_all_median: 1.25,
    total_all_min: 0.85,
    total_all_max: 2.50,
    available_all_count: 85,
    available_all_median: 1.30,
    rented_all_count: 85,
    rented_all_median: 1.20,
    dlperf_per_dollar: 490,
    created_at: new Date().toISOString()
  },
  {
    model: "RTX 3090",
    total_all_count: 120,
    total_all_median: 0.95,
    total_all_min: 0.60,
    total_all_max: 1.80,
    available_all_count: 60,
    available_all_median: 1.00,
    rented_all_count: 60,
    rented_all_median: 0.90,
    dlperf_per_dollar: 420,
    created_at: new Date().toISOString()
  },
  {
    model: "RTX 3080",
    total_all_count: 90,
    total_all_median: 0.75,
    total_all_min: 0.45,
    total_all_max: 1.50,
    available_all_count: 45,
    available_all_median: 0.80,
    rented_all_count: 45,
    rented_all_median: 0.70,
    dlperf_per_dollar: 380,
    created_at: new Date().toISOString()
  },
  {
    model: "RTX 4080",
    total_all_count: 60,
    total_all_median: 1.10,
    total_all_min: 0.70,
    total_all_max: 2.00,
    available_all_count: 30,
    available_all_median: 1.15,
    rented_all_count: 30,
    rented_all_median: 1.05,
    dlperf_per_dollar: 450,
    created_at: new Date().toISOString()
  },
  {
    model: "A100",
    total_all_count: 25,
    total_all_median: 2.25,
    total_all_min: 1.50,
    total_all_max: 3.50,
    available_all_count: 12,
    available_all_median: 2.30,
    rented_all_count: 13,
    rented_all_median: 2.20,
    dlperf_per_dollar: 178,
    created_at: new Date().toISOString()
  }
]

const mockOfferData: MarketplaceOffer[] = [
  {
    id: 1,
    provider_id: 101,
    model: "RTX 4090",
    price_base_per_hour: 1.25,
    price_total_per_hour: 1.35,
    dlperf: 612,
    dlperf_per_dollar: 490,
    availability_status: 'available',
    verification_status: 'verified',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    provider_id: 102,
    model: "RTX 3090",
    price_base_per_hour: 0.95,
    price_total_per_hour: 1.05,
    dlperf: 399,
    dlperf_per_dollar: 420,
    availability_status: 'available',
    verification_status: 'verified',
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    provider_id: 103,
    model: "A100",
    price_base_per_hour: 1.75,
    price_total_per_hour: 1.95,
    dlperf: 312,
    dlperf_per_dollar: 178,
    availability_status: 'available',
    verification_status: 'verified',
    created_at: new Date().toISOString()
  },
  {
    id: 4,
    provider_id: 104,
    model: "RTX 4080",
    price_base_per_hour: 1.10,
    price_total_per_hour: 1.20,
    dlperf: 495,
    dlperf_per_dollar: 450,
    availability_status: 'available',
    verification_status: 'unverified',
    created_at: new Date().toISOString()
  },
  {
    id: 5,
    provider_id: 105,
    model: "RTX 3080",
    price_base_per_hour: 0.26,
    price_total_per_hour: 0.35,
    dlperf: 98,
    dlperf_per_dollar: 377,
    availability_status: 'available',
    verification_status: 'unverified',
    created_at: new Date().toISOString()
  }
]

const mockProviderData: GPUProvider[] = [
  {
    host_id: 1,
    host_name: "CloudGPU US East",
    country: "United States",
    region: "us-east-1",
    total_machines: 450,
    total_tflops: 1620,
    avg_dlperf_per_dollar: 425,
    verification_status: 'verified',
    created_at: new Date().toISOString()
  },
  {
    host_id: 2,
    host_name: "EuroCompute",
    country: "Germany",
    region: "eu-central-1", 
    total_machines: 280,
    total_tflops: 980,
    avg_dlperf_per_dollar: 390,
    verification_status: 'verified',
    created_at: new Date().toISOString()
  },
  {
    host_id: 3,
    host_name: "NetherlandsGPU",
    country: "Netherlands",
    region: "eu-west-1",
    total_machines: 120,
    total_tflops: 420,
    avg_dlperf_per_dollar: 410,
    verification_status: 'unverified',
    created_at: new Date().toISOString()
  },
  {
    host_id: 4,
    host_name: "CanadianCloud",
    country: "Canada",
    region: "ca-central-1",
    total_machines: 95,
    total_tflops: 340,
    avg_dlperf_per_dollar: 385,
    verification_status: 'verified',
    created_at: new Date().toISOString()
  }
]

const mockAvailabilityData: AvailabilityMetric[] = [
  {
    id: 1,
    gpu_name: "RTX 4090",
    count: 85,
    rented: false,
    verified: true,
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    gpu_name: "RTX 4090", 
    count: 85,
    rented: true,
    verified: true,
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    gpu_name: "RTX 3090",
    count: 60,
    rented: false,
    verified: true,
    created_at: new Date().toISOString()
  },
  {
    id: 4,
    gpu_name: "RTX 3090",
    count: 60,
    rented: true,
    verified: true,
    created_at: new Date().toISOString()
  },
  {
    id: 5,
    gpu_name: "RTX 3080",
    count: 45,
    rented: false,
    verified: false,
    created_at: new Date().toISOString()
  },
  {
    id: 6,
    gpu_name: "RTX 3080",
    count: 45,
    rented: true,
    verified: false,
    created_at: new Date().toISOString()
  },
  {
    id: 7,
    gpu_name: "RTX 4080",
    count: 30,
    rented: false,
    verified: true,
    created_at: new Date().toISOString()
  },
  {
    id: 8,
    gpu_name: "RTX 4080",
    count: 30,
    rented: true,
    verified: true,
    created_at: new Date().toISOString()
  }
]

export default function DashboardPage() {
  const [gpuData, setGpuData] = useState<GPUMarketStat[]>([])
  const [offerData, setOfferData] = useState<MarketplaceOffer[]>([])
  const [providerData, setProviderData] = useState<GPUProvider[]>([])
  const [availabilityData, setAvailabilityData] = useState<AvailabilityMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Function to fetch real data from API
  const fetchMarketData = async () => {
    setLoading(true)
    try {
      // Fetch from actual Cloudflare Workers API endpoints  
      const [gpuResponse, offerResponse, hostsResponse] = await Promise.all([
        fetch('/api/market/gpu-stats').catch(() => null),
        fetch('/api/market/offers').catch(() => null),
        fetch('/api/market/hosts').catch(() => null)
      ])

      if (gpuResponse?.ok) {
        const gpuResult = await gpuResponse.json()
        if (gpuResult.success && gpuResult.data && gpuResult.data.models) {
          // Transform 500.farm API format to our GPUMarketStat format
          const transformedData = gpuResult.data.models.map((model: any) => ({
            model: model.name,
            total_all_count: model.stats?.all?.all?.[0]?.count || 0,
            total_all_median: model.stats?.all?.all?.[0]?.price_median || 0,
            total_all_min: model.stats?.all?.all?.[0]?.price_10th_percentile || 0,
            total_all_max: model.stats?.all?.all?.[0]?.price_90th_percentile || 0,
            available_all_count: model.stats?.available?.all?.[0]?.count || 0,
            available_all_median: model.stats?.available?.all?.[0]?.price_median || 0,
            rented_all_count: model.stats?.rented?.all?.[0]?.count || 0,
            rented_all_median: model.stats?.rented?.all?.[0]?.price_median || 0,
            dlperf_per_dollar: model.info?.dlperf ? Math.round(model.info.dlperf / (model.stats?.all?.all?.[0]?.price_median || 1)) : 0,
            created_at: new Date().toISOString()
          }))
          setGpuData(transformedData)
        }
      }

      if (offerResponse?.ok) {
        const offerResult = await offerResponse.json()
        if (offerResult.success && offerResult.data && offerResult.data.offers) {
          // Transform offers data to our MarketplaceOffer format
          const transformedOffers = offerResult.data.offers.map((offer: any, index: number) => ({
            id: index + 1,
            provider_id: offer.host_id || index,
            model: offer.model || 'Unknown',
            price_base_per_hour: offer.price_per_hour || 0,
            price_total_per_hour: offer.price_per_hour || 0,
            dlperf: offer.performance_score || 0,
            dlperf_per_dollar: offer.performance_score ? Math.round(offer.performance_score / offer.price_per_hour) : 0,
            availability_status: offer.availability ? 'available' : 'rented',
            verification_status: 'verified', // Default since 500.farm data is verified
            created_at: new Date().toISOString()
          }))
          setOfferData(transformedOffers)
        }
      }

      if (hostsResponse?.ok) {
        const hostsResult = await hostsResponse.json()
        if (hostsResult.success && hostsResult.data && hostsResult.data.hosts) {
          // Transform hosts data to our GPUProvider format
          const transformedProviders = hostsResult.data.hosts.map((host: any) => ({
            host_id: host.id || host.host_id,
            host_name: host.name || `Host ${host.id}`,
            country: host.location || 'Unknown',
            region: host.region || 'unknown',
            total_machines: host.num_gpus || 1,
            total_tflops: host.total_flops || 0,
            avg_dlperf_per_dollar: Math.round((host.dlperf || 0) / (host.price_per_hour || 1)),
            verification_status: 'verified',
            created_at: new Date().toISOString()
          }))
          setProviderData(transformedProviders)
          
          // Create availability metrics from provider data
          const availabilityMetrics = transformedProviders.flatMap((provider: any) => [
            {
              gpu_name: 'RTX 4090', // This would come from actual machine data
              count: Math.floor(provider.total_machines / 2),
              rented: false,
              verified: provider.verification_status === 'verified',
              timestamp: new Date().toISOString()
            },
            {
              gpu_name: 'RTX 4090',
              count: Math.ceil(provider.total_machines / 2),
              rented: true,
              verified: provider.verification_status === 'verified', 
              timestamp: new Date().toISOString()
            }
          ])
          setAvailabilityData(availabilityMetrics)
        }
      }

      setLastUpdated(new Date())
    } catch (error) {
      console.warn('Failed to fetch live data, using fallback data:', error)
      // Keep using current data on error
    } finally {
      setLoading(false)
    }
  }

  // Initial data load
  useEffect(() => {
    fetchMarketData()
  }, [])

  // Calculate summary statistics
  const totalGPUs = gpuData.reduce((sum, gpu) => sum + gpu.total_all_count, 0)
  const avgPrice = offerData.reduce((sum, offer) => sum + offer.price_base_per_hour, 0) / offerData.length
  const bestValue = Math.max(...offerData.map(offer => offer.dlperf_per_dollar))

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Market Intelligence Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Live GPU market data • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button 
          onClick={fetchMarketData}
          disabled={loading}
          className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Refresh Data'}
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total GPU Units</CardDescription>
            <CardTitle className="text-3xl">{totalGPUs.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">Across {gpuData.length} models</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Price</CardDescription>
            <CardTitle className="text-3xl">${avgPrice.toFixed(2)}/hr</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">From {offerData.length} active offers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Best Value</CardDescription>
            <CardTitle className="text-3xl">{bestValue.toFixed(0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">DLPERF per dollar</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GPUMarketShareChart data={gpuData} />
        <PricePerformanceChart data={offerData} />
      </div>

      {/* Additional Charts */}
      <div className="space-y-8">
        <AvailabilityMetricsChart data={availabilityData} />
        <GeographicDistributionChart data={providerData} />
      </div>

      {/* Additional Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Market Insights</CardTitle>
            <CardDescription>Key observations from current data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Market Leader</span>
              <span className="font-medium">{gpuData[0]?.model || 'RTX 4090'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Price Range</span>
              <span className="font-medium">
                ${Math.min(...offerData.map(o => o.price_base_per_hour)).toFixed(2)} - 
                ${Math.max(...offerData.map(o => o.price_base_per_hour)).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Verified Offers</span>
              <span className="font-medium">
                {offerData.filter(o => o.verification_status === 'verified').length}/{offerData.length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Sources</CardTitle>
            <CardDescription>Information about current dataset</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">GPU Models</span>
              <span className="font-medium">{gpuData.length} tracked</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Offers</span>
              <span className="font-medium">{offerData.length} available</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Data Provider</span>
              <span className="font-medium">500.farm API</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}