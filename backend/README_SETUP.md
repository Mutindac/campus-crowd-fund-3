# Backend Setup Guide

## Prerequisites

- Node.js 18+
- PostgreSQL database (Neon PostgreSQL provided)
- npm or yarn

## Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL and other settings
```

3. Set up Prisma:
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations to create database tables
npm run prisma:migrate
```

4. Start the development server:
```bash
npm run dev
```

## Database Setup

The database URL is already configured in `.env.example`:
```
DATABASE_URL="postgresql://neondb_owner:npg_MN1kFQDgalf3@ep-small-grass-a4p9djbf-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

## Prisma Commands

- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio to view/edit data

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login user

### Campaigns (requires authentication)
- `GET /api/campaigns` - List all campaigns
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns` - Create new campaign
- `POST /api/campaigns/:id/donate` - Donate to campaign

### Price
- `GET /api/price/avax-kes` - Get AVAX to KES conversion rate

## Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 3001)

Optional:
- `AVALANCHE_RPC_URL` - Avalanche RPC endpoint
- `CONTRACT_ADDRESS` - Smart contract address
- `PRIVATE_KEY` - Wallet private key for contract interactions

