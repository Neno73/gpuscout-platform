"use client"

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/simple-chart'
import { GPUMarketStat } from '@/lib/types'

interface GPUMarketShareChartProps {
  data: GPUMarketStat[]
  title?: string
  description?: string
}

// Chart configuration with GPU model colors
const chartConfig = {
  "RTX 4090": {
    label: "RTX 4090",
    color: "hsl(var(--chart-1))"
  },
  "RTX 3090": {
    label: "RTX 3090", 
    color: "hsl(var(--chart-2))"
  },
  "RTX 3080": {
    label: "RTX 3080",
    color: "hsl(var(--chart-3))"
  },
  "RTX 4080": {
    label: "RTX 4080",
    color: "hsl(var(--chart-4))"
  },
  "A100": {
    label: "A100",
    color: "hsl(var(--chart-5))"
  }
} as const

export function GPUMarketShareChart({ 
  data, 
  title = "GPU Market Share",
  description = "Distribution of GPU models by total available units"
}: GPUMarketShareChartProps) {
  // Transform data for pie chart
  const chartData = data.map((item) => ({
    model: item.model,
    count: item.total_all_count,
    percentage: 0 // Will be calculated
  }))

  // Calculate percentages
  const totalCount = chartData.reduce((sum, item) => sum + item.count, 0)
  chartData.forEach(item => {
    item.percentage = Math.round((item.count / totalCount) * 100)
  })

  // Sort by count descending
  chartData.sort((a, b) => b.count - a.count)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="model"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={chartConfig[entry.model as keyof typeof chartConfig]?.color || "hsl(var(--muted))"}
                />
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
                          name: data.model,
                          value: `${data.count} units (${data.percentage}%)`,
                          color: chartConfig[data.model as keyof typeof chartConfig]?.color
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
        
        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {chartData.slice(0, 5).map((item) => (
            <div key={item.model} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: chartConfig[item.model as keyof typeof chartConfig]?.color || "hsl(var(--muted))"
                }}
              />
              <span className="text-muted-foreground">
                {item.model}: {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}