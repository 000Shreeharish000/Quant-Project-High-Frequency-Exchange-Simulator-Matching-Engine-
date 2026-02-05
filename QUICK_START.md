# 🚀 NEXUSX Authentication - Quick Start Guide

Get your authentication system up and running in 10 minutes!

## ⚡ Super Quick Start (5 minutes with Docker)

### Prerequisites

- Docker & Docker Compose (download from docker.com)
- Node.js 18+
- Google OAuth credentials (optional for testing)

### Step 1: Start Services

```bash
# From project root, create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: nexusx_exchange
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
EOF

# Start containers
docker-compose up -d
```

### Step 2: Setup Backend

```bash
cd backend

# Install
npm install

# Create .env
echo "PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexusx_exchange
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=dev-secret-key-change-in-production
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
FRONTEND_URL=http://localhost:5173" > .env

# Initialize database
npm run db:init

# Start server
npm run dev
```

### Step 3: Setup Frontend

```bash
# In frontend root
echo "REACT_APP_API_URL=http://localhost:5000" > .env.local

# Start frontend
npm run dev
```

### Step 4: Test

1. Open `http://localhost:5173` in browser
2. Go to login page
3. Register: `test@example.com` / `password123`
4. Click "Sign in"
5. Should redirect to `/trade`

✅ **Done!** You now have a working authentication system.

---

## 📋 What You Get

### Backend Features ✅

- Email/Password authentication with bcrypt
- Google OAuth 2.0 sign-in
- JWT tokens with Redis session validation
- PostgreSQL user storage
- Rate limiting (5 auth attempts per 15 min)
- CORS configured for frontend
- Production-ready error handling

### Frontend Integration ✅

- Login page connected to backend
- Signup page with validation
- AuthService utility for making API calls
- Token persistence in localStorage
- Protected routes support
- ApiClient for authenticated requests

---

## 🔐 API Endpoints

All endpoints are at `http://localhost:5000/auth/`

### Public Endpoints

```bash
# Register
POST /auth/register
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}

# Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "securePassword123"
}

# Google OAuth (opens browser)
GET /auth/google

# Google callback (handled automatically)
GET /auth/google/callback
```

### Protected Endpoints (Require Authorization Header)

```bash
# Get profile
GET /auth/me
Headers: Authorization: Bearer <token>

# Logout
POST /auth/logout
Headers: Authorization: Bearer <token>
```

---

## 🔑 Using in Your Components

### Example 1: Check Authentication

```tsx
import AuthService from '@/utils/AuthService';

function MyComponent() {
  if (!AuthService.isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  
  const user = AuthService.getUser();
  return <div>Welcome {user?.first_name}!</div>;
}
```

### Example 2: Make Authenticated API Call

```tsx
import ApiClient from '@/utils/ApiClient';

async function fetchOrders() {
  const result = await ApiClient.get('/api/orders');
  if (result.success) {
    console.log(result.data);
  } else {
    console.error(result.error);
  }
}
```

### Example 3: Logout

```tsx
async function handleLogout() {
  await AuthService.logoutServer();
  navigate('/login');
}
```

---

## 🐛 Troubleshooting

### Errors on startup?

1. Check Docker containers are running:
   ```bash
   docker-compose ps
   ```

2. Check .env file exists:
   ```bash
   cat backend/.env
   ```

3. Check database initialized:
   ```bash
   cd backend && npm run db:init
   ```

### Can't login?

1. Check backend is running: `curl http://localhost:5000/health`
2. Check frontend .env.local: `cat .env.local`
3. Check browser console (F12) for errors
4. Check network tab (F12) for API requests

### Google sign-in not working?

1. Get credentials from [Google Cloud Console](https://console.cloud.google.com/)
2. Add `http://localhost:5000/auth/google/callback` to allowed redirects
3. Update backend .env with CLIENT_ID and CLIENT_SECRET
4. Restart backend

---

## 📝 Environment Variables

### Backend (.env)

```env
# Server
PORT=5000                                          # Server port
NODE_ENV=development                               # development or production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexusx_exchange
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key-here                   # CHANGE THIS!
JWT_EXPIRY=24h                                     # Token expiration time

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:5173                # For CORS and redirects
```

### Frontend (.env.local)

```env
REACT_APP_API_URL=http://localhost:5000           # Backend URL
```

---

## 🚀 Next Steps

1. ✅ Authentication working
2. Add email verification
3. Add password reset
4. Add user profile editing
5. Add wallet/balance management
6. Add order placement APIs
7. Add WebSocket for real-time updates

---

## 📚 Full Documentation

- **Backend**: See [backend/README.md](backend/README.md)
- **Integration**: See [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)
- **API Docs**: Check backend README for endpoint details

---

## 💡 Pro Tips

### Test API with curl

```bash
# Register
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","firstName":"Test"}'

# Login (save token from response)
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# Get profile
curl -X GET http://localhost:5000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Stop Services

```bash
# Stop everything
docker-compose down

# Stop just the app
# Kill the npm processes or Ctrl+C in terminals
```

---

## 🆘 Quick Help

| Problem | Solution |
|---------|----------|
| Can't connect to database | Run `docker-compose up -d` |
| CORS error | Check `FRONTEND_URL` in backend .env |
| Token not saving | Check `REACT_APP_API_URL` in frontend .env.local |
| 401 errors | Token might be expired, try logging in again |
| Google auth fails | Check Client ID/Secret and callback URL in Google Console |

---

**Questions?** Check the full [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)

**Ready to go live?** See backend [README.md](backend/README.md) for production setup.

---

**Built with ❤️ for the NEXUSX Financial Exchange**
