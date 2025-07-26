'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { GPUProvider } from '@/lib/types'

interface CountryFilterProps {
  data: GPUProvider[]
  onFilterChange: (filteredData: GPUProvider[]) => void
}

export function CountryFilter({ data, onFilterChange }: CountryFilterProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('all')

  // Get unique countries and their counts
  const countryStats = data.reduce((acc: any[], provider) => {
    const country = provider.country || 'Unknown'
    let existing = acc.find(item => item.country === country)
    
    if (!existing) {
      existing = { country, count: 0, totalMachines: 0, totalTflops: 0 }
      acc.push(existing)
    }
    
    existing.count += 1
    existing.totalMachines += provider.total_machines
    existing.totalTflops += provider.total_tflops
    
    return acc
  }, [])
  
  countryStats.sort((a, b) => b.totalTflops - a.totalTflops)

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country)
    
    if (country === 'all') {
      onFilterChange(data)
    } else {
      const filtered = data.filter(provider => provider.country === country)
      onFilterChange(filtered)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Geographic Filter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Select value={selectedCountry} onValueChange={handleCountryChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countryStats.map((stat) => (
                <SelectItem key={stat.country} value={stat.country}>
                  {stat.country} ({stat.count} providers)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <div className="text-sm font-medium">Available Countries:</div>
          <div className="flex flex-wrap gap-2">
            {countryStats.slice(0, 8).map((stat) => (
              <Badge 
                key={stat.country}
                variant={selectedCountry === stat.country ? "default" : "secondary"}
                className="cursor-pointer text-xs"
                onClick={() => handleCountryChange(stat.country)}
              >
                {stat.country} ({stat.count})
              </Badge>
            ))}
            {countryStats.length > 8 && (
              <Badge variant="outline" className="text-xs">
                +{countryStats.length - 8} more
              </Badge>
            )}
          </div>
        </div>

        {selectedCountry !== 'all' && (
          <div className="pt-2 border-t">
            <div className="text-sm text-slate-600">
              {selectedCountry} Statistics:
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
              <div>
                <div className="font-medium">
                  {countryStats.find(s => s.country === selectedCountry)?.count || 0}
                </div>
                <div className="text-slate-500">Providers</div>
              </div>
              <div>
                <div className="font-medium">
                  {(countryStats.find(s => s.country === selectedCountry)?.totalMachines || 0).toLocaleString()}
                </div>
                <div className="text-slate-500">Machines</div>
              </div>
              <div>
                <div className="font-medium">
                  {(countryStats.find(s => s.country === selectedCountry)?.totalTflops || 0).toLocaleString()}
                </div>
                <div className="text-slate-500">TFLOPS</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}