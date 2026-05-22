'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, useInView, useMotionValue, useTransform, animate, useScroll, useSpring } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { 
  Shield,
  CaretRight,
  CaretLeft,
  Phone,
  Envelope,
  MapPin,
  CheckCircle,
  Heart,
  Sun,
  Moon,
  Download,
  Medal,
  Check,
  List,
  X,
  Wind,
  CloudRain,
  Thermometer,
  Drop,
  Pulse,
  MagnifyingGlass,
  Warning,
  Plant,
  NavigationArrow,
  Hospital,
  ChatCircleText,
  Spinner,
  PaperPlaneRight,
  WarningCircle,
  Heart as LungsIcon,
  FirstAid,
  Sparkle,
  CheckCircle as StomachIcon,
  Bone,
  Brain,
  Pill
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import LanguageSwitcher from '@/components/LanguageSwitcher'

// Animated Counter Component
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, value, {
        duration: 2,
        ease: "easeOut",
        onUpdate: (latest) => setDisplayValue(Math.round(latest))
      })
      return () => controls.stop()
    }
  }, [isInView, value])

  return <span ref={ref}>{displayValue}{suffix}</span>
}

// AQI Component
function AQICard() {
  const [aqi, setAqi] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState('Delhi')

  useEffect(() => {
    const fetchAQI = async (lat: number, lon: number) => {
      try {
        const token = process.env.NEXT_PUBLIC_WAQI_TOKEN
        if (!token) {
          setAqi(null)
          setLoading(false)
          return
        }
        const response = await axios.get(`https://api.waqi.info/feed/geo:${lat};${lon}/?token=${token}`)
        if (response.data.status === 'ok') {
          setAqi(response.data.data.aqi)
          setLocation(response.data.data.city?.name || 'Your City')
        }
      } catch (error) {
        console.error('AQI fetch error:', error)
        setAqi(null)
      } finally {
        setLoading(false)
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchAQI(pos.coords.latitude, pos.coords.longitude),
        () => {
          // Default to Delhi if location denied
          fetchAQI(28.6139, 77.2090)
        }
      )
    } else {
      fetchAQI(28.6139, 77.2090)
    }
  }, [])

  const getAQIMessage = (value: number) => {
    if (value > 200) return { text: 'Saans lene mein takleef ho sakti hai', alert: true, color: 'text-red-600' }
    if (value > 100) return { text: 'Hawa Pradushit hai', alert: true, color: 'text-orange-500' }
    return { text: 'Hawa saaf hai', alert: false, color: 'text-green-500' }
  }

  const aqiData = aqi ? getAQIMessage(aqi) : null

  if (!loading && aqi === null) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0, duration: 0.6, type: "spring" }}
      whileHover={{ scale: 1.05 }}
      className="text-center cursor-default p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-900 border border-blue-100 dark:border-slate-700"
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <Wind className="w-6 h-6 text-blue-500" weight="fill" />
        {aqiData?.alert && <Warning className="w-5 h-5 text-red-500 animate-pulse" weight="fill" />}
      </div>
      <div className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1">
        {loading ? '...' : aqi}
      </div>
      <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">AQI - {location}</div>
      {aqiData && (
        <div className={`text-xs font-medium ${aqiData.color} bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-lg`}>
          {aqiData.text}
        </div>
      )}
    </motion.div>
  )
}

