# Agorich Pharma - Current Design Structure

## Current App Overview

### Implemented Roles
The application currently implements **5 distinct user roles**:

1. **SUPER_ADMIN** - Full administrative access, command center, all retailers/distributors management
2. **ADMIN** - Administrative dashboard with metrics, alerts, invoice flow management
3. **DISTRIBUTOR** - Inventory management, routed orders, invoices, logistics coordination, settlements
4. **RETAILER** - Order creation, cart management, invoices, referrals, inventory browsing
5. **LOGISTIC** - Delivery management, route tracking, delivery history
6. **SALES** - Sales team dashboard with customer management and performance tracking

---

## Screen Inventory

### AUTHENTICATION SCREENS

#### Login - `/login`
- **Layout**: Centered card on gradient background (slate/blue/indigo)
- **Data Displayed**: Email/password fields, Google sign-in button, dark mode toggle, last used account display
- **CTAs**: Email/password login, Google OAuth login, dark mode toggle, link to signup
- **Behavior**: Redirects based on role after login (SUPER_ADMIN→/admin, DISTRIBUTOR→/distributor, RETAILER→/retailer, LOGISTIC→/logistic, SALES→/sales)

#### Signup - `/signup`
- **Layout**: Same centered card design as login
- **Data Displayed**: Email, phone, password, confirm password fields
- **CTAs**: Create account with email, Google signup, back to login link

#### Onboarding Hub - `/onboarding`
- **Layout**: Full-screen gradient with logo
- **Behavior**: Auto-redirects to distributor or retailer onboarding based on user role

#### Distributor Onboarding - `/onboarding/distributor`
- **Layout**: Multi-step form with progress indicator
- **Data Displayed**: Business name, business type (Proprietorship/Partnership/LLP/Private Limited/Public Limited/Other), GSTIN, PAN, email, phone, address, city, state, pincode, latitude/longitude, bank details (account number, IFSC)
- **CTAs**: Next/Back navigation, form validation at each step, submit onboarding

#### Retailer Onboarding - `/onboarding/retailer`
- **Layout**: Multi-step form similar to distributor
- **Data Displayed**: Owner name, phone, business name, business type, address, city, state, pincode, latitude/longitude, store location picker
- **CTAs**: Next/Back navigation, latitude/longitude picker, form submission

#### Retailer Location Registration - `/retailer/register/location`
- **Layout**: Form with map/location picker integration
- **Data Displayed**: Address fields, location coordinates
- **CTAs**: Save location, back navigation

---

### UNIVERSAL DASHBOARD

#### Root Dashboard - `/dashboard`
- **Layout**: Full-screen gradient with loading spinner
- **Behavior**: Role-based redirect - checks user role and redirects to appropriate dashboard (admin/distributor/retailer/logistic/sales)

---

### ADMIN SCREENS

#### Admin Dashboard - `/admin`
- **Layout**: Full-width with metrics cards, charts, AI performance panel, agent status panel
- **Data Displayed**: Revenue data (monthly), total retailers, total revenue, outstanding amounts, top retailers table, AI agent performance, spending metrics, alerts overview
- **CTAs**: Navigate to retailers list, alerts, command center, invoice flow, notifications, settings
- **Components Used**: AdminCharts (AIPerformanceChart, CostTracker), InventorySection, SalesTeamSection, ARAgingPanel, InventoryIntelligencePanel, DemandForecastPanel

#### Admin Command Center - `/admin/command-center`
- **Layout**: Chat-style interface with metrics panels
- **Data Displayed**: JARVIS AI chat interface, MetricsOverview (realtime metrics), AI performance chart, cost tracker, agent status panel
- **CTAs**: Send message to AI assistant, refresh metrics, toggle panels

#### Admin Retailers - `/admin/retailers`
- **Layout**: Table with search, filters, pagination
- **Data Displayed**: Retailer business name, owner name, phone, city, state, verification status, total orders, total units, total revenue, outstanding, last order date
- **CTAs**: Search retailers, filter by status (all/verified/unverified), sort by revenue/orders/units, view retailer details, export to Excel

