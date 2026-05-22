'use client'

import { useState, useEffect } from 'react'
import { VideoCamera, Paperclip, Smiley } from '@phosphor-icons/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  FloppyDisk,
  CheckCircle,
  WarningCircle,
  Shield,
  Eye,
  EyeSlash,
  Camera,
  X,
  User,
  Building,
  MapPin,
  ArrowLeft,
  SignOut
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
// Authentication removed
import { useTranslation } from 'react-i18next'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { user, profile, signOut } = useSupabaseAuth()
  const router = useRouter()
  // Authentication removed - no auth needed
  // Using localStorage for profile data
  const [isLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [profileFile, setProfileFile] = useState<File | null>(null)
  
  // Dark mode state - synced with homepage via localStorage
  const [darkMode, setDarkMode] = useState(true)
  
  useEffect(() => {
    const saved = localStorage.getItem('agorich-dark-mode')
    if (saved !== null) {
      setDarkMode(saved === 'true')
    }
  }, [])
  
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'agorich-dark-mode') {
        setDarkMode(e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])
  
  const [profileData, setProfileData] = useState({
    userName: '',
    phone: '',
    businessName: '',
    businessType: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
    fssaiLicense: '',
    businessRegistration: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    bankName: ''
  })

  // Load user profile data
  useEffect(() => {
    if (profile) {
      try {
        setProfileData({
          userName: profile.user_name || '',
          phone: profile.phone || '',
          businessName: profile.business_name || '',
          businessType: profile.business_type || '',
          address: profile.address || '',
          city: profile.city || '',
          state: profile.state || '',
          pincode: profile.pincode || '',
          gstNumber: profile.gst_number || '',
          fssaiLicense: profile.fssai_license || '',
          businessRegistration: profile.business_registration || '',
          bankAccountNumber: profile.bank_account_number || '',
          bankIfscCode: profile.bank_ifsc_code || '',
          bankName: profile.bank_name || ''
        })
        
        // Load profile photo if exists
        if (profile.profile_photo) {
          setProfilePhoto(profile.profile_photo)
        } else {
          // Check localStorage for fallback
          const savedPhoto = localStorage.getItem('profilePhoto')
          if (savedPhoto) {
            setProfilePhoto(savedPhoto)
          }
        }
      } catch (error) {
        console.error('Error loading profile data:', error)
        setMessage({ type: 'error', text: 'Error loading profile data. Please refresh the page.' })
      }
    }
  }, [profile])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setMessage(null)

      // Build data from form state
      const updatedProfileData = {
        user_name: profileData.userName,
        phone: profileData.phone,
        business_name: profileData.businessName,
        business_type: profileData.businessType,
        address: profileData.address,
        city: profileData.city,
        state: profileData.state,
        pincode: profileData.pincode,
        gst_number: profileData.gstNumber,
        fssai_license: profileData.fssaiLicense,
        business_registration: profileData.businessRegistration,
        bank_account_number: profileData.bankAccountNumber,
        bank_ifsc_code: profileData.bankIfscCode,
        bank_name: profileData.bankName,
        profile_photo: profilePhoto // will be replaced by URL if we upload
      }

      console.log('Saving complete profile data to Supabase:', {
        ...updatedProfileData,
        profile_photo: profilePhoto ? 'Base64 image data (length: ' + profilePhoto.length + ')' : 'No photo'
      })
      
      // If authenticated, upload to Storage and upsert to Supabase
      let uploadedUrl: string | null = null
      if (user && profileFile) {
        try {
          const ext = (profileFile.name?.split('.')?.pop() || 'jpg').toLowerCase()
          const path = `${user.id}/profile_${Date.now()}.${ext}`
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
          uploadedUrl = pub?.publicUrl || null
        } catch (e) {
          console.error('Profile photo upload failed in settings:', e)
        }
      }

      if (user) {
        const payload = {
          id: user.id,
          ...updatedProfileData,
          // only set when new file uploaded
          profile_photo: uploadedUrl ?? undefined
        }
        const { error: upErr } = await supabase
          .from('profiles')
          .upsert(payload, { onConflict: 'id' })
          .select()
        if (upErr) {
          console.error('Supabase upsert error:', upErr)
          setMessage({ type: 'error', text: `Failed to save profile: ${upErr.message || 'Unknown error'}` })
          return
        }
        
        // Update local state with the uploaded URL and clear the file
        if (uploadedUrl) {
          setProfilePhoto(uploadedUrl)
          setProfileFile(null)
          console.log('Profile photo saved to Supabase with URL:', uploadedUrl)
        }
      }

      // Always save to localStorage as backup / offline
      Object.entries(updatedProfileData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          localStorage.setItem(key, String(value))
        }
      })

      // Also save to localStorage as backup
      const photoToCache = uploadedUrl ?? profilePhoto
      if (photoToCache) {
        localStorage.setItem('profilePhoto', photoToCache)
        console.log('Profile photo also saved to localStorage as backup')
      }

      // Update localStorage for backward compatibility
      localStorage.setItem('userName', profileData.userName)
      localStorage.setItem('businessName', profileData.businessName)
      localStorage.setItem('businessType', profileData.businessType)

      setMessage({ type: 'success', text: t('settings.profileUpdated') })
      
    } catch (error) {
      console.error('Error in handleSave:', error)
      setMessage({ type: 'error', text: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}` })
    } finally {
      setIsSaving(false)
    }
  }

  // Photo upload handler
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: t('settings.invalidImageFile') })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: t('settings.imageSizeTooLarge') })
      return
    }

    setIsUploadingPhoto(true)
    setMessage(null) // Clear previous messages
    
    try {
      // Store file for upload
      setProfileFile(file)
      
      // Convert to base64 for preview only
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string
          if (result) {
            setProfilePhoto(result)
            setIsUploadingPhoto(false)
            setMessage({ type: 'success', text: t('settings.photoUploaded') })
            console.log('Photo uploaded successfully')
          } else {
            throw new Error('Failed to read file')
          }
        } catch (error) {
          console.error('Error processing photo:', error)
          setIsUploadingPhoto(false)
          setMessage({ type: 'error', text: t('settings.photoProcessFailed') })
        }
      }
      reader.onerror = (error) => {
        console.error('FileReader error:', error)
        setIsUploadingPhoto(false)
        setMessage({ type: 'error', text: t('settings.photoProcessFailed') })
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Photo upload error:', error)
      setIsUploadingPhoto(false)
      setMessage({ type: 'error', text: t('settings.photoUploadFailed') })
    }
  }

  const handleRemovePhoto = () => {
    setProfilePhoto(null)
    setProfileFile(null)
    setMessage({ type: 'success', text: t('settings.photoRemoved') })
  }


  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className={darkMode ? 'text-slate-300' : 'text-slate-600'}>{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen relative overflow-hidden ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Subtle background gradient */}
      <div className={`absolute inset-0 pointer-events-none ${darkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800/50 to-slate-900' : 'bg-gradient-to-br from-slate-50 via-white to-slate-50'}`} />

      {/* Header */}
      <header className={`border-b backdrop-blur-md sticky top-0 z-50 ${darkMode ? 'border-slate-700/50 bg-slate-800/50' : 'border-slate-200 bg-white/80'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 md:h-16">
            <div className="flex items-center space-x-3 md:space-x-4">
              <Link href="/distributor" className={`flex items-center transition-colors text-sm md:text-base ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'}`}>
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" weight="thin" />
                <span className="md:hidden">Back</span>
                <span className="hidden md:inline">{t('settings.backToDashboard')}</span>
              </Link>
              <div className="hidden md:block w-px h-6 bg-slate-700" />
              <div className="flex items-center space-x-2 md:space-x-3">
                <div className="icon-squirclexs md:icon-squircle">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" weight="thin" />
                </div>
                <div>
                  <h1 className={`text-base md:text-lg font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{t('settings.profileSettings')}</h1>
                  <p className={`hidden md:block text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t('settings.manageAccount')}</p>
                </div>
              </div>
            </div>
            
            <Badge className="hidden md:flex bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              <CheckCircle className="w-4 h-4 mr-1" weight="thin" />
              {t('settings.profileComplete')}
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 relative z-10">
        {/* Message Display */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 p-3 rounded-lg flex items-center backdrop-blur-sm border ${
              message.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 mr-2" weight="thin" />
            ) : (
              <WarningCircle className="w-4 h-4 mr-2" weight="thin" />
            )}
            <span className="text-sm">{message.text}</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Personal Information */}
          <div className="lg:col-span-2 space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="glass-card hover-lift">
                <div className="flex items-center gap-3 p-3 border-b border-slate-700/50">
                  <div className="icon-squircle">
                    <User className="w-4 h-4 text-emerald-400" weight="thin" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{t('settings.personalInformation')}</h3>
                    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>{t('settings.updatePersonalDetails')}</p>
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  {/* Profile Photo Section */}
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="relative">
                      {profilePhoto ? (
                        <div className="relative group">
                          <Image
                            src={profilePhoto}
                            alt="Profile Photo"
                            width={64}
                            height={64}
                            className={`w-16 h-16 rounded-full object-cover border-2 ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}
                          />
                          <button
                            onClick={handleRemovePhoto}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" weight="thin" />
                          </button>
                        </div>
                      ) : (
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                          <User className={`w-8 h-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} weight="thin" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {t('settings.profilePhoto')}
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          id="photo-upload"
                        />
                        <label
                          htmlFor="photo-upload"
                          className={`btn-premium flex items-center px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-sm border ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                        >
                          {isUploadingPhoto ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-300 mr-2"></div>
                              {t('settings.uploading')}
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Camera className="w-4 h-4 mr-1" weight="thin" />
                              {profilePhoto ? t('settings.changePhoto') : t('settings.uploadPhoto')}
                            </div>
                          )}
                        </label>
                        {profilePhoto && (
                          <Button
                            onClick={handleRemovePhoto}
                            variant="outline"
                            size="sm"
                            className={`btn-premium h-8 px-2 ${darkMode ? 'border-slate-600 text-slate-400 hover:text-rose-400 hover:border-rose-500/50' : 'border-slate-300 text-slate-600 hover:text-rose-500'}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        {t('settings.photoFormatHint')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] items-center gap-2 md:gap-3 py-1">
                    <label className={`text-xs md:text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t('settings.fullName')}
                    </label>
                    <Input
                      value={profileData.userName}
                      onChange={(e) => setProfileData({...profileData, userName: e.target.value})}
                      placeholder={t('settings.enterFullName')}
                      className={`h-8 md:h-9 text-xs md:text-sm focus:border-emerald-500/50 focus:ring-emerald-500/20 ${darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>

                  <div className="grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] items-center gap-2 md:gap-3 py-1">
                    <label className={`text-xs md:text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t('settings.phoneNumber')}
                    </label>
                    <Input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        setProfileData({...profileData, phone: value})
                      }}
                      placeholder={t('settings.enterPhoneNumber')}
                      maxLength={10}
                      className={`h-8 md:h-9 text-xs md:text-sm focus:border-emerald-500/50 focus:ring-emerald-500/20 ${darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>

                  <div className="grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] items-start gap-2 md:gap-3 py-1">
                    <label className={`text-xs md:text-sm font-medium md:pt-2 truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t('settings.email')}
                    </label>
                    <div>
                      <Input
                        value={localStorage.getItem('email') || ''}
                        disabled
                        className={`h-8 md:h-9 text-xs md:text-sm ${darkMode ? 'bg-slate-800/30 border-slate-700/50 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
                      />
                      <p className={`text-[10px] md:text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        {t('settings.emailCannotChange')}
                      </p>
                    </div>
                  </div>
              </div>
            </div>

            </motion.div>

            {/* Business Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="glass-card hover-lift">
                <div className={`flex items-center gap-3 p-3 border-b ${darkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <div className="icon-squircle">
                    <Building className="w-4 h-4 text-emerald-400" weight="thin" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{t('settings.businessInformation')}</h3>
                    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>{t('settings.updateBusinessDetails')}</p>
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <div className="grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] items-center gap-2 md:gap-3 py-1">
                    <label className={`text-xs md:text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t('settings.businessName')}
                    </label>
                    <Input
                      value={profileData.businessName}
                      onChange={(e) => setProfileData({...profileData, businessName: e.target.value})}
                      placeholder={t('settings.enterBusinessName')}
                      className={`h-8 md:h-9 text-xs md:text-sm focus:border-emerald-500/50 focus:ring-emerald-500/20 ${darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>

                  <div className="grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] items-center gap-2 md:gap-3 py-1">
                    <label className={`text-xs md:text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t('settings.businessType')}
                    </label>
                    <Select 
                      value={profileData.businessType} 
                      onValueChange={(value) => setProfileData({...profileData, businessType: value})}
                    >
                      <SelectTrigger className={`h-8 md:h-9 text-xs md:text-sm focus:border-emerald-500/50 ${darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'}`}>
                        <SelectValue placeholder={t('settings.selectBusinessType')} />
                      </SelectTrigger>
                      <SelectContent className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                        <SelectItem value="Medical Store">Medical Store</SelectItem>
                        <SelectItem value="Hospital">Hospital</SelectItem>
                        <SelectItem value="Clinic">Clinic</SelectItem>
                        <SelectItem value="Diagnostic Center">Diagnostic Center</SelectItem>
                        <SelectItem value="Nursing Home">Nursing Home</SelectItem>
                        <SelectItem value="Dental Clinic">Dental Clinic</SelectItem>
                        <SelectItem value="Veterinary Clinic">Veterinary Clinic</SelectItem>
                        <SelectItem value="Ayurvedic Store">Ayurvedic Store</SelectItem>
                        <SelectItem value="Homeopathy Store">Homeopathy Store</SelectItem>
                        <SelectItem value="Medical Equipment Supplier">Medical Equipment Supplier</SelectItem>
                        <SelectItem value="Pharmaceutical Distributor">Pharmaceutical Distributor</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] items-center gap-2 md:gap-3 py-1">
                    <label className={`text-xs md:text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t('settings.gstNumberOptional')}
                    </label>
                    <Input
                      value={profileData.gstNumber}
                      onChange={(e) => setProfileData({...profileData, gstNumber: e.target.value})}
                      placeholder={t('settings.enterGstNumber')}
                      className={`h-8 md:h-9 text-xs md:text-sm focus:border-emerald-500/50 focus:ring-emerald-500/20 ${darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>

                  <div className="grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] items-center gap-2 md:gap-3 py-1">
                    <label className={`text-xs md:text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t('settings.fssaiLicenseOptional')}
                    </label>
                    <Input
                      value={profileData.fssaiLicense}
                      onChange={(e) => setProfileData({...profileData, fssaiLicense: e.target.value})}
                      placeholder={t('settings.enterFssaiLicense')}
                      className={`h-8 md:h-9 text-xs md:text-sm focus:border-emerald-500/50 focus:ring-emerald-500/20 ${darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>
              </div>
            </div>

            </motion.div>

            {/* Address Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="glass-card hover-lift">
                <div className="flex items-center gap-3 p-3 border-b border-slate-700/50">
                  <div className="icon-squircle">
                    <MapPin className="w-4 h-4 text-emerald-400" weight="thin" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{t('settings.addressInformation')}</h3>
                    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>{t('settings.updateAddressDetails')}</p>
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <div className="grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] items-start gap-2 md:gap-3 py-1">
                    <label className={`text-xs md:text-sm font-medium md:pt-2 truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t('settings.completeAddress')}
                    </label>
                    <Textarea
                      value={profileData.address}
                      onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                      placeholder={t('settings.enterBusinessAddress')}
                      className={`min-h-[50px] md:min-h-[60px] text-xs md:text-sm focus:border-emerald-500/50 focus:ring-emerald-500/20 ${darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>

                  <div className="grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] items-center gap-2 md:gap-3 py-1">
                    <label className={`text-xs md:text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t('settings.state')}
                    </label>
                    <Input
                      value={profileData.state}
                      onChange={(e) => setProfileData({...profileData, state: e.target.value})}
                      placeholder={t('settings.state')}
                      className={`h-8 md:h-9 text-xs md:text-sm focus:border-emerald-500/50 focus:ring-emerald-500/20 ${darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>

                  <div className="grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] items-center gap-2 md:gap-3 py-1">
                    <label className={`text-xs md:text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t('settings.city')}
                    </label>
                    <Input
                      value={profileData.city}
                      onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                      placeholder={t('settings.city')}
                      className={`h-8 md:h-9 text-xs md:text-sm focus:border-emerald-500/50 focus:ring-emerald-500/20 ${darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>

                  <div className="grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] items-center gap-2 md:gap-3 py-1">
                    <label className={`text-xs md:text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t('settings.pincode')}
                    </label>
                    <Input
                      value={profileData.pincode}
                      onChange={(e) => setProfileData({...profileData, pincode: e.target.value})}
                      placeholder={t('settings.pincode')}
                      className={`h-8 md:h-9 text-xs md:text-sm focus:border-emerald-500/50 focus:ring-emerald-500/20 ${darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                      maxLength={6}
                    />
                  </div>
              </div>
            </div>

            </motion.div>

            {/* Banking Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="glass-card hover-lift">
                <div className="flex items-center gap-3 p-3 border-b border-slate-700/50">
                  <div className="icon-squircle">
                    <Shield className="w-4 h-4 text-emerald-400" weight="thin" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{t('settings.bankingInformation')}</h3>
                    <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>{t('settings.updateBankingDetails')}</p>
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <div className="grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] items-center gap-2 md:gap-3 py-1">
                    <label className={`text-xs md:text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t('settings.bankName')}
                    </label>
                    <Input
                      value={profileData.bankName}
                      onChange={(e) => setProfileData({...profileData, bankName: e.target.value})}
                      placeholder={t('settings.enterBankName')}
                      className={`h-8 md:h-9 text-xs md:text-sm focus:border-emerald-500/50 focus:ring-emerald-500/20 ${darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>

                  <div className="grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] items-center gap-2 md:gap-3 py-1">
                    <label className={`text-xs md:text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t('settings.accountNumber')}
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={profileData.bankAccountNumber}
                        onChange={(e) => setProfileData({...profileData, bankAccountNumber: e.target.value})}
                        placeholder={t('settings.enterAccountNumber')}
                        className={`h-8 md:h-9 pr-10 text-xs md:text-sm focus:border-emerald-500/50 focus:ring-emerald-500/20 ${darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-2 top-1 md:top-1.5 w-6 h-6 ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {showPassword ? <EyeSlash className="w-4 h-4" weight="thin" /> : <Eye className="w-4 h-4" weight="thin" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-[100px_1fr] md:grid-cols-[140px_1fr] items-center gap-2 md:gap-3 py-1">
                    <label className={`text-xs md:text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {t('settings.ifscCode')}
                    </label>
                    <Input
                      value={profileData.bankIfscCode}
                      onChange={(e) => setProfileData({...profileData, bankIfscCode: e.target.value.toUpperCase()})}
                      placeholder={t('settings.enterIfscCode')}
                      className={`h-8 md:h-9 text-xs md:text-sm focus:border-emerald-500/50 focus:ring-emerald-500/20 ${darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-600' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
                      maxLength={11}
                    />
                  </div>
              </div>
            </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Save Button */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="glass-card p-3">
                <Button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full h-10 btn-premium bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {isSaving ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('settings.saving')}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <FloppyDisk className="w-4 h-4 mr-2" weight="thin" />
                      {t('settings.saveChanges')}
                    </div>
                  )}
                </Button>
              </div>
            </motion.div>

            {/* Logout Button */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-3"
            >
              <div className="glass-card p-3">
                <Button 
                  onClick={async () => {
                    try {
                      await signOut()
                    } catch (err) {
                      console.error('Logout failed:', err)
                      window.location.href = '/login'
                    }
                  }}
                  className="w-full h-10 btn-premium border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  variant="outline"
                >
                  <SignOut className="w-4 h-4 mr-2" weight="bold" />
                  Logout
                </Button>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  )
}
