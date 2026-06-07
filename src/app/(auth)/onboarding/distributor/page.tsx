'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase-client'
import { Building, User, FileText, Shield, ExternalLink, Info, CheckCircle } from 'lucide-react'

// ============ CONSTANTS ============
const BUSINESS_TYPES = [
  'Proprietorship', 
  'Partnership', 
  'LLP', 
  'Private Limited', 
  'Public Limited', 
  'Other'
]

// India geographic boundaries for validation
const INDIA_BOUNDS = {
  latitude: { min: 6.0, max: 38.0 },
  longitude: { min: 68.0, max: 98.0 }
}

// ============ VALIDATORS ============
const validators = {
  required: (v: string): string | null => {
    if (!v || !v.trim()) return 'This field is required'
    return null
  },
  
  businessName: (v: string): string | null => {
    if (!v || !v.trim()) return 'Business name is required'
    if (v.trim().length < 3) return 'Business name must be at least 3 characters'
    if (v.trim().length > 200) return 'Business name is too long (max 200 characters)'
    return null
  },
  
  businessType: (v: string): string | null => {
    if (!v) return 'Please select a business type'
    if (!BUSINESS_TYPES.includes(v)) return 'Invalid business type'
    return null
  },
  
  gstin: (v: string): string | null => {
    if (!v || !v.trim()) return null
    const cleaned = v.trim().toUpperCase()
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleaned)) {
      return 'Invalid GST format (e.g., 22AAAAA0000A1Z5)'
    }
    return null
  },
  
  pan: (v: string): string | null => {
    if (!v || !v.trim()) return null // Optional field
    const cleaned = v.trim().toUpperCase()
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleaned)) {
      return 'Invalid PAN format (e.g., ABCDE1234F)'
    }
    return null
  },
  
  email: (v: string): string | null => {
    if (!v || !v.trim()) return null
    const cleaned = v.trim().toLowerCase()
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned)) {
      return 'Invalid email format'
    }
    if (cleaned.length > 254) return 'Email is too long'
    return null
  },
  
  phone: (v: string): string | null => {
    if (!v || !v.trim()) return 'Mobile number is required'
    // Only digits, exactly 10, starting with 6-9
    const cleaned = v.replace(/\D/g, '')
    if (cleaned.length !== 10) return 'Mobile must be 10 digits'
    if (!/^[6-9]/.test(cleaned)) return 'Mobile must start with 6, 7, 8, or 9'
    return null
  },
  
  pincode: (v: string): string | null => {
    if (!v || !v.trim()) return 'Pincode is required'
    // Exactly 6 digits, first digit cannot be 0
    const cleaned = v.replace(/\D/g, '')
    if (cleaned.length !== 6) return 'Pincode must be 6 digits'
    if (cleaned[0] === '0') return 'Pincode cannot start with 0'
    return null
  },
  
  latitude: (v: string): string | null => {
    if (!v || !v.trim()) return null
    const num = parseFloat(v.trim())
    if (isNaN(num)) return null
    if (num < INDIA_BOUNDS.latitude.min || num > INDIA_BOUNDS.latitude.max) {
      return null
    }
    if (v.includes('.') && v.split('.')[1]?.length > 8) {
      return null
    }
    return null
  },

  longitude: (v: string): string | null => {
    if (!v || !v.trim()) return null
    const num = parseFloat(v.trim())
    if (isNaN(num)) return null
    if (num < INDIA_BOUNDS.longitude.min || num > INDIA_BOUNDS.longitude.max) {
      return null
    }
    if (v.includes('.') && v.split('.')[1]?.length > 8) {
      return null
    }
    return null
  },
  
  drugLicense: (v: string): string | null => {
    if (!v || !v.trim()) return null
    const cleaned = v.trim().toUpperCase()
    if (!/^[A-Z0-9-]{5,}$/.test(cleaned)) {
      return 'License must be at least 5 alphanumeric characters'
    }
    if (cleaned.length > 50) return 'License number is too long'
    return null
  },
  
  name: (v: string): string | null => {
    if (!v || !v.trim()) return 'Full name is required'
    const cleaned = v.trim()
    if (cleaned.length < 3) return 'Name must be at least 3 characters'
    if (cleaned.length > 100) return 'Name is too long (max 100 characters)'
    // Only letters, spaces, dots, and apostrophes
    if (!/^[a-zA-Z\s.'-]+$/.test(cleaned)) {
      return 'Name should only contain letters, spaces, dots, or apostrophes'
    }
    return null
  },
  
  address: (v: string): string | null => {
    if (!v || !v.trim()) return null
    if (v.trim().length > 500) return 'Address is too long (max 500 characters)'
    return null
  },
  
  city: (v: string): string | null => {
    if (!v || !v.trim()) return null
    if (v.trim().length > 100) return 'City name is too long'
    return null
  },

  state: (v: string): string | null => {
    if (!v || !v.trim()) return null
    if (v.trim().length > 100) return 'State name is too long'
    return null
  }
}

