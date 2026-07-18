# Luuna Backend

Luuna Backend is a NestJS API built with TypeScript, Prisma, and PostgreSQL.

## Requirements

Use these versions for local development and CI parity:

| Tool | Required version |
| --- | --- |
| Node.js | `24.4.1` |
| npm | `11.5.2` or compatible with Node `24.4.1` |
| PostgreSQL | `16` |
| Prisma CLI / Client | `7.8.0` |
| NestJS | `11.x` |

The Docker and CI setup currently use:

- `node:24.4.1-alpine`
- `postgres:16-alpine`

## Environment

Copy the example environment file:

```bash
cp .env.example .env
```

The app uses individual database variables and builds the Prisma connection URL internally.

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=luuna_db
DB_USER=luuna_user
DB_PASSWORD=luuna_pass
DB_SCHEMA=public

CORS_ORIGIN=*
```

For Docker Compose, the app container uses `DB_HOST=db` automatically.

You do not need to add `DATABASE_URL` or `SHADOW_DATABASE_URL` to `.env`.
Both values are generated from the `DB_*` variables.

## Database

Create the main database and the Prisma shadow database:

```bash
sudo -u postgres psql -v ON_ERROR_STOP=1 \
  -c "CREATE USER luuna_user WITH PASSWORD 'luuna_pass';" \
  -c "CREATE DATABASE luuna_db OWNER luuna_user;" \
  -c "CREATE DATABASE luuna_db_shadow OWNER luuna_user;" \
  -c "GRANT ALL PRIVILEGES ON DATABASE luuna_db TO luuna_user;" \
  -c "GRANT ALL PRIVILEGES ON DATABASE luuna_db_shadow TO luuna_user;"
```

The shadow database is used by Prisma when creating or validating migrations.
It is configured in [prisma.config.ts](prisma.config.ts) with `shadowDatabaseUrl`.
By default, the shadow database name is your `DB_NAME` with `_shadow` added.

For example:

| `DB_NAME` | Shadow database |
| --- | --- |
| `luuna_db` | `luuna_db_shadow` |
| `my_app` | `my_app_shadow` |

## Setup

Install dependencies:

```bash
npm ci
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npm run prisma:migrate:deploy
```

Start the development server:

```bash
npm run start:dev
```

The API runs at:

- API: `http://localhost:3000`
- Swagger docs: `http://localhost:3000/api/docs`
- Health check: `http://localhost:3000/health`

## Docker Setup

Start PostgreSQL and the API together:

```bash
docker compose up --build
```

This uses PostgreSQL `16-alpine` and creates the default database values from `.env`.

Stop containers:

```bash
docker compose down
```

Remove the database volume as well:

```bash
docker compose down -v
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run start` | Start the app once |
| `npm run start:dev` | Start in watch mode |
| `npm run build` | Build the NestJS app |
| `npm run start:prod` | Run the built app from `dist/main` |
| `npm run lint` | Run ESLint with auto-fix |
| `npm run format` | Format source and test files |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run e2e tests |
| `npm run test:cov` | Run test coverage |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Create and apply a development migration |
| `npm run prisma:migrate:deploy` | Apply existing migrations |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run prisma:seed` | Run the Prisma seed script |

## CI/CD

The GitHub Actions workflow runs on `main` and `develop` pushes and pull requests.

The CI job uses:

- Node.js `24.4.1`
- PostgreSQL `16-alpine`
- `npm ci`
- Prisma client generation
- Prisma migrations
- lint, build, unit tests, and e2e tests

On push events, the build job publishes a Docker image to GitHub Container Registry.

## Project Structure

```text
src/
  common/          Shared constants, filters, and interceptors
  config/          Database URL builder and env loader
  modules/         Feature modules
  prisma/          Prisma module and service
prisma/
  migrations/      Database migrations
  schema.prisma    Prisma schema
```

## Notes

- Prefer `DB_*` variables over hand-written `DATABASE_URL` values.
- `DATABASE_URL` and `SHADOW_DATABASE_URL` are generated internally from `DB_*` values.
- Use PostgreSQL `16` locally to match Docker and CI.