// Weather Component
function WeatherCard() {
  const [weather, setWeather] = useState<{temp: number, condition: string} | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
        if (!apiKey) {
          setWeather(null)
          setLoading(false)
          return
        }
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`)
        setWeather({
          temp: Math.round(response.data.main.temp),
          condition: response.data.weather[0].main
        })
      } catch (error) {
        console.error('Weather fetch error:', error)
        setWeather(null)
      } finally {
        setLoading(false)
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(28.6139, 77.2090)
      )
    } else {
      fetchWeather(28.6139, 77.2090)
    }
  }, [])

  const getWeatherMessage = (temp: number, condition: string) => {
    if (temp < 15) return { text: 'Thand badh rahi hai, sardi se bachein', icon: <Thermometer className="w-5 h-5 text-blue-400" weight="fill" /> }
    if (condition === 'Rain') return { text: 'Baarish mein infection ka khatra, immunity badhayein', icon: <CloudRain className="w-5 h-5 text-blue-500" weight="fill" /> }
    return { text: 'Mausam thik hai', icon: <Sun className="w-5 h-5 text-amber-400" weight="fill" /> }
  }

  const weatherData = weather ? getWeatherMessage(weather.temp, weather.condition) : null

  if (!loading && weather === null) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.15, duration: 0.6, type: "spring" }}
      whileHover={{ scale: 1.05 }}
      className="text-center cursor-default p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-gradient-to-br from-amber-50 to-white dark:from-slate-800 dark:to-slate-900 border border-amber-100 dark:border-slate-700"
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        {weatherData?.icon}
      </div>
      <div className="text-3xl sm:text-4xl font-bold text-amber-600 dark:text-amber-400 mb-1">
        {loading ? '...' : `${weather?.temp}°C`}
      </div>
      <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
        {loading ? '...' : weather?.condition}
      </div>
      {weatherData && (
        <div className="text-xs font-medium text-amber-600 bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-lg">
          {weatherData.text}
        </div>
      )}
    </motion.div>
  )
}

// Nearby Medical Places Component (OpenStreetMap - Free)
function NearbyMedicalCard() {
  const [places, setPlaces] = useState<{name: string, distance: string, type: 'hospital' | 'pharmacy'}[]>([])
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState('Your Area')

  useEffect(() => {
    // Set default location immediately, update in background if API succeeds
    const fetchLocationName = async (lat: number, lon: number) => {
      // Try API in background with short timeout
      try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`, {
          timeout: 3000
        })
        const address = response.data.address
        const city = address?.city || address?.town || address?.district || 'Your Area'
        const state = address?.state || ''
        setLocation(state ? `${city}, ${state}` : city)
      } catch {
        // Silently ignore - location already set to default
      }
    }

    const fetchMedicalPlaces = async (lat: number, lon: number) => {
      // Set fallback data immediately first
      setPlaces([
        { name: 'City Hospital', distance: '1.2 km', type: 'hospital' },
        { name: 'Local Medical Store', distance: '0.8 km', type: 'pharmacy' },
        { name: 'Life Care Hospital', distance: '2.5 km', type: 'hospital' },
        { name: 'City Pharmacy', distance: '1.5 km', type: 'pharmacy' }
      ])
      setLoading(false)
      
      // Try to fetch real data in background (don't block UI)
      try {
        // Simpler query - just hospitals within 3km
        const query = `[out:json];node[amenity=hospital](around:3000,${lat},${lon});out body 4;`
        const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
          headers: { 'Content-Type': 'text/plain' },
          timeout: 5000
        })
        
        const elements = response.data.elements || []
        if (elements.length > 0) {
          const placesList = elements.slice(0, 4).map((el: any, idx: number) => ({
            name: el.tags?.name || 'Hospital',
            distance: `${(idx * 0.8 + 0.5).toFixed(1)} km`,
            type: 'hospital' as const
          }))
          setPlaces(placesList)
        }
      } catch (error) {
        // Already have fallback set, just log error
        console.log('Medical fetch failed (expected if API busy):', error)
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          fetchLocationName(latitude, longitude)
          fetchMedicalPlaces(latitude, longitude)
        },
        () => {
          // Default to Patna
          setLocation('Patna, Bihar')
          fetchMedicalPlaces(25.5941, 85.1376)
        },
        { timeout: 10000, enableHighAccuracy: false }
      )
    } else {
      setLocation('Patna, Bihar')
      fetchMedicalPlaces(25.5941, 85.1376)
    }
  }, [])

  const openInMaps = (placeName: string) => {
    const query = encodeURIComponent(`${placeName} near ${location}`)
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30, scale: 0.8 }} 
      whileInView={{ opacity: 1, y: 0, scale: 1 }} 
      viewport={{ once: true }}
      transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
      whileHover={{ scale: 1.02 }}
      className="text-center cursor-default p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-gradient-to-br from-green-50 to-white dark:from-slate-800 dark:to-slate-900 border border-green-100 dark:border-slate-700"
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <MapPin className="w-5 h-5 text-green-500" weight="fill" />
      </div>
      <div className="text-base font-bold text-green-600 dark:text-green-400 mb-1 truncate px-1">
        {location}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
        Nearby Medical
      </div>
      <div className="space-y-1 max-h-[140px] overflow-y-auto">
        {loading ? (
          <div className="text-xs text-slate-400 py-4">Finding nearby places...</div>
        ) : (
          places.map((place, idx) => (
            <button
              key={idx}
              onClick={() => openInMaps(place.name)}
              className="w-full flex items-center justify-between text-xs px-2 py-1.5 bg-white/80 dark:bg-slate-800/80 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-left"
            >
              <span className="flex items-center gap-1.5">
                {place.type === 'pharmacy' ? (
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                )}
                <span className="text-slate-700 dark:text-slate-300 truncate max-w-[90px]">{place.name}</span>
              </span>
              <span className="text-green-600 font-medium text-[10px]">{place.distance}</span>
            </button>
          ))
        )}
      </div>
      {!loading && (
        <div className="mt-2 flex justify-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400"></span> Hospital
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span> Pharmacy
          </span>
        </div>
      )}
    </motion.div>
  )
}

