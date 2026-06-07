'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  House,
  Package,
  FileText,
  Truck,
  Users,
  Gear,
  SignOut,
  ChartLine,
  Wallet,
  Bell,
  List,
  X,
  ShoppingCart,
  PlusCircle,
  ClockCountdown,
  ArrowLeft,
  CurrencyInr,
  Buildings,
  Megaphone
} from '@phosphor-icons/react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  activeIcon?: React.ElementType
}

interface RoleConfig {
  role: 'retailer' | 'distributor' | 'logistic' | 'admin'
  navItems: NavItem[]
  secondaryItems: NavItem[]
}

const RETAILER_NAV: RoleConfig = {
  role: 'retailer',
  navItems: [
    { label: 'Home', href: '/retailer', icon: House },
    { label: 'Order', href: '/retailer/create-invoice', icon: PlusCircle },
    { label: 'Invoices', href: '/retailer/invoices', icon: FileText },
    { label: 'Cart', href: '/retailer/checkout', icon: ShoppingCart, activeIcon: ShoppingCart },
  ],
  secondaryItems: [
    { label: 'Profile', href: '/retailer/settings', icon: Gear },
    { label: 'Support', href: '/retailer/support', icon: Bell },
  ]
}

const DISTRIBUTOR_NAV: RoleConfig = {
  role: 'distributor',
  navItems: [
    { label: 'Dashboard', href: '/distributor', icon: House },
    { label: 'Orders', href: '/distributor/routed-orders', icon: Package },
    { label: 'Invoices', href: '/distributor/invoices', icon: FileText },
    { label: 'Settlements', href: '/distributor/payables', icon: Wallet },
  ],
  secondaryItems: [
    { label: 'Inventory', href: '/distributor/inventory', icon: Buildings },
    { label: 'Logistics', href: '/distributor/logistics', icon: Truck },
    { label: 'Settings', href: '/distributor/settings', icon: Gear },
  ]
}

const LOGISTIC_NAV: RoleConfig = {
  role: 'logistic',
  navItems: [
    { label: 'Dashboard', href: '/logistic', icon: House },
    { label: 'Routes', href: '/logistic/routes', icon: Truck },
    { label: 'Deliveries', href: '/logistic/deliveries', icon: Package },
    { label: 'History', href: '/logistic/history', icon: ClockCountdown },
  ],
  secondaryItems: [
    { label: 'Profile', href: '/logistic/settings', icon: Gear },
  ]
}

const ADMIN_NAV: RoleConfig = {
  role: 'admin',
  navItems: [
    { label: 'Dashboard', href: '/admin', icon: ChartLine },
    { label: 'Retailers', href: '/admin/retailers', icon: Users },
    { label: 'Intelligence', href: '/admin/command-center', icon: Megaphone },
    { label: 'Alerts', href: '/admin/alerts', icon: Bell },
  ],
  secondaryItems: [
    { label: 'Accounts', href: '/admin/accounts-receivable', icon: CurrencyInr },
    { label: 'Settings', href: '/admin/settings', icon: Gear },
  ]
}

function getNavConfig(pathname: string): RoleConfig {
  if (pathname.startsWith('/retailer')) return RETAILER_NAV
  if (pathname.startsWith('/distributor')) return DISTRIBUTOR_NAV
  if (pathname.startsWith('/logistic')) return LOGISTIC_NAV
  if (pathname.startsWith('/admin')) return ADMIN_NAV
  return RETAILER_NAV
}

function isActiveHref(href: string, pathname: string): boolean {
  if (href === `/${pathname.split('/')[1]}`) {
    return pathname === href
  }
  return pathname.startsWith(href)
}

interface DashboardShellProps {
  children: React.ReactNode
  userRole?: 'retailer' | 'distributor' | 'logistic' | 'admin'
}

