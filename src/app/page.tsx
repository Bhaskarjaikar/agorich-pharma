'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  CheckCircle, 
  Truck, 
  Shield, 
  Clock, 
  Users, 
  Star,
  Phone,
  Mail,
  MapPin,
  Zap,
  Target
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import BackgroundSlideshow from "@/components/BackgroundSlideshow";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Home() {
  const { t } = useTranslation();
  const [currentQuote, setCurrentQuote] = useState(0);
  const [mrpValue, setMrpValue] = useState(100);
  
  const quotes = [
    t("common.quote1", "Trusted by 10,000+ Pharmacies"),
    t("common.quote2", "Empowering Healthcare Excellence"),
    t("common.quote3", "Your Trusted Pharma Partner"),
    t("common.quote4", "Delivering Quality & Trust"),
    t("common.quote5", "Building Healthy Communities")
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote((prev) => (prev + 1) % quotes.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [quotes.length]);

  // Authentication removed - no OAuth handling needed

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative">
      {/* Navigation - Sticky Header */}
      <nav className="border-b border-white/10 bg-gradient-to-r from-slate-900/95 via-blue-900/95 to-indigo-900/95 backdrop-blur-xl fixed top-0 left-0 right-0 z-[100] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="relative group cursor-pointer">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-blue-500 to-purple-500 animate-spin" style={{animationDuration: '3s'}}></div>
                  <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
                    <Image 
                      src="/agorich-logo.png" 
                      alt="Agorich Logo" 
                      width={56} 
                      height={56}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  </div>
                </div>
                {/* Hover Tooltip */}
                <div className="absolute left-full ml-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out pointer-events-none z-50">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full shadow-lg whitespace-nowrap text-sm font-medium">
                    <span className="transition-all duration-500 ease-in-out">
                      "{quotes[currentQuote]}"
                    </span>
                  </div>
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gradient-to-r from-blue-600 to-purple-600 rotate-45"></div>
                </div>
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link 
                href="#features" 
                className="text-white hover:text-cyan-400 transition-all duration-300 hover:scale-105 font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {t("nav.features")}
              </Link>
              <Link 
                href="#testimonials" 
                className="text-white hover:text-cyan-400 transition-all duration-300 hover:scale-105 font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {t("nav.testimonials")}
              </Link>
              <Link href="/login" className="text-white hover:text-cyan-400 transition-all duration-300 hover:scale-105 font-medium">{t("nav.login", "Dashboard")}</Link>
              {/* Language Switcher */}
              <LanguageSwitcher />
              {/* Capsule-shaped "Get Started" Button in Navigation */}
              <div className="relative group cursor-pointer" onClick={() => window.location.href = '/login'}>
                {/* Capsule Container */}
                <div className="relative w-32 h-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-600 rounded-full shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105 overflow-hidden">
                  {/* Capsule shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  
                  {/* Capsule division line */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 transform -translate-x-1/2"></div>
                  
                  {/* Text content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm tracking-wide relative z-10">
                {t("nav.getStarted")}
                    </span>
                  </div>
                  
                  {/* Capsule ends (rounded caps) */}
                  <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full border border-white/20"></div>
                  <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full border border-white/20"></div>
                </div>
                
                {/* Mini Hyper Burst Effect - Micro Capsules */}
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                  {/* Micro Capsule 1 - Indigo */}
                  <div className="absolute top-1/2 left-1/2 w-1.5 h-3 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-up-left_0.6s_ease-out_forwards]" style={{animationDelay: '0ms'}}>
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                    <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-indigo-500 rounded-full"></div>
                    <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-indigo-600 rounded-full"></div>
                  </div>
                  
                  {/* Micro Capsule 2 - Purple */}
                  <div className="absolute top-1/2 left-1/2 w-1 h-2 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-up-right_0.6s_ease-out_forwards]" style={{animationDelay: '50ms'}}>
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                    <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-purple-500 rounded-full"></div>
                    <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-purple-600 rounded-full"></div>
                  </div>
                  
                  {/* Micro Capsule 3 - Pink */}
                  <div className="absolute top-1/2 left-1/2 w-1.5 h-3 bg-gradient-to-r from-pink-400 to-pink-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-down-left_0.6s_ease-out_forwards]" style={{animationDelay: '100ms'}}>
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                    <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-pink-500 rounded-full"></div>
                    <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-pink-600 rounded-full"></div>
                  </div>
                  
                  {/* Micro Capsule 4 - Violet */}
                  <div className="absolute top-1/2 left-1/2 w-1 h-2 bg-gradient-to-r from-violet-400 to-violet-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-down-right_0.6s_ease-out_forwards]" style={{animationDelay: '150ms'}}>
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                    <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-violet-500 rounded-full"></div>
                    <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-violet-600 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="md:hidden">
              <Link
                href="/login"
                className="relative group inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20 hover:shadow-purple-500/30 transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <span className="relative z-10">{t("signIn")}</span>
                <ArrowRight className="w-4 h-4 ml-1 relative z-10" />
                <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="absolute inset-0 rounded-full -translate-x-full group-hover:translate-x-0 transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Slideshow Background */}
      <section className="relative min-h-[85vh] pt-24 pb-20 px-4 sm:px-6 lg:px-8 z-10 overflow-hidden">
        {/* Background Slideshow - Only in Hero Section */}
        <BackgroundSlideshow
          images={["/slides/medics.jpg", "/slides/red-fort.jpg", "/slides/india-gate.jpg", "/slides/india-flag.jpg"]}
          intervalMs={7000}
          overlayClassName="bg-gradient-to-b from-black/75 via-black/70 to-black/75"
          gradeClassName="bg-gradient-to-br from-slate-900/40 via-blue-900/35 to-indigo-900/40 mix-blend-multiply"
          tintClassName="bg-cyan-900/30 mix-blend-overlay"
          blurPx={3}
        />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            <div className="animate-bounce mb-4">
              <Badge className="bg-gradient-to-r from-emerald-400 to-cyan-500 text-white border-0 shadow-lg">
                🎉 {t("hero.badge")}
              </Badge>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
              {t("hero.titleLine1")}
              <span className="block bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-pulse">
                {t("hero.titleLine2")}
              </span>
            </h1>
            <p className="text-xl text-white/80 mb-8 max-w-3xl mx-auto animate-slide-up leading-relaxed">
              {t("hero.desc")}
            </p>

            {/* 40% Margin Guarantee Banner - Compact Calculator */}
            <div className="max-w-3xl mx-auto mb-6 animate-slide-up">
              <Card className="border border-cyan-500/30 bg-gradient-to-br from-slate-800/80 via-blue-900/60 to-indigo-900/80 backdrop-blur-sm shadow-xl">
                <CardContent className="p-4">
                  <div className="text-center mb-3">
                    <h3 className="text-lg md:text-xl font-bold text-white mb-0.5">
                      <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                        {t("calculator.title")}
                      </span>
                    </h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Left - Slider */}
                    <div>
                      <label className="block text-white/80 text-xs mb-2 font-medium">
                        {t("calculator.productMRP")}
                      </label>
                      <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                        <div className="text-center mb-2">
                          <span className="text-xl font-bold text-cyan-400">₹{mrpValue}</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="100000"
                          step="500"
                          value={mrpValue}
                          onChange={(e) => setMrpValue(Number(e.target.value))}
                          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${((mrpValue - 50) / (100000 - 50)) * 100}%, rgba(255,255,255,0.1) ${((mrpValue - 50) / (100000 - 50)) * 100}%, rgba(255,255,255,0.1) 100%)`
                          }}
                        />
                        <div className="flex justify-between text-xs text-white/40 mt-1">
                          <span>₹50</span>
                          <span>₹1,00,000</span>
                        </div>
                      </div>
                    </div>

                    {/* Right - Dynamic Donut Chart - Fills with Total */}
                    <div className="flex flex-col justify-center">
                      <div className="relative w-full aspect-square max-w-[120px] mx-auto">
                        <svg viewBox="0 0 200 200" className="w-full h-full">
                          <defs>
                            <linearGradient id="earningsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#f97316" stopOpacity="1" />
                              <stop offset="50%" stopColor="#ef4444" stopOpacity="1" />
                              <stop offset="100%" stopColor="#fbbf24" stopOpacity="1" />
                            </linearGradient>
                            <filter id="glow">
                              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                            <filter id="glowOrange">
                              <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>
                          {/* Background Circle */}
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="18"
                          />
                          {/* Dynamic Fill - Investment Portion (60% of total value) - CYAN (Cool) */}
                          <circle
                            cx="100"
                            cy="100"
                            r="80"
                            fill="none"
                            stroke="#06b6d4"
                            strokeWidth="18"
                            strokeDasharray={`${502.65 * (mrpValue / 100000) * 0.6} ${502.65}`}
                            strokeDashoffset="0"
                            className="transition-all duration-700 ease-out"
                            strokeLinecap="round"
                            transform="rotate(-90 100 100)"
                            style={{
                              filter: 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.5))'
                            }}
                          />
                          {/* Dynamic Fill - Earnings Portion (40% of total value) - ORANGE/RED (Warm - Opposite) */}
                          {mrpValue > 50 && (
                            <circle
                              cx="100"
                              cy="100"
                              r="80"
                              fill="none"
                              stroke="url(#earningsGradient)"
                              strokeWidth="22"
                              strokeDasharray={`${502.65 * (mrpValue / 100000) * 0.4} ${502.65}`}
                              strokeDashoffset={`-${502.65 * (mrpValue / 100000) * 0.6}`}
                              className="transition-all duration-700 ease-out"
                              strokeLinecap="round"
                              filter="url(#glowOrange)"
                              transform="rotate(-90 100 100)"
                              style={{
                                animation: mrpValue > 10000 ? `pulse 2s ease-in-out infinite` : 'none',
                                boxShadow: mrpValue > 10000 ? '0 0 25px rgba(249, 115, 22, 0.8)' : 'none'
                              }}
                            >
                              {mrpValue > 10000 && (
                                <animate
                                  attributeName="stroke-width"
                                  values="22;26;22"
                                  dur="2s"
                                  repeatCount="indefinite"
                                />
                              )}
                            </circle>
                          )}
                          {/* Animated earnings highlight - Only shows when value is high - BRIGHT ORANGE */}
                          {mrpValue > 5000 && (
                            <circle
                              cx="100"
                              cy="100"
                              r="80"
                              fill="none"
                              stroke="#f97316"
                              strokeWidth="10"
                              strokeDasharray={`${502.65 * (mrpValue / 100000) * 0.4} ${502.65}`}
                              strokeDashoffset={`-${502.65 * (mrpValue / 100000) * 0.6}`}
                              className="transition-all duration-700 ease-out opacity-70"
                              strokeLinecap="round"
                              transform="rotate(-90 100 100)"
                              style={{
                                animation: `rotate 3s linear infinite`
                              }}
                            />
                          )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <p className="text-[10px] text-white/50 mb-0.5">
                            {mrpValue < 5000 ? t("calculator.fillToEarn") : t("calculator.youEarn")}
                          </p>
                          <p className="text-lg font-bold bg-gradient-to-r from-orange-400 via-red-500 to-yellow-400 bg-clip-text text-transparent" style={{
                            animation: mrpValue > 10000 ? 'pulse 2s ease-in-out infinite' : 'none'
                          }}>
                            ₹{Math.round(mrpValue * 0.40).toLocaleString('en-IN')}
                          </p>
                          <p className="text-[9px] text-white/40 mt-0.5">
                            {((mrpValue / 100000) * 100).toFixed(0)}% of Max
                          </p>
                        </div>
                        {/* Pulsing ring effect - Only when value is significant - ORANGE */}
                        {mrpValue > 10000 && (
                          <div className="absolute inset-0 rounded-full border-2 border-orange-400/40 animate-ping" style={{animationDuration: '3s'}}></div>
                        )}
                      </div>
                      <div className="flex gap-2 justify-center text-[10px] mt-1">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-cyan-400 rounded"></div>
                          <span className="text-white/50">{t("calculator.invest")}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded ${mrpValue > 10000 ? 'bg-gradient-to-r from-orange-400 to-red-500 animate-pulse' : 'bg-orange-400'}`}></div>
                          <span className={`${mrpValue > 10000 ? 'text-white font-semibold' : 'text-white/70 font-medium'}`}>{t("calculator.earn")}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Results Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="bg-white/5 rounded-lg p-2 border border-cyan-400/20 text-center">
                      <p className="text-[10px] text-white/60 mb-0.5">{t("calculator.youPay")}</p>
                      <p className="text-base font-bold text-cyan-400">₹{Math.round(mrpValue * 0.60)}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 border border-orange-400/30 text-center">
                      <p className="text-[10px] text-white/60 mb-0.5">{t("calculator.yourMargin")}</p>
                      <p className="text-base font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">₹{Math.round(mrpValue * 0.40)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg p-2 border border-blue-400/30 text-center">
                      <p className="text-[10px] text-white/60 mb-0.5">{t("calculator.total")}</p>
                      <p className="text-base font-bold text-white">₹{mrpValue}</p>
                    </div>
                  </div>

                  {/* Bottom Summary */}
                  <div className="mt-3 bg-gradient-to-r from-cyan-500/10 to-orange-500/10 rounded-lg p-2.5 border border-cyan-400/20 border-r-orange-400/30">
                    <p className="text-center text-white text-xs font-medium">
                      {t("calculator.investmentEarnTotal")}: <span className="text-cyan-400 font-bold">₹{mrpValue.toLocaleString('en-IN')}</span>
                    </p>
                    <p className="text-center text-[10px] text-white/60 mt-0.5">
                      <span className="text-cyan-400">₹{Math.round(mrpValue * 0.60).toLocaleString('en-IN')}</span> + <span className="text-orange-400 font-semibold">₹{Math.round(mrpValue * 0.40).toLocaleString('en-IN')}</span> = ₹{mrpValue.toLocaleString('en-IN')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
              {/* Capsule-shaped "Start Your Journey" Button */}
              <div className="relative group cursor-pointer" onClick={() => window.location.href = '/login'}>
                {/* Capsule Container */}
                <div className="relative w-80 h-16 bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 rounded-full shadow-2xl hover:shadow-red-500/30 transition-all duration-500 hover:scale-105 overflow-hidden">
                  {/* Capsule shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  
                  {/* Capsule division line */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 transform -translate-x-1/2"></div>
                  
                  {/* Text content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-lg tracking-wide relative z-10">
                {t("hero.startJourney")}
                    </span>
                    <ArrowRight className="ml-3 w-5 h-5 text-white animate-pulse relative z-10" />
                  </div>
                  
                  {/* Capsule ends (rounded caps) */}
                  <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full border-2 border-white/20"></div>
                  <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full border-2 border-white/20"></div>
                  
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-400/0 via-pink-400/0 to-purple-500/0 group-hover:from-red-400/20 group-hover:via-pink-400/20 group-hover:to-purple-500/20 transition-all duration-300"></div>
                </div>
                
                {/* Hyper Burst Effect - Micro Capsules */}
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                  {/* Micro Capsule 1 - Red */}
                  <div className="absolute top-1/2 left-1/2 w-3 h-6 bg-gradient-to-r from-red-400 to-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-up-left_0.8s_ease-out_forwards]" style={{animationDelay: '0ms'}}>
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                    <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-red-500 rounded-full"></div>
                    <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-red-600 rounded-full"></div>
                  </div>
                  
                  {/* Micro Capsule 2 - Pink */}
                  <div className="absolute top-1/2 left-1/2 w-2.5 h-5 bg-gradient-to-r from-pink-400 to-pink-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-up-right_0.8s_ease-out_forwards]" style={{animationDelay: '50ms'}}>
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                    <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-pink-500 rounded-full"></div>
                    <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-pink-600 rounded-full"></div>
                  </div>
                  
                  {/* Micro Capsule 3 - Purple */}
                  <div className="absolute top-1/2 left-1/2 w-3 h-6 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-down-left_0.8s_ease-out_forwards]" style={{animationDelay: '100ms'}}>
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                    <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-purple-500 rounded-full"></div>
                    <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-purple-600 rounded-full"></div>
                  </div>
                  
                  {/* Micro Capsule 4 - Blue */}
                  <div className="absolute top-1/2 left-1/2 w-2.5 h-5 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-down-right_0.8s_ease-out_forwards]" style={{animationDelay: '150ms'}}>
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                    <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-blue-500 rounded-full"></div>
                    <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-blue-600 rounded-full"></div>
                  </div>
                  
                  {/* Micro Capsule 5 - Green */}
                  <div className="absolute top-1/2 left-1/2 w-3 h-6 bg-gradient-to-r from-green-400 to-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-left-up_0.8s_ease-out_forwards]" style={{animationDelay: '200ms'}}>
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                    <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-green-500 rounded-full"></div>
                    <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-green-600 rounded-full"></div>
                  </div>
                  
                  {/* Micro Capsule 6 - Yellow */}
                  <div className="absolute top-1/2 left-1/2 w-2.5 h-5 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-left-down_0.8s_ease-out_forwards]" style={{animationDelay: '250ms'}}>
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                    <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-yellow-500 rounded-full"></div>
                    <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-yellow-600 rounded-full"></div>
                  </div>
                  
                  {/* Micro Capsule 7 - Orange */}
                  <div className="absolute top-1/2 left-1/2 w-3 h-6 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-right-up_0.8s_ease-out_forwards]" style={{animationDelay: '300ms'}}>
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                    <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-orange-500 rounded-full"></div>
                    <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-orange-600 rounded-full"></div>
                  </div>
                  
                  {/* Micro Capsule 8 - Cyan */}
                  <div className="absolute top-1/2 left-1/2 w-2.5 h-5 bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-right-down_0.8s_ease-out_forwards]" style={{animationDelay: '350ms'}}>
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                    <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-cyan-500 rounded-full"></div>
                    <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-cyan-600 rounded-full"></div>
                  </div>
                  
                  {/* Micro Capsule 9 - Indigo */}
                  <div className="absolute top-1/2 left-1/2 w-2 h-4 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-diagonal-1_0.8s_ease-out_forwards]" style={{animationDelay: '400ms'}}>
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                    <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-indigo-500 rounded-full"></div>
                    <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-indigo-600 rounded-full"></div>
                  </div>
                  
                  {/* Micro Capsule 10 - Teal */}
                  <div className="absolute top-1/2 left-1/2 w-2 h-4 bg-gradient-to-r from-teal-400 to-teal-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-diagonal-2_0.8s_ease-out_forwards]" style={{animationDelay: '450ms'}}>
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                    <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-teal-500 rounded-full"></div>
                    <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-teal-600 rounded-full"></div>
                  </div>
                </div>
                
                {/* Floating particles around capsule */}
                <div className="absolute -top-2 -left-2 w-2 h-2 bg-red-400 rounded-full animate-ping opacity-60"></div>
                <div className="absolute -bottom-2 -right-2 w-1.5 h-1.5 bg-pink-400 rounded-full animate-ping opacity-60" style={{animationDelay: '0.5s'}}></div>
                <div className="absolute top-1/2 -left-4 w-1 h-1 bg-purple-400 rounded-full animate-ping opacity-60" style={{animationDelay: '1s'}}></div>
              </div>
              <Button
                asChild
                size="lg"
                className="text-lg px-8 py-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <a
                  href="/agorich-brochure.pdf"
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("hero.downloadBrochure", "Download Brochure")}
                </a>
              </Button>
            </div>
            <div className="mt-12 flex justify-center items-center space-x-8 text-sm text-white/70">
              <div className="flex items-center animate-pulse">
                <CheckCircle className="w-4 h-4 text-emerald-400 mr-2" />
                {t("hero.noSetupFees", "No Setup Fees")}
              </div>
              <div className="flex items-center animate-pulse delay-100">
                <CheckCircle className="w-4 h-4 text-emerald-400 mr-2" />
                {t("features.grace")}
              </div>
              <div className="flex items-center animate-pulse delay-200">
                <CheckCircle className="w-4 h-4 text-emerald-400 mr-2" />
                {t("features.advisor")}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section id="features" className="py-20 bg-gradient-to-b from-slate-800 to-slate-900 relative">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 animate-fade-in">
              {t("features.why")}
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto animate-slide-up">
              {t("features.subtitle", "We're revolutionizing pharmaceutical distribution with transparent pricing and unmatched service.")}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/10 group">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center mb-4 group-hover:animate-pulse">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl text-white">{t("features.directMargin")}</CardTitle>
                <CardDescription className="text-white/70">
                  {t("features.directMarginDesc")}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/10 group">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-green-500 rounded-lg flex items-center justify-center mb-4 group-hover:animate-pulse">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl text-white">{t("features.doorstep")}</CardTitle>
                <CardDescription className="text-white/70">
                  {t("features.doorstepDesc")}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/10 group">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-lg flex items-center justify-center mb-4 group-hover:animate-pulse">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl text-white">{t("features.invoice")}</CardTitle>
                <CardDescription className="text-white/70">
                  {t("features.invoiceDesc")}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/10 group">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg flex items-center justify-center mb-4 group-hover:animate-pulse">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl text-white">{t("features.grace")}</CardTitle>
                <CardDescription className="text-white/70">
                  {t("features.graceDesc")}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/10 group">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center mb-4 group-hover:animate-pulse">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl text-white">{t("features.returns")}</CardTitle>
                <CardDescription className="text-white/70">
                  {t("features.returnsDesc")}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/10 group">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center mb-4 group-hover:animate-pulse">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl text-white">{t("features.advisor")}</CardTitle>
                <CardDescription className="text-white/70">
                  {t("features.advisorDesc")}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-gradient-to-b from-slate-900 to-slate-800 relative">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 animate-fade-in">
              {t("testimonials.title")}
            </h2>
            <p className="text-xl text-white/70 animate-slide-up">
              {t("testimonials.subtitle")}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/10 group">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current animate-pulse" style={{animationDelay: `${i * 100}ms`}} />
                  ))}
                </div>
                <p className="text-white/80 mb-4 leading-relaxed">
                  "Agorich transformed my pharmacy business. The 40% margin is real, and the delivery is always on time. My profits have increased by 300% in just 6 months!"
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center mr-3 group-hover:animate-pulse">
                    <span className="text-white font-semibold">RK</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Rajesh Kumar</p>
                    <p className="text-sm text-white/60">Patna, Bihar</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/10 group">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current animate-pulse" style={{animationDelay: `${i * 100}ms`}} />
                  ))}
                </div>
                <p className="text-white/80 mb-4 leading-relaxed">
                  "The transparent pricing and real-time margin calculation helped me make better business decisions. The support team is amazing!"
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center mr-3 group-hover:animate-pulse">
                    <span className="text-white font-semibold">PS</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Priya Sharma</p>
                    <p className="text-sm text-white/60">Lucknow, UP</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/10 group">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current animate-pulse" style={{animationDelay: `${i * 100}ms`}} />
                  ))}
                </div>
                <p className="text-white/80 mb-4 leading-relaxed">
                  "From a small clinic to a successful pharmacy chain, Agorich has been our trusted partner. The referral program is fantastic!"
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mr-3 group-hover:animate-pulse">
                    <span className="text-white font-semibold">AM</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Amit Mishra</p>
                    <p className="text-sm text-white/60">Ranchi, Jharkhand</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 animate-pulse">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm20 0c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 animate-fade-in">
            {t("cta.title")}
          </h2>
          <p className="text-xl text-white/90 mb-8 animate-slide-up">
            {t("cta.desc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            {/* Capsule-shaped "Get Started Now" Button */}
            <div className="relative group cursor-pointer" onClick={() => window.location.href = '/login'}>
              {/* Capsule Container */}
              <div className="relative w-72 h-14 bg-gradient-to-r from-orange-500 via-yellow-500 to-green-600 rounded-full shadow-2xl hover:shadow-orange-500/30 transition-all duration-500 hover:scale-105 overflow-hidden">
                {/* Capsule shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                {/* Capsule division line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 transform -translate-x-1/2"></div>
                
                {/* Text content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-lg tracking-wide relative z-10">
              {t("cta.getStartedNow")}
                  </span>
                  <ArrowRight className="ml-3 w-5 h-5 text-white animate-pulse relative z-10" />
                </div>
                
                {/* Capsule ends (rounded caps) */}
                <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full border-2 border-white/20"></div>
                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gradient-to-r from-yellow-500 to-green-600 rounded-full border-2 border-white/20"></div>
                
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400/0 via-yellow-400/0 to-green-500/0 group-hover:from-orange-400/20 group-hover:via-yellow-400/20 group-hover:to-green-500/20 transition-all duration-300"></div>
              </div>
              
              {/* Hyper Burst Effect - Micro Capsules */}
              <div className="absolute inset-0 pointer-events-none overflow-visible">
                {/* Micro Capsule 1 - Orange */}
                <div className="absolute top-1/2 left-1/2 w-2.5 h-5 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-up-left_0.8s_ease-out_forwards]" style={{animationDelay: '0ms'}}>
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                  <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-orange-500 rounded-full"></div>
                  <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-orange-600 rounded-full"></div>
                </div>
                
                {/* Micro Capsule 2 - Yellow */}
                <div className="absolute top-1/2 left-1/2 w-2 h-4 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-up-right_0.8s_ease-out_forwards]" style={{animationDelay: '50ms'}}>
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                  <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-yellow-500 rounded-full"></div>
                  <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-yellow-600 rounded-full"></div>
                </div>
                
                {/* Micro Capsule 3 - Green */}
                <div className="absolute top-1/2 left-1/2 w-2.5 h-5 bg-gradient-to-r from-green-400 to-green-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-down-left_0.8s_ease-out_forwards]" style={{animationDelay: '100ms'}}>
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                  <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-green-500 rounded-full"></div>
                  <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-green-600 rounded-full"></div>
                </div>
                
                {/* Micro Capsule 4 - Lime */}
                <div className="absolute top-1/2 left-1/2 w-2 h-4 bg-gradient-to-r from-lime-400 to-lime-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-down-right_0.8s_ease-out_forwards]" style={{animationDelay: '150ms'}}>
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                  <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-lime-500 rounded-full"></div>
                  <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-lime-600 rounded-full"></div>
                </div>
                
                {/* Micro Capsule 5 - Amber */}
                <div className="absolute top-1/2 left-1/2 w-2.5 h-5 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-left-up_0.8s_ease-out_forwards]" style={{animationDelay: '200ms'}}>
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                  <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-amber-500 rounded-full"></div>
                  <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-amber-600 rounded-full"></div>
                </div>
                
                {/* Micro Capsule 6 - Emerald */}
                <div className="absolute top-1/2 left-1/2 w-2 h-4 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-left-down_0.8s_ease-out_forwards]" style={{animationDelay: '250ms'}}>
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                  <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-emerald-500 rounded-full"></div>
                  <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-emerald-600 rounded-full"></div>
                </div>
                
                {/* Micro Capsule 7 - Sky */}
                <div className="absolute top-1/2 left-1/2 w-2.5 h-5 bg-gradient-to-r from-sky-400 to-sky-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-right-up_0.8s_ease-out_forwards]" style={{animationDelay: '300ms'}}>
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                  <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-sky-500 rounded-full"></div>
                  <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-sky-600 rounded-full"></div>
                </div>
                
                {/* Micro Capsule 8 - Rose */}
                <div className="absolute top-1/2 left-1/2 w-2 h-4 bg-gradient-to-r from-rose-400 to-rose-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:animate-[burst-right-down_0.8s_ease-out_forwards]" style={{animationDelay: '350ms'}}>
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/40 transform -translate-x-1/2"></div>
                  <div className="absolute -left-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-rose-500 rounded-full"></div>
                  <div className="absolute -right-0.5 top-1/2 transform -translate-y-1/2 w-0.5 h-0.5 bg-rose-600 rounded-full"></div>
                </div>
              </div>
              
              {/* Floating particles around capsule */}
              <div className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-orange-400 rounded-full animate-ping opacity-60"></div>
              <div className="absolute -bottom-1 -right-1 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-60" style={{animationDelay: '0.5s'}}></div>
              <div className="absolute top-1/2 -left-3 w-0.5 h-0.5 bg-green-400 rounded-full animate-ping opacity-60" style={{animationDelay: '1s'}}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-slate-900 to-black text-white py-16 relative">
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='10' cy='10' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="relative group">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-blue-500 to-purple-500 animate-spin" style={{animationDuration: '3s'}}></div>
                    <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
                      <Image 
                        src="/agorich-logo.png" 
                        alt="Agorich Logo" 
                        width={72} 
                        height={72}
                        className="w-18 h-18 rounded-full object-cover"
                      />
                    </div>
                  </div>
                  {/* Hover Tooltip */}
                  <div className="absolute left-full ml-4 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out pointer-events-none z-50">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full shadow-lg whitespace-nowrap text-sm font-medium">
                      <span className="transition-all duration-500 ease-in-out">
                        "Your Trusted Pharma Partner"
                      </span>
                    </div>
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gradient-to-r from-blue-600 to-purple-600 rotate-45"></div>
                  </div>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Agorich</h2>
              <p className="text-white/70 mb-4 leading-relaxed">
                India's leading B2B pharmaceutical distribution platform connecting retailers with trusted suppliers across Bihar, UP, Jharkhand, and Odisha.
              </p>
              <div className="flex space-x-4">
                <a 
                  href="tel:+918409725206" 
                  className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-110 cursor-pointer"
                  title="Call us"
                >
                  <Phone className="w-4 h-4 text-white" />
                </a>
                <a 
                  href="mailto:automation@agorich.com" 
                  className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-110 cursor-pointer"
                  title="Email us"
                >
                  <Mail className="w-4 h-4 text-white" />
                </a>
                <a 
                  href="https://wa.me/918409725206" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-110 cursor-pointer"
                  title="WhatsApp us"
                >
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 text-white">{t("footer.services")}</h3>
              <ul className="space-y-2 text-white/70">
                <li>
                  <a href="#services" className="hover:text-white transition-colors duration-300 cursor-pointer">
                    B2B Distribution
                  </a>
                </li>
                <li>
                  <a href="#delivery" className="hover:text-white transition-colors duration-300 cursor-pointer">
                    {t("features.doorstep")}
                  </a>
                </li>
                <li>
                  <a href="#inventory" className="hover:text-white transition-colors duration-300 cursor-pointer">
                    Inventory Management
                  </a>
                </li>
                <li>
                  <a href="#financial" className="hover:text-white transition-colors duration-300 cursor-pointer">
                    Financial Services
                  </a>
                </li>
                <li>
                  <a href="#referrals" className="hover:text-white transition-colors duration-300 cursor-pointer">
                    Referral Program
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 text-white">{t("footer.support")}</h3>
              <ul className="space-y-2 text-white/70">
                <li>
                  <a href="/support" className="hover:text-white transition-colors duration-300 cursor-pointer">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="mailto:automation@agorich.com" className="hover:text-white transition-colors duration-300 cursor-pointer">
                    {t("footer.contact")}
                  </a>
                </li>
                <li>
                  <a href="/docs" className="hover:text-white transition-colors duration-300 cursor-pointer">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="/training" className="hover:text-white transition-colors duration-300 cursor-pointer">
                    Training
                  </a>
                </li>
                <li>
                  <a href="/faq" className="hover:text-white transition-colors duration-300 cursor-pointer">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4 text-white">{t("footer.contact")}</h3>
              <div className="space-y-2 text-white/70">
                <div className="flex items-start">
                  <MapPin className="w-4 h-4 mr-2 text-cyan-400 mt-1 flex-shrink-0" />
                  <div>
                    <p>2, Bhushan market, Baruraj thana chowk</p>
                    <p>Baruraj, motipur, muzaffarpur</p>
                    <p>MUZAFFARPUR, BIHAR - 843132</p>
                    <p className="text-sm text-white/50 mt-1">Serving: Bihar, UP, Jharkhand, Odisha</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-cyan-400" />
                  <a href="tel:+918409725206" className="hover:text-white transition-colors duration-300">
                    +91 8409725206
                  </a>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-cyan-400" />
                  <a href="mailto:automation@agorich.com" className="hover:text-white transition-colors duration-300">
                    automation@agorich.com
                  </a>
                </div>
                <div className="flex items-start">
                  <svg className="w-4 h-4 mr-2 text-cyan-400 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <div>
                    <p className="text-sm">GSTIN: 04AAKCD0849F1ZU</p>
                    <p className="text-sm">DL.No: WLF21B2023CH0002</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center text-white/60 text-sm">
              <p>&copy; 2024 Agorich Pharma. All rights reserved.</p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="/privacy" className="hover:text-white transition-colors duration-300">
                  {t("footer.privacy")}
                </a>
                <a href="/terms" className="hover:text-white transition-colors duration-300">
                  {t("footer.terms")}
                </a>
                <a href="/refund" className="hover:text-white transition-colors duration-300">
                  {t("footer.refund")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
