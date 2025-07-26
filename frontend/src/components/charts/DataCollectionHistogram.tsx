'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TimelineData {
  hour: string
  gpuStats: number
  offers: number
  hosts: number
  metrics: number
}

export function DataCollectionHistogram() {
  const [timelineData, setTimelineData] = useState<TimelineData[]>([])
  const [timeRange, setTimeRange] = useState('24h')
  const [loading, setLoading] = useState(true)

  const fetchTimeline = async () => {
    setLoading(true)
    try {
      // For now, generate sample data showing the expected collection pattern
      // This will be replaced with actual API call to /api/diagnostics/timeline
      const now = new Date()
      const hours = timeRange === '24h' ? 24 : timeRange === '12h' ? 12 : 6
      const data: TimelineData[] = []
      
      for (let i = hours - 1; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
        data.push({
          hour: hour.getHours() + ':00',
          // Simulate expected collection patterns
          gpuStats: Math.floor(12 * (1 + Math.random() * 0.2)), // ~12 per hour (every 5 min)
          offers: Math.floor(30 * (1 + Math.random() * 0.2)), // ~30 per hour (every 2 min)
          hosts: Math.floor(2 * (1 + Math.random() * 0.2)), // ~2 per hour (every 30 min)
          metrics: Math.floor(60 * (1 + Math.random() * 0.2)), // ~60 per hour (every 1 min)
        })
      }
      
      setTimelineData(data)
    } catch (error) {
      console.error('Failed to fetch timeline:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTimeline()
  }, [timeRange])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} collections
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Data Collection Timeline</CardTitle>
            <CardDescription>
              Collection frequency across different endpoints
            </CardDescription>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectContent>
              <SelectItem value="6h">Last 6 hours</SelectItem>
              <SelectItem value="12h">Last 12 hours</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="metrics" stackId="a" fill="#8884d8" name="Real-time Metrics" />
            <Bar dataKey="offers" stackId="a" fill="#82ca9d" name="GPU Offers" />
            <Bar dataKey="gpuStats" stackId="a" fill="#ffc658" name="GPU Stats" />
            <Bar dataKey="hosts" stackId="a" fill="#ff7c7c" name="Hosts" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#8884d8]" />
            <span>Every 1 min</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#82ca9d]" />
            <span>Every 2 min</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#ffc658]" />
            <span>Every 5 min</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#ff7c7c]" />
            <span>Every 30 min</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}