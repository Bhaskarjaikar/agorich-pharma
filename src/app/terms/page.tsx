'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Shield, Eye, Lock, Database, Users, FileText, Warning, CheckCircle, XCircle, Scales } from '@phosphor-icons/react'
import Link from 'next/link'
import Image from 'next/image'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-purple-600 to-indigo-700 text-primary-foreground py-16 relative overflow-hidden">
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
              className="inline-flex items-center text-primary-foreground/80 hover:text-primary-foreground transition-colors duration-300 mb-8"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            
            <div className="flex items-center justify-center mb-6">
              <div className="relative group">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-blue-500 to-purple-500 animate-spin" style={{animationDuration: '3s'}}></div>
                  <div className="absolute inset-1 bg-card rounded-full flex items-center justify-center">
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
              Terms of Service
            </h1>
            <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
              Please read these terms carefully before using our pharmaceutical distribution platform.
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
          className="bg-card rounded-2xl shadow-xl p-8 md:p-12"
        >
          <div className="prose prose-lg max-w-none">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
                <Scales className="w-8 h-8 text-primary-foreground" weight="fill" />
              </div>
              <p className="text-muted-foreground text-lg">
                <strong>Effective Date:</strong> January 1, 2024<br />
                <strong>Last Updated:</strong> January 1, 2024
              </p>
            </div>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <FileText className="w-6 h-6 mr-3 text-primary" />
                  1. Acceptance of Terms
                </h2>
                <div className="bg-primary/10 p-6 rounded-lg">
                  <p className="text-foreground mb-4">
                    By accessing and using Agorich Pharma's B2B distribution platform, you agree to be bound by these Terms of Service and all applicable laws and regulations.
                  </p>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-success mt-1 flex-shrink-0" />
                    <p className="text-foreground">You must be a licensed pharmaceutical retailer or distributor</p>
                  </div>
                  <div className="flex items-start space-x-3 mt-2">
                    <CheckCircle className="w-5 h-5 text-success mt-1 flex-shrink-0" />
                    <p className="text-foreground">You must provide accurate business and license information</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <Users className="w-6 h-6 mr-3 text-purple-500 dark:text-purple-400" />
                  2. User Accounts and Registration
                </h2>
                <div className="bg-purple-500/10 dark:bg-purple-950/30 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-foreground mb-3">Account Requirements</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                    <li>Valid pharmaceutical retail license</li>
                    <li>GST registration number</li>
                    <li>Accurate business information</li>
                    <li>Valid contact information</li>
                  </ul>
                  <div className="bg-warning/10 dark:bg-warning/20 border border-warning/20 p-4 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Warning className="w-5 h-5 text-warning mt-1 flex-shrink-0" weight="fill" />
                      <p className="text-foreground">
                        <strong>Important:</strong> Providing false information may result in immediate account suspension.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <Shield className="w-6 h-6 mr-3 text-green-600 dark:text-green-400" />
                  3. Pharmaceutical Compliance
                </h2>
                <div className="bg-green-500/10 dark:bg-green-950/30 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-foreground mb-3">Regulatory Requirements</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                    <li>All products must be properly licensed and approved</li>
                    <li>Storage and handling must comply with pharmaceutical standards</li>
                    <li>Expiry dates must be clearly visible and respected</li>
                    <li>Cold chain requirements must be maintained</li>
                  </ul>
                  <div className="bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 p-4 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <XCircle className="w-5 h-5 text-destructive mt-1 flex-shrink-0" />
                      <p className="text-foreground">
                        <strong>Prohibited:</strong> Sale of expired, counterfeit, or unlicensed pharmaceutical products.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  4. Orders and Payments
                </h2>
                <div className="bg-orange-500/10 dark:bg-orange-950/30 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-foreground mb-3">Order Processing</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                    <li>Orders are subject to availability and verification</li>
                    <li>Payment must be completed before order processing</li>
                    <li>Minimum order quantities may apply</li>
                    <li>Delivery timelines are estimates and not guaranteed</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-foreground mb-3 mt-6">Payment Terms</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Net 30 days payment terms for approved accounts</li>
                    <li>Credit card payments processed immediately</li>
                    <li>Bank transfer payments may take 1-3 business days</li>
                    <li>Late payments may incur additional charges</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  5. Delivery and Returns
                </h2>
                <div className="bg-indigo-500/10 dark:bg-indigo-950/30 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-foreground mb-3">Delivery Policy</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                    <li>Free delivery for orders above ₹10,000</li>
                    <li>Delivery charges apply for smaller orders</li>
                    <li>Delivery available in Bihar, UP, Jharkhand, and Odisha</li>
                    <li>Signature required upon delivery</li>
                  </ul>

                  <h3 className="text-lg font-semibold text-foreground mb-3 mt-6">Return Policy</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Returns accepted within 7 days of delivery</li>
                    <li>Products must be in original packaging and unopened</li>
                    <li>Expired or damaged products will be replaced</li>
                    <li>Return shipping charges may apply</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  6. Limitation of Liability
                </h2>
                <div className="bg-muted p-6 rounded-lg">
                  <p className="text-muted-foreground mb-4">
                    Agorich Pharma shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our platform.
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Maximum liability limited to the value of the specific order</li>
                    <li>No liability for delays in delivery due to circumstances beyond our control</li>
                    <li>Users responsible for proper storage and handling of products</li>
                    <li>Compliance with local pharmaceutical regulations is user's responsibility</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  7. Termination
                </h2>
                <div className="bg-destructive/10 dark:bg-destructive/20 p-6 rounded-lg">
                  <p className="text-muted-foreground mb-4">
                    We reserve the right to suspend or terminate accounts for violations of these terms:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Providing false or misleading information</li>
                    <li>Violation of pharmaceutical regulations</li>
                    <li>Non-payment or repeated payment failures</li>
                    <li>Fraudulent or suspicious activity</li>
                    <li>Violation of intellectual property rights</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  8. Contact Information
                </h2>
                <div className="bg-primary/10 dark:bg-primary/20 p-6 rounded-lg">
                  <p className="text-muted-foreground mb-4">
                    For questions about these Terms of Service, please contact us:
                  </p>
                  <div className="space-y-2 text-muted-foreground">
                    <p><strong>Email:</strong> bhaskarjaikar.1@gmail.com</p>
                    <p><strong>Phone:</strong> +91 8409725206</p>
                    <p><strong>Address:</strong> At + Vill + PO + PS: Baruraj Thana Chowk, Block: Motipur, Muzaffarpur, Bihar - 843111</p>
                    <p><strong>GSTIN:</strong> 04AAKCD0849F1ZU</p>
                    <p><strong>License:</strong> WLF20B2026BR00059, WLF21B2026BR00058</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-12 p-6 bg-gradient-to-r from-primary/10 to-purple-500/10 dark:from-primary/20 dark:to-purple-950/30 rounded-lg border border-primary/20">
              <p className="text-foreground text-center">
                <strong>Note:</strong> These Terms of Service may be updated from time to time.
                Continued use of our platform constitutes acceptance of any changes.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
