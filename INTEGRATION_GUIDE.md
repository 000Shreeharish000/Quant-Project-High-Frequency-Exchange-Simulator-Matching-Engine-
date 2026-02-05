# NEXUSX Authentication - Integration Guide

## 🎯 Overview

This guide walks you through integrating the NEXUSX authentication backend with your React frontend.

## 📁 Project Structure

```
FinTech SuperSecure Wallet/
├── frontend (your React app)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx          ✅ Updated with backend integration
│   │   │   ├── Signup.tsx         ✅ New signup page
│   │   │   └── Trade.tsx
│   │   ├── utils/
│   │   │   └── AuthService.ts     ✅ New auth utility
│   │   └── ...
│   ├── .env.local                 📝 Create this
│   └── ...
│
└── backend (new Node.js/TypeScript)
    ├── src/
    │   ├── routes/
    │   ├── controllers/
    │   ├── services/
    │   ├── models/
    │   └── ...
    ├── .env                       📝 Create from .env.example
    ├── package.json
    └── README.md
```

## 🚀 Setup Steps

### Step 1: Backend Setup

#### 1a. Install Dependencies

```bash
cd backend
npm install
# or
bun install
```

#### 1b. Create .env File

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# PostgreSQL (install locally or use Docker)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexusx_exchange
DB_USER=postgres
DB_PASSWORD=postgres

# Redis (install locally or use Docker)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT (generate a random secret!)
JWT_SECRET=your-secret-key-change-this-in-production

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Frontend URL (important for CORS and OAuth redirect)
FRONTEND_URL=http://localhost:5173
```

#### 1c. Install PostgreSQL & Redis

**Option A: Using Docker (Recommended)**

```bash
# Start PostgreSQL
docker run -d \
  --name nexusx-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=nexusx_exchange \
  -p 5432:5432 \
  postgres:15

# Start Redis
docker run -d \
  --name nexusx-redis \
  -p 6379:6379 \
  redis:7

# Check if running
docker ps | grep nexusx
```

**Option B: Local Installation**

- **PostgreSQL**: Download from https://www.postgresql.org/download/
- **Redis**: Download from https://redis.io/download or use Windows Subsystem for Linux (WSL)

#### 1d. Initialize Database

```bash
npm run db:init
```

You should see:
```
✅ Database connected
🔄 Initializing database schema...
✅ Database schema initialized successfully!
```

#### 1e. Start Backend Server

```bash
npm run dev
```

You should see:
```
╔════════════════════════════════════════════╗
║   ✅ NEXUSX Authentication Service        ║
║   🔐 Running on http://localhost:5000      ║
║   📊 Database: Connected                  ║
║   💾 Redis: Connected                     ║
║   🌐 Frontend: http://localhost:5173         ║
╚════════════════════════════════════════════╝
```

### Step 2: Frontend Setup

#### 2a. Create .env.local File

In your frontend root (same level as `src/`):

```bash
# Create .env.local in frontend root
echo "REACT_APP_API_URL=http://localhost:5000" > .env.local
```

Or manually create `frontend/.env.local`:

```env
REACT_APP_API_URL=http://localhost:5000
```

#### 2b. Update vite.config.ts (if using Vite)

If your frontend uses Vite, ensure environment variables are loaded:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': process.env,
  },
})
```

#### 2c. Frontend Routes

Update your router to include the new pages. Example with React Router:

```tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Trade from './pages/Trade';
import AuthService from './utils/AuthService';

// Protected route component
function ProtectedRoute({ children }) {
  return AuthService.isAuthenticated() ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route 
          path="/trade" 
          element={
            <ProtectedRoute>
              <Trade />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}
```

#### 2d. Logout Handler

Add logout functionality to your Trade page or header:

```tsx
import AuthService from '@/utils/AuthService';
import { useNavigate } from 'react-router-dom';

function Header() {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await AuthService.logoutServer();
    navigate('/login');
  };

  return (
    <header>
      {/* ... */}
      <button onClick={handleLogout}>Logout</button>
    </header>
  );
}
```

### Step 3: Google OAuth Setup

#### 3a. Get Google Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials (OAuth consent screen → Web application)
5. Add authorized redirect URIs:
   - `http://localhost:5000/auth/google/callback` (development)
   - Your production domain (later)
6. Copy the Client ID and Client Secret

#### 3b. Update Backend .env

```env
GOOGLE_CLIENT_ID=your-client-id-from-google
GOOGLE_CLIENT_SECRET=your-client-secret-from-google
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
```

#### 3c. Test Google Sign-In

1. Start the backend
2. Start the frontend
3. Click "Continue with Google" on login page
4. Should redirect to Google, then back to your app with token

### Step 4: Verify Integration

#### Test Email/Password Login

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

