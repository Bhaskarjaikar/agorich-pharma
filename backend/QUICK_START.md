# Saleor Backend - Quick Start Guide

## ✅ Setup Complete!

Saleor-compatible GraphQL backend has been set up successfully!

## 🚀 How to Start

### Option 1: Using Batch File (Easiest)
1. Double-click `START_SALEOR.bat` in the `backend` folder
2. Wait for "Server is ready" message
3. Open browser to http://localhost:8000/graphql/

### Option 2: Using Command Line
```bash
cd backend
npm run start
```

## 📋 Before Starting

1. **Create `.env` file** (if not exists):
   - Copy `backend/.env.example` to `backend/.env`
   - Update `DATABASE_URL` with your PostgreSQL connection string

2. **Database Setup**:
   - Make sure PostgreSQL is running
   - Database should exist (or will be created automatically)
   - Update connection string in `.env`

## 🌐 Endpoints

Once started, you'll have:
- **GraphQL API**: http://localhost:8000/graphql/
- **GraphQL Playground**: http://localhost:8000/graphql/ (interactive query tool)

## 🔧 Configuration

Edit `backend/.env` to configure:
- Database connection
- Port number
- CORS settings

## 📝 Test Query

Open http://localhost:8000/graphql/ and try:

```graphql
query {
  products(first: 5) {
    edges {
      node {
        id
        name
        description
        pricing {
          priceRange {
            start {
              gross {
                amount
                currency
              }
            }
          }
        }
      }
    }
  }
}
```

## ❌ Troubleshooting

**Server won't start?**
- Check if PostgreSQL is running
- Verify DATABASE_URL in `.env` file
- Check if port 8000 is available

**Database connection error?**
- Verify PostgreSQL credentials
- Check if database exists
- Test connection manually

**GraphQL errors?**
- Make sure database has `products` table
- Check server logs for details

## 🎉 That's it!

Your Saleor-compatible backend is ready to use!

