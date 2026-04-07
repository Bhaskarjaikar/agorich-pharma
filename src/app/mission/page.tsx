'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Target, Eye, Heart, Sun, Moon, CaretRight, Star, CheckCircle, Truck, Phone, Globe, Flask, Shield } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export default function MissionPage() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-slate-900' : 'bg-[#fafaf8]'}`}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium text-sm">Back</span>
          </Link>
          <h1 className="font-bold text-slate-900 dark:text-white">Our Mission</h1>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
              <Target className="w-10 h-10 text-blue-700 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              Mission & Vision
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              What drives us every day
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="pb-16 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Mission */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-700 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Our Mission</h2>
            </div>
            <div className="border-l-4 border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-r-xl p-4 mb-4">
              <p className="text-slate-800 dark:text-slate-200 italic text-lg" style={{ fontFamily: 'Georgia, serif' }}>
                &ldquo;To make quality healthcare accessible to every Indian family, in every town, in every home — so that no one has to choose between health and financial security.&rdquo;
              </p>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Our mission is rooted in the Indian reality. We believe that good health is not a privilege reserved for the few, 
              but a fundamental right of every citizen. Every Agorich medicine we manufacture carries this promise: 
              <em className="text-blue-700 dark:text-blue-400"> quality you can trust, at prices you can afford.</em>
            </p>
          </motion.div>

          {/* Vision */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-700 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Our Vision</h2>
            </div>
            <div className="border-l-4 border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-r-xl p-4 mb-4">
              <p className="text-slate-800 dark:text-slate-200 italic text-lg" style={{ fontFamily: 'Georgia, serif' }}>
                &ldquo;An India where every family is Rich in Health — where geography and income do not determine access to quality medicines.&rdquo;
              </p>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              We envision a future where a mother in a village has the same access to quality medicines as someone in a metro city. 
              Where the shopkeeper, the farmer, the teacher — everyone can afford the healthcare they deserve. 
              An India that is truly <em className="text-blue-700 dark:text-blue-400">Rich in Health</em>.
            </p>
          </motion.div>

          {/* Promise */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-blue-700 dark:bg-blue-800 rounded-2xl p-6 sm:p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="w-6 h-6" />
              <h2 className="text-xl font-bold">Our Promise</h2>
            </div>
            <ul className="space-y-3">
              {['Uncompromising quality in every medicine we make', 'Affordable pricing that respects every budget', 'Reaching the unreached — from metros to villages', 'Innovation that serves real Indian health needs', 'Rich in Health — for every family, everywhere'].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CaretRight className="w-3 h-3" weight="bold" />
                  </div>
                  <span className="text-white/90 text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center pt-4">
            <Link href="/">
              <Button className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-5 rounded-full font-semibold">
                <ArrowLeft className="mr-2 w-5 h-5" />Back to Home
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
