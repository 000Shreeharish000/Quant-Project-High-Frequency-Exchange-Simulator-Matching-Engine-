# NEXUSX - Financial Exchange Platform

## ✅ Authentication System Complete

### What's Working
- ✅ Email/password registration & login
- ✅ Google OAuth 2.0 sign-in
- ✅ JWT tokens + Redis sessions
- ✅ PostgreSQL database
- ✅ Rate limiting
- ✅ React frontend integration

## Quick Start

```bash
# 1. Start database & cache
docker-compose up -d

# 2. Start backend
cd backend
npm install
cp .env.example .env
npm run db:init
npm run dev

# 3. Start frontend (new terminal)
npm run dev

# 4. Visit http://localhost:5173
```

## API Endpoints

```
POST   /auth/register   - Create account
POST   /auth/login      - Login
GET    /auth/google     - Google OAuth
POST   /auth/logout     - Logout
GET    /auth/me         - Get profile
```

## Using Auth in React

```tsx
import AuthService from '@/utils/AuthService';
import ApiClient from '@/utils/ApiClient';

// Check logged in
if (!AuthService.isAuthenticated()) {
  navigate('/login');
}

// Make authenticated API call
const result = await ApiClient.get('/api/endpoint');

// Logout
await AuthService.logoutServer();
```

## Environment Variables

**Backend (.env)**
```env
PORT=5000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173
```

**Frontend (.env.local)**
```env
REACT_APP_API_URL=http://localhost:5000
```

## Files Created

**Backend:**
- `backend/src/` - Express API with auth logic
- `backend/src/models/User.ts` - Database model
- `backend/src/services/AuthService.ts` - Auth logic
- `backend/src/routes/auth.ts` - API endpoints
- `backend/src/middleware/` - JWT & rate limiting

**Frontend:**
- `src/pages/Login.tsx` - Login page
- `src/pages/Signup.tsx` - Signup page
- `src/utils/AuthService.ts` - Token management
- `src/utils/ApiClient.ts` - Authenticated API calls

**Infrastructure:**
- `docker-compose.yml` - PostgreSQL + Redis
- `backend/Dockerfile` - Container image

## Setup Instructions

See [SETUP.md](SETUP.md) for detailed steps and troubleshooting.
