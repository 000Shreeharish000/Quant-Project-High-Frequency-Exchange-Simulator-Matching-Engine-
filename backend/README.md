# NEXUSX Authentication Service

A production-grade authentication backend for the NEXUSX financial exchange platform. Built with Node.js, TypeScript, Express, PostgreSQL, Redis, and Google OAuth.

## 🎯 Features

- ✅ **Email/Password Authentication** - Register and login with bcrypt password hashing
- ✅ **Google OAuth 2.0** - One-click sign-in with Google
- ✅ **JWT Tokens** - Stateless authentication with JWT access tokens
- ✅ **Redis Sessions** - Session validation via Redis for security and performance
- ✅ **Rate Limiting** - DDoS protection on auth endpoints
- ✅ **PostgreSQL** - Persistent user storage with proper schema design
- ✅ **CORS Support** - Configured for frontend integration
- ✅ **Error Handling** - Comprehensive error messages and status codes

## 🏗️ Architecture

```
Frontend (React)
     ↓
POST /auth/login
     ↓
PostgreSQL (users table)
     ↓
bcrypt (password verification)
     ↓
JWT + Redis Session
     ↓
Protected Routes with Bearer Token
```

## 📋 Prerequisites

- Node.js 18+ and npm/bun
- PostgreSQL 12+
- Redis 6+
- Google OAuth Client ID and Secret (for Google sign-in)

## 🚀 Quick Start

### 1. Setup Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server
PORT=5000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexusx_exchange
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secret (change this!)
JWT_SECRET=your-super-secret-jwt-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Initialize Database

First, ensure PostgreSQL is running:

```bash
# Create database
createdb nexusx_exchange

# Run initialization script
npm run db:init
```

### 4. Start Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

## 🔐 API Endpoints

### Authentication Routes

#### POST `/auth/register`

Register a new user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "auth_method": "email"
    }
  }
}
```

#### POST `/auth/login`

Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "auth_method": "email"
    }
  }
}
```

#### GET `/auth/google`

Initiates Google OAuth flow. Redirects to Google login.

#### GET `/auth/google/callback`

Google OAuth callback. Called by Google after user authenticates. Redirects to frontend with token.

#### POST `/auth/logout`

Logout the current user. Invalidates session in Redis.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### GET `/auth/me`

Get current authenticated user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "auth_method": "email",
    "created_at": "2024-02-05T10:00:00Z",
    "is_active": true
  }
}
```

## 🔧 Implementation Details

### Database Schema

Users table with proper indexing:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  google_id VARCHAR(255) UNIQUE,
  auth_method VARCHAR(50) NOT NULL DEFAULT 'email',
  profile_picture_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
```

### Authentication Flow

#### Email/Password Registration:
1. Validate email format
2. Check if email already exists
3. Hash password using bcrypt (salt rounds: 10)
4. Store user in PostgreSQL
5. Generate JWT token with unique tokenId
6. Store session in Redis with TTL
7. Return token and user info

#### Email/Password Login:
1. Find user by email
2. Verify password against hash
3. Generate JWT token with unique tokenId
4. Store session in Redis with TTL
5. Return token and user info

#### Google OAuth:
1. Redirect to Google consent screen
2. User authorizes app
3. Google redirects with authorization code
4. Exchange code for user profile
5. Check if user exists by Google ID
6. If new user, create account and link Google ID
7. If existing user by email, link Google ID
8. Generate JWT and session
9. Redirect to frontend with token in URL

#### Session Validation:
- Every authenticated request verifies JWT signature
- TokenId is checked against Redis session store
- Invalid or expired sessions are rejected
- Redis TTL automatically expires old sessions

### Security Features

- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Secrets**: Via environment variables (never hardcoded)
- **Rate Limiting**: 5 auth attempts per 15 minutes per IP
- **Session Storage**: Redis-backed, TTL-based expiration
- **CORS**: Restricted to frontend origin
- **Input Validation**: Email format and password requirements
- **HTTP Status Codes**: Proper 401/403/400 responses

### File Structure

```
backend/
├── src/
│   ├── config/
│   │   └── index.ts          # Configuration management
│   ├── database/
│   │   ├── connection.ts      # PostgreSQL connection pool
│   │   └── init.ts            # Schema initialization
│   ├── models/
│   │   └── User.ts            # User model and queries
│   ├── services/
│   │   └── AuthService.ts     # Business logic
│   ├── controllers/
│   │   └── AuthController.ts  # Request handlers
│   ├── routes/
│   │   └── auth.ts            # API routes
│   ├── middleware/
│   │   ├── auth.ts            # JWT verification
│   │   └── rateLimit.ts       # Rate limiting
│   ├── utils/
│   │   ├── jwt.ts             # JWT utilities
│   │   ├── password.ts        # Password hashing
│   │   └── redis.ts           # Redis utilities
│   └── index.ts               # Express app setup
├── .env.example               # Environment template
├── package.json               # Dependencies
└── tsconfig.json              # TypeScript config
```

