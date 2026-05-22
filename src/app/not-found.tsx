'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MagnifyingGlass, House } from '@phosphor-icons/react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <MagnifyingGlass className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Page not found
        </h2>
        <p className="text-gray-600 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/">
          <Button className="gap-2">
            <House className="w-4 h-4" />
            Back to home
          </Button>
        </Link>
      </div>
    </div>
  )
}
