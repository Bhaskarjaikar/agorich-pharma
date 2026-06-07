'use client'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  House,
  Package,
  FileText
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface InvoiceNavigationProps {
  darkMode?: boolean
}

export function InvoiceNavigation({ darkMode = false }: InvoiceNavigationProps) {
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="sticky top-[60px] z-30 w-full"
    >
      <div className="flex flex-row gap-2 sm:gap-4 p-2 sm:p-3 rounded-b-3xl shadow-2xl backdrop-blur-xl border-2 overflow-x-auto bg-card/95">
        <Button
          variant="outline"
          className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
          onClick={() => router.push('/retailer')}
        >
          <House className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
          <span className="text-sm sm:text-base font-medium">Dashboard</span>
        </Button>

        <Button
          className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-xl shadow-emerald-500/50 ring-2 ring-emerald-400/60 transition-all duration-300 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white scale-[1.02] hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/60 hover:scale-[1.03]"
          onClick={() => router.push('/retailer/create-invoice')}
        >
          <Package className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
          <span className="text-sm sm:text-base font-semibold">Order Now</span>
        </Button>

        <Button
          variant="outline"
          className="flex-1 h-12 sm:h-14 flex flex-row items-center justify-center gap-2 sm:gap-3 shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl hover:scale-[1.02]"
          onClick={() => router.push('/retailer/invoices')}
        >
          <FileText className="w-5 h-5 sm:w-6 sm:h-6" weight="fill" />
          <span className="text-sm sm:text-base font-medium">Invoices</span>
        </Button>

        <ThemeToggle />
      </div>
    </motion.div>
  )
}