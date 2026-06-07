'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Shield, Eye, Lock, Database, Users, FileText } from '@phosphor-icons/react'
import Link from 'next/link'
import Image from 'next/image'

export default function PrivacyPolicy() {
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
              Privacy Policy
            </h1>
            <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
              Your privacy is important to us. Learn how we collect, use, and protect your information.
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
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <p className="text-muted-foreground text-lg">
                <strong>Effective Date:</strong> January 1, 2024<br />
                <strong>Last Updated:</strong> January 1, 2024
              </p>
            </div>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <Eye className="w-6 h-6 mr-3 text-primary" />
                  1. Information We Collect
                </h2>
                <div className="bg-primary/10 dark:bg-primary/20 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-foreground mb-3">Personal Information</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Name, email address, and contact information</li>
                    <li>Business registration details and GSTIN</li>
                    <li>Pharmacy license information</li>
                    <li>Billing and shipping addresses</li>
                    <li>Payment information (processed securely through third-party providers)</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <Database className="w-6 h-6 mr-3 text-purple-500 dark:text-purple-400" />
                  2. How We Use Your Information
                </h2>
                <div className="bg-purple-500/10 dark:bg-purple-950/30 p-6 rounded-lg">
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Process and fulfill your pharmaceutical orders</li>
                    <li>Provide customer support and technical assistance</li>
                    <li>Send important updates about your account and orders</li>
                    <li>Improve our platform and develop new features</li>
                    <li>Comply with pharmaceutical regulations and legal requirements</li>
                    <li>Prevent fraud and ensure platform security</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <Lock className="w-6 h-6 mr-3 text-green-600 dark:text-green-400" />
                  3. Data Security
                </h2>
                <div className="bg-green-500/10 dark:bg-green-950/30 p-6 rounded-lg">
                  <p className="text-muted-foreground mb-4">
                    We implement industry-standard security measures to protect your information:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>SSL encryption for all data transmission</li>
                    <li>Secure servers with regular security updates</li>
                    <li>Access controls and authentication protocols</li>
                    <li>Regular security audits and monitoring</li>
                    <li>Compliance with pharmaceutical data protection standards</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <Users className="w-6 h-6 mr-3 text-orange-500 dark:text-orange-400" />
                  4. Information Sharing
                </h2>
                <div className="bg-orange-500/10 dark:bg-orange-950/30 p-6 rounded-lg">
                  <p className="text-muted-foreground mb-4">
                    We do not sell your personal information. We may share information only in these circumstances:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>With pharmaceutical suppliers to fulfill your orders</li>
                    <li>With payment processors for transaction processing</li>
                    <li>With shipping partners for delivery coordination</li>
                    <li>When required by law or regulatory authorities</li>
                    <li>To protect our rights and prevent fraud</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center">
                  <FileText className="w-6 h-6 mr-3 text-indigo-500 dark:text-indigo-400" />
                  5. Your Rights
                </h2>
                <div className="bg-indigo-500/10 dark:bg-indigo-950/30 p-6 rounded-lg">
                  <p className="text-muted-foreground mb-4">You have the right to:</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Access and review your personal information</li>
                    <li>Correct inaccurate or incomplete information</li>
                    <li>Request deletion of your account and data</li>
                    <li>Opt-out of marketing communications</li>
                    <li>Data portability (receive your data in a structured format)</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  6. Contact Information
                </h2>
                <div className="bg-muted p-6 rounded-lg">
                  <p className="text-muted-foreground mb-4">
                    If you have questions about this Privacy Policy or want to exercise your rights, please contact us:
                  </p>
                  <div className="space-y-2 text-muted-foreground">
                    <p><strong>Email:</strong> bhaskarjaikar.1@gmail.com</p>
                    <p><strong>Phone:</strong> +91 8409725206</p>
                    <p><strong>Address:</strong> At + Vill + PO + PS: Baruraj Thana Chowk, Block: Motipur, Muzaffarpur, Bihar - 843111</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-12 p-6 bg-gradient-to-r from-primary/10 to-purple-500/10 dark:from-primary/20 dark:to-purple-950/30 rounded-lg border border-primary/20">
              <p className="text-foreground text-center">
                <strong>Note:</strong> This Privacy Policy may be updated from time to time.
                We will notify you of any significant changes via email or through our platform.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
