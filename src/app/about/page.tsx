'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart, Medal, Globe, Users, Plant, Sun, Moon, Factory, Flask, Target, UsersThree } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export default function AboutPage() {
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
            <ArrowLeft className="w-5 h-5" weight="bold" />
            <span className="font-medium text-sm">Back</span>
          </Link>
          <h1 className="font-bold text-slate-900 dark:text-white">About Us</h1>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" weight="fill" /> : <Moon className="w-5 h-5 text-slate-600" weight="fill" />}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
              <Plant className="w-10 h-10 text-blue-700 dark:text-blue-400" weight="fill" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              Agorich Pharma
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Caring for Life. Every Life. Always.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="pb-16 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Our Story</h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              Agorich Pharma was founded with a simple yet powerful belief: <em className="text-blue-700 dark:text-blue-400 font-medium">good health is the foundation of a good life</em>. 
              Since our inception, we have dedicated ourselves to manufacturing quality medicines that reach every corner of India.
            </p>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              From a small facility to a trusted name in healthcare, our journey has been driven by one purpose — 
              to make quality healthcare accessible to every Indian family, regardless of where they live or what they earn.
            </p>
          </motion.div>

          {/* Manufacturing */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Factory className="w-6 h-6 text-blue-700 dark:text-blue-400" weight="fill" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">World-Class Manufacturing</h2>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
              Our state-of-the-art manufacturing facilities follow the highest international standards. 
              Every Agorich medicine is produced in GMP-certified facilities with rigorous quality control at every step.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">ISO</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Certified</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">GMP</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Compliant</div>
              </div>
            </div>
          </motion.div>

          {/* Research */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Flask className="w-6 h-6 text-blue-700 dark:text-blue-400" weight="fill" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Innovation & Research</h2>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Our R&D team works tirelessly to develop effective formulations that address the real health needs of India. 
              From chronic disease management to everyday wellness, we invest in science that serves the people.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[{ icon: <UsersThree className="w-5 h-5" weight="fill" />, val: '5Cr+', label: 'Patients' }, { icon: <Medal className="w-5 h-5" weight="fill" />, val: '15+', label: 'Years' }, { icon: <Globe className="w-5 h-5" weight="fill" />, val: '25+', label: 'Therapy Areas' }, { icon: <Heart className="w-5 h-5" weight="fill" />, val: '500+', label: 'Products' }].map((stat, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl p-4 text-center border border-slate-200 dark:border-slate-700">
                <div className="w-10 h-10 mx-auto mb-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-700 dark:text-blue-400">{stat.icon}</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">{stat.val}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Promise */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-blue-700 dark:bg-blue-800 rounded-2xl p-6 sm:p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6" />
              <h2 className="text-xl font-bold">Our Promise</h2>
            </div>
            <p className="text-white/90 leading-relaxed">
              To every family that trusts Agorich — we promise to never compromise on quality, 
              to always keep our medicines affordable, and to stand by you in your journey to better health.
            </p>
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