#### Admin Retailer Detail - `/admin/retailers/[id]`
- **Layout**: Detail view of single retailer
- **Data Displayed**: Retailer profile info, metrics, invoice history
- **CTAs**: Back to list, view invoices

#### Admin Invoice Flow - `/admin/invoice-flow`
- **Layout**: Kanban-style status board with multiple view options
- **Data Displayed**: Invoices grouped by status (DRAFT, SENT, PROCESSING, PACKING, DELIVERED, PAID), invoice counts per status, total metrics (grand total, paid amount, outstanding)
- **CTAs**: Switch views (Board/Gallery/Table/List), search, export to Excel, confirm delivery, refresh

#### Admin Accounts Receivable - `/admin/accounts-receivable`
- **Layout**: Financial metrics dashboard
- **Data Displayed**: AR aging data, outstanding amounts
- **CTAs**: View details, refresh

#### Admin Alerts - `/admin/alerts`
- **Layout**: Alert listing page
- **Data Displayed**: System alerts and notifications
- **CTAs**: View alert details, dismiss

#### Admin Notifications - `/admin/notifications`
- **Layout**: Notification center
- **Data Displayed**: List of notifications with read/unread status
- **CTAs**: Mark as read, mark all as read, notification settings

#### Admin Settings - `/admin/settings`
- **Layout**: Settings page
- **Data Displayed**: System configuration options
- **CTAs**: Save settings

---

### DISTRIBUTOR SCREENS

#### Distributor Dashboard - `/distributor`
- **Layout**: Sidebar navigation with main content area
- **Data Displayed**: User profile (name, business name), recent invoices (invoice number, grand total, status, items), unread notifications count
- **CTAs**: Create new invoice, view all invoices, manage inventory, view routed orders, settlements/payables, logistics, settings, logout

#### Distributor Create Invoice - `/distributor/create-invoice`
- **Layout**: Split panel (products list left, invoice preview right) with resizable divider
- **Data Displayed**: Products from distributor inventory, search functionality, cart items, invoice preview with line items, tax calculations, totals
- **CTAs**: Search products, add to cart, adjust quantities, select distributor (for retailer creating invoice), save invoice, send invoice, pay now (Razorpay)

#### Distributor Inventory - `/distributor/inventory`
- **Layout**: Table with search and management actions
- **Data Displayed**: Product name, category, manufacturer, MRP, stock quantity, agorich price, distributor price, active status
- **CTAs**: Search products, toggle active status, add new product, edit product, delete product

#### Distributor Inventory Edit - `/distributor/inventory/edit/[id]`
- **Layout**: Product edit form
- **Data Displayed**: Product details (name, category, manufacturer, MRP, stock, pricing, batch info, expiry)
- **CTAs**: Save changes, cancel

#### Distributor Inventory New - `/distributor/inventory/new`
- **Layout**: Product creation form
- **Data Displayed**: All product fields
- **CTAs**: Create product, cancel

#### Distributor Invoices - `/distributor/invoices`
- **Layout**: Invoice listing
- **Data Displayed**: Invoice list with status, customer, amounts
- **CTAs**: View invoice, filter by status

#### Distributor Routed Orders - `/distributor/routed-orders`
- **Layout**: Order cards/list with accept/reject actions
- **Data Displayed**: Order details, customer info, items, totals
- **CTAs**: Accept order, reject order, view details

#### Distributor Checkout - `/distributor/checkout`
- **Layout**: Multi-step checkout form
- **Data Displayed**: Cart items, delivery address, contact phone, delivery date, payment method, order notes
- **CTAs**: Next/Previous steps, place order, process payment

#### Distributor Logistics - `/distributor/logistics`
- **Layout**: Logistics management view
- **Data Displayed**: Orders pending logistics, routing info
- **CTAs**: Manage logistics, view routes

#### Distributor Payables - `/distributor/payables`
- **Layout**: Settlement/payables dashboard
- **Data Displayed**: Outstanding payments, settlement history, pending amounts
- **CTAs**: View details, make payment

#### Distributor Expiry Watchlist - `/distributor/expiry-watchlist`
- **Layout**: List of products near expiry
- **Data Displayed**: Products with expiry dates, batch numbers, quantities
- **CTAs**: View details, mark as handled

