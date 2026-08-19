# DAO Simulator - Deployment Guide

## 🚀 Quick Start (Development)

Copy the example env file and update values:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Visit the URL printed by the launcher. It starts with `http://127.0.0.1:7884` and moves to the next free port when needed.

> Requires Node.js 22+ (Next.js 16).

## 🔐 API Authentication

### Using the API

All mutation endpoints (POST, PUT, DELETE) require authentication:

```bash
# Create a simulation
curl -X POST http://127.0.0.1:7884/api/simulation \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"num_developers": 10, "num_investors": 5}'
```

### Admin Dashboard Login

Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in your environment before logging in.

## 📦 Production Deployment

### Option 1: Coolify (production)

Coolify is the production deployment path for this repository. The application is connected to GitHub and deploys the `main` branch; GitHub Actions are not used.

1. In Coolify, confirm the repository, `main` branch, build pack, and domain.
2. Keep production secrets in Coolify's environment settings. Do not copy them into the repository or a shell command.
3. Deploy the latest commit from the application page and wait for the health check to become healthy.
4. Verify from Git Bash:

```bash
curl -fsS https://daosimulator.com/api/healthz
curl -fsS https://daosimulator.com/api/healthz/simulate
```

If a deploy is unhealthy, use Coolify's deployment history to roll back to the last healthy image, then re-run the readiness checks.

### Option 2: Docker

The repository includes a production-oriented `Dockerfile` and `docker-compose.yml` with Redis and PostgreSQL services.

1. **Set strong local secrets**:
```bash
export API_KEY=$(openssl rand -base64 32)
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export ADMIN_PASSWORD=$(openssl rand -base64 24)
```

2. **Build and run**:
```bash
docker compose up --build
```

3. **Check readiness**:
```bash
curl http://127.0.0.1:7884/api/healthz
```

The readiness endpoint validates production environment requirements and checks Redis/PostgreSQL connectivity when those services are configured.

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

1. **Upstash** - https://upstash.com (serverless Redis)
2. **Redis Cloud** - https://redis.com/redis-enterprise-cloud/
3. **AWS ElastiCache** - For AWS deployments

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

Before a release, run `npm run test:e2e:production` locally. It checks CSP, hydration, simulator interactivity, and readiness before the Coolify deploy.

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
| SMTP_USER | No | - | Zoho SMTP email for analytics reports |
| SMTP_PASS | No | - | Zoho SMTP password / app password |
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
