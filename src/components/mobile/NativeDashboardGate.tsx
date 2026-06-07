'use client';

import { useMemo } from 'react';
import type React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  ChartLine,
  ClockCountdown,
  FileText,
  House,
  Megaphone,
  Package,
  PlusCircle,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from '@phosphor-icons/react';
import { isNativeApp } from '@/lib/capacitor';

type Role = 'retailer' | 'distributor' | 'logistic' | 'admin';

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const NAV: Record<Role, NavItem[]> = {
  retailer: [
    { label: 'Home', href: '/retailer', icon: House },
    { label: 'Order', href: '/retailer/create-invoice', icon: PlusCircle },
    { label: 'Invoices', href: '/retailer/invoices', icon: FileText },
    { label: 'Cart', href: '/retailer/checkout', icon: ShoppingCart },
  ],
  distributor: [
    { label: 'Home', href: '/distributor', icon: House },
    { label: 'Orders', href: '/distributor/routed-orders', icon: Package },
    { label: 'Invoices', href: '/distributor/invoices', icon: FileText },
    { label: 'Payables', href: '/distributor/payables', icon: Wallet },
  ],
  logistic: [
    { label: 'Home', href: '/logistic', icon: House },
    { label: 'Routes', href: '/logistic/routes', icon: Truck },
    { label: 'Deliveries', href: '/logistic/deliveries', icon: Package },
    { label: 'History', href: '/logistic/history', icon: ClockCountdown },
  ],
  admin: [
    { label: 'Home', href: '/admin', icon: ChartLine },
    { label: 'Retailers', href: '/admin/retailers', icon: Users },
    { label: 'Intel', href: '/admin/command-center', icon: Megaphone },
    { label: 'Alerts', href: '/admin/alerts', icon: Bell },
  ],
};

function getRoleFromPathname(pathname: string): Role | null {
  if (pathname.startsWith('/retailer')) return 'retailer';
  if (pathname.startsWith('/distributor')) return 'distributor';
  if (pathname.startsWith('/logistic')) return 'logistic';
  if (pathname.startsWith('/admin')) return 'admin';
  return null;
}

function isActiveHref(href: string, pathname: string): boolean {
  if (href === `/${pathname.split('/')[1]}`) return pathname === href;
  return pathname.startsWith(href);
}

export function NativeDashboardGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const nativePlatform = isNativeApp();

  const navItems = useMemo(() => {
    const role = getRoleFromPathname(pathname);
    return role ? NAV[role] : [];
  }, [pathname]);

  if (!nativePlatform) return children;

  return (
    <div data-native-dashboard className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <style jsx global>{`
        [data-native-dashboard] [data-dashboard-shell] {
          display: none !important;
        }
      `}</style>

      <main
        className="w-full"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 88px)',
        }}
      >
        {children}
      </main>

      {navItems.length > 0 && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 dark:bg-slate-900/95 dark:border-slate-800 z-50">
          <div
            className="flex items-center justify-around h-[72px] px-2"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {navItems.map((item) => {
              const active = isActiveHref(item.href, pathname);
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl transition-all duration-200 ${
                    active
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon
                    weight={active ? 'fill' : 'regular'}
                    className="w-6 h-6"
                  />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export default NativeDashboardGate;
