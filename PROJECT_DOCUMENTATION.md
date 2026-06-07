# AGORICH PHARMA - Complete Project Documentation

**Version:** 1.0.0
**Last Updated:** June 2026
**Platform:** B2B Pharmaceutical Distribution for Rural Bihar

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Business Model](#2-business-model)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Architecture](#4-architecture)
5. [Database Schema](#5-database-schema)
6. [Entity Relationships](#6-entity-relationships)
7. [Order Flow](#7-order-flow)
8. [Status Transitions](#8-status-transitions)
9. [API Endpoints](#9-api-endpoints)
10. [Key Features](#10-key-features)
11. [Security](#11-security)
12. [Third-Party Integrations](#12-third-party-integrations)

---

## 1. Project Overview

### 1.1 What is Agorich Pharma?

**Agorich Pharma** is a B2B pharmaceutical distribution platform serving rural Bihar and Tier-2/3 cities. It connects pharmaceutical distributors with retailers through a technology platform.

### 1.2 Key Statistics
- **Target Market:** Rural Bihar, Tier-2/3 cities
- **Business Type:** B2B Platform (Not B2C)
- **Technology Stack:** Next.js + Supabase + Razorpay

### 1.3 Platform Goals
- Enable pharmaceutical distribution without admin holding inventory for retailer sales
- Connect distributors with retailers based on proximity
- Track orders from placement to delivery
- Manage payments securely
- Prevent fraud with distributor lock mechanism

---

## 2. Business Model

### 2.1 Two-Part Business Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         AGORICH PHARMA                            │
│                                                                   │
│   ┌─────────────────────┐       ┌─────────────────────────┐    │
│   │   WHOLESALE B2B     │       │     RETAIL B2B          │    │
│   │                     │       │                         │    │
│   │  Admin → Distributor│       │  Distributor → Retailer │    │
│   │                     │       │                         │    │
│   │  • Agorich owns     │       │  • Agorich is just      │    │
│   │    inventory        │       │    software/platform    │    │
│   │  • Sells products   │       │  • Commission/fee based │    │
│   │    to distributors  │       │  • No inventory risk    │    │
│   │  • B2B margins     │       │  • B2B service         │    │
│   └─────────────────────┘       └─────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Inventory Management

| Inventory Type | Owner | Purpose | Managed By |
|---------------|-------|---------|------------|
| **Products** | Admin (Agorich) | Sell to distributors when stock is low | Admin only |
| **Distributor Inventory** | Distributor | Sell to retailers | Distributor only |

### 2.3 Revenue Model
- **Wholesale:** Margin on products sold to distributors
- **Platform Fee:** Commission on distributor-retailer transactions
- **Logistics:** Delivery charges managed through logistics partners

---

## 3. User Roles & Permissions

### 3.1 Role Hierarchy

| Role | Code | Description | Access Level |
|------|------|-------------|--------------|
| **Super Admin** | `SUPER_ADMIN` | Full system access | All |
| **Admin** | `ADMIN` | Agorich operations | All except auth |
| **Support** | `SUPPORT` | Help desk | Limited read |
| **Sales** | `SALES` | Sales team | Limited |
| **Logistic** | `LOGISTIC` | Delivery partners | Logistics only |
| **Distributor** | `DISTRIBUTOR` | Product distributors | Own data only |
| **Retailer** | `RETAILER` | End customers | Own orders only |

### 3.2 Role Capabilities

```typescript
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['read', 'write', 'manage_users', 'view_analytics'],
  SUPPORT: ['read', 'view_issues'],
  SALES: ['read', 'write', 'manage_retailers'],
  LOGISTIC: ['read_logistics', 'update_delivery'],
  DISTRIBUTOR: ['read_inventory', 'write_inventory', 'accept_orders', 'reject_orders', 'dispatch'],
  RETAILER: ['read_products', 'create_order', 'pay_order']
}
```

---

## 4. Architecture

### 4.1 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14 (App Router) | UI |
| **Styling** | Tailwind CSS + Phosphor Icons | Design |
| **Animation** | Framer Motion | Transitions |
| **Backend** | Next.js API Routes | Serverless APIs |
| **Database** | Supabase (PostgreSQL) | Primary DB |
| **Auth** | Supabase Auth | Authentication |
| **Payments** | Razorpay | Payment Gateway |
| **i18n** | react-i18next | Translations |
| **Themes** | next-themes | Dark/Light mode |

### 4.2 Project Structure

```
agorich-pharma-main/
├── src/
│   ├── app/
│   │   ├── (auth)/                 # Authentication pages
│   │   │   ├── login/
│   │   │   └── onboarding/
│   │   │       ├── distributor/
│   │   │       └── retailer/
│   │   ├── (dashboard)/           # Dashboard pages
│   │   │   ├── admin/
│   │   │   ├── distributor/
│   │   │   │   ├── routed-orders/
│   │   │   │   ├── logistics/
│   │   │   │   └── invoices/
│   │   │   ├── retailer/
│   │   │   │   ├── order-now/
│   │   │   │   ├── create-invoice/
│   │   │   │   └── invoices/
│   │   │   └── logistic/
│   │   ├── api/                   # API Routes
│   │   │   ├── admin/
│   │   │   ├── distributor/
│   │   │   ├── retailer/
│   │   │   ├── invoices/
│   │   │   ├── payments/
│   │   │   ├── health/
│   │   │   └── profile/
│   │   └── page.tsx               # Landing page
│   ├── components/                 # Reusable components
│   │   ├── ui/                    # Base UI components
│   │   ├── invoice/               # Invoice related
│   │   ├── invoice-flow/           # Invoice Kanban views
│   │   ├── payments/               # Payment components
│   │   └── auth/                  # Auth components
│   ├── lib/                       # Utilities
│   │   ├── constants.ts           # Status constants
│   │   ├── api-helpers.ts        # API utilities
│   │   ├── invoice-calculations.ts
│   │   ├── invoice-sequence.ts
│   │   ├── notifications.ts
│   │   └── supabase-client.ts
│   ├── hooks/                     # Custom hooks
│   └── types/                     # TypeScript types
├── migrations/                     # Database migrations
├── supabase/                       # Supabase config
└── backend/                        # Backend services
```

---

## 5. Database Schema

### 5.1 Core Tables

#### `profiles` - User Profiles
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    role TEXT CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'DISTRIBUTOR', 'RETAILER', 'LOGISTIC', 'SUPPORT', 'SALES')),
    user_name TEXT,
    business_name TEXT,
    business_type TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    phone TEXT,
    gst_number TEXT,
    drug_license_20b TEXT,
    drug_license_21b TEXT,
    store_lat DECIMAL,
    store_lng DECIMAL,
    max_delivery_radius_km INTEGER,
    default_search_radius_km INTEGER,
    is_active BOOLEAN DEFAULT true,
    is_delisted BOOLEAN DEFAULT false,
    monthly_rejection_count INTEGER DEFAULT 0,
    max_rejections_per_month INTEGER DEFAULT 3,
    rejection_reset_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `products` - Product Catalog
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT,
    manufacturer TEXT,
    composition TEXT,
    dosage TEXT,
    indications TEXT,
    contraindications TEXT,
    side_effects TEXT,
    mrp DECIMAL(10,2),
    agorich_price DECIMAL(10,2),
    distributor_price DECIMAL(10,2),
    retailer_price DECIMAL(10,2),
    hsn_code TEXT,
    pack_size TEXT,
    batch_number TEXT,
    expiry_date DATE,
    mfg_date DATE,
    stock INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `invoices` - Invoice Records
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE,
    order_id TEXT,
    customer_id UUID REFERENCES profiles(id),
    distributor_id UUID REFERENCES profiles(id),
    user_id UUID REFERENCES auth.users,
    invoice_date DATE,
    due_date DATE,
    delivery_date DATE,
    subtotal DECIMAL(12,2),
    total_gst DECIMAL(12,2),
    grand_total DECIMAL(12,2),
    balance_due DECIMAL(12,2),
    status TEXT CHECK (status IN ('DRAFT', 'SENT', 'PROCESSING', 'PACKING', 'DISPATCHED', 'DELIVERED', 'PAID', 'CANCELLED', 'RETURNED', 'REFUNDED')),
    payment_status TEXT CHECK (payment_status IN ('PENDING', 'PARTIALLY_PAID', 'PAID')),
    payment_method TEXT,
    payment_amount DECIMAL(12,2),
    customer_data JSONB,
    distributor_data JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `routed_orders` - Orders Routed to Distributors
```sql
CREATE TABLE routed_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    invoice_id UUID REFERENCES invoices(id),
    distributor_id UUID REFERENCES profiles(id),
    retailer_id UUID REFERENCES profiles(id),
    status TEXT CHECK (status IN ('ASSIGNED', 'ACCEPTED', 'REJECTED', 'PACKING', 'PACKED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED')),
    margin DECIMAL(10,2),
    margin_percentage DECIMAL(5,2),
    logistics_cost DECIMAL(10,2),
    logistics_partner_id UUID,
    distance_km DECIMAL(10,2),
    assigned_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    packed_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    rejection_reason TEXT,
    rejection_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `distributor_inventory` - Distributor Stock
```sql
CREATE TABLE distributor_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID REFERENCES profiles(id),
    product_id UUID REFERENCES products(id),
    quantity INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

#### `logistics_partners` - Logistics Providers
```sql
CREATE TABLE logistics_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distributor_id UUID REFERENCES profiles(id),
    partner_name TEXT,
    partner_type TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Supporting Tables

| Table | Purpose |
|-------|---------|
| `orders` | Legacy order tracking |
| `invoice_items` | Line items for invoices |
| `payment_verifications` | Razorpay payment records |
| `distributor_margins` | Distributor earnings |
| `notifications` | User notifications |
| `retailer_distributor_lock` | Prevents order fragmentation |

---

## 6. Entity Relationships

```
┌──────────────┐
│  auth.users  │
└──────┬───────┘
       │ 1:1
       ▼
┌──────────────┐
│  profiles   │ ◄──── All user types
└──────┬───────┘
       │
       ├──┬──────────┬──────────┐
       │  │          │          │
       ▼  ▼          ▼          ▼
┌─────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐
│Admin/Sales│ │DISTRIBUTOR│ │ RETAILER │ │  LOGISTIC │
└────┬────┘ └────┬────┘ └────┬────┘ └────┬─────┘
     │           │           │            │
     │           ▼           │            │
     │    ┌────────────────────────┐     │
     │    │ distributor_inventory │     │
     │    └────────────────────────┘     │
     │           │                       │
     │           ▼                       │
     │    ┌────────────────────────┐     │
     │    │ logistics_partners     │     │
     │    └────────────────────────┘     │
     │           │                       │
     │           ▼                       │
     │    ┌────────────────────────┐     │
     │    │    routed_orders       │─────┘
     │    └────────────────────────┘
     │           │
     ▼           ▼
┌────────────────────────┐
│       invoices         │
└────────────────────────┘
```

---

## 7. Order Flow

### 7.1 Complete Order Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              ORDER LIFECYCLE                                  │
└──────────────────────────────────────────────────────────────────────────────┘

RETAILER                                        DISTRIBUTOR                          LOGISTICS
   │                                                │                                   │
   │  1. SELECT DISTRIBUTOR (distance slider)      │                                   │
   │ ───────────────────────────────────────────────►                                  │
   │                                                │                                   │
   │  2. CREATE INVOICE                            │                                   │
   │  (from distributor's inventory)                 │                                   │
   │                                                │                                   │
   │  3. PAYMENT (UPI/Razorpay)                    │                                   │
   │                                                │                                   │
   │  4. Invoice created: status=DRAFT              │                                   │
   │     Routed Order created: status=ASSIGNED       │                                   │
   │ ───────────────────────────────────────────────►                                  │
   │                                                │                                   │
   │                                        5. ACCEPT / REJECT                      │
   │                                                │                                   │
   │                                    ┌───────────┴───────────┐                  │
   │                                    │                     │                  │
   │                                    ▼                     ▼                  │
   │                               ACCEPTED              REJECTED               │
   │                                    │                     │                  │
   │                                    │                     │ (upto 3/month)   │
   │                                    ▼                     │                  │
   │                               6. PACK                  │                  │
   │                                    │                     │                  │
   │                                    ▼                     │                  │
   │                               7. DISPATCH ──────────────────────────────────►
   │                                    │                     │                  │
   │                                    │              8. PACK & DELIVER        │
   │                                    │                     │                  │
   │                                    │                     ▼                  │
   │                                    │              DELIVERED                 │
   │                                    │                     │                  │
   │ ◄─────────────────────────────────┴─────────────────────┘                  │
   │         9. ORDER DELIVERED                                                 │
   │                                                                            │
```

### 7.2 Step-by-Step Details

#### Step 1: Select Distributor
- Retailer opens "Order Now" page
- Distance slider shows nearby distributors (default 0-5km)
- Selects one distributor → Locked for this order
- Cannot switch to another distributor until order complete

#### Step 2: Create Invoice
- Only selected distributor's inventory shown
- Products added to cart
- Minimum order: ₹500
- Invoice generated with DRAFT status

#### Step 3: Payment
- Prepaid: UPI/Net Banking via Razorpay
- COD: Cash on Delivery
- Payment updates invoice to PAID

#### Step 4: Order Routing
- Invoice created with PAID status
- Routed order created with ASSIGNED status
- Distributor notified

#### Step 5: Distributor Accept/Reject
- Accept: Status → ACCEPTED
- Reject: Status → REJECTED (max 3/month)
- If 3 rejections reached → Can be delisted

#### Step 6: Dispatch
- Inventory deducted
- Status → DISPATCHED
- Invoice status also → DISPATCHED
- Logistics notified

#### Step 7: Delivery
- Logistics picks up
- Delivers to retailer
- Status → DELIVERED

---

## 8. Status Transitions

### 8.1 Invoice Status Flow

```
┌─────────┐     ┌──────────────┐     ┌────────────┐     ┌───────────┐
│  DRAFT  │────►│WAITING_FOR_  │────►│   SENT    │────►│PROCESSING│
│         │     │  APPROVAL    │     │           │     │          │
└─────────┘     └──────────────┘     └────────────┘     └─────┬────┘
      │               │                    │                  │
      │               │                    │                  ▼
      │               │                    │            ┌───────────┐
      │               │                    │            │  PACKING  │
      │               │                    │            └─────┬────┘
      │               │                    │                  │
      │               ▼                    ▼                  ▼
      │         ┌──────────┐        ┌───────────┐     ┌───────────┐
      └────────►│ CANCELLED│        │ OVERDUE   │     │ DISPATCHED│
                └──────────┘        └───────────┘     └─────┬────┘
                                                           │
                                                           ▼
                                                    ┌───────────┐
                                                    │ DELIVERED │
                                                    └─────┬─────┘
                                                          │
                            ┌─────────────────────────────┴────────────────┐
                            ▼                                                   ▼
                     ┌────────────┐                                     ┌──────────┐
                     │PARTIAL_PAID│                                     │   PAID   │
                     └────────────┘                                     └──────────┘
                            │                                                   │
                            ▼                                                   ▼
                     ┌──────────┐                                     ┌──────────┐
                     │   PAID   │                                     │ REFUNDED │
                     └──────────┘                                     └──────────┘
```

### 8.2 Routed Order Status Flow

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│  ASSIGNED │────►│ ACCEPTED │────►│  PACKING  │────►│  PACKED   │
└─────┬─────┘     └───────────┘     └───────────┘     └─────┬─────┘
      │                                                         │
      │                                                         ▼
      │                                                   ┌───────────┐
      │                                                   │ DISPATCHED│
      │                                                   └─────┬─────┘
      │                                                         │
      │                                                         ▼
      ▼                                                   ┌───────────┐
┌───────────┐     ┌───────────┐                      ┌───────────┐
│ REJECTED  │     │CANCELLED │                      │ IN_TRANSIT│
│(max 3/mo) │     └───────────┘                      └─────┬─────┘
└───────────┘                                                │
                                                              ▼
                                                        ┌───────────┐
                                                        │ DELIVERED │
                                                        └─────┬─────┘
                                                              │
                                                              ▼
                                                        ┌───────────┐
                                                        │ RETURNED  │
                                                        └───────────┘
```

---

## 9. API Endpoints

### 9.1 Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/callback` | OAuth callback |
| POST | `/api/auth/logout` | Logout |

### 9.2 Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile/[id]` | Get profile by ID |

### 9.3 Distributors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/distributors/by-distance` | Find nearby distributors |
| GET | `/api/distributor/inventory` | Get distributor inventory |
| GET | `/api/distributor/routed-orders` | Get routed orders |
| POST | `/api/distributor/routed-orders/accept` | Accept order |
| POST | `/api/distributor/routed-orders/reject` | Reject order |
| GET | `/api/distributor/logistics` | Get logistics partners |
| POST | `/api/distributor/logistics` | Add logistics partner |

### 9.4 Retailers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/retailer/distributor-lock` | Lock distributor |
| DELETE | `/api/retailer/distributor-lock` | Release lock |

### 9.5 Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List invoices |
| POST | `/api/invoices` | Create invoice |
| GET | `/api/invoices/[id]` | Get invoice |
| PATCH | `/api/invoices/[id]/status` | Update status |
| GET | `/api/invoices/[id]/pdf` | Generate PDF |

### 9.6 Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/create-order` | Create Razorpay order |
| POST | `/api/payments/verify` | Verify payment |
| POST | `/api/payments/webhook` | Razorpay webhook |

### 9.7 Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/retailers` | List retailers |
| GET | `/api/admin/distributors` | List distributors |
| GET | `/api/admin/wallet` | Wallet management |
| POST | `/api/admin/wallet` | Wallet operations |

### 9.8 System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

---

## 10. Key Features

### 10.1 Distance-Based Discovery
```typescript
// Retailer searches for distributors
const params = new URLSearchParams({
  lat: '25.5941',      // Retailer latitude
  lng: '85.1376',      // Retailer longitude
  radius: '10',        // Search radius in km
})
const res = await fetch(`/api/distributors/by-distance?${params}`)
```
- Uses Haversine formula for distance calculation
- Default radius: 5km
- Maximum radius: 50km

### 10.2 Distributor Lock Mechanism
```typescript
// Prevents order fragmentation
// Once distributor selected, cannot change until order complete
sessionStorage.setItem('selected_distributor_id', distributorId)
sessionStorage.setItem('selected_distributor_lock', 'true')
```
- Lock expires after order completion
- Prevents "shopping around" between distributors

### 10.3 Smart Dispatch
```typescript
// Single transaction handles multiple operations
await supabase.rpc('smart_dispatch_order', {
  p_order_id: orderId,
  p_distributor_id: distributorId,
  p_margin_percentage: 15
})
// Atomically:
// 1. Deducts inventory
// 2. Records distributor margin
// 3. Updates order status
// 4. Updates routed order status
// 5. Creates inventory ledger entries
```

### 10.4 Rejection Limits
```typescript
// Prevents distributor abuse
const maxRejections = 3
const currentRejections = distributor.monthly_rejection_count
if (currentRejections >= maxRejections) {
  throw new Error('Monthly rejection limit reached')
}
```
- Maximum 3 rejections per distributor per month
- Counter resets monthly
- Can lead to delisting if exceeded

### 10.5 Invoice Preview
```typescript
// Live preview while creating order
<LiveInvoicePreview invoiceData={invoiceData} />
```
- Real-time calculation of totals
- GST calculations
- Print-ready format

---

## 11. Security

### 11.1 Authentication
- Supabase Auth with email/password
- Role-based access control (RBAC)
- Session management

### 11.2 API Security
```typescript
// verifyRetailerOrAdmin - ensures only authorized access
export async function verifyRetailerOrAdmin(request: NextRequest) {
  // 1. Verify session
  // 2. Check role
  // 3. Return user or error
}

// verifyDistributor - for distributor-only routes
export async function verifyDistributor(request: NextRequest) {
  // 1. Verify session
  // 2. Ensure role is DISTRIBUTOR
}
```

### 11.3 Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Admin role bypasses RLS

### 11.4 Input Validation
```typescript
// Sanitization of all inputs
function sanitizeString(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return ''
  return input.trim().slice(0, maxLength).replace(/[<>\"\'`;\\]/g, '')
}
```

### 11.5 XSS Prevention
```typescript
// Notes field sanitized before storage
const sanitizeNotes = (input: string | null | undefined): string | null => {
  if (!input) return null
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
```

---

## 12. Third-Party Integrations

### 12.1 Razorpay
| Feature | Implementation |
|---------|----------------|
| Payment Gateway | UPI, Net Banking |
| Order Creation | `/api/payments/create-order` |
| Verification | `/api/payments/verify` |
| Webhooks | `/api/payments/webhook` |

### 12.2 Supabase
| Feature | Implementation |
|---------|----------------|
| Database | PostgreSQL |
| Authentication | Auth.users table |
| Realtime | Invoice status updates |
| Storage | File uploads |

### 12.3 Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_UPI_ID=
NEXT_PUBLIC_UPI_RECIPIENT_NAME=

# Bank Details
NEXT_PUBLIC_BANK_NAME=
NEXT_PUBLIC_BANK_ACCOUNT_NUMBER=
NEXT_PUBLIC_BANK_IFSC=
NEXT_PUBLIC_BANK_ACCOUNT_HOLDER=
```

---

## 13. Constants & Types

### 13.1 Unified Constants (`src/lib/constants.ts`)

```typescript
// Invoice Statuses
INVOICE_STATUSES = {
  DRAFT, WAITING_FOR_APPROVAL, SENT, PROCESSING,
  PACKING, DISPATCHED, DELIVERED, PARTIAL_PAID, PAID,
  OVERDUE, CANCELLED, RETURNED, REFUNDED, PAYMENT_FAILED
}

// Fulfillment Statuses
FULFILLMENT_STATUSES = {
  PLACED, ASSIGNED, ACCEPTED, REJECTED, PACKING,
  PACKED, DISPATCHED, IN_TRANSIT, DELIVERED, CANCELLED, RETURNED
}

// Payment Methods
PAYMENT_METHODS = {
  UPI, NET_BANKING, RAZORPAY, CASH, COD,
  CREDIT_NOTE, BALANCE_ADJUSTMENT
}

// Rejection Types
REJECTION_TYPES = {
  OUT_OF_STOCK, PRICING, DISTANCE, BUSINESS_POLICY,
  CUSTOMER_REQUEST, FORCE_MAJEURE, OTHER
}
```

### 13.2 State Machine Transitions

```typescript
// Valid fulfillment transitions
FULFILLMENT_TRANSITIONS = {
  ASSIGNED: [ACCEPTED, REJECTED, CANCELLED],
  ACCEPTED: [PACKING, CANCELLED],
  PACKING: [PACKED, CANCELLED],
  PACKED: [DISPATCHED],
  DISPATCHED: [IN_TRANSIT],
  IN_TRANSIT: [DELIVERED, RETURNED],
  DELIVERED: [RETURNED]
}

// Valid invoice transitions
INVOICE_TRANSITIONS = {
  DRAFT: [WAITING_FOR_APPROVAL, SENT, CANCELLED],
  SENT: [PROCESSING, CANCELLED],
  PROCESSING: [PACKING, CANCELLED],
  PACKING: [DISPATCHED, CANCELLED],
  DISPATCHED: [DELIVERED, RETURNED],
  DELIVERED: [PARTIAL_PAID, PAID, RETURNED],
  PARTIAL_PAID: [PAID]
}
```

---

## 14. Error Handling

### 14.1 Unified Error Responses
```typescript
// Standard error format
{
  success: false,
  error: "Error message",
  code?: "ERROR_CODE",
  details?: { ... }
}
```

### 14.2 Common Error Codes
| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid input data |
| `UNAUTHORIZED` | Not logged in |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Duplicate entry |
| `REJECTION_LIMIT` | Monthly rejection exceeded |

---

## 15. Migrations

### 15.1 Key Migrations
| File | Purpose |
|------|---------|
| `001_gst_compliant_invoice_system.sql` | Invoice system |
| `003_distributor_ecosystem.sql` | Routed orders |
| `FINAL_SAFE_GST_MIGRATION.sql` | Latest schema |
| `unified_status_constraints.sql` | Status fixes |

### 15.2 Running Migrations
```bash
# Via Supabase dashboard
# Or CLI
supabase db push

# Or raw SQL
psql -h host -U postgres -d database -f migrations/filename.sql
```

---

## 16. Testing Checklist

### 16.1 Order Flow
- [ ] Retailer can see distributors by distance
- [ ] Distributor lock works correctly
- [ ] Minimum ₹500 order enforced
- [ ] Invoice created with correct data
- [ ] Payment via Razorpay works
- [ ] Routed order appears for distributor
- [ ] Accept/Reject works
- [ ] Dispatch updates inventory
- [ ] Invoice status updates to DISPATCHED
- [ ] Logistics can see DISPATCHED invoices
- [ ] Delivery updates status to DELIVERED

### 16.2 Edge Cases
- [ ] Rejection limit (3/month)
- [ ] Delisting after limit exceeded
- [ ] Distributor lock prevents switching
- [ ] COD payment flow
- [ ] Invoice PDF generation
- [ ] Dark mode toggle

---

## 17. Glossary

| Term | Definition |
|------|------------|
| **B2B** | Business to Business |
| **Distributor** | Pharma distributor who sells to retailers |
| **Retailer** | End customer (pharmacy) who buys from distributors |
| **Routed Order** | Order assigned to a specific distributor |
| **AGORICH** | Platform name (Admin/Agorich entity) |
| **COD** | Cash on Delivery |
| **MRP** | Maximum Retail Price |
| **HSN** | Harmonized System of Nomenclature (tax codes) |

---

## 18. Contact & Support

For technical issues or questions:
- Email: support@agorich.com
- Internal: Use `/admin/debug` for diagnostics

---

**Document Version:** 1.0.0
**Last Updated:** June 2026
**Maintained By:** Development Team
