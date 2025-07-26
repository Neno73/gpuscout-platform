"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/simple-chart'
import { AvailabilityMetric } from '@/lib/types'

interface AvailabilityMetricsChartProps {
  data: AvailabilityMetric[]
  title?: string
  description?: string
}

// Chart configuration
const chartConfig = {
  available: {
    label: "Available",
    color: "hsl(142 76% 36%)" // Green
  },
  rented: {
    label: "Rented", 
    color: "hsl(346 87% 43%)" // Red
  },
  verified: {
    label: "Verified",
    color: "hsl(217 91% 60%)" // Blue
  },
  unverified: {
    label: "Unverified",
    color: "hsl(43 96% 56%)" // Yellow
  }
} as const

export function AvailabilityMetricsChart({ 
  data, 
  title = "GPU Availability Metrics",
  description = "Real-time availability and rental status by GPU model"
}: AvailabilityMetricsChartProps) {
  // Transform data for bar chart
  const chartData = data.reduce((acc: any[], metric) => {
    let existing = acc.find(item => item.gpu_name === metric.gpu_name)
    
    if (!existing) {
      existing = {
        gpu_name: metric.gpu_name,
        available: 0,
        rented: 0,
        verified: 0,
        unverified: 0,
        total: 0
      }
      acc.push(existing)
    }
    
    const count = metric.count
    existing.total += count
    
    if (metric.rented) {
      existing.rented += count
    } else {
      existing.available += count
    }
    
    if (metric.verified) {
      existing.verified += count
    } else {
      existing.unverified += count
    }
    
    return acc
  }, [])

  // Sort by total count descending
  chartData.sort((a, b) => b.total - a.total)

  // Calculate percentages for gauges
  const availabilityRates = chartData.map(item => ({
    gpu_name: item.gpu_name,
    availability_rate: Math.round((item.available / item.total) * 100),
    verification_rate: Math.round((item.verified / item.total) * 100),
    total: item.total
  }))

  return (
    <div className="space-y-6">
      {/* Availability Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="gpu_name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Bar
                dataKey="available"
                stackId="status"
                fill={chartConfig.available.color}
                name="Available"
              />
              <Bar
                dataKey="rented"
                stackId="status"
                fill={chartConfig.rented.color}
                name="Rented"
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <ChartTooltipContent
                        active={active}
                        payload={[
                          {
                            name: "Available",
                            value: `${data.available} units`,
                            color: chartConfig.available.color
                          },
                          {
                            name: "Rented", 
                            value: `${data.rented} units`,
                            color: chartConfig.rented.color
                          }
                        ]}
                        label={label}
                      />
                    )
                  }
                  return null
                }}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Availability Rate Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availabilityRates.slice(0, 6).map((item) => (
          <Card key={item.gpu_name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{item.gpu_name}</CardTitle>
              <CardDescription>Availability & Verification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Availability Gauge */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Available</span>
                    <span className="font-medium">{item.availability_rate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${item.availability_rate}%`,
                        backgroundColor: chartConfig.available.color
                      }}
                    />
                  </div>
                </div>

                {/* Verification Gauge */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Verified</span>
                    <span className="font-medium">{item.verification_rate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${item.verification_rate}%`,
                        backgroundColor: chartConfig.verified.color
                      }}
                    />
                  </div>
                </div>

                {/* Total Count */}
                <div className="text-xs text-slate-600 text-center pt-2 border-t">
                  Total: {item.total} units
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}