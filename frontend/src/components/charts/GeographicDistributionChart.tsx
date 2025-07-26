"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/simple-chart'
import { GPUProvider } from '@/lib/types'

interface GeographicDistributionChartProps {
  data: GPUProvider[]
  title?: string
  description?: string
}

// Chart configuration
const chartConfig = {
  us: {
    label: "United States",
    color: "hsl(217 91% 60%)" // Blue
  },
  germany: {
    label: "Germany",
    color: "hsl(142 76% 36%)" // Green
  },
  netherlands: {
    label: "Netherlands", 
    color: "hsl(43 96% 56%)" // Yellow
  },
  canada: {
    label: "Canada",
    color: "hsl(346 87% 43%)" // Red
  },
  other: {
    label: "Other",
    color: "hsl(224 71% 4%)" // Dark gray
  }
} as const

// Country color mapping
const getCountryColor = (country: string): string => {
  const normalized = country.toLowerCase()
  if (normalized.includes('united states') || normalized.includes('usa') || normalized === 'us') {
    return chartConfig.us.color
  }
  if (normalized.includes('germany') || normalized === 'de') {
    return chartConfig.germany.color
  }
  if (normalized.includes('netherlands') || normalized === 'nl') {
    return chartConfig.netherlands.color
  }
  if (normalized.includes('canada') || normalized === 'ca') {
    return chartConfig.canada.color
  }
  return chartConfig.other.color
}

export function GeographicDistributionChart({ 
  data, 
  title = "Geographic Distribution",
  description = "Provider distribution by country and compute capacity"
}: GeographicDistributionChartProps) {
  // Aggregate data by country
  const countryData = data.reduce((acc: any[], provider) => {
    const country = provider.country || 'Unknown'
    let existing = acc.find(item => item.country === country)
    
    if (!existing) {
      existing = {
        country,
        providers: 0,
        total_machines: 0,
        total_tflops: 0,
        avg_dlperf_per_dollar: 0,
        verified_providers: 0
      }
      acc.push(existing)
    }
    
    existing.providers += 1
    existing.total_machines += provider.total_machines
    existing.total_tflops += provider.total_tflops
    existing.avg_dlperf_per_dollar += provider.avg_dlperf_per_dollar
    
    if (provider.verification_status === 'verified') {
      existing.verified_providers += 1
    }
    
    return acc
  }, [])

  // Calculate averages and sort by TFLOPS
  countryData.forEach(country => {
    country.avg_dlperf_per_dollar = Math.round(country.avg_dlperf_per_dollar / country.providers)
  })
  countryData.sort((a, b) => b.total_tflops - a.total_tflops)

  // Prepare data for pie chart (provider count)
  const pieData = countryData.map(country => ({
    name: country.country,
    value: country.providers,
    color: getCountryColor(country.country)
  }))

  return (
    <div className="space-y-6">
      {/* Country Performance Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px]">
            <BarChart data={countryData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="country"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                yAxisId="tflops"
                orientation="left"
                label={{ value: 'TFLOPS', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="machines"
                orientation="right"
                label={{ value: 'Machines', angle: 90, position: 'insideRight' }}
              />
              <Bar
                yAxisId="tflops"
                dataKey="total_tflops"
                fill="hsl(217 91% 60%)"
                name="Total TFLOPS"
                opacity={0.8}
              />
              <Bar
                yAxisId="machines"
                dataKey="total_machines"
                fill="hsl(142 76% 36%)"
                name="Total Machines"
                opacity={0.6}
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
                            name: "Providers",
                            value: `${data.providers}`,
                            color: "hsl(217 91% 60%)"
                          },
                          {
                            name: "TFLOPS",
                            value: `${data.total_tflops.toLocaleString()}`,
                            color: "hsl(217 91% 60%)"
                          },
                          {
                            name: "Machines",
                            value: `${data.total_machines.toLocaleString()}`,
                            color: "hsl(142 76% 36%)"
                          },
                          {
                            name: "Avg Value",
                            value: `${data.avg_dlperf_per_dollar} DLPERF/$`,
                            color: "hsl(43 96% 56%)"
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

      {/* Provider Distribution by Country */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Provider Distribution</CardTitle>
            <CardDescription>Number of providers by country</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={2}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <ChartTooltipContent
                          active={active}
                          payload={[
                            {
                              name: data.name,
                              value: `${data.value} providers`,
                              color: data.color
                            }
                          ]}
                        />
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Country Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Regional Statistics</CardTitle>
            <CardDescription>Key metrics by geographic region</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {countryData.slice(0, 4).map((country) => (
                <div key={country.country} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: getCountryColor(country.country) }}
                      />
                      <span className="font-medium">{country.country}</span>
                    </div>
                    <span className="text-sm text-slate-600">
                      {country.providers} providers
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 ml-5">
                    <div>
                      <div className="font-medium text-slate-900">
                        {country.total_tflops.toLocaleString()}
                      </div>
                      <div>TFLOPS</div>
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">
                        {country.total_machines.toLocaleString()}
                      </div>
                      <div>Machines</div>
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">
                        {country.avg_dlperf_per_dollar}
                      </div>
                      <div>DLPERF/$</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}