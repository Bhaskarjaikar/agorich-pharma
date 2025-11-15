'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  User,
  Building,
  MapPin,
  Save,
  CheckCircle,
  AlertCircle,
  Shield,
  Eye,
  EyeOff,
  Camera,
  X
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
// Authentication removed
import { useTranslation } from 'react-i18next'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase-client'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { user, profile } = useSupabaseAuth()
  // Authentication removed - no auth needed
  // Using localStorage for profile data
  const [isLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [profileFile] = useState<File | null>(null)
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
      }

      // Always save to localStorage as backup / offline
      Object.entries(updatedProfileData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          localStorage.setItem(key, String(value))
        }
      })

      // Also save to localStorage as backup
      if (profilePhoto) {
        localStorage.setItem('profilePhoto', profilePhoto)
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
      // Convert to base64 for storage
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
    setMessage({ type: 'success', text: t('settings.photoRemoved') })
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-400 mx-auto mb-6"></div>
          <p className="text-white text-xl">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/retailer" className="flex items-center text-white/70 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                {t('settings.backToDashboard')}
              </Link>
              <div className="w-px h-6 bg-white/20" />
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-blue-500 to-purple-500 animate-spin" style={{animationDuration: '3s'}}></div>
                    <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
                      <Image 
                        src="/agorich-logo.png" 
                        alt="Agorich Logo" 
                        width={32} 
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white">{t('settings.profileSettings')}</h1>
                  <p className="text-sm text-white/70">{t('settings.manageAccount')}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge className="bg-green-500/20 text-green-100 border-green-400/30">
                <CheckCircle className="w-4 h-4 mr-1" />
                {t('settings.profileComplete')}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Message Display */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg flex items-center backdrop-blur-sm border ${
              message.type === 'success' 
                ? 'bg-green-500/20 border-green-400/30 text-green-100' 
                : 'bg-red-500/20 border-red-400/30 text-red-100'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            {message.text}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Personal Information */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 px-4 py-3">
                  <CardTitle className="flex items-center text-white text-sm">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mr-2">
                      <User className="w-3 h-3 text-white" />
                    </div>
                    {t('settings.personalInformation')}
                  </CardTitle>
                  <CardDescription className="text-blue-100 text-xs">
                    {t('settings.updatePersonalDetails')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  {/* Profile Photo Section */}
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      {profilePhoto ? (
                        <div className="relative group">
                          <Image
                            src={profilePhoto}
                            alt="Profile Photo"
                            width={80}
                            height={80}
                            className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
                          />
                          <button
                            onClick={handleRemovePhoto}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                          <User className="w-10 h-10 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        {t('settings.profilePhoto')}
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          id="photo-upload"
                        />
                        <label
                          htmlFor="photo-upload"
                          className="flex items-center px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                        >
                          {isUploadingPhoto ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              {t('settings.uploading')}
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Camera className="w-4 h-4 mr-2" />
                              {profilePhoto ? t('settings.changePhoto') : t('settings.uploadPhoto')}
                            </div>
                          )}
                        </label>
                        {profilePhoto && (
                          <Button
                            onClick={handleRemovePhoto}
                            variant="outline"
                            size="sm"
                            className="bg-red-500/20 border-red-400/30 text-red-100 hover:bg-red-500/30"
                          >
                            <X className="w-4 h-4 mr-1" />
                            {t('settings.remove')}
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-white/60 mt-1">
                        {t('settings.photoFormatHint')}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('settings.fullName')}
                    </label>
                    <Input
                      value={profileData.userName}
                      onChange={(e) => setProfileData({...profileData, userName: e.target.value})}
                      placeholder={t('settings.enterFullName')}
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('settings.phoneNumber')}
                    </label>
                    <Input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '') // Only allow digits
                        setProfileData({...profileData, phone: value})
                      }}
                      placeholder={t('settings.enterPhoneNumber')}
                      maxLength={10}
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('settings.email')}
                    </label>
                    <Input
                      value={localStorage.getItem('email') || ''}
                      disabled
                      className="h-12 bg-white/5 border-white/10 text-white/60"
                    />
                    <p className="text-xs text-white/60 mt-1">
                      {t('settings.emailCannotChange')}
                    </p>
                  </div>
              </CardContent>
            </Card>

            </motion.div>

            {/* Business Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-4 py-3">
                  <CardTitle className="flex items-center text-white text-sm">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-2">
                      <Building className="w-3 h-3 text-white" />
                    </div>
                    {t('settings.businessInformation')}
                  </CardTitle>
                  <CardDescription className="text-green-100 text-xs">
                    {t('settings.updateBusinessDetails')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('settings.businessName')}
                    </label>
                    <Input
                      value={profileData.businessName}
                      onChange={(e) => setProfileData({...profileData, businessName: e.target.value})}
                      placeholder={t('settings.enterBusinessName')}
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-green-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('settings.businessType')}
                    </label>
                    <Select 
                      value={profileData.businessType} 
                      onValueChange={(value) => setProfileData({...profileData, businessType: value})}
                    >
                      <SelectTrigger className="h-12 bg-white/10 border-white/20 text-white focus:bg-white/20 focus:border-green-400">
                        <SelectValue placeholder={t('settings.selectBusinessType')} />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
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

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('settings.gstNumberOptional')}
                    </label>
                    <Input
                      value={profileData.gstNumber}
                      onChange={(e) => setProfileData({...profileData, gstNumber: e.target.value})}
                      placeholder={t('settings.enterGstNumber')}
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-green-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('settings.fssaiLicenseOptional')}
                    </label>
                    <Input
                      value={profileData.fssaiLicense}
                      onChange={(e) => setProfileData({...profileData, fssaiLicense: e.target.value})}
                      placeholder={t('settings.enterFssaiLicense')}
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-green-400"
                    />
                  </div>
              </CardContent>
            </Card>

            </motion.div>

            {/* Address Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-3">
                  <CardTitle className="flex items-center text-white text-sm">
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-2">
                      <MapPin className="w-3 h-3 text-white" />
                    </div>
                    {t('settings.addressInformation')}
                  </CardTitle>
                  <CardDescription className="text-purple-100 text-xs">
                    {t('settings.updateAddressDetails')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('settings.completeAddress')}
                    </label>
                    <Textarea
                      value={profileData.address}
                      onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                      placeholder={t('settings.enterBusinessAddress')}
                      className="min-h-[100px] bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-purple-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        {t('settings.state')}
                      </label>
                      <Input
                        value={profileData.state}
                        onChange={(e) => setProfileData({...profileData, state: e.target.value})}
                        placeholder={t('settings.state')}
                        className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        {t('settings.city')}
                      </label>
                      <Input
                        value={profileData.city}
                        onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                        placeholder={t('settings.city')}
                        className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        {t('settings.pincode')}
                      </label>
                      <Input
                        value={profileData.pincode}
                        onChange={(e) => setProfileData({...profileData, pincode: e.target.value})}
                        placeholder={t('settings.pincode')}
                        className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-purple-400"
                        maxLength={6}
                      />
                    </div>
                  </div>
              </CardContent>
            </Card>

            </motion.div>

            {/* Banking Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-orange-500/20 to-red-500/20 px-4 py-3">
                  <CardTitle className="flex items-center text-white text-sm">
                    <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mr-2">
                      <Shield className="w-3 h-3 text-white" />
                    </div>
                    {t('settings.bankingInformation')}
                  </CardTitle>
                  <CardDescription className="text-orange-100 text-xs">
                    {t('settings.updateBankingDetails')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('settings.bankName')}
                    </label>
                    <Input
                      value={profileData.bankName}
                      onChange={(e) => setProfileData({...profileData, bankName: e.target.value})}
                      placeholder={t('settings.enterBankName')}
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-orange-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('settings.accountNumber')}
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={profileData.bankAccountNumber}
                        onChange={(e) => setProfileData({...profileData, bankAccountNumber: e.target.value})}
                        placeholder={t('settings.enterAccountNumber')}
                        className="h-12 pr-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-orange-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 w-6 h-6 text-white/60 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      {t('settings.ifscCode')}
                    </label>
                    <Input
                      value={profileData.bankIfscCode}
                      onChange={(e) => setProfileData({...profileData, bankIfscCode: e.target.value.toUpperCase()})}
                      placeholder={t('settings.enterIfscCode')}
                      className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-orange-400"
                      maxLength={11}
                    />
                  </div>
              </CardContent>
            </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Save Button */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300">
                <CardContent className="p-6">
                  <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isSaving ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        {t('settings.saving')}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Save className="w-5 h-5 mr-2" />
                        {t('settings.saveChanges')}
                      </div>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  )
}
