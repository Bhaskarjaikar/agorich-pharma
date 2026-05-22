'use client'

import { useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Download, ShareNetwork } from '@phosphor-icons/react'

const WEBSITE_URL = 'https://www.agorich.com/'

export default function QRCodePage() {
  const qrRef = useRef<SVGSVGElement>(null)
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    if (!qrRef.current) return
    
    const svg = qrRef.current
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = document.createElement('img')
    
    img.onload = () => {
      canvas.width = 1024
      canvas.height = 1024
      if (ctx) {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, 1024, 1024)
        
        const pngFile = canvas.toDataURL('image/png')
        const downloadLink = document.createElement('a')
        downloadLink.download = 'agorich-qr-code.png'
        downloadLink.href = pngFile
        downloadLink.click()
      }
    }
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(WEBSITE_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative w-20 h-20">
            <Image
              src="/agorich-logo.png"
              alt="Agorich Pharma"
              fill
              className="object-contain"
              priority
              sizes="80px"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Agorich Pharma
        </h1>
        <p className="text-slate-500 mb-8">
          Scan to visit our website
        </p>

        {/* QR Code */}
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-white rounded-2xl border-2 border-slate-100">
            <QRCodeSVG
              ref={qrRef}
              value={WEBSITE_URL}
              size={280}
              level="H"
              includeMargin={false}
              imageSettings={{
                src: '/agorich-logo.png',
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>
        </div>

        {/* URL Display */}
        <div 
          className="bg-slate-50 rounded-xl p-3 mb-6 cursor-pointer hover:bg-slate-100 transition-colors"
          onClick={handleCopyLink}
        >
          <p className="text-sm text-slate-600 font-medium truncate">
            {WEBSITE_URL}
          </p>
          {copied && (
            <p className="text-xs text-green-600 mt-1">Link copied!</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleDownload}
            className="flex-1 gap-2"
            size="lg"
          >
            <Download className="w-5 h-5" />
            Download QR
          </Button>
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="flex-1 gap-2"
            size="lg"
          >
            <ShareNetwork className="w-5 h-5" />
            Copy Link
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-400 mt-6">
          Point your camera at the QR code to visit our website
        </p>
      </div>
    </div>
  )
}
