'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import {
  CheckCircle,
  XCircle,
  MapPin,
  Storefront,
  Warning,
  SpinnerGap,
  MagnifyingGlass
} from '@phosphor-icons/react'
import type { Distributor } from '@/lib/invoice/types'

interface DistributorSelectorProps {
  searchRadius: number
  onRadiusChange: (radius: number) => void
  distributors: Distributor[]
  loading: boolean
  error: string | null
  selectedDistributor: Distributor | null
  onSelectDistributor: (distributor: Distributor) => void
  onReleaseLock: () => void
  onSearchChange: (query: string) => void
  searchQuery: string
}

export function DistributorSelector({
  searchRadius,
  onRadiusChange,
  distributors,
  loading,
  error,
  selectedDistributor,
  onSelectDistributor,
  onReleaseLock,
  searchQuery,
  onSearchChange
}: DistributorSelectorProps) {
  if (selectedDistributor) {
    return (
      <Card className="mb-4 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-900/20">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Distributor Selected</h4>
                <p className="text-sm text-muted-foreground">{selectedDistributor.business_name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedDistributor.address}, {selectedDistributor.city}, {selectedDistributor.state} {selectedDistributor.pincode}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  {selectedDistributor.distance_km.toFixed(1)} km away
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={onReleaseLock}
              className="text-xs"
            >
              Change
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Search Radius
          </label>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{searchRadius} km</span>
        </div>
        <Slider
          value={[searchRadius]}
          onValueChange={(value) => onRadiusChange(value[0])}
          min={1}
          max={50}
          step={1}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>1 km</span>
          <span>25 km</span>
          <span>50 km</span>
        </div>
      </div>

      <div className="mb-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <SpinnerGap className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <Warning className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : distributors.length === 0 ? (
          <div className="text-center py-8">
            <Storefront className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No distributors found in this area</p>
            <p className="text-xs text-muted-foreground mt-1">Try increasing the search radius</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {distributors.map((distributor) => (
              <Card
                key={distributor.id}
                className={`cursor-pointer hover:border-emerald-500/50 transition-colors ${
                  !distributor.rejection_status.available ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => distributor.rejection_status.available && onSelectDistributor(distributor)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">{distributor.business_name}</h4>
                      <p className="text-xs text-muted-foreground">{distributor.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {distributor.city}, {distributor.state}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {distributor.distance_km.toFixed(1)} km
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 ${
                            distributor.rejection_status.available
                              ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                              : 'border-rose-500/30 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          Rejects: {distributor.rejection_status.current}/{distributor.rejection_status.max}
                        </Badge>
                      </div>
                    </div>
                    {distributor.rejection_status.available ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 mt-1" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500 mt-1" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search products"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-background border-input text-foreground placeholder:text-muted-foreground"
        />
      </div>
    </>
  )
}