## 🔌 Frontend Integration

### Using the Authentication Service

Store the token from login/register response:

```typescript
// Login
const response = await fetch("http://localhost:5000/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    email: "user@example.com", 
    password: "password123" 
  })
});

const data = await response.json();
localStorage.setItem("accessToken", data.data.accessToken);
```

Make authenticated requests:

```typescript
// Protected endpoint
const response = await fetch("http://localhost:5000/auth/me", {
  headers: {
    "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
  }
});
```

### Google OAuth Integration

```typescript
// Initiate Google sign-in
const handleGoogleSignIn = () => {
  window.location.href = "http://localhost:5000/auth/google";
};

// After callback, frontend will receive:
// http://localhost:5173/trade?token=<jwt>&user=<user_json>
```

## 🚀 Production Deployment

### Before Going Live

1. **Change JWT Secret**
   ```env
   JWT_SECRET=generate-a-strong-random-secret-here
   ```

2. **Configure Google OAuth**
   - Go to Google Cloud Console
   - Create OAuth 2.0 credentials
   - Add your production domain to allowed redirects
   - Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

3. **Setup PostgreSQL**
   - Use production-grade database
   - Enable SSL connections
   - Regular backups
   - Monitor query performance

4. **Setup Redis**
   - Enable authentication
   - Configure persistence
   - Set up monitoring/alerts
   - Consider clustering for high availability

5. **Environment**
   - Set `NODE_ENV=production`
   - Use strong JWT secret
   - Disable debug logging
   - Enable HTTPS
   - Configure firewall rules

6. **CORS**
   - Update FRONTEND_URL to production domain
   - Restrict to specific origins

7. **Monitoring**
   - Setup error tracking (Sentry, etc.)
   - Monitor database performance
   - Monitor Redis memory usage
   - Setup alerts for failed login attempts

## 📝 Extending the System

### Adding New OAuth Providers

1. Install passport strategy: `npm install passport-github`
2. Add to `src/routes/auth.ts`:
   ```typescript
   passport.use(new GitHubStrategy({...}, handler));
   router.get("/github", passport.authenticate("github"));
   router.get("/github/callback", ...);
   ```

### Adding User Profiles/Wallet

Create new migration:

```sql
CREATE TABLE user_wallets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  balance DECIMAL(20, 8),
  currency VARCHAR(10)
);
```

Create model and service similar to UserModel.

### Adding Two-Factor Authentication

1. Store secret in users table
2. Create routes for 2FA setup/verification
3. Require 2FA token during login

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL
psql -h localhost -U postgres -d nexusx_exchange

# Check if running
sudo systemctl status postgresql
```

### Redis Connection Issues

```bash
# Test Redis
redis-cli ping

# Check if running
sudo systemctl status redis-server
```

### Google OAuth Issues

- Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
- Check callback URL matches in Google Console
- Test with `curl http://localhost:5000/auth/google`

### JWT Verification Issues

- Check JWT_SECRET is set correctly
- Ensure token hasn't expired
- Verify Redis session exists

## 📚 API Testing

### Using cURL

```bash
# Register
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get profile (replace TOKEN with actual token)
curl -X GET http://localhost:5000/auth/me \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman

1. Import `http://localhost:5000/auth/...` endpoints
2. Set up environment variable: `{{token}}`
3. In login response, use "Tests" tab to set token:
   ```javascript
   pm.environment.set("token", pm.response.json().data.accessToken);
   ```
4. Use `{{token}}` in Authorization header for protected endpoints

## 📖 Next Steps

- Implement email verification
- Add password reset functionality
- Create user profile editing endpoints
- Add wallet/balance management
- Implement order placement APIs
- Add trading history endpoints
- Setup WebSocket for real-time updates

## 📄 License

MIT - Feel free to use in your projects

## 💡 Support

For issues or questions, refer to:
- Express.js docs: https://expressjs.com
- PostgreSQL docs: https://www.postgresql.org/docs
- Redis docs: https://redis.io/docs
- JWT docs: https://jwt.io
- Google OAuth: https://developers.google.com/identity

---

**Built with ❤️ for the NEXUSX Financial Exchange**