#### Distributor Settings - `/distributor/settings`
- **Layout**: Profile and settings form
- **Data Displayed**: User info, business info, preferences
- **CTAs**: Save settings, logout

#### Distributor Support - `/distributor/support`
- **Layout**: Support/help page
- **CTAs**: Contact support, view FAQs

#### Distributor Referrals - `/distributor/referrals`
- **Layout**: Referral dashboard with tabs
- **Data Displayed**: Referral stats (total referrals, active, earnings, pending), referral list with status and progress
- **CTAs**: Share referral code (WhatsApp, SMS, copy), view achievements, earnings, history, leaderboard, loyalty

---

### RETAILER SCREENS

#### Retailer Dashboard - `/retailer`
- **Layout**: Sidebar navigation (Home, Order, Invoices, Cart, Profile, Support)
- **Data Displayed**: User name, business name, recent orders with status, unread notifications count
- **CTAs**: Create new order, view invoices, go to cart, settings, logout

#### Retailer Create Invoice - `/retailer/create-invoice`
- **Layout**: Distributor selection + product browsing + cart + invoice preview (split panel)
- **Data Displayed**: Nearby distributors with distance, products with search, cart items, real-time invoice preview
- **CTAs**: Search distributors by radius, browse products, add to cart, adjust quantities, save invoice, send to distributor

#### Retailer Checkout - `/retailer/checkout`
- **Layout**: Multi-step checkout
- **Data Displayed**: Cart items, delivery address, contact, delivery date, payment method
- **CTAs**: Next/Previous steps, place order

#### Retailer Invoices - `/retailer/invoices`
- **Layout**: Invoice listing
- **Data Displayed**: Invoice history with status, amounts, dates
- **CTAs**: View invoice details

#### Retailer Inventory - `/retailer/inventory`
- **Layout**: Product browsing page
- **Data Displayed**: Available products from selected distributor
- **CTAs**: Browse, add to cart

#### Retailer Order Now - `/order-now` (redirects to `/retailer/create-invoice`)
- **Layout**: Redirects immediately
- **Behavior**: Redirect to create-invoice

#### Retailer Settings - `/retailer/settings`
- **Layout**: Profile settings form
- **Data Displayed**: User info, business info
- **CTAs**: Save settings

#### Retailer Support - `/retailer/support`
- **Layout**: Support page
- **CTAs**: Contact support

#### Retailer Referrals - `/retailer/referrals`
- **Layout**: Referral hub with sub-pages
- **Data Displayed**: Referral code, link, QR code, referral stats, referral list
- **CTAs**: Share via WhatsApp/SMS/email, copy code, download QR, view achievements/earnings/history/leaderboard/loyalty

---

### LOGISTIC SCREENS

#### Logistic Dashboard - `/logistic`
- **Layout**: Invoice cards grouped by status (PROCESSING, PACKING)
- **Data Displayed**: Active processing count, packing count, monthly metrics, grouped invoices
- **CTAs**: Refresh, confirm delivery (opens modal), view invoice

#### Logistic Deliveries - `/logistic/deliveries`
- **Layout**: Active deliveries list
- **Data Displayed**: Delivery items with status
- **CTAs**: Confirm delivery, view details

#### Logistic Routes - `/logistic/routes`
- **Layout**: Route management
- **Data Displayed**: Route information, assigned deliveries
- **CTAs**: Manage routes

#### Logistic History - `/logistic/history`
- **Layout**: Past deliveries
- **Data Displayed**: Completed deliveries with dates and details
- **CTAs**: View history

#### Logistic Settings - `/logistic/settings`
- **Layout**: Profile settings
- **CTAs**: Save settings

---

### SALES SCREENS

#### Sales Dashboard - `/sales`
- **Layout**: Tabbed dashboard (overview, customers)
- **Data Displayed**: Monthly target vs actual, new retailers, active retailers, retention rate, avg order value, commission earned, pending follow-ups, customer list with health scores
- **CTAs**: Add customer, view customer details, filter/search customers

---

