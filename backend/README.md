# Agorich Pharma - MedusaJS Backend

This is the MedusaJS backend for Agorich Pharma application.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+ (can use existing Supabase PostgreSQL or local)
- Redis (optional but recommended for caching)

## Quick Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `ENV_EXAMPLE.txt` to `.env` and update with your database credentials:

```bash
cp ENV_EXAMPLE.txt .env
```

**Required Variables:**
- `DB_USERNAME` - PostgreSQL username
- `DB_PASSWORD` - PostgreSQL password
- `DB_HOST` - PostgreSQL host (localhost or Supabase host)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_DATABASE` - Database name (create new: `medusa_agorich`)

**Optional Variables:**
- `REDIS_URL` - Redis connection string (if available)

### 3. Create Database

If using local PostgreSQL:
```sql
CREATE DATABASE medusa_agorich;
```

If using Supabase PostgreSQL, create a new database or use a different schema.

### 4. Run Migrations

```bash
npm run migrate
```

This will create all necessary tables for MedusaJS and your custom product fields.

### 5. Create Admin User

After migrations, you can create an admin user:

```bash
npx medusa user -e admin@agorich.com -p admin123
```

Update the email and password as needed.

### 6. Start the Backend

**Development mode:**
```bash
npm run dev
```

The backend will start on:
- API: http://localhost:9000
- Admin Panel: http://localhost:7001

**Production mode:**
```bash
npm run build
npm start
```

## Custom Features

### Extended Product Model

The Product entity has been extended with pharma-specific fields:

- `manufacturer` - Drug manufacturer name/code
- `pack_size` - Package size (e.g., "10 tablets", "100ml")
- `batch_number` - Batch/lot number
- `expiry_date` - Expiry date
- `agorich_price` - Agorich wholesale price
- `retailer_price` - Retailer selling price
- `margin` - Profit margin percentage
- `composition` - Drug composition
- `dosage` - Dosage information
- `indications` - Medical indications
- `contraindications` - Contraindications
- `side_effects` - Possible side effects
- `therapeutic_class` - Therapeutic classification
- `is_prescription_required` - Prescription requirement flag
- `rating` - Product rating

### Bulk Import Endpoint

POST `/admin/products/bulk-import`

Import multiple products at once:

```json
{
  "products": [
    {
      "title": "Product Name",
      "manufacturer": "Manufacturer Code",
      "pack_size": "10 tablets",
      "batch_number": "BATCH123",
      "expiry_date": "2025-12-31",
      "agorich_price": 100.00,
      "retailer_price": 120.00,
      "margin": 16.67,
      // ... other fields
    }
  ]
}
```

## API Endpoints

### Store API (Port 9000)
- `GET /store/products` - List products
- `GET /store/products/:id` - Get product details
- `POST /store/cart` - Create cart
- `POST /store/orders` - Create order

### Admin API (Port 9000)
- `GET /admin/products` - List products
- `POST /admin/products` - Create product
- `PUT /admin/products/:id` - Update product
- `DELETE /admin/products/:id` - Delete product
- `POST /admin/products/bulk-import` - Bulk import

### Admin Panel (Port 7001)
Access the visual admin interface at http://localhost:7001

Default credentials (if using ENV defaults):
- Email: admin@agorich.com
- Password: admin123

## Integration with Next.js Frontend

The Next.js app communicates with this backend through API proxy routes in:
`/src/app/api/medusa/`

These proxy routes handle:
1. Authentication (passing Supabase user context)
2. Request forwarding to MedusaJS
3. Response formatting for the frontend

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check credentials in `.env`
- Ensure database `medusa_agorich` exists

### Port Already in Use
- Change ports in `.env`:
  - `BACKEND_URL=http://localhost:9001` (or any free port)
  - `ADMIN_URL=http://localhost:7002`

### Redis Not Available
- Redis is optional
- Comment out Redis config in `medusa-config.js` if not using:
```javascript
// redis_url: REDIS_URL,  // Comment this line
```

## Data Migration

To migrate existing products from Supabase to MedusaJS, use the migration script:

```bash
cd ..
node scripts/migrate-to-medusa.js
```

This will transfer all products while preserving data integrity.
















