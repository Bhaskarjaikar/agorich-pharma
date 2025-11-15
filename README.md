# Agorich Pharma B2B Platform

A modern, comprehensive B2B pharmaceutical distribution platform built with Next.js 14+, featuring role-based dashboards, transparent pricing, and trust-building UX elements.

## 🚀 Features Implemented

### ✅ Core Foundation
- **Next.js 14+ with App Router** - Modern React framework with server-side rendering
- **TypeScript** - Full type safety throughout the application
- **Tailwind CSS + shadcn/ui** - Beautiful, accessible component library
- **Framer Motion** - Smooth animations and micro-interactions
- **Prisma ORM** - Type-safe database operations with PostgreSQL
- **NextAuth.js** - Secure authentication with role-based access control

### ✅ Authentication & Onboarding
- **Multi-step Login Flow** - Email/Phone OTP authentication
- **Role-based Access Control** - SUPER_ADMIN, SALES_MANAGER, SALES_EXECUTIVE, RETAILER, FINANCE_TEAM, SUPPORT_TEAM
- **Onboarding Wizard** - 4-step profile setup with document upload
- **Session Management** - 30-day auto-logout with login history tracking

### ✅ Landing Page
- **Modern Hero Section** - Compelling value proposition with trust indicators
- **Feature Showcase** - 6 key benefits with animated cards
- **Testimonials** - Social proof from successful retailers
- **Trust-building Elements** - Security badges, guarantees, and success metrics

### ✅ Retailer Dashboard
- **KPI Cards** - Total orders, revenue, profit margin, outstanding balance, active categories, referral earnings
- **Real-time Metrics** - Animated counters with month-over-month comparisons
- **Recent Orders** - Order history with status tracking and profit visibility
- **Notification Center** - Order updates, payment reminders, stock alerts
- **Quick Actions** - Easy access to common tasks

### ✅ Product Catalog
- **Advanced Search & Filters** - By name, category, manufacturer, price range, margin
- **Grid/List View Toggle** - Flexible product browsing experience
- **Transparent Pricing** - Clear MRP, Agorich price, retailer price, and profit calculation
- **Real-time Stock** - Stock levels and expiry date tracking
- **Add to Cart** - Seamless shopping experience with quantity management

### ✅ Shopping Cart & Checkout
- **Cart Management** - Add/remove items with quantity controls
- **Order Summary** - Detailed breakdown with GST calculation
- **Profit Visibility** - Real-time margin calculation display
- **Multi-step Checkout** - Delivery details, payment method, order review
- **Trust Indicators** - 7-day grace period, free delivery, invoice guarantee

## 🎨 Design Philosophy

### Trust-Building Elements
- **Transparent Pricing** - Every price breakdown is visible and clear
- **Real-time Calculations** - Live margin and profit calculations
- **Trust Gradients** - Warm, professional color schemes
- **Success Indicators** - Achievement badges and progress indicators
- **Social Proof** - Customer testimonials and success stories

### Modern UX Patterns
- **Glassmorphism Effects** - Subtle backdrop blur for premium feel
- **Smooth Animations** - Framer Motion for delightful interactions
- **Responsive Design** - Mobile-first approach with touch-friendly interfaces
- **Loading States** - Skeleton loaders and progress indicators
- **Error Handling** - Friendly error messages with helpful guidance

## 🏗️ Technical Architecture

### Frontend Stack
```
Next.js 14+ (App Router)
├── TypeScript - Type safety
├── Tailwind CSS - Utility-first styling
├── shadcn/ui - Accessible components
├── Framer Motion - Animations
├── React Hook Form + Zod - Form validation
├── Lucide React - Consistent icons
└── Recharts - Data visualization
```

### Backend Stack
```
Next.js API Routes
├── Prisma ORM - Database operations
├── NextAuth.js - Authentication
├── PostgreSQL - Primary database
└── Redis - Caching (optional)
```

