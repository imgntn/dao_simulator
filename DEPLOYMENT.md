# DAO Simulator - Deployment Guide

## 🚀 Quick Start (Development)

Copy the example env file and update values:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Visit http://localhost:7884

> Requires Node.js 22+ (Next.js 16).

## 🔐 API Authentication

### Using the API

All mutation endpoints (POST, PUT, DELETE) require authentication:

```bash
# Create a simulation
curl -X POST http://localhost:7884/api/simulation \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"num_developers": 10, "num_investors": 5}'
```

### Admin Dashboard Login

Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in your environment before logging in.

## 📦 Production Deployment

### Option 1: Railway (Recommended)

1. **Install Railway CLI**:
```bash
npm i -g @railway/cli
railway login
```

2. **Set Environment Variables**:
```bash
railway variables set API_KEY=$(openssl rand -base64 32)
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)
railway variables set NEXTAUTH_URL=https://your-app.railway.app
railway variables set ADMIN_PASSWORD=YourStrongPassword
railway variables set NODE_ENV=production
```

3. **Add Redis** (in Railway dashboard):
   - Add Redis plugin
   - Copy REDIS_URL from plugin
   - Set `USE_REDIS=true`

4. **Add PostgreSQL** (optional, for analytics):
   - `railway add -d postgres` or add via dashboard
   - `DATABASE_URL` is set automatically
   - Analytics runs without it (graceful no-op)

4. **Deploy**:
```bash
railway up
```

### Option 2: Vercel

1. **Install Vercel CLI**:
```bash
npm i -g vercel
vercel login
```

2. **Set Environment Variables**:
```bash
vercel env add API_KEY
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add ADMIN_PASSWORD
```

3. **Add Redis**:
   - Use Upstash Redis (vercel.com/integrations/upstash)
   - Or set REDIS_URL manually

4. **Deploy**:
```bash
vercel --prod
```

### Option 3: Docker

1. **Create `docker-compose.yml`**:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - USE_REDIS=true
      - API_KEY=${API_KEY}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

2. **Build and run**:
```bash
docker-compose up -d
```

## 🔑 Generating Secure Keys

```bash
# API Key
openssl rand -base64 32

# NextAuth Secret
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 🗄️ Redis Setup

### Local Development (Optional)
```bash
# macOS
brew install redis
redis-server

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# Windows (WSL or Docker)
docker run -d -p 6379:6379 redis:alpine
```

### Production Options

1. **Railway** - Add Redis plugin (1-click)
2. **Upstash** - https://upstash.com (serverless Redis)
3. **Redis Cloud** - https://redis.com/redis-enterprise-cloud/
4. **AWS ElastiCache** - For AWS deployments

## 📊 Checkpoint Storage

Checkpoints are stored based on environment:

- **Browser**: IndexedDB (10 checkpoints max)
- **Server with Redis**: Redis (24 hour TTL)
- **Server without Redis**: In-memory (lost on restart)

For persistent checkpoints in production, **enable Redis**.

## 🧪 Testing in Production

```bash
# Health check
curl https://your-domain.com/api/simulation

# Create simulation (with auth)
curl -X POST https://your-domain.com/api/simulation \
  -H "X-API-Key: your-production-key" \
  -H "Content-Type: application/json" \
  -d '{"num_developers": 15, "governance_rule": "quorum"}'

# Export data
curl https://your-domain.com/api/simulation/data?id=sim_123&format=csv \
  -H "X-API-Key: your-production-key"
```

## 🔒 Security Checklist

- [ ] Change API_KEY from default
- [ ] Change NEXTAUTH_SECRET from default
- [ ] Change ADMIN_PASSWORD from default
- [ ] Set USE_REDIS=true in production
- [ ] Set NEXTAUTH_URL to your domain
- [ ] Enable HTTPS in production
- [ ] Never commit .env.local or .env.production
- [ ] Use environment variables on hosting platform
- [ ] Regularly rotate API keys

## 📈 Monitoring

### Check simulation health:
```bash
# List all simulations
curl https://your-domain.com/api/simulation

# Get simulation state
curl https://your-domain.com/api/simulation?id=sim_123
```

### Redis monitoring:
```bash
redis-cli INFO stats
redis-cli KEYS "dao-sim:*"
```

## 🐛 Troubleshooting

### "Unauthorized" errors
- Check X-API-Key header matches API_KEY
- Verify API_KEY is set in environment

### Simulations not persisting
- Enable Redis: `USE_REDIS=true`
- Check REDIS_URL connection

### Checkpoint failures
- Browser: Check IndexedDB quota
- Server: Verify Redis connection

## 📚 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| API_KEY | Yes* | - | API authentication key |
| NEXTAUTH_SECRET | Yes | - | NextAuth JWT secret |
| NEXTAUTH_URL | Yes | - | App URL for OAuth |
| ADMIN_USERNAME | No | admin | Admin login username |
| ADMIN_PASSWORD | Yes | - | Admin login password |
| REDIS_URL | No | - | Redis connection string |
| USE_REDIS | No | false | Enable Redis storage |
| DATABASE_URL | No | - | PostgreSQL connection string (analytics) |
| NODE_ENV | No | development | Environment mode |

*In development, API_KEY is optional (bypassed).

> **Note:** The simulation engine runs entirely client-side in a Web Worker. No separate server process or Socket.IO configuration is needed.

## 🎉 Success!

Your DAO Simulator is now running in production with:
- ✅ Persistent Redis storage
- ✅ Checkpoint save/restore
- ✅ Secure API authentication
- ✅ Data export (CSV/JSON)
- ✅ Production-grade RNG

Need help? Check the [IMPROVEMENTS.md](./IMPROVEMENTS.md) for technical details.
