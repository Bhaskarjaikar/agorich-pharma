"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { Pill, FirstAid, Syringe, Heartbeat } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showLoader, setShowLoader] = useState(false)

  useEffect(() => {
    // Start transition immediately
    setIsTransitioning(true)
    setShowLoader(true)
    
    // Quick transition - 300ms instead of 400ms
    const loaderTimer = setTimeout(() => {
      setShowLoader(false)
      setIsTransitioning(false)
    }, 300)
    
    return () => clearTimeout(loaderTimer)
  }, [pathname])

  return (
    <>
      <AnimatePresence mode="wait">
        {/* Transition Overlay */}
        {showLoader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          >
            <div className="relative">
              {/* Main spinning pill */}
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  rotate: { duration: 1, ease: "linear", repeat: Infinity },
                  scale: { duration: 0.5, repeat: Infinity, repeatType: "reverse" }
                }}
                className="relative z-10"
              >
                <Pill className="w-20 h-20 text-amber-500" />
              </motion.div>

              {/* Floating medical icons */}
              <motion.div
                animate={{
                  rotate: [0, -360],
                }}
                transition={{
                  rotate: { duration: 2, ease: "linear", repeat: Infinity }
                }}
                className="absolute -top-8 -left-8"
              >
                <FirstAid className="w-8 h-8 text-blue-400" />
              </motion.div>

              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  rotate: { duration: 1.5, ease: "linear", repeat: Infinity }
                }}
                className="absolute -bottom-8 -right-8"
              >
                <Syringe className="w-8 h-8 text-green-400" />
              </motion.div>

              <motion.div
                animate={{
                  rotate: [0, -360],
                }}
                transition={{
                  rotate: { duration: 1.8, ease: "linear", repeat: Infinity }
                }}
                className="absolute -top-6 -right-6"
              >
                <Heartbeat className="w-6 h-6 text-red-400" />
              </motion.div>

              {/* Pulsing ring effect */}
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 rounded-full border-2 border-amber-500/30 -m-4"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content */}
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </>
  )
}
