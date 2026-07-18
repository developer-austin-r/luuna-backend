# Local Docker Development Setup

Use this file to quickly spin up a complete development environment with PostgreSQL and the NestJS application.

## Quick Start

```bash
# 1. Start all services
docker-compose up -d

# 2. Check if everything is running
docker-compose ps

# 3. View logs
docker-compose logs -f app

# 4. Access the application
# API: http://localhost:3000
# Swagger Docs: http://localhost:3000/api/docs
# Health: http://localhost:3000/health
```

## Services

### PostgreSQL Database
- **Host**: localhost (from host machine)
- **Host**: db (from containers)
- **Port**: 5432
- **Username**: luuna_user (default)
- **Password**: luuna_pass (default)
- **Database**: luuna_db

### NestJS Application
- **Port**: 3000
- **Mode**: Development with hot reload
- **URL**: http://localhost:3000

## Environment Variables

Override defaults with `.env` file:

```env
# For PostgreSQL
DB_USER=luuna_user
DB_PASSWORD=luuna_pass
DB_NAME=luuna_db

# For Application
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*
```

## Common Commands

```bash
# View database logs
docker-compose logs db

# View app logs
docker-compose logs app

# Stop all services
docker-compose stop

# Remove all services (keeps data)
docker-compose down

# Remove everything including volumes (removes data)
docker-compose down -v

# Rebuild containers
docker-compose up --build

# Access PostgreSQL CLI
docker-compose exec db psql -U luuna_user -d luuna_db

# Run Prisma migrations
docker-compose exec app npm run prisma:migrate

# View Prisma Studio
docker-compose exec app npm run prisma:studio
```

## Troubleshooting

### Port already in use
```bash
# Change ports in docker-compose.yml
# Or kill existing process
lsof -i :3000
kill -9 <PID>
```

### Database connection refused
```bash
# Check if db service is healthy
docker-compose ps

# View db logs
docker-compose logs db

# Wait for db to be ready (usually takes 5-10 seconds)
```

### Hot reload not working
```bash
# Rebuild the app image
docker-compose up -d --build app

# Or manually restart
docker-compose restart app
```

### Want to use different database
```bash
# Edit .env
DB_HOST=localhost
DB_PORT=5433  # Different port
DB_NAME=my_db
DB_USER=my_user
DB_PASSWORD=my_pass

# Restart services
docker-compose down
docker-compose up -d
```