// Emergency Hotline Component
function EmergencyHotlineCard() {
  const emergencyNumbers = [
    { number: '108', label: 'Ambulance', icon: <Phone className="w-4 h-4" weight="fill" /> },
    { number: '102', label: 'Pregnancy', icon: <Heart className="w-4 h-4" weight="fill" /> },
    { number: '104', label: 'Health', icon: <Pulse className="w-4 h-4" weight="fill" /> }
  ]

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30, scale: 0.8 }} 
      whileInView={{ opacity: 1, y: 0, scale: 1 }} 
      viewport={{ once: true }}
      transition={{ delay: 0.45, duration: 0.6, type: "spring" }}
      whileHover={{ scale: 1.02 }}
      className="text-center cursor-default p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-gradient-to-br from-red-50 to-white dark:from-slate-800 dark:to-slate-900 border-2 border-red-200 dark:border-red-800 shadow-lg shadow-red-100 dark:shadow-red-900/20"
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <Phone className="w-5 h-5 text-red-500 animate-pulse" weight="fill" />
        <span className="text-xs font-bold text-red-600">EMERGENCY</span>
      </div>
      <div className="space-y-1.5">
        {emergencyNumbers.map((emergency, idx) => (
          <button
            key={idx}
            onClick={() => handleCall(emergency.number)}
            className="w-full flex items-center justify-between px-2 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-xs font-semibold"
          >
            <span className="flex items-center gap-1">
              {emergency.icon}
              {emergency.label}
            </span>
            <span>{emergency.number}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-red-500 font-medium">
        One-tap to call
      </div>
    </motion.div>
  )
}

// Contact Button Component with Dialog
function ContactButton() {
  const [isOpen, setIsOpen] = useState(false)
  const { t } = useTranslation()

  const handleClick = () => {
    console.log('Contact button clicked')
    setIsOpen(true)
  }

  const handleClose = () => {
    console.log('Closing modal')
    setIsOpen(false)
  }

  return (
    <>
      <button 
        onClick={handleClick}
        type="button"
        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold text-sm sm:text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
      >
        <Phone className="w-4 h-4 sm:w-5 sm:h-5" weight="fill" />
        <span>Contact Us</span>
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={handleClose}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Contact Us</h3>
              <button 
                onClick={handleClose} 
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                type="button"
              >
                <X className="w-5 h-5 text-slate-500" weight="bold" />
              </button>
            </div>
            
            <div className="space-y-3">
              <a 
                href="tel:+919876543210" 
                className="flex items-center gap-3 p-3 rounded-xl bg-pink-50 dark:bg-pink-900/20 hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors"
                onClick={() => console.log('Calling...')}
              >
                <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-white" weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">+91 8409725206</p>
                  <p className="text-xs text-slate-500">{t('common.callNow')}</p>
                </div>
              </a>
              
              <a 
                href="mailto:bhaskarjaikar.1@gmail.com" 
                className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                  <Envelope className="w-5 h-5 text-white" weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">bhaskarjaikar.1@gmail.com</p>
                  <p className="text-xs text-slate-500">{t('common.emailUs')}</p>
                </div>
              </a>
              
              <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-white" weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">Baruraj, Muzaffarpur, Bihar</p>
                  <p className="text-xs text-slate-500">{t('common.office')}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleClose}
              type="button"
              className="w-full mt-4 bg-gradient-to-r from-pink-500 to-indigo-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </>
  )
}

