'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Phone, 
  Calendar, 
  FileText, 
  EyeSlash, 
  Camera, 
  X, 
  MapPin, 
  ArrowLeft, 
  Clock, 
  Shield, 
  CheckCircle, 
  Truck,
  CreditCard
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'

export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [formData, setFormData] = useState({
    deliveryAddress: '123 Main Street, Patna, Bihar 800001',
    contactPhone: '+91 8409725206',
    deliveryDate: '',
    paymentMethod: 'credit_period',
    orderNotes: ''
  })

  // MOCK DATA - Replace with cart data from application state
  // TODO: Wire orderItems to actual cart/order data
  const orderItems = [
    {
      id: '1',
      name: 'Paracetamol 500mg',
      manufacturer: 'Sun Pharma',
      quantity: 2,
      unitPrice: 80,
      totalPrice: 160,
      margin: 32
    },
    {
      id: '2',
      name: 'Amoxicillin 250mg',
      manufacturer: 'Cipla',
      quantity: 1,
      unitPrice: 60,
      totalPrice: 60,
      margin: 26
    },
    {
      id: '3',
      name: 'Omeprazole 20mg',
      manufacturer: 'Dr. Reddy\'s',
      quantity: 3,
      unitPrice: 70,
      totalPrice: 210,
      margin: 32
    }
  ]

  const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0)
  const totalMargin = orderItems.reduce((sum, item) => sum + (item.margin * item.quantity), 0)
  const gstAmount = subtotal * 0.18
  const totalAmount = subtotal + gstAmount

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handlePlaceOrder = async () => {
    setIsProcessing(true)
    
    // Simulate order processing
    setTimeout(() => {
      // Redirect to invoices with success flag
      window.location.href = '/distributor/invoices?order=success'
      setIsProcessing(false)
    }, 2000)
  }

  const steps = [
    { id: 1, title: 'Delivery Details', icon: MapPin },
    { id: 2, title: 'Payment Method', icon: CreditCard },
    { id: 3, title: 'Review & Confirm', icon: CheckCircle }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="border-b border-border bg-card/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/distributor/create-invoice" className="flex items-center text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Invoice
              </Link>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center space-x-3">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 via-blue-500 to-purple-500 animate-spin" style={{animationDuration: '3s'}}></div>
                  <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
                    <Image
                      src="/agorich-logo.png"
                      alt="Agorich Logo"
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Checkout</h1>
                  <p className="text-sm text-muted-foreground">Complete your pharmaceutical order</p>
                </div>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-400/30">
              <CheckCircle className="w-4 h-4 mr-1" />
              Secure Checkout
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                      currentStep >= step.id
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}>
                      <step.icon className="w-6 h-6" />
                    </div>
                    <span className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </span>
                    {index < steps.length - 1 && (
                      <div className={`absolute top-6 left-1/2 w-full h-0.5 ${
                        currentStep > step.id ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-muted'
                      }`} style={{width: 'calc(100% - 3rem)', marginLeft: '1.5rem'}}></div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card className="bg-card border-border shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-foreground">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mr-3">
                        <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      Delivery Information
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Where should we deliver your pharmaceutical order?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Delivery Address
                      </label>
                      <Textarea
                        value={formData.deliveryAddress}
                        onChange={(e) => setFormData({...formData, deliveryAddress: e.target.value})}
                        className="min-h-[100px] bg-background border-input text-foreground placeholder:text-muted-foreground"
                        placeholder="Enter complete delivery address"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Contact Phone
                        </label>
                        <Input
                          value={formData.contactPhone}
                          onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                          className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                          placeholder="+91 8409725206"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Preferred Delivery Date
                        </label>
                        <Input
                          type="date"
                          value={formData.deliveryDate}
                          onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                          className="bg-background border-input text-foreground"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button
                    onClick={() => setCurrentStep(2)}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Continue to Payment
                  </Button>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card className="bg-card border-border shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-foreground">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mr-3">
                        <CreditCard className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      Payment Method
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Choose your preferred payment option
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.paymentMethod === 'credit_period'
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-border hover:border-green-500/50 bg-muted/50'
                        }`}
                        onClick={() => setFormData({...formData, paymentMethod: 'credit_period'})}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <div>
                              <h3 className="font-semibold text-foreground">7-Day Credit Period</h3>
                              <p className="text-sm text-muted-foreground">Pay within 7 days of delivery</p>
                            </div>
                          </div>
                          <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">Recommended</Badge>
                        </div>
                      </div>

                      <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.paymentMethod === 'cod'
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-border hover:border-blue-500/50 bg-muted/50'
                        }`}
                        onClick={() => setFormData({...formData, paymentMethod: 'cod'})}
                      >
                        <div className="flex items-center space-x-3">
                          <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <div>
                            <h3 className="font-semibold text-foreground">Cash on Delivery</h3>
                            <p className="text-sm text-muted-foreground">Pay when you receive the order</p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.paymentMethod === 'online'
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-border hover:border-purple-500/50 bg-muted/50'
                        }`}
                        onClick={() => setFormData({...formData, paymentMethod: 'online'})}
                      >
                        <div className="flex items-center space-x-3">
                          <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          <div>
                            <h3 className="font-semibold text-foreground">Online Payment</h3>
                            <p className="text-sm text-muted-foreground">Pay now with UPI/Card/Net Banking</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {formData.paymentMethod === 'cod' && (
                      <div className="mt-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <p className="text-sm text-yellow-800 dark:text-yellow-400">COD ke liye kripya delivery par cash ready rakhein. High-value orders par advance ki maang ho sakti hai.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="border-input text-foreground hover:bg-muted"
                  >
                    Back to Delivery
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(3)}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Review Order
                  </Button>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card className="bg-card border-border shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center text-foreground">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                      Review Your Order
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Please review all details before placing your order
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Order Items */}
                    <div>
                      <h3 className="font-semibold text-foreground mb-4">Order Items</h3>
                      <div className="space-y-3">
                        {orderItems.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                              <h4 className="font-medium text-foreground">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">{item.manufacturer}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-foreground">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                              <p className="text-sm text-green-600">+{formatCurrency(item.margin * item.quantity)} profit</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Details */}
                    <div>
                      <h3 className="font-semibold text-foreground mb-4">Delivery Details</h3>
                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-muted-foreground mr-2" />
                          <span className="text-sm text-foreground">{formData.deliveryAddress}</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 text-muted-foreground mr-2" />
                          <span className="text-sm text-foreground">{formData.contactPhone}</span>
                        </div>
                        {formData.deliveryDate && (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 text-muted-foreground mr-2" />
                            <span className="text-sm text-foreground">
                              {new Date(formData.deliveryDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Notes */}
                    {formData.orderNotes && (
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Order Notes</h3>
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-foreground">{formData.orderNotes}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                  >
                    Back to Payment
                  </Button>
                  <Button 
                    onClick={handlePlaceOrder}
                    disabled={isProcessing}
                    className="trust-gradient text-white"
                  >
                    {isProcessing ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing Order...
                      </div>
                    ) : (
                      'Place Order'
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-card border-border shadow-xl sticky top-8">
                <CardHeader>
                  <CardTitle className="flex items-center text-foreground">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mr-3">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    Order Summary
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Price Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST (18%)</span>
                      <span className="font-medium text-foreground">{formatCurrency(gstAmount)}</span>
                    </div>

                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-foreground">Total Amount</span>
                        <span className="text-foreground">{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                        <span className="font-semibold text-foreground">Your Total Profit</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(totalMargin)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {((totalMargin / subtotal) * 100).toFixed(1)}% margin
                      </div>
                    </div>
                  </div>

                  {/* Trust Indicators */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Shield className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                      <span>100% Invoice Guarantee</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Truck className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                      <span>Free Doorstep Delivery</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
                      <span>7-Day Payment Grace</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

