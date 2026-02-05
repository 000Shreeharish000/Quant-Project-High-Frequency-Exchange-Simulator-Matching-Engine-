# Setup Instructions

## Prerequisites

- Docker & Docker Compose
- Node.js 18+
- PostgreSQL 12+ (or use Docker)
- Redis 6+ (or use Docker)

## Step 1: Start Database & Cache

```bash
docker-compose up -d
```

Verify running:
```bash
docker ps | grep nexusx
```

## Step 2: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env from template
cp .env.example .env

# Initialize database
npm run db:init

# Start development server
npm run dev
```

Should see:
```
✅ NEXUSX Authentication Service
🔐 Running on http://localhost:5000
📊 Database: Connected
💾 Redis: Connected
```

## Step 3: Frontend Setup

In a new terminal (keep backend running):

```bash
# In project root
echo "REACT_APP_API_URL=http://localhost:5000" > .env.local

# Start frontend
npm run dev
```

Should see `http://localhost:5173` is ready.

## Step 4: Test It

1. Open `http://localhost:5173`
2. Click "Create account"
3. Enter email/password
4. Click "Create Account"
5. Should redirect to `/trade` ✅

## Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable "Google+ API"
4. OAuth consent screen → Create
5. Credentials → OAuth 2.0 Client ID → Web application
6. Authorized redirect URIs → Add:
   ```
   http://localhost:5000/auth/google/callback
   ```
7. Copy Client ID and Secret
8. Update `backend/.env`:
   ```env
   GOOGLE_CLIENT_ID=your-id
   GOOGLE_CLIENT_SECRET=your-secret
   ```
9. Restart backend
10. Try "Continue with Google" button

## Environment Variables

### Backend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5000 | Server port |
| NODE_ENV | development | Environment |
| DB_HOST | localhost | Database host |
| DB_PORT | 5432 | Database port |
| DB_NAME | nexusx_exchange | Database name |
| DB_USER | postgres | DB username |
| DB_PASSWORD | postgres | DB password |
| REDIS_HOST | localhost | Redis host |
| REDIS_PORT | 6379 | Redis port |
| JWT_SECRET | your-secret-key | **CHANGE THIS** |
| GOOGLE_CLIENT_ID | | Google OAuth ID |
| GOOGLE_CLIENT_SECRET | | Google OAuth secret |
| GOOGLE_CALLBACK_URL | | Google callback URL |
| FRONTEND_URL | http://localhost:5173 | Frontend domain |

### Frontend (.env.local)

```env
REACT_APP_API_URL=http://localhost:5000
```

## Troubleshooting

### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Or start it
docker-compose up -d postgres
```

### "CORS error"
- Verify `FRONTEND_URL` in `backend/.env`
- Should be `http://localhost:5173`
- Restart backend after changing

### "Google sign-in fails"
- Check Client ID/Secret are correct in `backend/.env`
- Verify callback URL in Google Console matches exactly
- Restart backend

### "Token not saving in browser"
- Check `REACT_APP_API_URL` in `.env.local`
- Verify `.env.local` is in root directory (same level as `src/`)
- Check browser console: F12 → Console tab

## API Testing

### Register
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"password123",
    "firstName":"Test"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"password123"
  }'
```

Response will have `accessToken` - copy it.

### Get Profile (with token)
```bash
curl -X GET http://localhost:5000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Stopping Services

```bash
# Stop database & cache
docker-compose down

# Stop backend
Ctrl+C in backend terminal

# Stop frontend
Ctrl+C in frontend terminal
```

## Production Deployment

### Before Going Live

1. **Generate JWT Secret**
   ```bash
   # Use strong random string
   openssl rand -base64 32
   ```
   Update `backend/.env`:
   ```env
   JWT_SECRET=<generated-string>
   ```

2. **Setup Managed Database**
   - Use AWS RDS, Railway, or similar
   - Enable SSL/TLS
   - Update DB credentials in `.env`

3. **Setup Managed Redis**
   - Use AWS ElastiCache, Railway, or similar
   - Update Redis credentials in `.env`

4. **Google OAuth**
   - Add production domain to allowed redirects
   - Update `GOOGLE_CALLBACK_URL` to production

5. **Frontend Domain**
   ```env
   FRONTEND_URL=https://yourdomain.com
   ```

6. **Build & Deploy**
   ```bash
   cd backend
   npm run build
   # Deploy dist/ folder
   
   # Frontend
   npm run build
   # Deploy to Vercel, Netlify, etc.
   ```

### Recommended Platforms

- **Backend**: Railway, Vercel, Heroku, AWS
- **Database**: Railway, AWS RDS, Heroku Postgres
- **Redis**: Railway, AWS ElastiCache
- **Frontend**: Vercel, Netlify

## Verification Checklist

- [ ] Docker PostgreSQL running
- [ ] Docker Redis running
- [ ] `backend/.env` created
- [ ] `frontend/.env.local` created
- [ ] Database initialized: `npm run db:init`
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Token persists in localStorage
- [ ] Can access protected routes
- [ ] Can logout

All checked? You're good to go! ✅

---

See README.md for overview and usage examples.
