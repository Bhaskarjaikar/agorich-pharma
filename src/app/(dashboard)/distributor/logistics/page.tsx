'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Truck,
  Plus,
  PencilSimple,
  Trash,
  X,
  Check,
  Phone,
  Envelope,
  MapPin,
  Package,
  Clock,
  CurrencyInr,
  Warning,
  CaretDown,
  CaretUp,
  House
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Protected from '@/components/Protected'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { ThemeToggle } from '@/components/ThemeToggle'

interface LogisticsPartner {
  id: string
  partner_name: string
  partner_contact: string | null
  partner_phone: string | null
  partner_email: string | null
  partner_address: string | null
  partner_type: string
  is_active: boolean
  base_cost: number
  cost_per_km: number
  min_weight_kg: number
  max_weight_kg: number
  estimated_days_min: number
  estimated_days_max: number
  notes: string | null
  created_at: string
  updated_at: string
}

const PARTNER_TYPES = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'EXPRESS', label: 'Express' },
  { value: 'ECONOMY', label: 'Economy' },
  { value: 'COLD_CHAIN', label: 'Cold Chain' },
  { value: 'BULK', label: 'Bulk' }
]

export default function LogisticsPartnersPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useSupabaseAuth()
  const [partners, setPartners] = useState<LogisticsPartner[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPartner, setEditingPartner] = useState<LogisticsPartner | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    partner_name: '',
    partner_contact: '',
    partner_phone: '',
    partner_email: '',
    partner_address: '',
    partner_type: 'STANDARD',
    is_active: true,
    base_cost: '',
    cost_per_km: '',
    min_weight_kg: '',
    max_weight_kg: '1000',
    estimated_days_min: '1',
    estimated_days_max: '7',
    notes: ''
  })

  useEffect(() => {
    if (profile?.role === 'DISTRIBUTOR') {
      loadPartners()
    }
  }, [profile])

  const loadPartners = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/distributor/logistics', {
        credentials: 'include'
      })
      const json = await res.json()
      if (json.success) {
        setPartners(json.partners || [])
      }
    } catch (err) {
      console.error('Error loading partners:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      partner_name: '',
      partner_contact: '',
      partner_phone: '',
      partner_email: '',
      partner_address: '',
      partner_type: 'STANDARD',
      is_active: true,
      base_cost: '',
      cost_per_km: '',
      min_weight_kg: '',
      max_weight_kg: '1000',
      estimated_days_min: '1',
      estimated_days_max: '7',
      notes: ''
    })
    setEditingPartner(null)
  }

  const openAddModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (partner: LogisticsPartner) => {
    setEditingPartner(partner)
    setFormData({
      partner_name: partner.partner_name || '',
      partner_contact: partner.partner_contact || '',
      partner_phone: partner.partner_phone || '',
      partner_email: partner.partner_email || '',
      partner_address: partner.partner_address || '',
      partner_type: partner.partner_type || 'STANDARD',
      is_active: partner.is_active ?? true,
      base_cost: partner.base_cost?.toString() || '',
      cost_per_km: partner.cost_per_km?.toString() || '',
      min_weight_kg: partner.min_weight_kg?.toString() || '',
      max_weight_kg: partner.max_weight_kg?.toString() || '1000',
      estimated_days_min: partner.estimated_days_min?.toString() || '1',
      estimated_days_max: partner.estimated_days_max?.toString() || '7',
      notes: partner.notes || ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.partner_name.trim()) {
      alert('Partner name is required')
      return
    }

    setSaving(true)
    try {
      const url = editingPartner
        ? `/api/distributor/logistics/${editingPartner.id}`
        : '/api/distributor/logistics'

      const res = await fetch(url, {
        method: editingPartner ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      })

      const json = await res.json()

      if (json.success) {
        setShowModal(false)
        resetForm()
        loadPartners()
        alert(editingPartner ? 'Partner updated successfully!' : 'Partner added successfully!')
      } else {
        alert(json.error || 'Failed to save partner')
      }
    } catch (err) {
      console.error('Error saving partner:', err)
      alert('Failed to save partner')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (partnerId: string) => {
    if (!confirm('Are you sure you want to delete this logistics partner?')) {
      return
    }

    setDeletingId(partnerId)
    try {
      const res = await fetch(`/api/distributor/logistics/${partnerId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const json = await res.json()

      if (json.success) {
        loadPartners()
        alert('Partner deleted successfully!')
      } else {
        alert(json.error || 'Failed to delete partner')
      }
    } catch (err) {
      console.error('Error deleting partner:', err)
      alert('Failed to delete partner')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleActive = async (partner: LogisticsPartner) => {
    try {
      const res = await fetch(`/api/distributor/logistics/${partner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...partner, is_active: !partner.is_active }),
        credentials: 'include'
      })

      const json = await res.json()

      if (json.success) {
        loadPartners()
      } else {
        alert(json.error || 'Failed to update partner')
      }
    } catch (err) {
      console.error('Error toggling partner:', err)
    }
  }

  const getPartnerTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      STANDARD: 'bg-blue-100 text-blue-800',
      EXPRESS: 'bg-purple-100 text-purple-800',
      ECONOMY: 'bg-green-100 text-green-800',
      COLD_CHAIN: 'bg-cyan-100 text-cyan-800',
      BULK: 'bg-amber-100 text-amber-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type.replace('_', ' ')}
      </span>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (profile?.role !== 'DISTRIBUTOR') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md p-6">
          <CardContent className="text-center">
            <Warning className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">Only distributors can manage logistics partners.</p>
            <Button onClick={() => router.push('/distributor')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Protected>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Logistics Partners</h1>
                <p className="text-xs text-muted-foreground">Manage your delivery partners</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={openAddModal} className="bg-gradient-to-r from-indigo-500 to-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Partner
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : partners.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Logistics Partners Yet</h3>
                <p className="text-muted-foreground mb-4">Add your first logistics partner to manage deliveries.</p>
                <Button onClick={openAddModal} className="bg-gradient-to-r from-indigo-500 to-purple-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Partner
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {partners.map((partner) => (
                <Card key={partner.id} className={!partner.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Truck className="w-6 h-6 text-indigo-600" />
                          <h3 className="font-semibold text-lg">{partner.partner_name}</h3>
                          {getPartnerTypeBadge(partner.partner_type)}
                          {!partner.is_active && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          {partner.partner_phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-4 h-4" />
                              {partner.partner_phone}
                            </div>
                          )}
                          {partner.partner_email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Envelope className="w-4 h-4" />
                              {partner.partner_email}
                            </div>
                          )}
                          {partner.partner_address && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              {partner.partner_address}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-1">
                            <CurrencyInr className="w-4 h-4 text-green-600" />
                            <span>Base: ₹{partner.base_cost || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4 text-blue-600" />
                            <span>₹{partner.cost_per_km || 0}/km</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span>{partner.estimated_days_min}-{partner.estimated_days_max} days</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedCard(expandedCard === partner.id ? null : partner.id)}
                        >
                          {expandedCard === partner.id ? (
                            <CaretUp className="w-4 h-4" />
                          ) : (
                            <CaretDown className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(partner)}
                        >
                          {partner.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(partner)}
                        >
                          <PencilSimple className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(partner.id)}
                          disabled={deletingId === partner.id}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {expandedCard === partner.id && (
                      <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Weight Range</p>
                          <p className="font-medium">{partner.min_weight_kg || 0} - {partner.max_weight_kg || 1000} kg</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Partner Contact</p>
                          <p className="font-medium">{partner.partner_contact || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">{new Date(partner.created_at).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Notes</p>
                          <p className="font-medium">{partner.notes || 'No notes'}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {editingPartner ? 'Edit Logistics Partner' : 'Add Logistics Partner'}
                  </CardTitle>
                  <button onClick={() => { setShowModal(false); resetForm(); }}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-1 block">
                      Partner Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.partner_name}
                      onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                      placeholder="Partner or Company Name"
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Contact Person</label>
                    <input
                      type="text"
                      value={formData.partner_contact}
                      onChange={(e) => setFormData({ ...formData, partner_contact: e.target.value })}
                      placeholder="Contact person name"
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Phone</label>
                    <input
                      type="tel"
                      value={formData.partner_phone}
                      onChange={(e) => setFormData({ ...formData, partner_phone: e.target.value })}
                      placeholder="Phone number"
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-1 block">Email</label>
                    <input
                      type="email"
                      value={formData.partner_email}
                      onChange={(e) => setFormData({ ...formData, partner_email: e.target.value })}
                      placeholder="Email address"
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-1 block">Address</label>
                    <textarea
                      value={formData.partner_address}
                      onChange={(e) => setFormData({ ...formData, partner_address: e.target.value })}
                      placeholder="Full address"
                      rows={2}
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Partner Type</label>
                    <select
                      value={formData.partner_type}
                      onChange={(e) => setFormData({ ...formData, partner_type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                    >
                      {PARTNER_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Active Status</label>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_active: true })}
                        className={`flex-1 py-2 rounded-md border ${formData.is_active ? 'bg-green-100 border-green-500 text-green-700' : 'border-gray-300'}`}
                      >
                        <Check className="w-4 h-4 inline mr-1" /> Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_active: false })}
                        className={`flex-1 py-2 rounded-md border ${!formData.is_active ? 'bg-red-100 border-red-500 text-red-700' : 'border-gray-300'}`}
                      >
                        <X className="w-4 h-4 inline mr-1" /> Inactive
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Base Cost (₹)</label>
                    <input
                      type="number"
                      value={formData.base_cost}
                      onChange={(e) => setFormData({ ...formData, base_cost: e.target.value })}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Cost per km (₹)</label>
                    <input
                      type="number"
                      value={formData.cost_per_km}
                      onChange={(e) => setFormData({ ...formData, cost_per_km: e.target.value })}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Min Weight (kg)</label>
                    <input
                      type="number"
                      value={formData.min_weight_kg}
                      onChange={(e) => setFormData({ ...formData, min_weight_kg: e.target.value })}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Max Weight (kg)</label>
                    <input
                      type="number"
                      value={formData.max_weight_kg}
                      onChange={(e) => setFormData({ ...formData, max_weight_kg: e.target.value })}
                      placeholder="1000"
                      min="0"
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Min Delivery Days</label>
                    <input
                      type="number"
                      value={formData.estimated_days_min}
                      onChange={(e) => setFormData({ ...formData, estimated_days_min: e.target.value })}
                      placeholder="1"
                      min="1"
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">Max Delivery Days</label>
                    <input
                      type="number"
                      value={formData.estimated_days_max}
                      onChange={(e) => setFormData({ ...formData, estimated_days_max: e.target.value })}
                      placeholder="7"
                      min="1"
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-1 block">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600"
                  >
                    {saving ? 'Saving...' : (editingPartner ? 'Update Partner' : 'Add Partner')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowModal(false); resetForm(); }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Protected>
  )
}
