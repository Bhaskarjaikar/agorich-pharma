'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase-client'
import { MapPin as MapPinIcon, CheckCircle, Building, User, Store, Shield, FileText, ExternalLink, Info } from 'lucide-react'

// ============ CONSTANTS ============
const BUSINESS_TYPES = ['Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited', 'Other']

const INSTRUCTION_TEXT = "Apne store ki sateek Latitude aur Longitude nikalne ke liye yahan click karein:"

// ============ VALIDATORS ============
const validators = {
  required: (v: string, msg = 'This field is required') => !v.trim() ? msg : null,
  minLength: (v: string, min: number, msg?: string) => v.trim().length < min ? (msg || `Minimum ${min} characters required`) : null,
  gstin: (v: string) => {
    if (!v.trim()) return null
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v.toUpperCase())) return 'GST must be exactly 15 characters'
    return null
  },
  pan: (v: string) => {
    if (!v.trim()) return null
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.toUpperCase())) return 'PAN must be exactly 10 characters (e.g., ABCDE1234F)'
    return null
  },
  email: (v: string) => {
    if (!v.trim()) return null
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v)) return null
    return null
  },
  phone: (v: string) => {
    if (!v.trim()) return 'Mobile number is required'
    if (!/^[6-9]\d{9}$/.test(v)) return 'Mobile must be 10 digits starting with 6, 7, 8, or 9'
    return null
  },
  pincode: (v: string) => {
    if (!v.trim()) return null
    if (!/^[1-9][0-9]{5}$/.test(v)) return null
    return null
  },
  latitude: (v: string) => {
    if (!v.trim()) return null
    const num = parseFloat(v)
    if (isNaN(num)) return null
    if (num < 6.0 || num > 38.0) return null
    return null
  },
  longitude: (v: string) => {
    if (!v.trim()) return null
    const num = parseFloat(v)
    if (isNaN(num)) return null
    if (num < 68.0 || num > 98.0) return null
    return null
  },
  name: (v: string) => {
    if (!v.trim()) return 'Full name is required'
    if (v.trim().length < 3) return 'Name must be at least 3 characters'
    if (!/^[a-zA-Z\s]+$/.test(v.trim())) return 'Name should contain only letters and spaces'
    return null
  },
  businessName: (v: string) => {
    if (!v.trim()) return 'Business name is required'
    if (v.trim().length < 3) return 'Business name must be at least 3 characters'
    return null
  },
}

// ============ TYPES ============
interface FormState {
  userName: string
  phone: string
  businessName: string
  businessType: string
  address: string
  city: string
  stateName: string
  pincode: string
  gstNumber: string
  panNumber: string
  storeLat: string
  storeLng: string
  email: string
}

interface FieldConfig {
  name: keyof FormState
  label: string
  required: boolean
  type: string
  placeholder: string
  inputMode?: React.InputHTMLAttributes<unknown>['inputMode']
  validate?: (v: string) => string | null
  upperCase?: boolean
  numericOnly?: boolean
  maxLength?: number
}

const SECTIONS = [
  { id: 'business', title: '1. Business Identity', icon: Building },
  { id: 'contact', title: '2. Contact Person', icon: User },
  { id: 'location', title: '3. Store Location', icon: Store },
]

