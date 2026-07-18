# Database Configuration Refactoring Guide

## Overview

This project has been refactored to use **individual database environment variables** instead of a hardcoded `DATABASE_URL`. This approach provides better flexibility, security, and containerization support.

## Why Individual Database Variables?

### Benefits:
1. **Environment Flexibility**: Different values per environment (dev, staging, prod)
2. **Security**: No need to hardcode connection strings in repositories
3. **Container-Friendly**: Easy to pass environment variables to Docker containers
4. **CI/CD Integration**: Seamless integration with GitHub Actions, GitLab CI, etc.
5. **Cloud-Ready**: Compatible with AWS RDS, Azure Database, managed PostgreSQL services
6. **Visibility**: Clear understanding of database configuration components
7. **Maintainability**: Easy to rotate credentials without changing connection string format

## Configuration Architecture

### Flow Diagram:
```
┌─────────────────────────────────────────────────────────────┐
│               Environment Variables                          │
│  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SCHEMA│
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│          src/config/database.config.ts                       │
│       buildDatabaseUrl() function                            │
│  Constructs: postgresql://user:pass@host:port/db?schema=x  │
└────────────────┬────────────────────────────────────────────┘
                 │
         ┌───────┴──────────┐
         ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│ prisma.config.ts │  │ PrismaService    │
│  (CLI Commands)  │  │  (NestJS Runtime)│
└──────────────────┘  └──────────────────┘
         │                  │
         └───────┬──────────┘
                 ▼
        PostgreSQL Database
```

## Environment Variables

### Individual Database Variables:

| Variable | Default | Required | Example | Purpose |
|----------|---------|----------|---------|---------|
| `DB_HOST` | `localhost` | Yes | `localhost` or `db` (Docker) | Database host/IP |
| `DB_PORT` | `5432` | Yes | `5432` | Database port |
| `DB_NAME` | `luuna_db` | Yes | `luuna_db` | Database name |
| `DB_USER` | `luuna_user` | Yes | `luuna_user` | Database username |
| `DB_PASSWORD` | `luuna_pass` | Yes | `secure_password` | Database password |
| `DB_SCHEMA` | `public` | No | `public` | Schema name (PostgreSQL) |

### Generated CONNECTION STRING:
```
postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?schema={DB_SCHEMA}
```

## File Structure

```
luuna-backend/
├── .env                           # Local development (gitignored)
├── .env.example                   # Template for developers
├── .env.development               # Development specific
├── .env.production                # Production specific
├── src/
│   ├── config/
│   │   ├── database.config.ts     # DATABASE_URL builder
│   │   └── env-loader.ts          # Prisma CLI loader
│   ├── configuration.ts           # NestJS config factory
│   ├── main.ts                    # Application bootstrap
│   └── ...
├── prisma/
│   ├── schema.prisma              # Prisma schema
│   └── migrations/                # Migration history
├── prisma.config.ts               # Prisma configuration
├── Dockerfile                     # Docker build
├── docker-compose.yml             # Local Docker setup
├── init-db.sh                     # Shadow database init
└── .github/
    └── workflows/
        └── ci-cd.yml              # GitHub Actions
```

## How It Works

### 1. Local Development Setup

**File: `.env`**
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=luuna_db
DB_USER=luuna_user
DB_PASSWORD=luuna_pass
DB_SCHEMA=public
CORS_ORIGIN="*"
```

**Process:**
```
1. dotenv-config loads .env
2. buildDatabaseUrl() reads DB_* variables
3. Constructs: postgresql://luuna_user:luuna_pass@localhost:5432/luuna_db?schema=public
4. Sets process.env.DATABASE_URL
5. Prisma and NestJS use this URL
```

### 2. Prisma CLI Integration

**File: `prisma.config.ts`**
```typescript
import 'dotenv/config';
import { buildDatabaseUrl, buildShadowDatabaseUrl } from './src/config/database.config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: buildDatabaseUrl(),           // Dynamically built
    shadowDatabaseUrl: buildShadowDatabaseUrl(),
  },
});
```

**Why this works:**
- `dotenv/config` loads environment variables
- `buildDatabaseUrl()` is called at config resolution time
- Prisma CLI receives the generated DATABASE_URL

### 3. NestJS Runtime Integration

**File: `src/config/database.config.ts`**
```typescript
export function buildDatabaseUrl(): string {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'luuna_db';
  const dbUser = process.env.DB_USER || 'luuna_user';
  const dbPassword = process.env.DB_PASSWORD || 'luuna_pass';
  const dbSchema = process.env.DB_SCHEMA || 'public';

  if (!dbUser || !dbPassword || !dbName) {
    throw new Error('Missing required database environment variables');
  }

  return `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=${dbSchema}`;
}
```

**File: `src/prisma/prisma.service.ts`**
```typescript
constructor(private readonly configService: ConfigService) {
  const connectionString = buildDatabaseUrl();
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  
  super({ adapter, log: ['error', 'warn'] });
}
```

### 4. Docker Integration

**File: `docker-compose.yml`**
```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-luuna_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-luuna_pass}
      POSTGRES_DB: ${DB_NAME:-luuna_db}
  app:
    environment:
      DB_HOST: db                  # Docker service name
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-luuna_db}
      DB_USER: ${DB_USER:-luuna_user}
      DB_PASSWORD: ${DB_PASSWORD:-luuna_pass}
