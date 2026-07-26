# Deployment Setup Guide for EC2

## Prerequisites

- Ubuntu EC2 instance with SSH access
- Docker and Docker Compose installed on EC2
- GitHub Secrets configured in your repository:
  - `EC2_HOST`: Your EC2 instance IP or domain
  - `EC2_USERNAME`: SSH username (typically `ubuntu`)
  - `EC2_SSH_KEY`: Your private SSH key for EC2
  - `GHCR_PAT`: Token with permission to pull the container image

The production `.env` file is kept only on the EC2 server. It is not stored in
GitHub Actions secrets and the deployment workflow never replaces it.

## EC2 Setup Steps

### 1. Create Deployment Directory

SSH into your EC2 instance and create the deployment directory:

```bash
mkdir -p /home/ubuntu/luuna-backend
cd /home/ubuntu/luuna-backend
```

### 2. Create `.env` File

Create a `.env` file in `/home/ubuntu/luuna-backend/` with your production environment variables:

```bash
cat > /home/ubuntu/luuna-backend/.env << 'EOF'
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
DATABASE_URL=postgresql://username:password@postgres-host:5432/luuna_db
DB_HOST=postgres-host
DB_PORT=5432
DB_NAME=luuna_db
DB_USER=username
DB_PASSWORD=password
DB_SCHEMA=public
EOF

chmod 600 /home/ubuntu/luuna-backend/.env
```

**Important:** Replace the database credentials with your actual PostgreSQL connection details.

### 3. Optional: Pre-create `docker-compose.yml`

The GitHub Actions workflow will automatically generate `docker-compose.yml` if it doesn't exist. However, you can create it manually before the first deployment:

```bash
cp docker-compose.yml.template /home/ubuntu/luuna-backend/docker-compose.yml
```

Or create it directly:

```bash
cat > /home/ubuntu/luuna-backend/docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    image: ghcr.io/developer-austin-r/luuna-backend:latest
    container_name: luuna-backend
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      NODE_ENV: production
    networks:
      - luuna-network
    healthcheck:
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s

networks:
  luuna-network:
    driver: bridge
EOF
```

## How Deployment Works

1. **Code Push**: When you push to the `main` branch, GitHub Actions triggers the workflow
2. **Build**: Docker image is built and pushed to GHCR with tags:
   - `ghcr.io/developer-austin-r/luuna-backend:latest`
   - `ghcr.io/developer-austin-r/luuna-backend:sha-<commit-hash>`
3. **Deploy**: SSH into EC2 and:
   - Create `/home/ubuntu/luuna-backend` if it doesn't exist
   - Verify the server-managed `.env` and `docker-compose.yml` files exist
   - Pull the latest image from GHCR
   - Run `prisma migrate deploy` using the newly pulled image
   - Start/restart containers with `docker compose --env-file .env up -d`
   - Clean up unused images with `docker image prune -f`

The workflow fails safely if either server file is missing. It does not change
the contents of `.env`; update it manually on EC2 when credentials or runtime
settings need to change.

Every deployment applies the migration files committed in `prisma/migrations`.
If a migration fails, the workflow stops before the currently running backend
container is shut down.

## Troubleshooting

### `.env` file not found error

**Problem**: Deployment fails with "ERROR: .env file not found"

**Solution**: SSH to your EC2 instance and create the `.env` file:

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
cd /home/ubuntu/luuna-backend
touch .env
# Edit .env with your environment variables
nano .env
```

### GHCR authentication issues

**Problem**: Docker can't pull from GHCR

**Solution**: Ensure Docker is logged into GHCR on your EC2 instance:

```bash
docker login ghcr.io -u your-github-username -p your-github-token
```

You can generate a personal access token at: https://github.com/settings/tokens

### Port already in use

**Problem**: Port 3000 is already in use

**Solution**: Either stop the existing container or update `docker-compose.yml` to use a different port:

```yaml
ports:
  - "8080:3000"  # Maps EC2 port 8080 to container port 3000
```

## Nginx Reverse Proxy (Optional)

If you're using Nginx as a reverse proxy, configure it to forward requests to the backend:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then reload Nginx:

```bash
sudo systemctl reload nginx
```

## Manual Deployment

If you need to deploy manually without GitHub Actions:

```bash
cd /home/ubuntu/luuna-backend
docker compose pull
docker compose up -d
docker image prune -f
```

## View Logs

To check the running container's logs:

```bash
docker compose logs -f backend
```

## Stop Deployment

To stop the running containers:

```bash
docker compose down
```

To stop and remove volumes (WARNING: deletes data):

```bash
docker compose down -v
```
