'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { useTranslation } from 'react-i18next'

export default function OnboardingPage() {
  const router = useRouter()
  const { i18n } = useTranslation()
  const isHindi = (i18n?.language || '').toLowerCase().startsWith('hi')
  const L = (en: string, hi: string) => (isHindi ? hi : en)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [phone, setPhone] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [stateName, setStateName] = useState('')
  const [pincode, setPincode] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [fssaiLicense, setFssaiLicense] = useState('')
  const [businessRegistration, setBusinessRegistration] = useState('')
  // Bank details removed for now; collect at checkout time instead
  const [aadharNumber, setAadharNumber] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [profilePhoto, setProfilePhoto] = useState('')
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [aadhaarError, setAadhaarError] = useState<string>('')
  const [panError, setPanError] = useState<string>('')
  const profileGalleryRef = useRef<HTMLInputElement>(null)
  const profileCameraRef = useRef<HTMLInputElement>(null)

  const BUSINESS_TYPES = ['Retailer','Wholesaler','Distributor','Pharmacy','Clinic']

  const isValidAadhaar = (v: string) => /^[0-9]{12}$/.test(v.replace(/\s+/g,''))
  const isValidPAN = (v: string) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.toUpperCase())
  const handleImageToDataUrl = (file: File, setter: (v: string)=>void) => {
    const reader = new FileReader()
    reader.onload = () => setter(reader.result as string)
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    // If not logged in, send to login (wait briefly for session to hydrate)
    let cancelled = false
    const check = async () => {
      for (let i = 0; i < 5; i++) {
        if (cancelled) return
        const { data } = await supabase.auth.getSession()
        if (data.session) return
        await new Promise(r => setTimeout(r, 150))
      }
      if (!cancelled) router.replace('/login?redirect=%2Fonboarding')
    }
    check()
    return () => { cancelled = true }
  }, [router])

  useEffect(() => {
    let cancelled = false
    const fetchProfile = async () => {
      const { data: userRes } = await supabase.auth.getUser()
      const uid = userRes.user?.id || null
      if (cancelled) return
      setUserId(uid)
      if (!uid) return
      const { data, error: selErr } = await supabase
        .from('profiles')
        .select(`
          user_name, phone, business_name, business_type, address, city, state,
          pincode, gst_number, fssai_license, business_registration,
          aadhar_number, pan_number, profile_photo
        `)
        .eq('id', uid)
        .single()
      if (cancelled) return
      if (selErr) return
      setUserName(data?.user_name || '')
      setPhone(data?.phone || '')
      setBusinessName(data?.business_name || '')
      setBusinessType(data?.business_type || '')
      setAddress(data?.address || '')
      setCity(data?.city || '')
      setStateName(data?.state || '')
      setPincode(data?.pincode || '')
      setGstNumber(data?.gst_number || '')
      setFssaiLicense(data?.fssai_license || '')
      setBusinessRegistration(data?.business_registration || '')
      // Bank details intentionally not prefilling or collecting in onboarding
      setAadharNumber(data?.aadhar_number || '')
      setPanNumber(data?.pan_number || '')
      setProfilePhoto(data?.profile_photo || '')
    }
    fetchProfile()
    return () => { cancelled = true }
  }, [])

  const handleComplete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Client-side validations
      if (aadharNumber && !isValidAadhaar(aadharNumber)) {
        setError('Please enter a valid 12-digit Aadhaar number')
        setLoading(false)
        return
      }
      if (panNumber && !isValidPAN(panNumber)) {
        setError('Please enter a valid PAN (e.g., ABCDE1234F)')
        setLoading(false)
        return
      }
      // Skipping pincode validation and state/district enforcement by request

      // Ensure authenticated user exists (prevents FK violations)
      const { data: userRes } = await supabase.auth.getUser()
      const uid = userRes.user?.id
      if (!uid) {
        // Save a draft and send user to login, then autosave after login
        try {
          const draft = {
            user_name: userName || null,
            phone: phone || null,
            business_name: businessName || null,
            business_type: businessType || null,
            address: address || null,
            city: city || null,
            state: stateName || null,
            pincode: pincode || null,
            gst_number: gstNumber || null,
            fssai_license: fssaiLicense || null,
            business_registration: businessRegistration || null,
            aadhar_number: aadharNumber || null,
            pan_number: panNumber || null,
            profile_photo: profilePhoto || null,
          }
          localStorage.setItem('onboardingDraft', JSON.stringify(draft))
          localStorage.setItem('postLoginNext', '/retailer?onboarding=success')
        } catch {}
        if (typeof window !== 'undefined') {
          window.location.replace('/login?autosave=1')
        } else {
          router.replace('/login?autosave=1')
        }
        return
      }

      // If profile photo selected, upload to Supabase Storage and get public URL
      let profilePhotoUrl: string | null = null
      if (profileFile) {
        try {
          const ext = (profileFile.name?.split('.')?.pop() || 'jpg').toLowerCase()
          const path = `${uid}/profile_${Date.now()}.${ext}`
          const { error: uploadErr } = await supabase
            .storage
            .from('profile-photos')
            .upload(path, profileFile, {
              cacheControl: '3600',
              upsert: true,
              contentType: profileFile.type || 'image/jpeg'
            })
          if (uploadErr) throw uploadErr
          const { data: pub } = supabase
            .storage
            .from('profile-photos')
            .getPublicUrl(path)
          profilePhotoUrl = pub?.publicUrl || null
        } catch (err) {
          console.warn('Profile photo upload failed:', err)
        }
      }

      const payload: {
        id: string
        user_name: string | null
        phone: string | null
        business_name: string | null
        business_type: string | null
        address: string | null
        city: string | null
        state: string | null
        pincode: string | null
        gst_number: string | null
        fssai_license: string | null
        business_registration: string | null
        aadhar_number: string | null
        pan_number: string | null
        profile_photo?: string
        is_verified: boolean
        updated_at: string
      } = {
        id: uid,
        user_name: userName || null,
        phone: phone || null,
        business_name: businessName || null,
        business_type: businessType || null,
        address: address || null,
        city: city || null,
        state: stateName || null,
        pincode: pincode || null,
        gst_number: gstNumber || null,
        fssai_license: fssaiLicense || null,
        business_registration: businessRegistration || null,
        // Bank details skipped in onboarding
        aadhar_number: aadharNumber || null,
        pan_number: panNumber || null,
        // Only set when new files have been uploaded to avoid overwriting existing URLs
        profile_photo: profilePhotoUrl ?? undefined,
        is_verified: true,
        updated_at: new Date().toISOString(),
      }

      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()

      if (upsertErr) throw upsertErr

      setTimeout(() => {
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('onboardingCompleted','true') } catch {}
          window.location.replace('/retailer?onboarding=success')
        } else {
          router.replace('/retailer?onboarding=success')
        }
      }, 200)
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message ? err.message : String(err)
      if (msg.includes('profiles_id_fkey')) {
        setError('Session issue detected. Please log in again, then save your onboarding form.')
      } else {
        setError(msg || 'Failed to complete onboarding')
      }
    } finally {
      setLoading(false)
    }
  } 
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Image src="/agorich-logo.png" alt="Agorich" width={56} height={56} priority className="rounded" />
          </div>
          <CardTitle className="text-2xl font-bold">{L('Complete Onboarding ✨','ऑनबोर्डिंग पूरा करें ✨')}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="text-muted-foreground">{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleComplete} className="space-y-6" autoComplete="off">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Personal Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold">{L('Upload your profile photo','अपना प्रोफाइल फोटो अपलोड करें')}</label>
                  <div className="flex items-center gap-3">
                    <input
                      ref={profileGalleryRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) { setProfileFile(f); handleImageToDataUrl(f, setProfilePhoto) } }}
                      className="hidden"
                    />
                    <input
                      ref={profileCameraRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) { setProfileFile(f); handleImageToDataUrl(f, setProfilePhoto) } }}
                      className="hidden"
                    />
                    <Button type="button" variant="outline" className="px-3 py-2 text-xs sm:text-sm" onClick={() => profileCameraRef.current?.click()}>
                      {L('Take Photo','फोटो लें')}
                    </Button>
                    <Button type="button" variant="outline" className="px-3 py-2 text-xs sm:text-sm" onClick={() => profileGalleryRef.current?.click()}>
                      {L('Choose from Gallery','गैलरी से चुनें')}
                    </Button>
                    {profilePhoto && (
                      <Image
                        src={profilePhoto}
                        alt="Profile"
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover border"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium">{L('Full Name','पूरा नाम')}</label>
                  <input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    inputMode="text"
                    placeholder={L('Full name (as per Aadhaar/PAN)','पूरा नाम (आधार/पैन के अनुसार)')}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{L('Please enter your name as per Aadhaar or PAN card.','कृपया अपना नाम आधार या पैन कार्ड के अनुसार दर्ज करें।')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium">{L('Phone','फोन')}</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder={L('10-digit phone','10 अंकों का फोन नंबर')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">{L('Aadhaar Number','आधार नंबर')}</label>
                  <input
                    value={aadharNumber}
                    onChange={(e) => {
                      const v = e.target.value
                      setAadharNumber(v)
                      setAadhaarError(v && !isValidAadhaar(v) ? 'Enter 12-digit Aadhaar number' : '')
                    }}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={L('12-digit Aadhaar','12 अंकों का आधार नंबर')}
                    inputMode="numeric"
                    maxLength={12}
                  />
                  {aadhaarError && <p className="text-xs text-red-400 mt-1">{aadhaarError}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium">{L('PAN Number','पैन नंबर')}</label>
                  <input
                    value={panNumber}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase()
                      setPanNumber(v)
                      setPanError(v && !isValidPAN(v) ? 'Format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)' : '')
                    }}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={L('ABCDE1234F','ABCDE1234F')}
                    inputMode="text"
                    maxLength={10}
                  />
                  {panError && <p className="text-xs text-red-400 mt-1">{panError}</p>}
                </div>
              </div>

              {/* Right: Business Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">{L('Business Name','व्यवसाय का नाम')}</label>
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    name="organization"
                    autoComplete="organization"
                    placeholder={L('Your business name','अपने व्यवसाय का नाम')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">{L('Business Type','व्यवसाय का प्रकार')}</label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{L('Select type','प्रकार चुनें')}</option>
                    {BUSINESS_TYPES.map(bt => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">{L('Address','पता')}</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="street-address"
                    placeholder={L('Street address','गली/मोहल्ला/पता')}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium">{L('State','राज्य')}</label>
                    <input
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={L('Type your state','अपना राज्य लिखें')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">{L('District','जिला')}</label>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      placeholder={L('Type your district (e.g., Muzaffarpur)','अपना जिला लिखें (जैसे, मुजफ्फरपुर)')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">{L('Pincode','पिनकोड')}</label>
                    <input
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      autoComplete="postal-code"
                      placeholder={L('Pincode','पिनकोड')}
                    />
                    {/* Pincode validation disabled */}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium">{L('GST Number (optional)','जीएसटी नंबर (वैकल्पिक)')}</label>
                    <input
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={L('GSTIN','जीएसटीआईएन')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">{L('FSSAI (optional)','एफएसएसएआई (वैकल्पिक)')}</label>
                    <input
                      value={fssaiLicense}
                      onChange={(e) => setFssaiLicense(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={L('FSSAI','एफएसएसएआई')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">{L('Business Registration (optional)','व्यवसाय पंजीकरण (वैकल्पिक)')}</label>
                    <input
                      value={businessRegistration}
                      onChange={(e) => setBusinessRegistration(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={L('CIN/Shop Act','सीआईएन/शॉप एक्ट')}
                    />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center mt-4">{L('Our authority verifies all details manually.','हमारी टीम सभी विवरणों की मैन्युअल रूप से जाँच करती है।')}</p>
            <p className="text-xs text-muted-foreground text-center mt-2">{L('Official: Pincode should match the address on your Aadhaar so we can meet you.','आधिकारिक: पिनकोड आपके आधार के पते से मेल खाना चाहिए ताकि हम आपसे मिल सकें।')}</p>
            <Button type="submit" className="w-full" size="lg" disabled={loading || !userId}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {L('Saving...','सेव हो रहा है...')}
                </>
              ) : (
                L('Save and Continue to Dashboard','सेव करें और डैशबोर्ड पर जाएं')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