### PUBLIC PAGES

#### Home - `/`
- **Layout**: Marketing landing page
- **Data Displayed**: App branding, hero content
- **CTAs**: Get started, learn more

#### About - `/about`
- **Layout**: Static content
- **CTAs**: None

#### Mission - `/mission`
- **Layout**: Static content
- **CTAs**: None

#### Privacy - `/privacy`
- **Layout**: Static content
- **CTAs**: None

#### Terms - `/terms`
- **Layout**: Static content
- **CTAs**: None

#### Values - `/values`
- **Layout**: Static content
- **CTAs**: None

#### Medicines - `/medicines`
- **Layout**: Product listing
- **Data Displayed**: Product cards with images, names, prices
- **CTAs**: View product detail

#### Medicine Category - `/medicines/category/[category]`
- **Layout**: Filtered product listing
- **Data Displayed**: Products in specific category
- **CTAs**: View product, filter

#### Medicine Detail - `/medicines/product/[id]`
- **Layout**: Product detail page
- **Data Displayed**: Full product information
- **CTAs**: Add to cart, buy now

#### Invoice View - `/invoice/[id]`
- **Layout**: Full invoice display
- **Data Displayed**: Complete invoice with header, items table, tax summary, payment details, footer
- **CTAs**: Print, download PDF, send via email

#### QR Page - `/qr`
- **Layout**: QR code scanner/display
- **CTAs**: Scan, share

#### Refund - `/refund`
- **Layout**: Refund request page
- **Data Displayed**: Order information
- **CTAs**: Submit refund request

#### Demo - `/demo`
- **Layout**: Demo/seed data page
- **CTAs**: Initialize demo data

#### Delivery Confirmation - `/delivery/[id]/confirm`
- **Layout**: Delivery confirmation form
- **Data Displayed**: Delivery details
- **CTAs**: Confirm delivery

---

## Current Global Components

### AUTH COMPONENTS

- **AuthContext** - Authentication state management (user, profile, loading, signInWithGoogle, signOut)
- **AuthErrorBoundary** - Error boundary for auth-related errors
- **LastUsedAccountCard** - Displays last logged in account with quick continue option
- **RedirectAfterLogin** - Handles post-login redirects based on role
- **SessionSync** - Synchronizes session across tabs/windows

### UI PRIMITIVES (shadcn/ui based)

- **Button** - Multi-variant button (default, destructive, outline, secondary, ghost, link) with size variants
- **Card** - Card container with CardHeader, CardTitle, CardDescription, CardContent
- **Input** - Text input field
- **Badge** - Status/category labels
- **Alert** - Alert messages with description
- **Dialog** - Modal dialog using Radix
- **Select** - Dropdown select using Radix
- **Tabs** - Tab navigation using Radix
- **Table** - Table with TableHeader, TableBody, TableRow, TableHead, TableCell
- **Skeleton** - Loading placeholder
- **Progress** - Progress bar
- **Slider** - Range slider
- **Label** - Form label
- **Textarea** - Multi-line text input
- **ExpandableText** - Text that can expand/collapse
- **Premium** - Premium feature badge
- **Sonner** - Toast notifications

### LAYOUT COMPONENTS

- **DashboardShell** - Sidebar navigation shell for dashboards (defines nav items per role: retailer, distributor, logistic, admin)
- **NativeDashboardGate** - Platform detection component that conditionally renders mobile-optimized nav on native apps vs children for web

### INVOICE COMPONENTS

- **InvoiceGenerator** - Full invoice generation with header, items, tax, payment details, footer
- **InvoiceHeader** - Company and customer info header section
- **ItemsTable** - Line items display with quantity, rates, amounts, GST
- **TaxSummary** - Tax breakdown (CGST/SGST or IGST)
- **PaymentDetails** - Payment terms and bank details
- **InvoiceFooter** - Footer with terms, signatures
- **InvoiceNavigation** - Next/previous invoice navigation
- **InvoicePreview** - Live preview of invoice while creating
- **LiveInvoicePreview** - Real-time updating invoice preview
- **ProductCard** - Product display card for selection
- **Pagination** - Page navigation
- **DistributorSelector** - Distributor selection for retailer invoice creation

