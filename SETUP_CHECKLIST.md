# ✅ NEXUSX Authentication Setup Checklist

Use this checklist to ensure everything is set up correctly.

## 📦 Prerequisites

- [ ] Docker installed
- [ ] Node.js 18+ installed
- [ ] npm or bun installed
- [ ] Git installed
- [ ] Text editor (VS Code recommended)

## 🗄️ Database & Cache

- [ ] Docker Compose file exists: `docker-compose.yml`
- [ ] Run: `docker-compose up -d`
- [ ] PostgreSQL running on port 5432
  - [ ] Test: `psql -h localhost -U postgres -d nexusx_exchange`
- [ ] Redis running on port 6379
  - [ ] Test: `redis-cli ping` (should return PONG)

## 🔧 Backend Setup

### Installation
- [ ] Navigate to `backend` folder
- [ ] Run: `npm install`
- [ ] Wait for all dependencies to install

### Configuration
- [ ] Create `backend/.env` file
- [ ] Copy contents from `backend/.env.example`
- [ ] Update values:
  - [ ] `DB_HOST=localhost`
  - [ ] `DB_USER=postgres`
  - [ ] `DB_PASSWORD=postgres`
  - [ ] `DB_NAME=nexusx_exchange`
  - [ ] `REDIS_HOST=localhost`
  - [ ] `JWT_SECRET=your-secret-key-here` (change this!)
  - [ ] `FRONTEND_URL=http://localhost:5173`

### Database Initialization
- [ ] Run: `npm run db:init`
- [ ] You should see:
  ```
  ✅ Database connected
  🔄 Initializing database schema...
  ✅ Database schema initialized successfully!
  ```

### Start Backend
- [ ] Run: `npm run dev`
- [ ] You should see:
  ```
  ╔════════════════════════════════════════════╗
  ║   ✅ NEXUSX Authentication Service        ║
  ║   🔐 Running on http://localhost:5000      ║
  ║   📊 Database: Connected                  ║
  ║   💾 Redis: Connected                     ║
  ║   🌐 Frontend: http://localhost:5173        ║
  ╚════════════════════════════════════════════╝
  ```
- [ ] Test health: `curl http://localhost:5000/health`
- [ ] Should return: `{"status":"ok","timestamp":"..."}`

## 💻 Frontend Setup

### Configuration
- [ ] Go to project root (not in `backend`)
- [ ] Create `.env.local` file
- [ ] Add: `REACT_APP_API_URL=http://localhost:5000`

### Verify Setup
- [ ] Check file exists: `ls .env.local` or `dir .env.local`
- [ ] Check content: `cat .env.local` or `type .env.local`

### Start Frontend
- [ ] Run: `npm run dev`
- [ ] You should see:
  ```
  ➜  Local:   http://localhost:5173/
  ```

## 🔐 Google OAuth (Optional)

### Get Credentials
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create new project named "NEXUSX"
- [ ] Search for "Google+ API" and enable it
- [ ] Create OAuth consent screen:
  - [ ] User type: External
  - [ ] Add your email as test user
- [ ] Create OAuth 2.0 credentials:
  - [ ] Type: Web application
  - [ ] Authorized redirect URIs: `http://localhost:5000/auth/google/callback`
- [ ] Copy Client ID and Client Secret

### Update Backend
- [ ] Edit `backend/.env`
- [ ] Add Google credentials:
  ```env
  GOOGLE_CLIENT_ID=your-client-id-here
  GOOGLE_CLIENT_SECRET=your-client-secret-here
  GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
  ```
- [ ] Restart backend: Stop and run `npm run dev` again

## 🧪 Testing Email/Password Auth

### Register New User
- [ ] Open `http://localhost:5173` in browser
- [ ] Click "Create account"
- [ ] Fill in form:
  - [ ] First Name: TestFirst
  - [ ] Email: test@example.com
  - [ ] Password: Password123!
  - [ ] Confirm: Password123!
- [ ] Click "Create Account"
- [ ] Should redirect to `/trade`
- [ ] Check localStorage has token: F12 → Application → Local Storage → accessToken

### Login with Credentials
- [ ] Click "Sign in" or go to `/login`
- [ ] Enter email: test@example.com
- [ ] Enter password: Password123!
- [ ] Click "Sign in"
- [ ] Should redirect to `/trade`

### Test Protected Route
- [ ] Refresh page (token should persist)
- [ ] Should stay on `/trade`
- [ ] Try removing token from localStorage
- [ ] Should redirect to `/login`

