'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ChatCircle, 
  Headphones, 
  FileText, 
  PaperPlaneRight,
  Plus,
  Heart,
  ArrowLeft,
  User,
  Robot,
  Phone,
  VideoCamera,
  Paperclip,
  Smiley
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function SupportHub() {
  const [activeTab, setActiveTab] = useState('chat')
  const [newMessage, setNewMessage] = useState('')
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: 'general'
  })

  // Mock data
  const chatMessages = [
    { id: 1, sender: 'mr', name: 'Amit Kumar (Your MR)', message: 'Hi Rajesh! How are your recent orders going?', time: '10:30 AM', avatar: 'AK' },
    { id: 2, sender: 'user', name: 'You', message: 'Great! The new products are selling well. I need some help with the payment process though.', time: '10:32 AM', avatar: 'RK' },
    { id: 3, sender: 'mr', name: 'Amit Kumar (Your MR)', message: 'Sure! I can help you with that. What specific issue are you facing?', time: '10:33 AM', avatar: 'AK' },
    { id: 4, sender: 'user', name: 'You', message: 'I want to understand the 7-day grace period better. When exactly does it start?', time: '10:35 AM', avatar: 'RK' },
    { id: 5, sender: 'mr', name: 'Amit Kumar (Your MR)', message: 'The grace period starts from the delivery date. So if your order is delivered on Monday, you have until the following Monday to make the payment.', time: '10:36 AM', avatar: 'AK' },
    { id: 6, sender: 'bot', name: 'Agorich Bot', message: 'I can also help with payment queries! Would you like me to show you your current payment status?', time: '10:37 AM', avatar: '🤖' }
  ]

  const supportTickets = [
    { id: 'TKT-001', subject: 'Payment Gateway Issue', status: 'Open', priority: 'High', created: '2024-01-15', lastUpdate: '2024-01-16' },
    { id: 'TKT-002', subject: 'Product Return Request', status: 'In Progress', priority: 'Medium', created: '2024-01-10', lastUpdate: '2024-01-14' },
    { id: 'TKT-003', subject: 'Account Verification', status: 'Resolved', priority: 'Low', created: '2024-01-05', lastUpdate: '2024-01-08' },
    { id: 'TKT-004', subject: 'Delivery Schedule Change', status: 'Open', priority: 'Medium', created: '2024-01-12', lastUpdate: '2024-01-12' }
  ]

  const quickActions = [
    { icon: Phone, title: 'Call Support', description: 'Speak directly with our support team', action: 'call' },
    { icon: VideoCamera, title: 'Video Call', description: 'Schedule a video consultation', action: 'video' },
    { icon: FileText, title: 'Create Ticket', description: 'Submit a detailed support request', action: 'ticket' },
    { icon: Robot, title: 'AI Assistant', description: 'Get instant answers from our bot', action: 'bot' }
  ]

  const faqItems = [
    { question: 'How does the 7-day payment grace period work?', answer: 'The grace period starts from the delivery date. You have 7 days to make payment after receiving your order.' },
    { question: 'What is the return policy for expired products?', answer: 'We offer zero-cost returns for expired products within 30 days of expiry date.' },
    { question: 'How can I track my order?', answer: 'You can track your order in real-time from your dashboard or by calling our support team.' },
    { question: 'What are the delivery charges?', answer: 'We offer free doorstep delivery for all orders above ₹5,000. Below that, a nominal charge of ₹50 applies.' }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-red-100 text-red-800 border-red-200'
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Resolved': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'Low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Add message to chat
      setNewMessage('')
    }
  }

  const handleCreateTicket = () => {
    if (newTicket.subject && newTicket.description) {
      // Create new ticket
      setNewTicket({ subject: '', description: '', priority: 'medium', category: 'general' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/retailer" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Link>
              <div className="w-px h-6 bg-gray-300" />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Support Hub</h1>
                  <p className="text-sm text-gray-500">Get help and connect with our team</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Phone className="w-4 h-4 mr-2" />
                Call Support
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
              >
                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <action.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8">
          <Button
            variant={activeTab === 'chat' ? 'default' : 'outline'}
            onClick={() => setActiveTab('chat')}
            className="flex items-center"
          >
            <ChatCircle className="w-4 h-4 mr-2" />
            Live Chat
          </Button>
          <Button
            variant={activeTab === 'tickets' ? 'default' : 'outline'}
            onClick={() => setActiveTab('tickets')}
            className="flex items-center"
          >
            <FileText className="w-4 h-4 mr-2" />
            Support Tickets
          </Button>
          <Button
            variant={activeTab === 'faq' ? 'default' : 'outline'}
            onClick={() => setActiveTab('faq')}
            className="flex items-center"
          >
            <Headphones className="w-4 h-4 mr-2" />
            FAQ
          </Button>
        </div>

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Chat Messages */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-lg h-[600px] flex flex-col">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center">
                    <ChatCircle className="w-5 h-5 mr-2 text-blue-600" />
                    Live Chat
                  </CardTitle>
                  <CardDescription>
                    Chat with your MR and our support team
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  {/* Messages */}
                  <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                    {chatMessages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-start space-x-3 max-w-[80%] ${
                          message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                            message.sender === 'user' ? 'bg-blue-600' :
                            message.sender === 'mr' ? 'bg-green-600' :
                            'bg-purple-600'
                          }`}>
                            {message.avatar}
                          </div>
                          <div className={`p-3 rounded-lg ${
                            message.sender === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : message.sender === 'mr'
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-purple-100 text-purple-900'
                          }`}>
                            <p className="text-sm font-medium mb-1">{message.name}</p>
                            <p className="text-sm">{message.message}</p>
                            <p className={`text-xs mt-1 ${
                              message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {message.time}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="border-t p-4">
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1"
                      />
                      <Button variant="outline" size="sm">
                        <Smiley className="w-4 h-4" />
                      </Button>
                      <Button onClick={handleSendMessage} className="trust-gradient text-white">
                        <PaperPlaneRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat Info */}
            <div>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2 text-green-600" />
                    Your Support Team
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">AK</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Amit Kumar</h4>
                        <p className="text-sm text-gray-600">Your Medical Representative</p>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Online
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">🤖</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Agorich Bot</h4>
                        <p className="text-sm text-gray-600">AI Assistant</p>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-blue-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Always Available
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Quick Stats</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Response Time</span>
                        <span className="font-medium">&lt; 2 minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Satisfaction</span>
                        <span className="font-medium">98%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Available</span>
                        <span className="font-medium">24/7</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Support Tickets Tab */}
        {activeTab === 'tickets' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            {/* Create New Ticket */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-blue-600" />
                  Create New Ticket
                </CardTitle>
                <CardDescription>
                  Submit a detailed support request
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <Input
                      placeholder="Brief description of your issue"
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <Select value={newTicket.priority} onValueChange={(value) => setNewTicket({...newTicket, priority: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Textarea
                    placeholder="Please provide detailed information about your issue..."
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                    className="min-h-[120px]"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleCreateTicket} className="trust-gradient text-white">
                    Create Ticket
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Existing Tickets */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-600" />
                  Your Support Tickets
                </CardTitle>
                <CardDescription>
                  Track the status of your support requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supportTickets.map((ticket, index) => (
                    <motion.div
                      key={ticket.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{ticket.subject}</h4>
                          <p className="text-sm text-gray-500">Created: {ticket.created}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status}
                        </Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Headphones className="w-5 h-5 mr-2 text-purple-600" />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription>
                  Find quick answers to common questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {faqItems.map((faq, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 bg-gray-50 rounded-lg"
                    >
                      <h4 className="font-semibold text-gray-900 mb-2">{faq.question}</h4>
                      <p className="text-sm text-gray-600">{faq.answer}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}

