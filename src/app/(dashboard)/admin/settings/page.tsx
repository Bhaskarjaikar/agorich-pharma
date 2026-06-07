'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ArrowLeft, Bell, ChartLine, CurrencyInr, FileText, Users } from '@phosphor-icons/react'

export default function AdminSettingsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Admin Settings</h1>
              <div className="text-xs text-muted-foreground">Quick tools and shortcuts</div>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="border-b bg-muted/40">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <ChartLine className="w-5 h-5" /> Dashboard
              </CardTitle>
              <CardDescription className="text-muted-foreground">Admin home and intelligence</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3">
              <Link href="/admin">
                <Button className="w-full justify-start" variant="outline">
                  <ChartLine className="w-4 h-4 mr-2" /> Open Admin Dashboard
                </Button>
              </Link>
              <Link href="/admin/command-center">
                <Button className="w-full justify-start" variant="outline">
                  <ChartLine className="w-4 h-4 mr-2" /> Open Command Center
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="border-b bg-muted/40">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Bell className="w-5 h-5" /> Notifications
              </CardTitle>
              <CardDescription className="text-muted-foreground">Alerts feed and broadcast center</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3">
              <Link href="/admin/alerts">
                <Button className="w-full justify-start" variant="outline">
                  <Bell className="w-4 h-4 mr-2" /> View Alerts
                </Button>
              </Link>
              <Link href="/admin/notifications">
                <Button className="w-full justify-start" variant="outline">
                  <Bell className="w-4 h-4 mr-2" /> Notification Center
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="border-b bg-muted/40">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Users className="w-5 h-5" /> Retailers
              </CardTitle>
              <CardDescription className="text-muted-foreground">Retailer overview and drill-down</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3">
              <Link href="/admin/retailers">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="w-4 h-4 mr-2" /> Retailer Summary
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="border-b bg-muted/40">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <CurrencyInr className="w-5 h-5" /> Finance
              </CardTitle>
              <CardDescription className="text-muted-foreground">Invoices and accounts receivable</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-3">
              <Link href="/admin/accounts-receivable">
                <Button className="w-full justify-start" variant="outline">
                  <CurrencyInr className="w-4 h-4 mr-2" /> Accounts Receivable
                </Button>
              </Link>
              <Link href="/admin/invoice-flow">
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="w-4 h-4 mr-2" /> Invoice Flow
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

