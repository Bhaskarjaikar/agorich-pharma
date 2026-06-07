'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Shield, Eye, Lock, Database, Users, FileText, Star, CheckCircle, Heart, Truck, Phone, Sun, Moon, Globe, Flask } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export default function ValuesPage() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const values = [
    { icon: <CheckCircle className="w-6 h-6" />, title: 'Patient First', desc: 'Every decision starts with what is best for the patient.' },
    { icon: <Heart className="w-6 h-6" />, title: 'Quality Above All', desc: 'Uncompromising standards in every medicine we make.' },
    { icon: <Star className="w-6 h-6" />, title: 'Affordable Excellence', desc: 'World-class medicines at prices every family can afford.' },
    { icon: <Globe className="w-6 h-6" />, title: 'Reach Everyone', desc: 'From metros to villages, we make medicines accessible to all.' },
    { icon: <Flask className="w-6 h-6" weight="fill" />, title: 'Innovation', desc: 'Continuous research to address India\'s health challenges.' },
    { icon: <Shield className="w-6 h-6" />, title: 'Integrity', desc: 'Honest pricing, transparent practices, trusted by doctors.' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card/95 dark:bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium text-sm">Back</span>
          </Link>
          <h1 className="font-bold text-foreground">Core Values</h1>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors">
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
              <Star className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              What We Stand For
            </h1>
            <p className="text-lg text-muted-foreground">
              The principles that guide everything we do
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values Grid */}
      <section className="pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-4">
            {values.map((value, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="bg-card dark:bg-card rounded-2xl p-6 shadow-sm border border-border">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                  {value.icon}
                </div>
                <h3 className="font-bold text-foreground mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Additional Content */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-6 bg-card dark:bg-card rounded-2xl p-6 sm:p-8 shadow-sm border border-border">
            <h2 className="text-xl font-bold text-foreground mb-4">The Agorich Way</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              These values are not just words on a page — they guide every decision we make,
              from the research lab to the manufacturing floor to the pharmacy counter.
            </p>
            <div className="space-y-3">
              {[{ title: 'Patient Safety First', desc: 'Every medicine undergoes rigorous quality testing before reaching patients.' }, { title: 'Affordability by Design', desc: 'We engineer our processes to keep costs low without compromising quality.' }, { title: 'Accessibility for All', desc: 'Our distribution reaches 25+ states, ensuring no patient is left behind.' }, { title: 'Doctor Trust', desc: 'We build relationships with healthcare professionals based on proven efficacy.' }].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center pt-8">
            <Link href="/">
              <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-8 py-5 rounded-full font-semibold">
                <ArrowLeft className="mr-2 w-5 h-5" />Back to Home
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