Response:
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "test@example.com",
      "first_name": "Test",
      "last_name": "User",
      "auth_method": "email"
    }
  }
}
```

#### Test Login

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### Test Protected Route

```bash
# Replace TOKEN with actual token from login
curl -X GET http://localhost:5000/auth/me \
  -H "Authorization: Bearer TOKEN"
```

## 🔐 Using AuthService in Components

### Example: Check if User is Logged In

```tsx
import AuthService from '@/utils/AuthService';
import { useEffect, useState } from 'react';

function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (AuthService.isAuthenticated()) {
      const user = AuthService.getUser();
      setUser(user);
    }
  }, []);

  if (!user) return <Navigate to="/login" />;

  return <div>Welcome, {user.first_name}!</div>;
}
```

### Example: Make Authenticated API Calls

```tsx
async function fetchUserOrders() {
  const headers = {
    ...AuthService.getAuthHeaders(),
    'Content-Type': 'application/json'
  };

  const response = await fetch('/api/orders', { headers });
  return response.json();
}
```

### Example: Logout

```tsx
async function handleLogout() {
  await AuthService.logoutServer();
  navigate('/login');
}
```

## 🚨 Common Issues & Solutions

### Issue: CORS Error

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**: 
- Ensure backend has correct FRONTEND_URL in .env
- Restart backend after changing .env

```env
FRONTEND_URL=http://localhost:5173
```

### Issue: Database Connection Failed

**Error**: `ECONNREFUSED 127.0.0.1:5432`

**Solution**:
- Check PostgreSQL is running: `psql -h localhost -U postgres`
- Or use Docker: `docker start nexusx-db`
- Verify DB_HOST, DB_USER, DB_PASSWORD in .env

### Issue: Google Sign-In Returns Error

**Error**: `Invalid redirect_uri`

**Solution**:
- Go to Google Cloud Console
- Check OAuth 2.0 Client ID
- Verify callback URL matches exactly:
  - Backend: `http://localhost:5000/auth/google/callback`
  - Google Console: Add exact same URL

### Issue: Token Not Persisting

**Error**: Token is not being saved in localStorage

**Solution**:
- Check browser console for errors
- Verify `REACT_APP_API_URL` in `.env.local` is correct
- Make sure `.env.local` is in the right directory (frontend root)

### Issue: "Session expired" on protected routes

**Error**: Valid token but getting 401 from protected routes

**Solution**:
- Ensure Redis is running: `docker start nexusx-redis`
- Check Redis connection in backend logs
- Verify SESSION_EXPIRY in backend .env (default: 86400 seconds)

## 📈 Production Deployment

### Before Deploying

1. **Change JWT Secret**
   ```env
   JWT_SECRET=generate-a-very-random-secret-string
   ```

2. **Update URLs**
   ```env
   FRONTEND_URL=https://yourdomain.com
   GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
   ```

3. **Configure Google OAuth**
   - Add production domain to Google Console authorized redirects

4. **Setup PostgreSQL**
   - Use managed service (AWS RDS, Heroku, etc.)
   - Enable SSL/TLS
   - Setup regular backups

5. **Setup Redis**
   - Use managed service (AWS ElastiCache, Heroku, etc.)
   - Enable authentication
   - Setup monitoring

6. **Environment Variables**
   - Never commit .env to git
   - Use environment management platform
   - Rotate credentials regularly

### Deployment Platforms

**Backend (Node.js)**
- Vercel (serverless)
- Heroku
- Railway
- AWS EC2/ECS
- DigitalOcean

**Frontend (React)**
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

## 🔗 API Reference

See [backend/README.md](../backend/README.md) for complete API documentation.

### Key Endpoints

- `POST /auth/register` - Register with email/password
- `POST /auth/login` - Login with email/password
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Google OAuth callback
- `POST /auth/logout` - Logout (requires auth)
- `GET /auth/me` - Get user profile (requires auth)

## 📚 Next Steps

1. ✅ Implement basic auth (email/password + Google)
2. 🔄 Add email verification
3. 🔄 Add password reset
4. 🔄 Add 2FA (two-factor authentication)
5. 🔄 Implement user profile editing
6. 🔄 Add trading endpoints
7. 🔄 Add WebSocket for real-time updates

## 💡 Testing Checklist

- [ ] Register with email/password
- [ ] Login with email/password
- [ ] Google sign-in works
- [ ] Token persists in localStorage
- [ ] Can access protected routes with token
- [ ] Logout clears token
- [ ] Invalid token returns 401
- [ ] Expired session returns 401
- [ ] Rate limiting works (5 failed logins = blocked)

## 🆘 Need Help?

1. Check backend logs: `npm run dev` output
2. Check browser console: F12 → Console
3. Check Network tab: F12 → Network (when calling API)
4. Verify .env files are created correctly
5. Make sure all services are running (PostgreSQL, Redis)

---

**Next**: Start your backend (`npm run dev`) and frontend, then test the login flow!