// ============ COMPONENT ============
export default function RetailerOnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profileFile, setProfileFile] = useState<File | null>(null)

  const STORAGE_KEY = 'retailer_onboarding_form'

  const getInitialForm = (): FormState => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          userName: parsed.userName || '',
          phone: parsed.phone || '',
          businessName: parsed.businessName || '',
          businessType: parsed.businessType || '',
          address: parsed.address || '',
          city: parsed.city || '',
          stateName: parsed.stateName || '',
          pincode: parsed.pincode || '',
          gstNumber: parsed.gstNumber || '',
          panNumber: parsed.panNumber || '',
          storeLat: parsed.storeLat || '',
          storeLng: parsed.storeLng || '',
          email: parsed.email || '',
        }
      }
    } catch (e) {
      console.warn('Failed to load saved form data:', e)
    }
    return {
      userName: '', phone: '', businessName: '', businessType: '',
      address: '', city: '', stateName: '', pincode: '',
      gstNumber: '', panNumber: '', storeLat: '', storeLng: '', email: '',
    }
  }

  const [form, setForm] = useState<FormState>(getInitialForm)

  const saveFormToStorage = useCallback((data: FormState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      console.warn('Failed to save form data:', e)
    }
  }, [])

  const clearFormFromStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.warn('Failed to clear form data:', e)
    }
  }, [])

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({})

  // ============ FIELD CONFIGS ============
  const fields: Record<string, FieldConfig[]> = {
    business: [
      { name: 'businessName', label: 'Legal Business Name', required: true, type: 'text', placeholder: 'Business Name *', validate: validators.businessName },
      { name: 'businessType', label: 'Business Type', required: true, type: 'select', placeholder: 'Business Type *' },
      { name: 'gstNumber', label: 'GST Number (GSTIN)', required: true, type: 'text', placeholder: 'GST Number *', validate: validators.gstin, upperCase: true },
      { name: 'panNumber', label: 'PAN Number', required: false, type: 'text', placeholder: 'PAN Number (Optional)', validate: validators.pan, upperCase: true },
      { name: 'address', label: 'Registered Address', required: true, type: 'textarea', placeholder: 'Complete Address *' },
      { name: 'city', label: 'City', required: true, type: 'text', placeholder: 'City *' },
      { name: 'stateName', label: 'State', required: true, type: 'text', placeholder: 'State *' },
      { name: 'pincode', label: 'Pincode', required: true, type: 'text', placeholder: '6-digit Pincode *', inputMode: 'numeric', validate: validators.pincode, numericOnly: true, maxLength: 6 },
    ],
    contact: [
      { name: 'userName', label: 'Full Name', required: true, type: 'text', placeholder: 'Your Name *', validate: validators.name },
      { name: 'phone', label: 'Mobile Number', required: true, type: 'tel', placeholder: '10-digit Mobile *', inputMode: 'tel', validate: validators.phone, numericOnly: true, maxLength: 10 },
      { name: 'email', label: 'Email Address', required: true, type: 'email', placeholder: 'Email *', validate: validators.email },
    ],
    location: [
      { name: 'storeLat', label: 'Latitude', required: true, type: 'text', placeholder: 'Latitude *' },
      { name: 'storeLng', label: 'Longitude', required: true, type: 'text', placeholder: 'Longitude *' },
    ],
  }

  // ============ HANDLERS ============
  const validateField = useCallback((name: string, value: string): string | null => {
    const config = Object.values(fields).flat().find(f => f.name === name)
    if (!config?.validate) return null
    return config.validate(value)
  }, [fields])

  const handleChange = (name: string, value: string) => {
    let processed = value
    const config = Object.values(fields).flat().find(f => f.name === name)
    
    if (config?.upperCase) processed = value.toUpperCase()
    if (config?.numericOnly) processed = value.replace(/\D/g, '').slice(0, config.maxLength || 999)
    
    setForm(prev => {
      const updated = { ...prev, [name]: processed }
      saveFormToStorage(updated)
      return updated
    })
    
    if (touched[name]) {
      const err = validateField(name, processed)
      setFieldErrors(prev => ({ ...prev, [name]: err }))
    }
  }

  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }))
    const err = validateField(name, form[name as keyof FormState])
    setFieldErrors(prev => ({ ...prev, [name]: err }))
  }

  const validateAll = (): boolean => {
    const errors: Record<string, string | null> = {}
    let valid = true
    
    for (const section of Object.values(fields)) {
      for (const field of section) {
        const err = field.validate?.(form[field.name]) ?? null
        errors[field.name] = err
        if (err) valid = false
      }
    }

    // GST/PAN - both optional, user can add later from settings
    // Trust user input - will save whatever provided
    const lat = parseFloat(form.storeLat)
    const lng = parseFloat(form.storeLng)
    if (!isNaN(lat) && !isNaN(lng) && lat < 20 && lng > 85) {
      errors.coords = '⚠️ Latitude/Longitude may be swapped (just a warning - will save as provided)'
    }
    
    setFieldErrors(errors)
    return valid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Just set touched for UI feedback - but DON'T validate, just SAVE
    const allTouched: Record<string, boolean> = {}
    Object.keys(form).forEach(k => { allTouched[k] = true })
    setTouched(allTouched)

    // NO VALIDATION - Trust user input, just save whatever they provided
    setLoading(true)
    
    try {
      const { data: userRes } = await supabase.auth.getUser()
      const uid = userRes.user?.id
      const userEmail = userRes.user?.email || form.email
      
      if (!uid) {
        localStorage.setItem('onboardingDraft', JSON.stringify({ ...form, role: 'RETAILER', email: userEmail }))
        window.location.replace('/login?autosave=1')
        return
      }
      
      // Upload profile photo
      let profilePhotoUrl: string | null = null
      if (profileFile) {
        try {
          const ext = profileFile.name?.split('.')?.pop()?.toLowerCase() || 'jpg'
          const path = `${uid}/profile_${Date.now()}.${ext}`
          await supabase.storage.from('profile-photos').upload(path, profileFile, { cacheControl: '3600', upsert: true })
          const { data: pub } = supabase.storage.from('profile-photos').getPublicUrl(path)
          profilePhotoUrl = pub?.publicUrl || null
        } catch { }
      }
      
      const lat = parseFloat(form.storeLat)
      const lng = parseFloat(form.storeLng)

      const profilePayload = {
        id: uid,
        user_name: form.userName || null,
        business_name: form.businessName || null,
        role: 'RETAILER',
        state: form.stateName || null,
        gst_number: form.gstNumber || null,
        phone: form.phone || null,
        email: userEmail || null,
        address: form.address || null,
        city: form.city || null,
        pincode: form.pincode || null,
        updated_at: new Date().toISOString(),
      }

      const { error: profileErr } = await supabase.from('profiles').upsert(profilePayload, { onConflict: 'id' }).select()
      if (profileErr) throw profileErr

      const retailerPayload = {
        id: uid,
        user_name: form.userName || null,
        phone: form.phone || null,
        business_name: form.businessName || null,
        business_type: form.businessType || null,
        address: form.address || null,
        city: form.city || null,
        state: form.stateName || null,
        pincode: form.pincode || null,
        gst_number: form.gstNumber || null,
        pan_number: form.panNumber || null,
        email: userEmail || null,
        profile_photo: profilePhotoUrl,
        is_verified: false,
        verification_status: 'PENDING_VERIFICATION',
        updated_at: new Date().toISOString(),
        location: lat && lng ? `SRID=4326;POINT(${lng} ${lat})` : null,
      }
      
      const { error: err } = await supabase.from('retailers').upsert(retailerPayload, { onConflict: 'id' }).select()
      if (err) throw err
      
      localStorage.setItem('onboardingCompleted', 'true')
      clearFormFromStorage()
      window.location.replace('/retailer?onboarding=success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg.includes('profiles_id_fkey') ? 'Session expired. Please login again.' : (msg || 'Submission failed'))
    } finally {
      setLoading(false)
    }
  }

  // ============ EFFECTS ============
  useEffect(() => {
    const check = async () => {
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase.auth.getSession()
        if (data.session) return
        await new Promise(r => setTimeout(r, 150))
      }
      router.replace('/login?redirect=%2Fonboarding%2Fretailer')
    }
    check()
  }, [router])

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: userRes } = await supabase.auth.getUser()
      const uid = userRes.user?.id || null
      setUserId(uid)
      if (!uid) return
      
      const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
      
      if (data?.role === 'RETAILER' && data.business_name) {
        setForm({
          userName: data.user_name || '',
          phone: data.phone || '',
          businessName: data.business_name || '',
          businessType: data.business_type || '',
          address: data.address || '',
          city: data.city || '',
          stateName: data.state || '',
          pincode: data.pincode || '',
          gstNumber: data.gst_number || '',
          panNumber: data.pan_number || '',
          storeLat: '',
          storeLng: '',
          email: data.email || userRes.user?.email || '',
        })
      } else if (data?.role !== 'RETAILER') {
        router.replace('/onboarding/distributor')
      } else {
        setForm(prev => {
          const updated = { ...prev, email: userRes.user?.email || '' }
          saveFormToStorage(updated)
          return updated
        })
      }
    }
    fetchProfile()
  }, [router, saveFormToStorage])

  // ============ RENDER HELPERS ============
  const renderInput = (field: FieldConfig) => {
    const err = touched[field.name] ? fieldErrors[field.name] : null
    const baseClass = `w-full px-3 py-2.5 border rounded-md text-sm text-foreground bg-background transition-all focus:outline-none focus:ring-3 focus:ring-emerald-600/15 ${
      err ? 'border-red-500 focus:border-red-500' : 'border-input focus:border-emerald-600'
    }`
    
    if (field.type === 'select') {
      return (
        <select
          value={form[field.name]}
          onChange={e => handleChange(field.name, e.target.value)}
          onBlur={() => handleBlur(field.name)}
          className={baseClass}
        >
          <option value="">{field.placeholder}</option>
          {BUSINESS_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
        </select>
      )
    }
    
    if (field.type === 'textarea') {
      return (
        <>
          <textarea
            value={form[field.name]}
            onChange={e => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field.name)}
            placeholder={field.placeholder}
            rows={3}
            className={`${baseClass} min-h-[80px] resize-y`}
          />
          {err && <p className="text-red-500 text-xs mt-1">{err}</p>}
        </>
      )
    }
    
    return (
      <>
        <div className="relative">
          <input
            type={field.type}
            inputMode={field.inputMode as any}
            placeholder={field.placeholder}
            value={form[field.name]}
            onChange={e => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field.name)}
            maxLength={field.maxLength}
            className={baseClass}
          />
          {err && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">!</span>
            </div>
          )}
        </div>
        {err && <p className="text-red-500 text-xs mt-1">{err}</p>}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-cyan-950 flex items-center justify-center p-4">
      <div className="w-full max-w-[680px] bg-card rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white p-8 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/agorich-logo.png" alt="Agorich" width={72} height={72} priority className="rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold mb-2">🏪 Retailer Onboarding</h1>
          <p className="opacity-90 text-sm mb-3">Set up your retailer account to start ordering</p>
          <span className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-xs font-medium">
            🏪 Retailer Registration
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 text-foreground" autoComplete="off">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Business Identity */}
          <div className="flex items-center gap-2 text-sm uppercase text-emerald-600 font-bold tracking-wide mb-5 mt-2 border-b-2 border-border pb-2">
            <Building className="w-5 h-5" />
            {SECTIONS[0].title}
          </div>
          
          <div className="space-y-4 mb-8">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Legal Business Name <span className="text-red-500">*</span>
              </label>
              {renderInput(fields.business[0])}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Business Type <span className="text-red-500">*</span>
                </label>
                {renderInput(fields.business[1])}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  GST Number (GSTIN) <span className="text-muted-foreground text-xs">(Optional)</span>
                </label>
                {renderInput(fields.business[2])}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  PAN Number <span className="text-muted-foreground text-xs">(Optional)</span>
                </label>
                {renderInput(fields.business[3])}
              </div>
              {/* GST/PAN optional - user can add later from settings */}
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Registered Address <span className="text-red-500">*</span>
              </label>
              {renderInput(fields.business[4])}
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={e => handleChange('city', e.target.value)}
                  onBlur={() => handleBlur('city')}
                  placeholder="City"
                  className={`w-full px-3 py-2.5 border rounded-md text-sm bg-background ${fieldErrors.city && touched.city ? 'border-red-500' : 'border-input'} focus:border-emerald-600 focus:outline-none focus:ring-3 focus:ring-emerald-600/15`}
                />
                {touched.city && fieldErrors.city && <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.stateName}
                  onChange={e => handleChange('stateName', e.target.value)}
                  onBlur={() => handleBlur('stateName')}
                  placeholder="State"
                  className={`w-full px-3 py-2.5 border rounded-md text-sm bg-background ${fieldErrors.stateName && touched.stateName ? 'border-red-500' : 'border-input'} focus:border-emerald-600 focus:outline-none focus:ring-3 focus:ring-emerald-600/15`}
                />
                {touched.stateName && fieldErrors.stateName && <p className="text-red-500 text-xs mt-1">{fieldErrors.stateName}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Pincode <span className="text-red-500">*</span>
                </label>
                {renderInput(fields.business[7])}
              </div>
            </div>
          </div>

          {/* Contact Person */}
          <div className="flex items-center gap-2 text-sm uppercase text-emerald-600 font-bold tracking-wide mb-5 mt-6 border-b-2 border-border pb-2">
            <User className="w-5 h-5" />
            {SECTIONS[1].title}
          </div>
          
          <div className="space-y-4 mb-8">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Full Name <span className="text-red-500">*</span>
              </label>
              {renderInput(fields.contact[0])}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                {renderInput(fields.contact[1])}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Email Address <span className="text-red-500">*</span>
                </label>
                {renderInput(fields.contact[2])}
              </div>
            </div>
          </div>

          {/* Store Location */}
          <div className="flex items-center gap-2 text-sm uppercase text-emerald-600 font-bold tracking-wide mb-5 mt-6 border-b-2 border-border pb-2">
            <Store className="w-5 h-5" />
            {SECTIONS[2].title}
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="p-4 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/50 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-1">
                    {INSTRUCTION_TEXT}
                  </p>
                  <a
                    href="https://www.latlong.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                  >
                    latlong.net <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Latitude <span className="text-red-500">*</span>
                </label>
                {renderInput(fields.location[0])}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Longitude <span className="text-red-500">*</span>
                </label>
                {renderInput(fields.location[1])}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              India bounds: Latitude 6.0 - 38.0 | Longitude 68.0 - 98.0
            </p>
            {fieldErrors.coords && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">!</span>
                  {fieldErrors.coords}
                </p>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !userId}
            className="w-full py-4 rounded-xl text-base font-bold cursor-pointer bg-gradient-to-r from-emerald-600 to-cyan-600 text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                Create Retailer Account & Continue
                <span className="text-lg">→</span>
              </>
            )}
          </button>
          
          <p className="text-center text-xs text-emerald-600 mt-2 flex items-center justify-center gap-1">
            <span>✓</span> Draft saved automatically
          </p>
        </form>
      </div>
    </div>
  )
}