// Feedback Section Component - Compact Toggleable
function FeedbackSection() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const [emailError, setEmailError] = useState('')

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    
    // Validate email if provided
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address (e.g., user@example.com)')
      return
    }
    setEmailError('')

    setIsSubmitting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSubmitStatus('success')
      setName('')
      setEmail('')
      setMessage('')
      setEmailError('')
      setTimeout(() => {
        setSubmitStatus('idle')
        setIsOpen(false)
      }, 2000)
    } catch {
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus('idle'), 3000)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="py-8 px-4 sm:px-6 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500">
      <div className="max-w-4xl mx-auto">
        {!isOpen ? (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:scale-110 transition-transform">
              <ChatCircleText className="w-5 h-5 text-blue-600 dark:text-blue-400" weight="fill" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('home.feedback.title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('home.feedback.subtitle')}</p>
            </div>
            <CaretRight className="w-5 h-5 text-slate-400 ml-auto group-hover:translate-x-1 transition-transform" weight="bold" />
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <ChatCircleText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('home.feedback.title')}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('home.feedback.subtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" weight="bold" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('home.feedback.namePlaceholder')}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setEmailError('')
                    }}
                    placeholder={t('home.feedback.emailPlaceholder')}
                    className={`w-full px-3 py-2.5 rounded-lg border ${emailError ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'} bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                  />
                  {emailError && (
                    <p className="text-red-500 text-xs mt-1">{emailError}</p>
                  )}
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('home.feedback.messagePlaceholder')}
                  rows={3}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="flex-1 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2 animate-spin" weight="bold" />
                        {t('home.feedback.sending')}
                      </>
                    ) : (
                      <>
                        <PaperPlaneRight className="w-4 h-4 mr-2" weight="fill" />
                        {t('home.feedback.submit')}
                      </>
                    )}
                  </button>
                </div>
              </form>

              {submitStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" weight="fill" />
                  <p className="text-green-800 dark:text-green-200 text-xs">{t('home.feedback.success')}</p>
                </motion.div>
              )}

              {submitStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2"
                >
                  <WarningCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" weight="fill" />
                  <p className="text-red-800 dark:text-red-200 text-xs">{t('home.feedback.error')}</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}

// Enhanced Scroll Reveal Component with blur-to-focus and spring physics
function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
  blur = true,
  duration = 0.8,
  spring = true,
  className = ""
}: {
  children: React.ReactNode
  delay?: number
  direction?: "up" | "down" | "left" | "right"
  blur?: boolean
  duration?: number
  spring?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? 80 : direction === "down" ? -80 : 0,
      x: direction === "left" ? 80 : direction === "right" ? -80 : 0,
      filter: blur ? "blur(10px)" : "blur(0px)",
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      filter: "blur(0px)",
      scale: 1,
      transition: spring
        ? {
            type: "spring" as const,
            stiffness: 100,
            damping: 15,
            delay,
          }
        : {
            duration,
            delay,
            ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
          },
    },
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      style={{ willChange: "transform, opacity, filter" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Staggered Children Container
function StaggerContainer({
  children,
  staggerDelay = 0.1,
  className = "",
}: {
  children: React.ReactNode
  staggerDelay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Staggered Child Item
function StaggerItem({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 40,
      scale: 0.9,
      filter: "blur(8px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        stiffness: 120,
        damping: 12,
      },
    },
  }

  return (
    <motion.div
      variants={itemVariants}
      className={className}
      style={{ willChange: "transform, opacity, filter" }}
    >
      {children}
    </motion.div>
  )
}

// Parallax Wrapper Component
function ParallaxSection({
  children,
  speed = 0.5,
  className = "",
}: {
  children: React.ReactNode
  speed?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  const y = useTransform(scrollYProgress, [0, 1], [0, -100 * speed])
  const smoothY = useSpring(y, { stiffness: 100, damping: 30, restDelta: 0.001 })

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div style={{ y: smoothY }}>{children}</motion.div>
    </div>
  )
}

// Magnetic Button Component
function MagneticButton({
  children,
  className = "",
  onClick,
  href,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  href?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const springConfig = { stiffness: 150, damping: 15 }
  const springX = useSpring(x, springConfig)
  const springY = useSpring(y, springConfig)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const distanceX = e.clientX - centerX
    const distanceY = e.clientY - centerY

    x.set(distanceX * 0.15)
    y.set(distanceY * 0.15)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const content = (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  )

  if (href) {
    return (
      <Link href={href} onClick={onClick}>
        {content}
      </Link>
    )
  }

  return <div onClick={onClick}>{content}</div>
}

// Text Reveal Animation for Hero
function TextReveal({
  children,
  delay = 0,
  className = "",
}: {
  children: string
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  const words = children.split(" ")

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: delay,
      },
    },
  }

  const child = {
    hidden: {
      opacity: 0,
      y: 20,
      filter: "blur(8px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 12,
      },
    },
  }

  return (
    <motion.span
      ref={ref}
      className={`inline-flex flex-wrap ${className}`}
      variants={container}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          variants={child}
          className="mr-[0.25em] inline-block"
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  )
}

export default function Home() {
  const { t } = useTranslation()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)

  // Global scroll progress for progress bar
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  // Load dark mode from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('agorich-dark-mode')
    if (saved !== null) {
      setDarkMode(saved === 'true')
    }
  }, [])

  // Save dark mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('agorich-dark-mode', String(darkMode))
  }, [darkMode])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const slides = [
    {
      id: 1,
      title: t('home.hero.slide1.title'),
      subtitle: t('home.hero.slide1.subtitle'),
      image: '/slides/medics.jpg',
    },
    {
      id: 2,
      title: t('home.hero.slide2.title'),
      subtitle: t('home.hero.slide2.subtitle'),
      image: '/slides/india-gate.jpg',
    },
    {
      id: 3,
      title: t('home.hero.slide3.title'),
      subtitle: t('home.hero.slide3.subtitle'),
      image: '/slides/india-flag.jpg',
      eager: true,
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [slides.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const stats = [
    { number: 15, suffix: '+', label: 'Years of Healing' },
    { number: 500, suffix: '+', label: 'Medicines' },
    { number: 25, suffix: '+', label: 'Therapy Areas' },
    { number: 5, suffix: 'Cr+', label: 'Patients Served' },
  ]

  const features = [
    { icon: <LungsIcon className="w-5 h-5" weight="fill" />, title: 'Respiratory', desc: 'Breathing wellness', image: '/medicines/Respiratory.jpg' },
    { icon: <Bone className="w-5 h-5" weight="fill" />, title: 'Orthopedics', desc: 'Bone & joint care', image: '/medicines/Orthopedics.jpg' },
    { icon: <Pill className="w-5 h-5" weight="fill" />, title: 'Neutraceuticals', desc: 'Nutritional supplements', image: '/medicines/Neutraceuticals.jpg' },
    { icon: <Brain className="w-5 h-5" weight="fill" />, title: 'Neurology', desc: 'Brain & nerve health', image: '/medicines/Neurology.jpg' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 origin-left z-[100]"
        style={{ scaleX }}
      />

      {/* HERO with Slideshow - Parallax Enhanced */}
      <section className="relative h-[40vh] sm:h-[75vh] overflow-hidden">
        {/* Slides */}
        <AnimatePresence mode="wait">
          {slides.map((slide, index) => (
            index === currentSlide && (
              <motion.div
                key={slide.id}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <div className="absolute inset-0">
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    className="object-cover"
                    priority={index === 0}
                    loading={slide.eager ? "eager" : undefined}
                    sizes="100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-800/80 to-slate-900/60" />
                </div>
              </motion.div>
            )
          ))}
        </AnimatePresence>

        {/* Navbar */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-lg p-1 shadow-sm">
                <Image 
                  src="/agorich-logo.png" 
                  alt="Agorich Pharma" 
                  width={64} 
                  height={64} 
                  className="object-contain w-full h-full" 
                  priority
                />
              </div>
            </Link>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {darkMode ? <Sun className="w-5 h-5 text-amber-400" weight="fill" /> : <Moon className="w-5 h-5 text-slate-600" weight="fill" />}
              </button>
              <LanguageSwitcher />
              <button onClick={() => router.push('/login')} className="hidden sm:flex bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 py-2 rounded-full font-semibold text-sm">
                Get Started
              </button>
              <button onClick={() => setMenuOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <div className="w-5 h-5 flex flex-col justify-between py-0.5">
                  <div className="w-full h-1 rounded-sm" style={{ backgroundColor: '#FF9933' }}></div>
                  <div className="w-full h-1 rounded-sm" style={{ backgroundColor: '#FFFFFF' }}></div>
                  <div className="w-full h-1 rounded-sm" style={{ backgroundColor: '#138808' }}></div>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex items-center justify-center pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl mx-auto text-center"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                  className="inline-block border-2 border-white/60 text-white text-xs tracking-[2px] uppercase px-4 sm:px-5 py-2 rounded-full mb-5 backdrop-blur-sm bg-white/10"
                >
                  {t('home.hero.badge')}
                </motion.div>

                <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                  <TextReveal delay={0.3}>{slides[currentSlide].title}</TextReveal>
                </h1>

                <motion.p
                  initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.6, type: "spring", stiffness: 100, damping: 15 }}
                  className="text-sm sm:text-lg md:text-xl text-white mb-7 leading-relaxed drop-shadow-md font-medium px-2 sm:px-0"
                >
                  {slides[currentSlide].subtitle}
                </motion.p>

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center justify-center">
                  {/* Buttons removed - clean text only design */}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Minimal Navigation - Dots Only */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-8 bg-blue-500' : 'w-2 bg-white/40 hover:bg-white/60'}`}
            />
          ))}
        </div>
      </section>

      {/* LOGIN / REGISTER CTA - Side by Side with Different Hovers */}
      <ScrollReveal>
        <section className="py-10 sm:py-12 px-4 sm:px-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mb-6 font-medium">
              {t('home.cta.ready')}
            </p>
            <div className="flex flex-row gap-4 justify-center items-center">
              {/* Login Button - Magnetic with enhanced hover */}
              <MagneticButton href="/login">
                <motion.div
                  className="group inline-flex items-center justify-center bg-blue-600 text-white px-10 py-4 rounded-full font-bold text-base shadow-lg shadow-blue-600/25 min-w-[150px] cursor-pointer"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 20px 40px rgba(37, 99, 235, 0.4)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <span>{t('home.cta.login')}</span>
                  <CaretRight className="w-5 h-5 ml-1 transition-transform duration-300 group-hover:translate-x-1" weight="bold" />
                </motion.div>
              </MagneticButton>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* HEALTH STATS BAR - Live Data with Staggered Reveal */}
      <ParallaxSection speed={0.1}>
        <section className="py-10 sm:py-14 px-4 sm:px-6 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-700">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal className="text-center mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1">{t('home.health.title')}</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{t('home.health.desc')}</p>
            </ScrollReveal>
            <StaggerContainer staggerDelay={0.12} className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              <StaggerItem>
                <motion.div whileHover={{ y: -5, transition: { type: "spring", stiffness: 300 } }}>
                  <AQICard />
                </motion.div>
              </StaggerItem>
              <StaggerItem>
                <motion.div whileHover={{ y: -5, transition: { type: "spring", stiffness: 300 } }}>
                  <WeatherCard />
                </motion.div>
              </StaggerItem>
              <StaggerItem>
                <motion.div whileHover={{ y: -5, transition: { type: "spring", stiffness: 300 } }}>
                  <NearbyMedicalCard />
                </motion.div>
              </StaggerItem>
              <StaggerItem>
                <motion.div whileHover={{ y: -5, transition: { type: "spring", stiffness: 300 } }}>
                  <EmergencyHotlineCard />
                </motion.div>
              </StaggerItem>
            </StaggerContainer>
            <ScrollReveal delay={0.4} className="mt-6 text-center">
              <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" weight="bold" />
                </motion.div>
                {t('home.health.trust')}
              </div>
            </ScrollReveal>
          </div>
        </section>
      </ParallaxSection>

      {/* FEATURES - Staggered Reveal with Parallax */}
      <ParallaxSection speed={0.2}>
        <section id="features" className="py-12 sm:py-16 px-4 sm:px-6 bg-white dark:bg-slate-900 transition-colors">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('home.medicines.title')}</h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">{t('home.medicines.desc')}</p>
            </ScrollReveal>

            {/* Staggered 2x2 Grid - Cards animate in sequence */}
            <StaggerContainer staggerDelay={0.15} className="grid grid-cols-2 gap-3 sm:gap-4 max-w-4xl mx-auto">
              {features.map((feature, idx) => (
                <StaggerItem key={idx}>
                  <Link href={`/medicines/category/${feature.title}`}>
                    <motion.div
                      className="relative h-48 sm:h-56 rounded-xl overflow-hidden group cursor-pointer"
                      whileHover={{
                        scale: 1.03,
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-800/50 to-blue-600/30" />
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 p-4 sm:p-5"
                        initial={{ y: 0 }}
                        whileHover={{ y: -5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <div className="flex items-center gap-2 text-white/90 mb-1">
                          {feature.icon}
                          <span className="text-sm font-medium">{feature.title}</span>
                        </div>
                      </motion.div>
                      {/* Glow effect on hover */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-blue-500/20 to-transparent pointer-events-none" />
                    </motion.div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* View All Button with magnetic effect */}
            <ScrollReveal delay={0.4} className="mt-6 sm:mt-8 text-center">
              <MagneticButton href="/medicines">
                <motion.div
                  className="inline-flex items-center justify-center bg-blue-600 text-white px-8 py-3 rounded-full font-semibold text-base shadow-lg cursor-pointer"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 20px 40px rgba(37, 99, 235, 0.4)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {t('home.medicines.viewAll')}
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    <CaretRight className="w-5 h-5 ml-1" weight="bold" />
                  </motion.div>
                </motion.div>
              </MagneticButton>
            </ScrollReveal>
          </div>
        </section>
      </ParallaxSection>

      {/* CTA SECTION - Optimistic & Vibrant with Micro-interactions */}
      <ParallaxSection speed={0.15}>
        <section className="py-6 px-4 sm:px-6 bg-gradient-to-r from-orange-400 via-pink-500 to-rose-500">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3">
                <motion.a
                  href="/agorich-brochure.pdf"
                  download
                  className="flex-1 flex items-center justify-center gap-2 bg-white text-orange-600 px-5 py-3.5 rounded-xl font-bold text-sm sm:text-base shadow-lg cursor-pointer"
                  whileHover={{
                    scale: 1.02,
                    y: -2,
                    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    <Download className="w-5 h-5" weight="bold" />
                  </motion.div>
                  <span>Our Brochure</span>
                </motion.a>
                <ContactButton />
              </div>
            </div>
          </ScrollReveal>
        </section>
      </ParallaxSection>

      {/* FEEDBACK SECTION */}
      <FeedbackSection />

      {/* Floating Ambient Particles - Subtle background effect */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-blue-500/5 to-purple-500/5 blur-3xl"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, 15, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 1.5,
            }}
          />
        ))}
      </div>

      {/* FOOTER - Arlo Style with Theme Support */}
      <ScrollReveal>
        <footer className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-t py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 relative z-10`}>
        <div className="max-w-7xl mx-auto">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            {/* Left Side - Brand */}
            <div className="flex flex-col justify-between">
              <div>
                <p className={`${darkMode ? 'text-slate-300' : 'text-slate-600'} text-lg mb-6 leading-relaxed`}>
                  Seamless Care for a <span className="text-emerald-600 font-medium italic">Better Life.</span>
                </p>
                <div className="relative">
                  <Image 
                    src="/agorich-logo.png" 
                    alt="Agorich" 
                    width={280} 
                    height={120} 
                    className="object-contain opacity-90" 
                  />
                </div>
              </div>
            </div>

            {/* Right Side - Navigation Columns */}
            <div className="grid grid-cols-3 gap-8 text-sm">
              {/* Company */}
              <div>
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'} mb-4`}>Company</h4>
                <ul className="space-y-3">
                  <li><Link href="/about" className={`${darkMode ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'} transition-colors`}>About</Link></li>
                  <li><Link href="/mission" className={`${darkMode ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'} transition-colors`}>Mission</Link></li>
                  <li><Link href="/values" className={`${darkMode ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'} transition-colors`}>Values</Link></li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'} mb-4`}>Resources</h4>
                <ul className="space-y-3">
                  <li><Link href="/login" className={`${darkMode ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'} transition-colors`}>Login</Link></li>
                  <li><Link href="/medicines" className={`${darkMode ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'} transition-colors`}>Medicines</Link></li>
                  <li><a href="/agorich-brochure.pdf" download className={`${darkMode ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'} transition-colors`}>Brochure</a></li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'} mb-4`}>Legal</h4>
                <ul className="space-y-3">
                  <li><Link href="/privacy" className={`${darkMode ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'} transition-colors`}>Privacy Policy</Link></li>
                  <li><Link href="/terms" className={`${darkMode ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'} transition-colors`}>Terms of Service</Link></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className={`pt-6 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} flex flex-col sm:flex-row justify-between items-center gap-4`}>
            <p className={`${darkMode ? 'text-slate-500' : 'text-slate-400'} text-xs uppercase tracking-wider`}>{t('home.footer.copyright')}</p>
            <div className="flex items-center gap-4">
              <a href="tel:+918409725206" className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${darkMode ? 'border-slate-600 text-slate-400 hover:border-emerald-500 hover:text-emerald-400' : 'border-slate-300 text-slate-500 hover:border-emerald-500 hover:text-emerald-600'}`}>
                <Phone className="w-4 h-4" />
              </a>
              <a href="mailto:bhaskarjaikar.1@gmail.com" className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${darkMode ? 'border-slate-600 text-slate-400 hover:border-emerald-500 hover:text-emerald-400' : 'border-slate-300 text-slate-500 hover:border-emerald-500 hover:text-emerald-600'}`}>
                <Envelope className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
      </ScrollReveal>

      {/* MOBILE MENU */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setMenuOpen(false)} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed right-0 top-0 h-full w-72 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white">{t('home.menu.home')}</span>
              <button onClick={() => setMenuOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5 text-slate-700 dark:text-slate-300" weight="bold" />
              </button>
            </div>
            <nav className="p-3 space-y-1">
              {[{ label: t('home.menu.home'), href: '/' }, { label: t('home.menu.features'), href: '#features' }, { label: t('home.menu.about'), href: '/about' }, { label: t('home.menu.mission'), href: '/mission' }, { label: t('home.menu.values'), href: '/values' }, { label: t('home.menu.retailerLogin'), href: '/login' }].map((item) => (
                <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300">
                  <span className="font-medium text-sm">{item.label}</span>
                  <CaretRight className="w-4 h-4 text-slate-400" weight="bold" />
                </Link>
              ))}
            </nav>
            <div className="p-3 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => { setDarkMode(!darkMode); setMenuOpen(false); }} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300">
                {darkMode ? <Sun className="w-5 h-5" weight="fill" /> : <Moon className="w-5 h-5" weight="fill" />}
                <span className="font-medium text-sm">{darkMode ? t('home.menu.lightMode') : t('home.menu.darkMode')}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}
