#!/bin/bash

# NestJS + Prisma + PostgreSQL - Quick Start Guide

echo "🚀 Luuna Backend - Quick Start"
echo "=============================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "📋 Creating .env file..."
  cp .env.example .env
  echo "✅ .env created. Please edit it with your database credentials."
  echo ""
fi

# Check Node.js
echo "✓ Checking Node.js..."
node --version

# Check npm
echo "✓ Checking npm..."
npm --version

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci

# Create database
echo ""
echo "🗄️  Setting up PostgreSQL..."
echo "Instructions:"
echo "1. Ensure PostgreSQL is running"
echo "2. Run these commands as postgres user:"
echo ""
echo "  sudo -u postgres psql -v ON_ERROR_STOP=1 \\"
echo "    -c \"CREATE USER luuna_user WITH PASSWORD 'luuna_pass';\" \\"
echo "    -c \"CREATE DATABASE luuna_db OWNER luuna_user;\" \\"
echo "    -c \"CREATE DATABASE luuna_db_shadow OWNER luuna_user;\" \\"
echo "    -c \"GRANT ALL PRIVILEGES ON DATABASE luuna_db TO luuna_user;\" \\"
echo "    -c \"GRANT ALL PRIVILEGES ON DATABASE luuna_db_shadow TO luuna_user;\""
echo ""

read -p "Have you created the database? (yes/no): " db_created
if [ "$db_created" != "yes" ]; then
  echo "❌ Please create the database first."
  exit 1
fi

# Generate Prisma Client
echo ""
echo "🔧 Generating Prisma Client..."
npm run prisma:generate

# Run migrations
echo ""
echo "📊 Running database migrations..."
npm run prisma:migrate:deploy

# Build
echo ""
echo "🔨 Building application..."
npm run build

# Success
echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   npm run start:dev    - Start development server"
echo "   npm run prisma:studio - Open Prisma Studio"
echo "   npm run test         - Run tests"
echo ""
echo "📚 API Documentation:"
echo "   http://localhost:3000/api/docs"
echo ""
echo "🏥 Health Check:"
echo "   http://localhost:3000/health"