```

**Key Points:**
- `DB_HOST=db` (Docker service name instead of localhost)
- Variables can be overridden via `docker-compose` or `.env`
- Shadow database auto-created via `init-db.sh`

## Usage Instructions

### Local Development

1. **Setup environment variables:**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

2. **Create PostgreSQL user and databases:**
```bash
sudo -u postgres psql -c "CREATE USER luuna_user WITH PASSWORD 'luuna_pass';"
sudo -u postgres psql -c "CREATE DATABASE luuna_db OWNER luuna_user;"
sudo -u postgres psql -c "CREATE DATABASE luuna_db_shadow OWNER luuna_user;"
```

3. **Generate Prisma Client:**
```bash
npm run prisma:generate
```

4. **Run migrations:**
```bash
npm run prisma:migrate
```

5. **Start development server:**
```bash
npm run start:dev
```

### Docker Development

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Docker Production Build

```bash
# Build image
docker build -t luuna-backend:latest .

# Run container
docker run -d \
  -e NODE_ENV=production \
  -e DB_HOST=your-rds-endpoint \
  -e DB_PORT=5432 \
  -e DB_NAME=luuna_db_prod \
  -e DB_USER=prod_user \
  -e DB_PASSWORD=secure_password \
  -e CORS_ORIGIN=https://yourdomain.com \
  -p 3000:3000 \
  luuna-backend:latest
```

### AWS RDS Setup

```bash
# Environment variables for AWS RDS
export DB_HOST=luuna-db.c5k9s4f8v4x2.us-east-1.rds.amazonaws.com
export DB_PORT=5432
export DB_NAME=luuna_prod
export DB_USER=luuna_admin
export DB_PASSWORD=AWS_SECRETS_MANAGER_PASSWORD
export DB_SCHEMA=public
```

## Prisma Commands

All commands now use the individual database variables:

```bash
# Generate Prisma Client
npm run prisma:generate

# Create migration
npm run prisma:migrate        # Creates new migration

# Deploy migrations
npm run prisma:migrate:deploy # For CI/CD pipelines

# View database in Prisma Studio
npm run prisma:studio

# Seed database
npm run prisma:seed
```

## Environment Files

### `.env.example` - Template
```
# Copy this to .env and fill in your values
DB_HOST=localhost
DB_PORT=5432
DB_NAME=luuna_db
DB_USER=luuna_user
DB_PASSWORD=your_secure_password
DB_SCHEMA=public
```

### `.env.development` - Development Defaults
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=luuna_db
DB_USER=luuna_user
DB_PASSWORD=luuna_pass
```

### `.env.production` - Production Template
```
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=luuna_db_prod
DB_USER=luuna_prod_user
DB_PASSWORD=${AWS_SECRETS_MANAGER}
```

## GitHub Actions CI/CD

The `.github/workflows/ci-cd.yml` file includes:

1. **Test Stage:**
   - Sets up PostgreSQL service
   - Loads environment variables
   - Runs Prisma migrations
   - Runs lint, build, and tests

2. **Build Stage:**
   - Builds Docker image
   - Pushes to container registry
   - Tags with version

3. **Deploy Stage (Optional):**
   - Can deploy to AWS, Azure, or your infrastructure

## Production Checklist

- [ ] Database credentials stored in AWS Secrets Manager or environment secrets
- [ ] Never commit `.env` file to repository
- [ ] Use `.env.example` as template for developers
- [ ] Set `CORS_ORIGIN` to specific domain (not "*")
- [ ] Enable database backups (AWS RDS automated backups)
- [ ] Set strong `DB_PASSWORD` (20+ characters, special chars)
- [ ] Use database encryption (AWS RDS encryption)
- [ ] Monitor database logs
- [ ] Set up alerts for connection failures
- [ ] Test disaster recovery procedures
- [ ] Document deployment steps

## Troubleshooting

### Error: "Missing required database environment variables"

**Cause:** One or more DB_* variables not set
**Solution:**
```bash
# Check environment variables
echo $DB_HOST $DB_PORT $DB_NAME $DB_USER $DB_PASSWORD

# Load from .env
source .env

# Try again
npm run prisma:migrate
```

### Error: "Cannot connect to database"

**Cause:** Database service not running or wrong credentials
**Solution:**
```bash
# Check database is running
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"

# Check credentials
echo "DB_USER=$DB_USER"
echo "DB_HOST=$DB_HOST"
echo "DB_NAME=$DB_NAME"
```

### Docker container exits immediately

**Cause:** Database not ready or connection failed
**Solution:**
```bash
# Check logs
docker-compose logs app

# Ensure db service is healthy
docker-compose ps

# Restart services
docker-compose down
docker-compose up --build
```

## Security Best Practices

1. **Never commit credentials:**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Use secrets management:**
   - AWS Secrets Manager
   - HashiCorp Vault
   - GitHub Secrets (CI/CD)

3. **Rotate credentials regularly:**
   ```bash
   # Create new DB user
   sudo -u postgres createuser new_user
   # Update DB_USER and DB_PASSWORD
   # Delete old user
   ```

4. **Use SSL for database connections:**
   ```
   postgresql://user:pass@host:port/db?sslmode=require
   ```

5. **Monitor database access:**
   - Enable PostgreSQL query logging
   - Set up CloudWatch alarms for AWS RDS
   - Review connection logs

## Summary

| Component | File | Purpose |
|-----------|------|---------|
| Config Builder | `src/config/database.config.ts` | Builds DATABASE_URL from env vars |
| Prisma Config | `prisma.config.ts` | Uses built DATABASE_URL for CLI |
| Prisma Service | `src/prisma/prisma.service.ts` | Uses built DATABASE_URL for runtime |
| Environment | `.env` | Local variable values |
| Docker | `docker-compose.yml` | Local containerized setup |
| CI/CD | `.github/workflows/ci-cd.yml` | Automated testing and deployment |

This architecture ensures flexibility, security, and compatibility across all environments (local, Docker, CI/CD, production).