### INVOICE FLOW COMPONENTS

- **StatusBoard** - Kanban-style board showing invoices grouped by status (DRAFT, SENT, PROCESSING, PACKING, DELIVERED, PAID)
- **InvoiceCard** - Card representation of single invoice
- **InvoiceTableView** - Tabular view of invoices
- **InvoiceGalleryView** - Card grid view of invoices
- **InvoiceListView** - Compact list view of invoices
- **RetailerInvoiceBoardView** - Status board for retailer perspective
- **RetailerInvoiceGalleryView** - Gallery for retailer
- **RetailerInvoiceListView** - List for retailer
- **RetailerInvoiceTableView** - Table for retailer
- **ViewSelector** - Toggle between board/table/gallery/list views
- **DeliveryConfirmModal** - Modal for confirming delivery

### COMMAND CENTER COMPONENTS

- **AdminCommandCenter** - AI chat interface (JARVIS) with metrics panels
- **ARAgingPanel** - Accounts receivable aging display
- **DemandForecastPanel** - Demand forecasting visualization
- **InventoryIntelligencePanel** - AI inventory insights

### ADMIN METRICS COMPONENTS

- **MetricsOverview** - 4-card grid showing Activity, Avg Response Time, Success Rate, Cost Today
- **AIPerformanceChart** - AI agent performance line chart
- **CostTracker** - Cost tracking display

### ADMIN COMPONENTS

- **AgentStatusPanel** - Sales agent status display
- **ApprovalQueue** - Pending approvals list
- **EmergencyControls** - Emergency stop/resume controls
- **LogViewer** - System log viewer
- **PerformanceDashboard** - Performance metrics
- **SpendingDashboard** - Spending/cost dashboard

### REFERRAL COMPONENTS

- **ShareModal** - Multi-tab modal for sharing referral code (share options + QR code)
- **ReferralDetailsModal** - Detailed referral information

### PAYMENT COMPONENTS

- **RazorpayPaymentButton** - Razorpay integration button
- **DirectRazorpayButton** - Direct payment flow button
- **OrderPaymentButton** - Order-specific payment button

### GEO COMPONENTS

- **AddressSearch** - Address search with autocomplete
- **StoreMap** - Store/distributor location map

### MOBILE COMPONENTS

- **NativeDashboardGate** - Conditional mobile web nav wrapper
- **NativeAppChrome** - Native app UI chrome
- **DeepLinkHandler** - Deep link processing

### DISTRIBUTOR COMPONENTS

- **DistributorSettlements** - Settlement display and management
- **ProductForm** - Product add/edit form

### OTHER COMPONENTS

- **BackgroundSlideshow** - Rotating background images for auth pages
- **FCMInitializer** - Firebase Cloud Messaging setup
- **FinancialHealthCard** - Financial health indicator
- **IntelligenceWidgets** - AI intelligence widgets
- **InventorySection** - Inventory display section
- **LanguageSwitcher** - i18n language picker
- **LanguageWelcomeModal** - Language selection welcome modal
- **LocalStorageCleanup** - Storage cleanup utility
- **Protected** - Route protection wrapper
- **SalesPerformanceCharts** - Sales charts
- **SalesTeamSection** - Sales team display
- **ThemeToggle** - Dark/light mode toggle
- **I18nProvider** - Internationalization provider
- **theme-provider** - Next-themes provider

---

## Technical Notes

- Uses **Next.js App Router** with route groups: `(auth)` for login/signup/onboarding, `(dashboard)` for authenticated pages
- **Authentication**: Supabase Auth with Google OAuth and email/password
- **Payments**: Razorpay integration
- **Notifications**: Firebase Cloud Messaging (FCM)
- **Mobile**: Capacitor for native app wrapper
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: React Context + hooks (useSupabaseAuth, useAppNotifications, etc.)
- **Charts**: Recharts for data visualization
- **Animations**: Framer Motion
- **Icons**: Phosphor Icons and Lucide React
- **Tables**: TanStack Table patterns
- **i18n**: react-i18next with en.json and hi.json