### Database Schema
- **Users** - Authentication and role management
- **Profiles** - Business information and verification
- **Products** - Medicine catalog with pricing
- **Orders** - Order management and tracking
- **Customers** - Retailer and clinic information
- **Inventory** - Stock management
- **Referrals** - Loyalty and referral system
- **Support Tickets** - Customer support
- **Notifications** - System messaging
- **Transactions** - Financial tracking

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agorich-pharma
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Update the following variables:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/agorich_pharma"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. **Start the development server**
```bash
npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Pages & Routes

### Public Pages
- `/` - Landing page with features and testimonials
- `/login` - Authentication with OTP
- `/register` - User registration
- `/onboarding` - Multi-step profile setup

### Retailer Dashboard
- `/retailer` - Main dashboard with KPIs
- `/retailer/products` - Product catalog with search/filters
- `/retailer/cart` - Shopping cart management
- `/retailer/checkout` - Multi-step checkout process
- `/retailer/orders` - Order history and tracking
- `/retailer/inventory` - Stock management
- `/retailer/financial` - Financial dashboard
- `/retailer/referrals` - Referral and loyalty system

### Sales Executive Dashboard
- `/sales` - Territory and customer management
- `/sales/pipeline` - Kanban sales pipeline
- `/sales/customers` - Customer relationship management
- `/sales/performance` - Sales analytics and KPIs

### Admin Dashboard
- `/admin` - Business intelligence and analytics
- `/admin/users` - User management
- `/admin/products` - Product catalog management
- `/admin/orders` - Order management
- `/admin/financial` - Financial compliance and reports

## 🎯 Key Features

### For Retailers
- **40% Direct Margin** - Transparent pricing with real-time profit calculation
- **Doorstep Delivery** - Free delivery with real-time tracking
- **7-Day Payment Grace** - Flexible payment terms
- **Zero-Cost Returns** - Expired product return policy
- **24/7 Support** - Dedicated product advisor support
- **Referral System** - Earn bonuses for bringing new retailers

### For Sales Executives
- **Territory Management** - Map view of assigned retailers
- **Sales Pipeline** - Kanban board with automated follow-ups
- **Customer Health Score** - AI-powered customer insights
- **Performance Tracking** - Commission and target monitoring
- **Communication Tools** - Bulk messaging and campaign management

### For Administrators
- **Business Intelligence** - Revenue analytics and forecasting
- **User Management** - Role-based access control
- **Inventory Control** - Stock management and expiry tracking
- **Financial Compliance** - GST reports and audit trails
- **Marketing Automation** - Campaign management and A/B testing

## 🔒 Security Features

- **HTTPS/SSL Encryption** - Secure data transmission
- **Two-Factor Authentication** - OTP-based login
- **Role-based Access Control** - Granular permissions
- **Session Management** - Automatic logout and activity tracking
- **Data Encryption** - Sensitive data protection
- **Audit Logs** - Complete activity tracking

## 📊 Performance Optimizations

- **Server-Side Rendering** - Fast initial page loads
- **Image Optimization** - Next.js Image component
- **Code Splitting** - Lazy loading for better performance
- **Caching Strategy** - Redis for session and data caching
- **Database Indexing** - Optimized queries
- **CDN Ready** - Static asset optimization

## 🌐 Localization Ready

- **i18n Support** - English and Hindi language support
- **Indian Currency** - ₹ formatting throughout
- **Date Formats** - DD/MM/YYYY Indian standard
- **Phone Formats** - +91 Indian phone number format
- **Regional Compliance** - GST and FSSAI regulations

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- **Railway** - Full-stack deployment with PostgreSQL
- **AWS** - EC2 with RDS PostgreSQL
- **DigitalOcean** - Droplet with managed database

## 📈 Success Metrics

- **500+ Active Retailers** - Target within 3 months
- **3+ Orders per Retailer** - Monthly average
- **85%+ Customer Retention** - Monthly retention rate
- **99.9% System Uptime** - Reliability target
- **₹8,000-15,000 AOV** - Average order value
- **70+ NPS Score** - Net Promoter Score
- **<2s Page Load Time** - Performance target

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Email: support@agorich.com
- Phone: +91 8409725206
- Documentation: [docs.agorich.com](https://docs.agorich.com)

## 🙏 Acknowledgments

- Built with ❤️ for the Indian pharmaceutical industry
- Special thanks to all the retailers and sales executives who provided feedback
- Powered by modern web technologies and best practices

---

**Agorich Pharma** - Transforming B2B pharmaceutical distribution in India 🇮🇳