## 🌐 Testing Google OAuth

### Test Google Sign-In
- [ ] On login page, click "Continue with Google"
- [ ] Should redirect to Google login
- [ ] Sign in with your Google account
- [ ] Should redirect back to `/trade`
- [ ] Token should be in localStorage

## 🔍 Verification

### Backend Health
```bash
# Test endpoints with curl
curl http://localhost:5000/health
curl http://localhost:5000/auth/me \
  -H "Authorization: Bearer INVALID_TOKEN"
# Should return 401
```

### Database
```bash
# Check users in database
psql -h localhost -U postgres -d nexusx_exchange
# \dt (list tables)
# SELECT * FROM users; (list users)
```

### Redis
```bash
# Check Redis is storing sessions
redis-cli
# KEYS * (list all keys)
# GET session:* (check session keys)
```

## 📝 Common Issues

### Issue: Database Connection Failed

**Symptoms**: 
```
❌ Database connection failed
ECONNREFUSED 127.0.0.1:5432
```

**Solution**:
```bash
# Check if PostgreSQL is running
docker-compose ps
# Should show "postgres" as "Up"

# If not running, start it
docker-compose up -d postgres

# Check connection
psql -h localhost -U postgres
```

### Issue: CORS Error

**Symptoms**: 
```
Access to XMLHttpRequest blocked by CORS policy
No 'Access-Control-Allow-Origin' header
```

**Solution**:
```bash
# Check FRONTEND_URL in backend/.env
cat backend/.env | grep FRONTEND_URL
# Should be: FRONTEND_URL=http://localhost:5173

# Restart backend if you changed it
```

### Issue: Token Not Saving

**Symptoms**: 
```
Token appears to be generated but doesn't save in localStorage
```

**Solution**:
```bash
# Check .env.local exists and has correct content
cat .env.local
# Should show: REACT_APP_API_URL=http://localhost:5000

# Check browser console (F12) for errors
# Check Network tab (F12) to see API responses
```

### Issue: Google Sign-In Returns Error

**Symptoms**:
```
Redirect URI mismatch
Invalid client ID
```

**Solution**:
1. Go to Google Cloud Console
2. Check OAuth 2.0 Client ID credentials
3. Verify "Authorized redirect URIs" includes:
   ```
   http://localhost:5000/auth/google/callback
   ```
4. Make sure Client ID and Secret are correct in backend/.env
5. Restart backend

## 🚀 Ready to Go!

All items checked? Then you're ready! Here's the final verification:

```bash
# Terminal 1: Ensure services are running
docker-compose ps
# Should show postgres and redis as Up

# Terminal 2: Backend running
cd backend && npm run dev
# Should show green checkmarks

# Terminal 3: Frontend running
npm run dev
# Should show "Local: http://localhost:5173"

# Browser: Visit http://localhost:5173
# Should show login page
# Click "Create account" and register
# Should redirect to /trade
```

If all above works, you have a complete, working authentication system! ✅

## 📋 Files to Check

| File | What to Check | Command |
|------|---------------|---------|
| `backend/.env` | All env vars set | `cat backend/.env` |
| `.env.local` | API URL correct | `cat .env.local` |
| `docker-compose.yml` | Exists in root | `ls docker-compose.yml` |
| `backend/src/index.ts` | No syntax errors | Shown in terminal |
| `src/pages/Login.tsx` | Updated with API calls | Check for `fetch` |

## 🎯 Next Milestones

Once working:
- [ ] Test rate limiting (5 failed logins)
- [ ] Test logout
- [ ] Test access after logout (should redirect to login)
- [ ] Customize error messages
- [ ] Add email verification (future)
- [ ] Add password reset (future)
- [ ] Deploy to production

## 💡 Pro Tips

1. Keep all three terminals open while developing
2. Use F12 browser tools constantly
3. Check error messages carefully
4. Database and Redis must be running
5. Port 5000 (backend) and 5173 (frontend) must be free
6. If ports in use: `lsof -i :5000` to find process

## 🆘 Can't Get It Working?

1. Read error message carefully
2. Check relevant section in `INTEGRATION_GUIDE.md`
3. Check browser console (F12 → Console)
4. Check backend terminal output
5. Verify all `.env` files are created
6. Make sure Docker containers are running
7. Try restarting everything

---

**Remember**: All three services must be running:
- ✅ Docker (PostgreSQL + Redis)
- ✅ Backend (`npm run dev`)
- ✅ Frontend (`npm run dev`)

Once they're all running, authentication is complete! 🎉
