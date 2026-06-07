import { useState, useEffect, useCallback } from 'react'
import type { Distributor, SelectedDistributor, DistributorInfo } from '@/lib/invoice/types'

interface UseDistributorSelectionProps {
  profile: { id: string; store_lat?: string | null; store_lng?: string | null } | null
  onDistributorSelected?: (distributorId: string) => void
  onDistributorDeselected?: () => void
}

interface UseDistributorSelectionReturn {
  searchRadius: number
  setSearchRadius: (radius: number) => void
  distributors: Distributor[]
  distributorsLoading: boolean
  distributorsError: string | null
  selectedDistributor: SelectedDistributor | null
  selectedDistributorInfo: DistributorInfo | null
  currentLock: { distributor_id: string; locked_at: string } | null
  loadDistributors: (lat: number, lng: number, radius: number) => Promise<void>
  handleSelectDistributor: (distributor: Distributor) => Promise<void>
  handleReleaseLock: () => Promise<void>
  refreshDistributorProducts: (distributorId: string) => Promise<void>
}

export function useDistributorSelection({
  profile,
  onDistributorSelected,
  onDistributorDeselected
}: UseDistributorSelectionProps): UseDistributorSelectionReturn {
  const [searchRadius, setSearchRadius] = useState(5)
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [distributorsLoading, setDistributorsLoading] = useState(false)
  const [distributorsError, setDistributorsError] = useState<string | null>(null)
  const [selectedDistributor, setSelectedDistributor] = useState<SelectedDistributor | null>(null)
  const [selectedDistributorInfo, setSelectedDistributorInfo] = useState<DistributorInfo | null>(null)
  const [currentLock, setCurrentLock] = useState<{ distributor_id: string; locked_at: string } | null>(null)

  const loadDistributors = useCallback(async (lat: number, lng: number, radius: number) => {
    setDistributorsLoading(true)
    setDistributorsError(null)
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radius: radius.toString(),
        limit: '50'
      })
      const res = await fetch(`/api/distributors/by-distance?${params}`, {
        credentials: 'include'
      })
      const json = await res.json()
      if (json.success) {
        setDistributors(json.distributors || [])
      } else {
        setDistributorsError(json.error || 'Failed to load distributors')
      }
    } catch (err) {
      console.error('Error loading distributors:', err)
      setDistributorsError('Failed to load distributors. Please try again.')
    } finally {
      setDistributorsLoading(false)
    }
  }, [])

  const refreshDistributorProducts = useCallback(async (distributorId: string) => {
    try {
      onDistributorSelected?.(distributorId)
    } catch (err) {
      console.error('Error refreshing distributor products:', err)
    }
  }, [onDistributorSelected])

  const loadDistributorInfo = useCallback(async (distributorId: string) => {
    fetch(`/api/profile/${distributorId}`)
      .then(response => response.json())
      .then(result => {
        if (result.success && result.profile) {
          const profileData = result.profile
          setSelectedDistributorInfo({
            business_name: profileData.business_name || '',
            address: profileData.address || '',
            city: profileData.city || '',
            state: profileData.state || '',
            pincode: profileData.pincode || '',
            gst_number: profileData.gst_number || '',
            phone: profileData.phone || '',
            drug_license_20b: profileData.drug_license_20b || '',
            drug_license_21b: profileData.drug_license_21b || ''
          })
        }
      })
      .catch(err => console.error('Error loading distributor profile:', err))
  }, [])

  const handleSelectDistributor = useCallback(async (distributor: Distributor) => {
    if (!distributor.rejection_status.available) {
      alert('This distributor has reached their monthly rejection limit and cannot accept new orders.')
      return
    }

    if (!profile?.id) return

    try {
      const res = await fetch('/api/retailer/distributor-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailer_id: profile.id,
          distributor_id: distributor.id
        })
      })
      const json = await res.json()

      if (json.success) {
        setCurrentLock(json.lock)
        setSelectedDistributor({
          ...distributor,
          locked_at: json.lock.locked_at
        })

        sessionStorage.setItem('selected_distributor_id', distributor.id)
        sessionStorage.setItem('selected_distributor_name', distributor.business_name)
        sessionStorage.setItem('selected_distributor_info', JSON.stringify({
          business_name: distributor.business_name,
          address: distributor.address,
          city: distributor.city,
          state: distributor.state,
          pincode: distributor.pincode
        }))

        await refreshDistributorProducts(distributor.id)
        await loadDistributorInfo(distributor.id)
      } else {
        alert(json.error || 'Failed to select distributor')
      }
    } catch (err) {
      console.error('Error selecting distributor:', err)
      alert('Failed to select distributor. Please try again.')
    }
  }, [profile, refreshDistributorProducts, loadDistributorInfo])

  const handleReleaseLock = useCallback(async () => {
    if (!profile?.id) return

    try {
      const res = await fetch('/api/retailer/distributor-lock', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailer_id: profile.id
        })
      })
      const json = await res.json()

      if (json.success) {
        setCurrentLock(null)
        setSelectedDistributor(null)
        setSelectedDistributorInfo(null)
        sessionStorage.removeItem('selected_distributor_id')
        sessionStorage.removeItem('selected_distributor_name')
        sessionStorage.removeItem('selected_distributor_info')
        onDistributorDeselected?.()
      } else {
        alert(json.error || 'Failed to change distributor')
      }
    } catch (err) {
      console.error('Error releasing lock:', err)
      alert('Failed to change distributor. Please try again.')
    }
  }, [profile, onDistributorDeselected])

  useEffect(() => {
    if (profile?.store_lat && profile?.store_lng) {
      const lat = parseFloat(String(profile.store_lat))
      const lng = parseFloat(String(profile.store_lng))
      if (!isNaN(lat) && !isNaN(lng)) {
        loadDistributors(lat, lng, searchRadius)
      }
    }
  }, [profile, loadDistributors, searchRadius])

  useEffect(() => {
    const checkLock = async () => {
      if (!profile?.id) return
      try {
        const res = await fetch(`/api/retailer/distributor-lock?retailer_id=${profile.id}`, {
          credentials: 'include'
        })
        const json = await res.json()
        if (json.success && json.lock) {
          setCurrentLock(json.lock)
          if (json.distributor) {
            setSelectedDistributor(json.distributor)
          }
        }
      } catch (err) {
        console.error('Error checking lock:', err)
      }
    }
    checkLock()
  }, [profile])

  useEffect(() => {
    const distributorInfoJson = sessionStorage.getItem('selected_distributor_info')
    if (!distributorInfoJson) return

    try {
      const basicInfo = JSON.parse(distributorInfoJson)
      const selectedDistributorId = sessionStorage.getItem('selected_distributor_id')

      if (!selectedDistributorId) return

      fetch(`/api/profile/${selectedDistributorId}`)
        .then(response => response.json())
        .then(result => {
          if (result.success && result.profile) {
            const profileData = result.profile
            setSelectedDistributorInfo({
              business_name: profileData.business_name || basicInfo.business_name || '',
              address: profileData.address || basicInfo.address || '',
              city: profileData.city || basicInfo.city || '',
              state: profileData.state || basicInfo.state || '',
              pincode: profileData.pincode || basicInfo.pincode || '',
              gst_number: profileData.gst_number || '',
              phone: profileData.phone || '',
              drug_license_20b: profileData.drug_license_20b || '',
              drug_license_21b: profileData.drug_license_21b || ''
            })
          } else {
            setSelectedDistributorInfo({
              business_name: basicInfo.business_name || '',
              address: basicInfo.address || '',
              city: basicInfo.city || '',
              state: basicInfo.state || '',
              pincode: basicInfo.pincode || '',
              gst_number: '',
              phone: '',
              drug_license_20b: '',
              drug_license_21b: ''
            })
          }
        })
    } catch (error) {
      console.error('Error loading distributor info:', error)
    }
  }, [])

  return {
    searchRadius,
    setSearchRadius,
    distributors,
    distributorsLoading,
    distributorsError,
    selectedDistributor,
    selectedDistributorInfo,
    currentLock,
    loadDistributors,
    handleSelectDistributor,
    handleReleaseLock,
    refreshDistributorProducts
  }
}