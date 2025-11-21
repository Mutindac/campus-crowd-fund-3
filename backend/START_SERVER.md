# How to Start the Backend Server

## Quick Start

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Set up Prisma** (if not already done):
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. **Create .env file** (if not exists):
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and JWT_SECRET
   ```

5. **Start the server**:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3001`

## Verify Server is Running

- Check console for: `🚀 Server running on port 3001`
- Visit: `http://localhost:3001/health` in your browser
- Should see: `{"status":"ok","timestamp":...}`

## Troubleshooting

### Port 3001 already in use
- Change `PORT` in `.env` file
- Or kill the process using port 3001

### Database connection error
- Check `DATABASE_URL` in `.env` file
- Ensure PostgreSQL database is accessible
- Run `npm run prisma:studio` to test connection

### Prisma errors
- Run `npm run prisma:generate` to regenerate client
- Run `npm run prisma:migrate` to apply migrations

