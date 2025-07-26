"use client"

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { MarketplaceOffer } from '@/lib/types'

interface PricePerformanceChartProps {
  data: MarketplaceOffer[]
  title?: string
  description?: string
}

// Chart configuration
const chartConfig = {
  offers: {
    label: "GPU Offers",
    color: "hsl(var(--chart-1))"
  },
  verified: {
    label: "Verified",
    color: "hsl(var(--chart-2))"
  },
  unverified: {
    label: "Unverified", 
    color: "hsl(var(--chart-3))"
  }
} as const

export function PricePerformanceChart({ 
  data, 
  title = "Price vs Performance Analysis",
  description = "GPU performance value (DLPERF per dollar) vs hourly pricing"
}: PricePerformanceChartProps) {
  // Transform data for scatter chart
  const chartData = data.map((offer) => ({
    price: offer.price_base_per_hour,
    performance: offer.dlperf_per_dollar,
    model: offer.model,
    dlperf: offer.dlperf,
    verified: offer.verification_status === 'verified',
    id: offer.id
  }))

  // Separate verified and unverified offers
  const verifiedOffers = chartData.filter(item => item.verified)
  const unverifiedOffers = chartData.filter(item => !item.verified)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px]">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              dataKey="price"
              name="Price per Hour"
              unit="$"
              domain={['dataMin - 0.1', 'dataMax + 0.1']}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <YAxis 
              type="number" 
              dataKey="performance"
              name="DLPERF per Dollar"
              domain={['dataMin - 50', 'dataMax + 50']}
              tickFormatter={(value) => value.toFixed(0)}
            />
            
            {/* Verified offers */}
            <Scatter
              name="Verified"
              data={verifiedOffers}
              fill={chartConfig.verified.color}
            />
            
            {/* Unverified offers */}
            <Scatter
              name="Unverified"
              data={unverifiedOffers}
              fill={chartConfig.unverified.color}
              fillOpacity={0.6}
            />
            
            {/* Value reference line - sweet spot for performance/price ratio */}
            <ReferenceLine 
              y={400} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="5 5"
              label={{ value: "Good Value Threshold", position: "top" }}
            />
            
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <ChartTooltipContent
                      active={active}
                      payload={[
                        {
                          name: data.model,
                          value: `$${data.price}/hr`,
                          color: data.verified ? chartConfig.verified.color : chartConfig.unverified.color
                        }
                      ]}
                      formatter={() => [
                        <div key="tooltip" className="grid gap-1">
                          <div>Model: {data.model}</div>
                          <div>Price: ${data.price}/hr</div>
                          <div>DLPERF: {data.dlperf}</div>
                          <div>Value: {data.performance.toFixed(1)} DLPERF/$</div>
                          <div>Status: {data.verified ? 'Verified' : 'Unverified'}</div>
                        </div>,
                        ""
                      ]}
                    />
                  )
                }
                return null
              }}
            />
          </ScatterChart>
        </ChartContainer>
        
        {/* Legend and stats */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: chartConfig.verified.color }}
              />
              <span>Verified Offers ({verifiedOffers.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full opacity-60"
                style={{ backgroundColor: chartConfig.unverified.color }}
              />
              <span>Unverified Offers ({unverifiedOffers.length})</span>
            </div>
          </div>
          
          <div className="space-y-1 text-muted-foreground">
            <div>Price Range: ${Math.min(...chartData.map(d => d.price)).toFixed(2)} - ${Math.max(...chartData.map(d => d.price)).toFixed(2)}</div>
            <div>Best Value: {Math.max(...chartData.map(d => d.performance)).toFixed(0)} DLPERF/$</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}