'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CollectionStatus {
  endpoint: string
  lastUpdate: string | null
  recordCount: number
  status: 'active' | 'stale' | 'error'
  minutesSinceUpdate: number | null
}

export function DataCollectionStatus() {
  const [statuses, setStatuses] = useState<CollectionStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date>(new Date())

  const checkStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('https://gpuscout-platform.nenad-a7c.workers.dev/api/scheduled/status')
      const result = await response.json()
      
      if (result.success && result.data) {
        const endpoints = ['gpu_stats', 'marketplace_offers', 'gpu_providers', 'real_time_metrics']
        const newStatuses: CollectionStatus[] = endpoints.map(endpoint => {
          const endpointData = result.data[endpoint] || {}
          const minutes = endpointData.minutesSinceLastUpdate
          
          let status: 'active' | 'stale' | 'error' = 'active'
          if (minutes === null || minutes > 60) status = 'error'
          else if (minutes > 30) status = 'stale'
          
          return {
            endpoint: endpoint.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            lastUpdate: endpointData.lastUpdate || null,
            recordCount: endpointData.totalRecords || 0,
            status,
            minutesSinceUpdate: minutes
          }
        })
        
        setStatuses(newStatuses)
      }
    } catch (error) {
      console.error('Failed to check status:', error)
    }
    setLoading(false)
    setLastChecked(new Date())
  }

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: CollectionStatus['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'stale':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = (status: CollectionStatus['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>
      case 'stale':
        return <Badge variant="default" className="bg-yellow-500">Stale</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Data Collection Status</CardTitle>
            <CardDescription>
              Real-time monitoring of data collection services
            </CardDescription>
          </div>
          <Button
            onClick={checkStatus}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {statuses.map((status) => (
            <div key={status.endpoint} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(status.status)}
                <div>
                  <p className="font-medium">{status.endpoint}</p>
                  <p className="text-sm text-muted-foreground">
                    {status.recordCount.toLocaleString()} records
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm">
                    {status.minutesSinceUpdate !== null 
                      ? `${status.minutesSinceUpdate} min ago`
                      : 'Never updated'}
                  </p>
                </div>
                {getStatusBadge(status.status)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
          Last checked: {lastChecked.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  )
}