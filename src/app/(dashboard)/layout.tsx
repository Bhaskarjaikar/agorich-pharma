import type { ReactNode } from 'react'
import NativeDashboardGate from '@/components/mobile/NativeDashboardGate'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <NativeDashboardGate>{children}</NativeDashboardGate>
}

