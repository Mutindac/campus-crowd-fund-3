# Authentication Flow Documentation

## Overview
This document explains how user accounts are created, stored, and authenticated in the backend database.

## Flow Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │         │   Backend    │         │  Database   │
│  (Sign Up)  │────────▶│   /auth/     │────────▶│  PostgreSQL │
│             │         │   signup     │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
       │                        │                        │
       │                        │                        │
       │◀───────────────────────┼───────────────────────┘
       │     User + Token       │
       │                        │
       ▼                        │
┌─────────────┐                │
│  AuthContext│                │
│  (Stored)   │                │
└─────────────┘                │
                                │
┌─────────────┐         ┌───────▼────────┐
│   Frontend  │         │   Backend      │
│  (Login)    │────────▶│   /auth/       │
│             │         │   login       │
└─────────────┘         └───────┬────────┘
       │                        │
       │                        │
       │                        ▼
       │                 ┌─────────────┐
       │                 │  Database   │
       │                 │  (Fetch)    │
       │                 └──────┬──────┘
       │                        │
       │                        │
       │◀───────────────────────┘
       │     User + Token
       │
       ▼
┌─────────────┐
│  AuthContext│
│  (Stored)   │
└─────────────┘
```

## Sign Up Process

1. **User fills form** (`src/pages/SignUp.tsx`)
   - Name, Email, Password, Wallet Address

2. **Frontend sends request** (`src/lib/api.ts`)
   ```javascript
   POST /api/auth/signup
   {
     name: "John Doe",
     email: "john@example.com",
     password: "password123",
     walletAddress: "0x..."
   }
   ```

3. **Backend validates** (`backend/src/controllers/authController.js`)
   - Validates input with Zod schema
   - Checks if email already exists in database

4. **Backend saves to database** (`backend/src/controllers/authController.js`)
   ```javascript
   const user = await prisma.user.create({
     data: {
       name,
       email,
       passwordHash: await bcrypt.hash(password, 10),
       walletAddress,
     }
   });
   ```
   - Password is hashed with bcrypt before storage
   - User data is saved to PostgreSQL via Prisma

5. **Backend returns response**
   ```json
   {
     "success": true,
     "data": {
       "token": "jwt_token_here",
       "user": {
         "id": 1,
         "name": "John Doe",
         "email": "john@example.com",
         "walletAddress": "0x..."
       }
     }
   }
   ```

6. **Frontend stores user data** (`src/contexts/AuthContext.tsx`)
   - Token stored in localStorage
   - User data stored in AuthContext state

## Login Process

1. **User fills form** (`src/pages/Login.tsx`)
   - Email, Password

2. **Frontend sends request** (`src/lib/api.ts`)
   ```javascript
   POST /api/auth/login
   {
     email: "john@example.com",
     password: "password123"
   }
   ```

3. **Backend fetches from database** (`backend/src/controllers/authController.js`)
   ```javascript
   const user = await prisma.user.findUnique({
     where: { email }
   });
   ```
   - Queries PostgreSQL database via Prisma
   - Returns user record if found

4. **Backend verifies password**
   ```javascript
   const isValidPassword = await bcrypt.compare(
     password, 
     user.passwordHash
   );
   ```
   - Compares provided password with stored hash

5. **Backend returns response**
   ```json
   {
     "success": true,
     "data": {
       "token": "jwt_token_here",
       "user": {
         "id": 1,
         "name": "John Doe",
         "email": "john@example.com",
         "walletAddress": "0x..."
       }
     }
   }
   ```

6. **Frontend stores user data** (`src/contexts/AuthContext.tsx`)
   - Token stored in localStorage
   - User data stored in AuthContext state

## Database Schema

The user data is stored in the `users` table with the following structure:

```prisma
model User {
  id            Int      @id @default(autoincrement())
  name          String
  email         String   @unique
  passwordHash  String   @map("password_hash")
  walletAddress String   @map("wallet_address")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## Security Features

1. **Password Hashing**: Passwords are hashed using bcrypt (10 rounds)
2. **JWT Tokens**: Authentication tokens expire after 7 days
3. **Input Validation**: All inputs validated with Zod schemas
4. **Email Uniqueness**: Database enforces unique email constraint
5. **Wallet Address Validation**: Regex validation for Ethereum/Avalanche addresses

## Testing the Flow

1. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm run dev
   ```

2. **Create Account**:
   - Navigate to `/signup`
   - Fill in form and submit
   - Check backend console for: `✅ User created in database: email@example.com (ID: 1)`
   - Check database: `npm run prisma:studio` to view users table

3. **Login**:
   - Navigate to `/login`
   - Use same email/password
   - Check backend console for: `✅ User logged in from database: email@example.com (ID: 1)`

## Verification

To verify data is being stored and fetched:

1. **Check Database**:
   ```bash
   npm run prisma:studio
   ```
   - Open browser to view users table
   - Verify user records exist

2. **Check Backend Logs**:
   - Look for `✅ User created in database` messages
   - Look for `✅ User logged in from database` messages

3. **Check Frontend**:
   - User data should persist after page refresh
   - Check localStorage for token and user data