export function DashboardShell({ children, userRole }: DashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navConfig = userRole
    ? { RETAILER_NAV, DISTRIBUTOR_NAV, LOGISTIC_NAV, ADMIN_NAV }[userRole.toUpperCase() + '_NAV']
    : getNavConfig(pathname)

  const config = navConfig || RETAILER_NAV

  const NavButton = ({ item, compact = false }: { item: NavItem; compact?: boolean }) => {
    const active = isActiveHref(item.href, pathname)
    const Icon = active && item.activeIcon ? item.activeIcon : item.icon

    return (
      <button
        onClick={() => router.push(item.href)}
        className={`
          flex flex-col items-center justify-center gap-1 transition-all duration-200
          ${compact ? 'w-16 h-16 rounded-2xl' : 'flex-1 h-14 rounded-xl'}
          ${active
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
          }
        `}
      >
        <Icon weight={active ? 'fill' : 'regular'} className="w-6 h-6" />
        <span className={`text-[10px] font-medium ${compact ? '' : 'hidden sm:block'}`}>
          {item.label}
        </span>
      </button>
    )
  }

  const SidebarItem = ({ item }: { item: NavItem }) => {
    const active = isActiveHref(item.href, pathname)
    const Icon = active && item.activeIcon ? item.activeIcon : item.icon

    return (
      <button
        onClick={() => {
          router.push(item.href)
          setSidebarOpen(false)
        }}
        className={`
          flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200
          ${active
            ? 'bg-emerald-500 text-white'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }
        `}
      >
        <Icon weight={active ? 'fill' : 'regular'} className="w-5 h-5" />
        <span className="font-medium">{item.label}</span>
        {active && (
          <motion.div
            layoutId="sidebar-indicator"
            className="ml-auto w-1.5 h-1.5 rounded-full bg-white"
          />
        )}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <aside data-dashboard-shell className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:bg-white lg:border-r lg:border-slate-200 lg:dark:bg-slate-900 lg:dark:border-slate-800 lg:z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <PlusCircle weight="fill" className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white">Agorich</h1>
            <p className="text-[10px] text-slate-500 capitalize">{config.role}</p>
          </div>
        </div>

        {/* Primary Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {config.navItems.map((item) => (
            <SidebarItem key={item.href} item={item} />
          ))}
        </nav>

        {/* Secondary Nav */}
        <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
          {config.secondaryItems.map((item) => (
            <SidebarItem key={item.href} item={item} />
          ))}
          <div className="pt-4 flex items-center gap-3 px-4">
            <ThemeToggle />
            <span className="text-sm text-slate-500">Dark Mode</span>
          </div>
        </div>

        {/* User */}
        <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <SignOut className="w-5 h-5" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header data-dashboard-shell className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-lg border-b border-slate-200 dark:bg-slate-900/95 dark:border-slate-800 z-40">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <PlusCircle weight="fill" className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-900 dark:text-white">Agorich</h1>
              <p className="text-[10px] text-slate-500 capitalize">{config.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/notifications')}
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Bell className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
            />
            <motion.aside
              data-dashboard-shell
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 z-50 flex flex-col"
            >
              {/* Logo */}
              <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                    <PlusCircle weight="fill" className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="font-bold text-slate-900 dark:text-white">Agorich</h1>
                    <p className="text-[10px] text-slate-500 capitalize">{config.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {config.navItems.map((item) => (
                  <SidebarItem key={item.href} item={item} />
                ))}
                <div className="my-4 border-t border-slate-200 dark:border-slate-800" />
                {config.secondaryItems.map((item) => (
                  <SidebarItem key={item.href} item={item} />
                ))}
              </nav>

              {/* User */}
              <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => router.push('/login')}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <SignOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:pl-64 pt-14 pb-24 lg:pb-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-lg border-t border-slate-200 dark:bg-slate-900/95 dark:border-slate-800 z-40 px-2 pb-safe">
        <div className="flex items-center justify-around h-full">
          {config.navItems.map((item) => (
            <NavButton key={item.href} item={item} />
          ))}
        </div>
      </nav>
    </div>
  )
}
