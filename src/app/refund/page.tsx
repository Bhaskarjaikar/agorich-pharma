'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock, Package, CreditCard, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <Link 
              href="/" 
              className="inline-flex items-center text-white/80 hover:text-white transition-colors duration-300 mb-8"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            
            <div className="flex items-center justify-center mb-6">
              <div className="relative group">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-blue-500 to-purple-500 animate-spin" style={{animationDuration: '3s'}}></div>
                  <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
                    <Image 
                      src="/agorich-logo.png" 
                      alt="Agorich Logo" 
                      width={56} 
                      height={56}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Refund Policy
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Our commitment to your satisfaction with clear and fair refund procedures.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl p-8 md:p-12"
        >
          <div className="prose prose-lg max-w-none">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
                <RefreshCw className="w-8 h-8 text-white" />
              </div>
              <p className="text-gray-600 text-lg">
                <strong>Effective Date:</strong> January 1, 2024<br />
                <strong>Last Updated:</strong> January 1, 2024
              </p>
            </div>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
                  Eligible for Refund
                </h2>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">We provide refunds for:</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Products damaged during shipping</li>
                    <li>Wrong products delivered</li>
                    <li>Products with manufacturing defects</li>
                    <li>Expired products (if expiry date was not clearly visible)</li>
                    <li>Products not matching the description</li>
                    <li>Duplicate orders placed by mistake</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <XCircle className="w-6 h-6 mr-3 text-red-600" />
                  Not Eligible for Refund
                </h2>
                <div className="bg-red-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">We cannot provide refunds for:</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Products opened or used after delivery</li>
                    <li>Change of mind or no longer needed</li>
                    <li>Products stored incorrectly by the customer</li>
                    <li>Orders cancelled after 24 hours of placement</li>
                    <li>Custom or special order products</li>
                    <li>Products damaged due to improper handling</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <Clock className="w-6 h-6 mr-3 text-blue-600" />
                  Refund Timeline
                </h2>
                <div className="bg-blue-50 p-6 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Return Request</h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-700">
                        <li>Submit within 7 days of delivery</li>
                        <li>Contact our support team</li>
                        <li>Provide order number and reason</li>
                        <li>Upload photos if applicable</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Processing Time</h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-700">
                        <li>Review: 1-2 business days</li>
                        <li>Pickup: 2-3 business days</li>
                        <li>Refund: 5-7 business days</li>
                        <li>Total: 8-12 business days</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <Package className="w-6 h-6 mr-3 text-purple-600" />
                  Return Process
                </h2>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Contact Support</h3>
                        <p className="text-gray-700">Email automation@agorich.com or call +91 8409725206</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Get Return Authorization</h3>
                        <p className="text-gray-700">We'll provide a Return Authorization Number (RAN)</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Package Items</h3>
                        <p className="text-gray-700">Pack items in original packaging with RAN clearly visible</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Schedule Pickup</h3>
                        <p className="text-gray-700">We'll arrange pickup or provide return shipping label</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-6 h-6 mr-3 text-orange-600" />
                  Refund Methods
                </h2>
                <div className="bg-orange-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Refunds will be processed to:</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                    <li>Original payment method (credit/debit card)</li>
                    <li>Bank account (for bank transfer payments)</li>
                    <li>Store credit (if requested by customer)</li>
                  </ul>
                  
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-gray-700">
                          <strong>Note:</strong> Refunds to credit/debit cards may take 5-10 business days to appear on your statement, depending on your bank's processing time.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Special Cases
                </h2>
                <div className="bg-indigo-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Cold Chain Products</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                    <li>Immediate replacement for temperature excursions</li>
                    <li>No questions asked policy for cold chain violations</li>
                    <li>Priority processing for temperature-sensitive products</li>
                  </ul>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 mt-6">Bulk Orders</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>Partial refunds available for bulk orders</li>
                    <li>Minimum quantity requirements for returns</li>
                    <li>Special handling for large volume returns</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Contact Information
                </h2>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-gray-700 mb-4">
                    For refund requests or questions about this policy, please contact us:
                  </p>
                  <div className="space-y-2 text-gray-700">
                    <p><strong>Email:</strong> automation@agorich.com</p>
                    <p><strong>Phone:</strong> +91 8409725206</p>
                    <p><strong>Business Hours:</strong> Monday to Saturday, 9:00 AM - 6:00 PM</p>
                    <p><strong>Address:</strong> 2, Bhushan market, Baruraj thana chowk, Baruraj, motipur, muzaffarpur, MUZAFFARPUR, BIHAR - 843132</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-12 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Customer Satisfaction Guarantee</h3>
                <p className="text-gray-700">
                  We are committed to your satisfaction. If you're not happy with your purchase, 
                  we'll work with you to make it right.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
