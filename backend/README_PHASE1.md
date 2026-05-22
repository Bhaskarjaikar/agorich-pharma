# PIOS Backend - Phase 1 (Operational Backbone)

## Overview
This is Phase 1 of the Pharma Intelligence Operating System - the operational backbone modules.

## Tech Stack
- Node.js + TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- JWT Authentication
- bcrypt

## Modules Implemented

### 1. Authentication + RBAC
- Signup
- Login
- Logout
- Refresh token rotation
- Protected routes
- Role-based access control
- Password hashing

### 2. User Management
- Create user
- Update user
- Deactivate/Activate user
- Assign territory
- CRUD operations

### 3. Product Management
- Product CRUD
- Search and filter
- Salt-based search
- Pagination

### 4. Inventory Management
- Stock add/reduce/reserve/release
- Stock transfer
- Batch tracking
- Expiry tracking
- PostgreSQL transactions

### 5. Order Management System (OMS)
- Place order
- View orders
- Reorder
- Accept/Reject/Pack/Dispatch/Deliver
- Order states: PENDING, ACCEPTED, REJECTED, PACKED, DISPATCHED, DELIVERED, CANCELLED

### 6. Invoice System
- Generate invoice from order
- GST calculation
- Payment status tracking
- Invoice items

### 7. Dashboard APIs
- Admin dashboard metrics
- Distributor dashboard
- Retailer dashboard

## Project Structure
```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── repositories/    # Data access layer
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   ├── validators/      # Request validators
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript types
│   └── server.ts        # Entry point
├── prisma/
│   └── schema.prisma    # Database schema
└── package.json
```

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Copy .env.example to .env and configure:
```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secrets
```

3. Generate Prisma client:
```bash
npm run prisma:generate
```

4. Run database migrations:
```bash
npm run prisma:migrate
```

5. Start development server:
```bash
npm run dev
```

## API Endpoints

### Auth
- `POST /api/v1/auth/signup` - Signup
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh-token` - Refresh token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

### Users
- `POST /api/v1/users` - Create user
- `GET /api/v1/users` - Get all users
- `GET /api/v1/users/:id` - Get user by ID
- `PUT /api/v1/users/:id` - Update user
- `PATCH /api/v1/users/:id/deactivate` - Deactivate user
- `PATCH /api/v1/users/:id/activate` - Activate user
- `PATCH /api/v1/users/:id/assign-territory` - Assign territory

### Products
- `POST /api/v1/products` - Create product
- `GET /api/v1/products` - Get all products
- `GET /api/v1/products/search/salt` - Search by salt
- `GET /api/v1/products/:id` - Get product by ID
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Delete product

### Inventory
- `POST /api/v1/inventory/add` - Add stock
- `GET /api/v1/inventory` - Get inventory
- `GET /api/v1/inventory/:id` - Get inventory by ID
- `PUT /api/v1/inventory/:id` - Update inventory
- `POST /api/v1/inventory/reserve` - Reserve stock
- `POST /api/v1/inventory/release` - Release stock
- `POST /api/v1/inventory/transfer` - Transfer stock

### Orders
- `POST /api/v1/orders` - Place order
- `GET /api/v1/orders` - Get orders
- `GET /api/v1/orders/:id` - Get order by ID
- `PATCH /api/v1/orders/:id/status` - Update status
- `POST /api/v1/orders/:id/accept` - Accept order
- `POST /api/v1/orders/:id/reject` - Reject order
- `POST /api/v1/orders/:id/pack` - Pack order
- `POST /api/v1/orders/:id/dispatch` - Dispatch order
- `POST /api/v1/orders/:id/deliver` - Deliver order
- `POST /api/v1/orders/:id/cancel` - Cancel order
- `POST /api/v1/orders/:id/reorder` - Reorder

### Invoices
- `POST /api/v1/invoices/from-order/:orderId` - Generate invoice
- `GET /api/v1/invoices` - Get invoices
- `GET /api/v1/invoices/:id` - Get invoice by ID
- `PUT /api/v1/invoices/:id` - Update invoice
- `POST /api/v1/invoices/:id/payment` - Record payment
- `POST /api/v1/invoices/:id/send` - Send invoice

### Dashboard
- `GET /api/v1/dashboard/admin` - Admin dashboard
- `GET /api/v1/dashboard/distributor` - Distributor dashboard
- `GET /api/v1/dashboard/retailer` - Retailer dashboard

## Roles
- ADMIN
- DISTRIBUTOR
- RETAILER
- DELIVERY_PARTNER