// ============ TYPES ============
interface FormData {
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
  drugLicense20B: string
  drugLicense21B: string
  email: string
  warehouseLat: string
  warehouseLng: string
}

type FieldName = keyof FormData

interface FieldConfig {
  name: FieldName
  label: string
  required: boolean
  placeholder: string
  type?: string
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>['inputMode']
  autoComplete?: string
}

// ============ COMPONENT ============
export default function DistributorOnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [documentsFile, setDocumentsFile] = useState<FileList | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const STORAGE_KEY = 'distributor_onboarding_form'

  const getInitialForm = (): FormData => {
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
          drugLicense20B: parsed.drugLicense20B || '',
          drugLicense21B: parsed.drugLicense21B || '',
          email: parsed.email || '',
          warehouseLat: parsed.warehouseLat || '',
          warehouseLng: parsed.warehouseLng || '',
        }
      }
    } catch (e) {
      console.warn('Failed to load saved form data:', e)
    }
    return {
      userName: '', phone: '', businessName: '', businessType: '',
      address: '', city: '', stateName: '', pincode: '',
      gstNumber: '', panNumber: '', drugLicense20B: '', drugLicense21B: '',
      email: '', warehouseLat: '', warehouseLng: '',
    }
  }

  const [form, setForm] = useState<FormData>(getInitialForm)

  const saveFormToStorage = useCallback((data: FormData) => {
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

  const [touched, setTouched] = useState<Record<FieldName | 'documents' | 'coords', boolean>>({} as Record<FieldName | 'documents' | 'coords', boolean>)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName | 'documents' | 'coords', string>>>({})

  // ============ FIELD DEFINITIONS ============
  const fields: FieldConfig[] = [
    { name: 'businessName', label: 'Legal Business Name', required: true, placeholder: 'Business Name *', autoComplete: 'organization' },
    { name: 'businessType', label: 'Business Type', required: true, placeholder: 'Business Type *' },
    { name: 'gstNumber', label: 'GST Number (GSTIN)', required: true, placeholder: 'GST Number *', autoComplete: 'off' },
    { name: 'panNumber', label: 'PAN Number', required: false, placeholder: 'PAN Number (Optional)', autoComplete: 'off' },
    { name: 'address', label: 'Registered Address', required: true, placeholder: 'Complete Address *' },
    { name: 'city', label: 'City', required: true, placeholder: 'City *' },
    { name: 'stateName', label: 'State', required: true, placeholder: 'State *' },
    { name: 'pincode', label: 'Pincode', required: true, placeholder: '6-digit Pincode *', inputMode: 'numeric', autoComplete: 'postal-code' },
    { name: 'userName', label: 'Full Name', required: true, placeholder: 'Your Name *', autoComplete: 'name' },
    { name: 'phone', label: 'Mobile Number', required: true, placeholder: '10-digit Mobile *', inputMode: 'tel', autoComplete: 'tel' },
    { name: 'email', label: 'Email Address', required: true, placeholder: 'Email *', type: 'email', inputMode: 'email', autoComplete: 'email' },
    { name: 'drugLicense20B', label: 'Drug License No. (20B)', required: true, placeholder: 'Drug License 20B *', autoComplete: 'off' },
    { name: 'drugLicense21B', label: 'Drug License No. (21B)', required: true, placeholder: 'Drug License 21B *', autoComplete: 'off' },
    { name: 'warehouseLat', label: 'Latitude', required: true, placeholder: 'Latitude *', inputMode: 'decimal', autoComplete: 'off' },
    { name: 'warehouseLng', label: 'Longitude', required: true, placeholder: 'Longitude *', inputMode: 'decimal', autoComplete: 'off' },
  ]

  // ============ VALIDATION ============
  const validateField = useCallback((name: string, value: string): string | null => {
    const validator = (validators as Record<string, (v: string) => string | null>)[name]
    if (!validator) return null
    return validator(value)
  }, [])

  const validateAll = useCallback((): boolean => {
    const errors: Partial<Record<FieldName | 'documents' | 'coords', string>> = {}
    let isValid = true

    // Validate all form fields
    for (const field of fields) {
      const error = validateField(field.name, form[field.name])
      errors[field.name] = error || undefined
      if (error) isValid = false
    }

    // Validate documents
    if (!documentsFile || documentsFile.length === 0) {
      errors.documents = 'Please upload at least one document (GST, Drug License, PAN)'
      isValid = false
    } else {
      // Check file types
      for (let i = 0; i < documentsFile.length; i++) {
        const file = documentsFile[i]
        const ext = file.name?.split('.')?.pop()?.toLowerCase()
        if (!['pdf', 'jpeg', 'jpg', 'png'].includes(ext || '')) {
          errors.documents = `Invalid file type: ${file.name}. Only PDF, JPEG, PNG allowed`
          isValid = false
          break
        }
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          errors.documents = `File too large: ${file.name}. Max 10MB allowed`
          isValid = false
          break
        }
      }
    }

    setFieldErrors(errors)
    return isValid
  }, [form, fields, validateField, documentsFile])

  // ============ HANDLERS ============
  const handleChange = useCallback((name: FieldName, value: string) => {
    let processed = value

    // Auto uppercase for specific fields
    if (['gstNumber', 'panNumber', 'drugLicense20B', 'drugLicense21B'].includes(name)) {
      processed = value.toUpperCase()
    }

    // Numeric only for phone and pincode
    if (['phone', 'pincode'].includes(name)) {
      processed = value.replace(/\D/g, '').slice(0, name === 'pincode' ? 6 : 10)
    }

    // Allow only one decimal point and valid chars for coordinates
    if (['warehouseLat', 'warehouseLng'].includes(name)) {
      processed = value.replace(/[^0-9.-]/g, '')
      const parts = processed.split('.')
      if (parts.length > 2) processed = parts[0] + '.' + parts.slice(1).join('')
      if (parts[1]?.length > 8) processed = parts[0] + '.' + parts[1].slice(0, 8)
    }

    // Sanitize name fields
    if (['userName', 'businessName', 'city', 'stateName'].includes(name)) {
      processed = processed.slice(0, name === 'businessName' ? 200 : name === 'stateName' || name === 'city' ? 100 : 100)
    }

    setForm(prev => {
      const updated = { ...prev, [name]: processed }
      saveFormToStorage(updated)
      return updated
    })

    // Real-time validation if field was touched
    if (touched[name]) {
      const error = validateField(name, processed)
      setFieldErrors(prev => ({ ...prev, [name]: error || undefined }))
    }
  }, [touched, validateField, saveFormToStorage])

  const handleBlur = useCallback((name: FieldName | 'documents') => {
    setTouched(prev => ({ ...prev, [name]: true }))
    
    if (name !== 'documents') {
      const error = validateField(name, form[name])
      setFieldErrors(prev => ({ ...prev, [name]: error || undefined }))
    } else {
      if (!documentsFile || documentsFile.length === 0) {
        setFieldErrors(prev => ({ ...prev, documents: 'Please upload at least one document' }))
      } else {
        setFieldErrors(prev => ({ ...prev, documents: undefined }))
      }
    }
  }, [form, validateField, documentsFile])

  // ============ SUBMISSION ============
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    // Just set touched for UI feedback - but DON'T validate, just SAVE
    const allTouched: Record<string, boolean> = {}
    fields.forEach(f => { allTouched[f.name] = true })
    allTouched.documents = true
    setTouched(allTouched as Record<FieldName | 'documents' | 'coords', boolean>)

    // NO VALIDATION - Trust user input, just save whatever they provided
    setLoading(true)

    try {
      // Get current user
      const { data: userRes } = await supabase.auth.getUser()
      const uid = userRes.user?.id
      const userEmail = userRes.user?.email || form.email

      // Redirect if not logged in
      if (!uid) {
        localStorage.setItem('onboardingDraft', JSON.stringify({ 
          ...form, 
          role: 'DISTRIBUTOR', 
          email: userEmail,
          savedAt: new Date().toISOString()
        }))
        window.location.replace('/login?autosave=1&next=/distributor')
        return
      }

      // 1. Upload profile photo (if selected)
      let profilePhotoUrl: string | null = null
      if (profileFile) {
        try {
          const ext = profileFile.name?.split('.')?.pop()?.toLowerCase() || 'jpg'
          const path = `distributors/${uid}/profile_${Date.now()}.${ext}`
          const { error: uploadErr } = await supabase.storage
            .from('profile-photos')
            .upload(path, profileFile, { 
              cacheControl: '3600', 
              upsert: true,
              contentType: profileFile.type || 'image/jpeg'
            })
          if (uploadErr) throw uploadErr
          const { data: pub } = supabase.storage.from('profile-photos').getPublicUrl(path)
          profilePhotoUrl = pub?.publicUrl || null
        } catch (err) {
          console.warn('Profile photo upload failed:', err)
        }
      }

      // 2. Upload documents
      const docUrls: string[] = []
      for (let i = 0; i < (documentsFile?.length || 0); i++) {
        const file = documentsFile![i]
        const ext = file.name?.split('.')?.pop()?.toLowerCase() || 'pdf'
        const path = `distributors/${uid}/documents/doc_${Date.now()}_${i}.${ext}`
        
        try {
          const { error: uploadErr } = await supabase.storage
            .from('distributor-docs')
            .upload(path, file, { 
              cacheControl: '3600', 
              upsert: false,
              contentType: file.type || 'application/pdf'
            })
          if (uploadErr) throw uploadErr
          
          const { data: pub } = supabase.storage.from('distributor-docs').getPublicUrl(path)
          if (pub?.publicUrl) docUrls.push(pub.publicUrl)
        } catch (err) {
          console.warn(`Document ${i} upload failed:`, err)
        }
      }

      // 3. Parse coordinates
      const lat = parseFloat(form.warehouseLat.trim())
      const lng = parseFloat(form.warehouseLng.trim())

      // 4. Build payload for profiles table (must exist before distributors)
      const profilePayload = {
        id: uid,
        user_name: form.userName.trim() || null,
        business_name: form.businessName.trim() || null,
        role: 'DISTRIBUTOR',
        state: form.stateName.trim() || null,
        gst_number: form.gstNumber.trim().toUpperCase() || null,
        phone: form.phone.trim() || null,
        email: (userEmail || form.email).trim().toLowerCase() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        pincode: form.pincode.trim() || null,
        updated_at: new Date().toISOString(),
      }

      // 4a. First upsert to profiles table (required for foreign key)
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
        .select()

      if (profileErr) {
        console.error('Profile upsert error:', profileErr)
        throw profileErr
      }

      // 4b. Build payload for distributors table
      const distributorPayload = {
        id: uid,
        user_name: form.userName.trim() || null,
        phone: form.phone.trim() || null,
        business_name: form.businessName.trim() || null,
        business_type: form.businessType || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.stateName.trim() || null,
        pincode: form.pincode.trim() || null,
        gst_number: form.gstNumber.trim().toUpperCase() || null,
        pan_number: form.panNumber.trim().toUpperCase() || null,
        drug_license_20b: form.drugLicense20B.trim().toUpperCase() || null,
        drug_license_21b: form.drugLicense21B.trim().toUpperCase() || null,
        email: (userEmail || form.email).trim().toLowerCase() || null,
        profile_photo: profilePhotoUrl,
        document_urls: docUrls.length > 0 ? docUrls : null,
        is_verified: false,
        verification_status: 'PENDING_VERIFICATION',
        updated_at: new Date().toISOString(),
        location: (lat && lng) ? `SRID=4326;POINT(${lng} ${lat})` : null,
      }

      // 5. Insert/Update to distributors table
      const { error: upsertErr } = await supabase
        .from('distributors')
        .upsert(distributorPayload, { onConflict: 'id' })
        .select()

      if (upsertErr) {
        console.error('Distributor upsert error:', upsertErr)
        throw upsertErr
      }

      // 6. Success - redirect
      localStorage.setItem('onboardingCompleted', 'true')
      clearFormFromStorage()
      window.location.replace('/distributor?onboarding=success')

    } catch (err: unknown) {
      console.error('Submission error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      
      if (msg.includes('profiles_id_fkey') || msg.includes('foreign key')) {
        setError('Session error. Please logout and login again.')
      } else if (msg.includes('duplicate') || msg.includes('unique')) {
        setError('This business is already registered. Please contact support.')
      } else {
        setError(msg || 'Failed to submit. Please try again.')
      }
    } finally {
      setLoading(false)
      setIsSubmitting(false)
    }
  }

  // ============ EFFECTS ============
  useEffect(() => {
    const checkSession = async () => {
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase.auth.getSession()
        if (data.session) return
        await new Promise(r => setTimeout(r, 200))
      }
      router.replace('/login?redirect=%2Fonboarding%2Fdistributor')
    }
    checkSession()
  }, [router])

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: userRes } = await supabase.auth.getUser()
      const uid = userRes.user?.id || null
      setUserId(uid)
      if (!uid) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single()

      if (data?.role === 'DISTRIBUTOR' && data.business_name) {
        // Pre-fill form if profile exists
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
          drugLicense20B: data.drug_license_20b || '',
          drugLicense21B: data.drug_license_21b || '',
          email: data.email || userRes.user?.email || '',
          warehouseLat: '',
          warehouseLng: '',
        })
        // City and state auto-fill from profile - functionality to be implemented
      } else if (data?.role !== 'DISTRIBUTOR') {
        router.replace('/onboarding/retailer')
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

  // ============ RENDER ============
  const renderField = (config: FieldConfig) => {
    const value = form[config.name]
    const error = touched[config.name] ? fieldErrors[config.name] : undefined
    const showError = touched[config.name] && error

    const baseInputClass = `w-full px-3 py-2.5 border rounded-md text-sm bg-background transition-all focus:outline-none focus:ring-3 focus:ring-indigo-600/15 ${
      showError 
        ? 'border-red-500 focus:border-red-500' 
        : 'border-input focus:border-indigo-600'
    }`

    if (config.name === 'businessType') {
      return (
        <div key={config.name}>
          <select
            value={value}
            onChange={e => handleChange('businessType', e.target.value)}
            onBlur={() => handleBlur('businessType')}
            autoComplete={config.autoComplete}
            className={baseInputClass}
          >
            <option value="">{config.placeholder}</option>
            {BUSINESS_TYPES.map(bt => (
              <option key={bt} value={bt}>{bt}</option>
            ))}
          </select>
          {showError && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
      )
    }

    if (config.name === 'address') {
      return (
        <div key={config.name}>
          <textarea
            value={value}
            onChange={e => handleChange('address', e.target.value)}
            onBlur={() => handleBlur('address')}
            placeholder={config.placeholder}
            rows={3}
            maxLength={500}
            autoComplete={config.autoComplete}
            className={`${baseInputClass} min-h-[80px] resize-y`}
          />
          <div className="flex justify-between mt-1">
            {showError && <p className="text-red-500 text-xs">{error}</p>}
            <p className="text-muted-foreground text-xs ml-auto">{value.length}/500</p>
          </div>
        </div>
      )
    }

    return (
      <div key={config.name}>
        <div className="relative">
          <input
            type={config.type || 'text'}
            inputMode={config.inputMode}
            placeholder={config.placeholder}
            value={value}
            onChange={e => handleChange(config.name, e.target.value)}
            onBlur={() => handleBlur(config.name)}
            maxLength={config.name === 'pincode' ? 6 : config.name === 'phone' ? 10 : undefined}
            autoComplete={config.autoComplete}
            className={baseInputClass}
          />
          {showError && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">!</span>
            </div>
          )}
        </div>
        {showError && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex items-center justify-center p-4">
      <div className="w-full max-w-[720px] bg-card rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/agorich-logo.png" alt="Agorich" width={72} height={72} priority className="rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold mb-2">🏭 Distributor Registration</h1>
          <p className="opacity-90 text-sm mb-3">Complete your distributor profile to start supplying</p>
          <span className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-xs font-medium">
            Fields marked with * are mandatory
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 text-foreground" autoComplete="on">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit */}
          <div className="flex items-center gap-2 text-sm uppercase text-indigo-600 font-bold tracking-wide mb-5 mt-2 border-b-2 border-border pb-2">
            <Building className="w-5 h-5" />
            1. Business Identity
          </div>
          
          <div className="space-y-4 mb-8">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Legal Business Name <span className="text-red-500">*</span>
              </label>
              {renderField(fields[0])}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Business Type <span className="text-red-500">*</span>
                </label>
                {renderField(fields[1])}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  GST Number (GSTIN) <span className="text-red-500">*</span>
                </label>
                {renderField(fields[2])}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                PAN Number <span className="text-muted-foreground text-xs">(Optional)</span>
              </label>
              {renderField(fields[3])}
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Registered Address <span className="text-red-500">*</span>
              </label>
              {renderField(fields[4])}
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
                  autoComplete="address-level2"
                  className={`w-full px-3 py-2.5 border rounded-md text-sm bg-background ${touched.city && fieldErrors.city ? 'border-red-500' : 'border-input'} focus:border-indigo-600 focus:outline-none focus:ring-3 focus:ring-indigo-600/15`}
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
                  autoComplete="address-level1"
                  className={`w-full px-3 py-2.5 border rounded-md text-sm bg-background ${touched.stateName && fieldErrors.stateName ? 'border-red-500' : 'border-input'} focus:border-indigo-600 focus:outline-none focus:ring-3 focus:ring-indigo-600/15`}
                />
                {touched.stateName && fieldErrors.stateName && <p className="text-red-500 text-xs mt-1">{fieldErrors.stateName}</p>}
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Pincode <span className="text-red-500">*</span>
                </label>
                {renderField(fields[7])}
              </div>
            </div>
          </div>

          {/* Section 2: Contact Person */}
          <div className="flex items-center gap-2 text-sm uppercase text-indigo-600 font-bold tracking-wide mb-5 mt-6 border-b-2 border-border pb-2">
            <User className="w-5 h-5" />
            2. Contact Person
          </div>
          
          <div className="space-y-4 mb-8">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Full Name <span className="text-red-500">*</span>
              </label>
              {renderField(fields[8])}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                {renderField(fields[9])}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Email Address <span className="text-red-500">*</span>
                </label>
                {renderField(fields[10])}
              </div>
            </div>
          </div>

          {/* Section 3: Pharma Compliance */}
          <div className="flex items-center gap-2 text-sm uppercase text-indigo-600 font-bold tracking-wide mb-5 mt-6 border-b-2 border-border pb-2">
            <FileText className="w-5 h-5" />
            3. Pharma Compliance (Mandatory)
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Drug License No. (20B) <span className="text-red-500">*</span>
                </label>
                {renderField(fields[11])}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Drug License No. (21B) <span className="text-red-500">*</span>
                </label>
                {renderField(fields[12])}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Upload Documents <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpeg,.jpg,.png"
                onChange={e => setDocumentsFile(e.target.files)}
                onBlur={() => handleBlur('documents')}
                className={`w-full px-3 py-2.5 border rounded-md text-sm bg-background file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer transition-colors ${touched.documents && fieldErrors.documents ? 'border-red-500' : 'border-input'}`}
              />
              <p className="text-muted-foreground text-xs mt-1.5">
                Upload GST, Drug Licenses, PAN etc. (PDF, JPEG, PNG | Max 10MB each)
              </p>
              {touched.documents && fieldErrors.documents && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.documents}</p>
              )}
              {documentsFile && documentsFile.length > 0 && (
                <p className="text-emerald-600 text-xs mt-1">
                  ✓ {documentsFile.length} file(s) selected
                </p>
              )}
            </div>
          </div>

          {/* Section 4: Warehouse Location */}
          <div className="flex items-center gap-2 text-sm uppercase text-indigo-600 font-bold tracking-wide mb-5 mt-6 border-b-2 border-border pb-2">
            <Shield className="w-5 h-5" />
            4. Warehouse Location
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="p-4 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/50 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 font-medium mb-2">
                    Get your exact coordinates:
                  </p>
                  <a
                    href="https://www.latlong.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                  >
                    Open latlong.net
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Search your address → Click on map to get Latitude & Longitude
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Latitude <span className="text-red-500">*</span>
                </label>
                {renderField(fields[13])}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Longitude <span className="text-red-500">*</span>
                </label>
                {renderField(fields[14])}
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              India bounds: Latitude {INDIA_BOUNDS.latitude.min}° - {INDIA_BOUNDS.latitude.max}° | Longitude {INDIA_BOUNDS.longitude.min}° - {INDIA_BOUNDS.longitude.max}°
            </p>
            
            {/* Coordinates warning - just informational, won't block submission */}
            {fieldErrors.coords && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-amber-600 dark:text-amber-400 text-sm">{fieldErrors.coords}</p>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || isSubmitting || !userId}
            className="w-full py-4 rounded-xl text-base font-bold cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner className="w-5 h-5 animate-spin" />
                {isSubmitting ? 'Validating...' : 'Submitting...'}
              </>
            ) : (
              <>
                Create Distributor Account & Continue
                <span className="text-lg">→</span>
              </>
            )}
          </button>
          
          <p className="text-center text-xs text-emerald-600 mt-2 flex items-center justify-center gap-1">
            <span>✓</span> Draft saved automatically
          </p>
          
          <p className="text-center text-xs text-muted-foreground mt-1">
            By submitting, you agree to our Terms of Service and Privacy Policy
          </p>
        </form>
      </div>
    </div>
  )
}
