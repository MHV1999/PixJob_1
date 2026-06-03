# PixJob — Sprint 0 Infrastructure

Monorepo for the PixJob creative-services marketplace.

---

## Stack

| Layer      | Technology                                      |
|------------|------------------------------------------------|
| Frontend   | Next.js 14, TypeScript, TailwindCSS, shadcn/ui, TanStack Query |
| Backend    | NestJS 10, TypeScript, Fastify adapter          |
| ORM        | Prisma 5                                        |
| Database   | PostgreSQL 16                                   |
| Cache      | Redis 7                                         |
| Monorepo   | Turborepo + npm workspaces                      |
| Containers | Docker Compose                                  |

---

## Repository structure

```
pixjob/
├── apps/
│   ├── backend/                  # NestJS API
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── config/           # Typed config (NestJS ConfigModule)
│   │       ├── infrastructure/
│   │       │   ├── database/     # PrismaService (global)
│   │       │   └── redis/        # RedisService (global)
│   │       └── modules/
│   │           └── health/       # GET /api/v1/health
│   └── frontend/                 # Next.js 14 App Router
│       ├── messages/             # i18n: en.json, fa.json
│       └── src/
│           ├── app/[locale]/     # Locale-aware routing
│           ├── i18n/             # next-intl request config
│           ├── lib/              # apiClient
│           ├── providers/        # TanStack Query provider
│           └── styles/           # globals.css (Tailwind)
├── packages/
│   ├── shared-types/             # Enums, response shapes, pagination
│   └── shared-utils/             # UUID generator, pagination helpers
├── .husky/                       # pre-commit + commit-msg hooks
├── .vscode/                      # Recommended extensions & settings
├── docker-compose.yml            # Development stack
├── docker-compose.prod.yml       # Production stack
├── turbo.json                    # Turborepo pipeline
├── tsconfig.base.json            # Shared TypeScript config
└── Makefile                      # Developer shortcuts
```

---

## Prerequisites

- Node.js >= 20
- npm >= 10
- Docker Desktop

---

## First-time setup

### 1 — Clone and install

```bash
git clone <repo-url> pixjob
cd pixjob
npm install
```

### 2 — Environment variables

```bash
# Root (used by Docker Compose)
cp .env.example .env

# Backend (used by NestJS directly when running outside Docker)
cp apps/backend/.env.example apps/backend/.env

# Frontend
cp apps/frontend/.env.example apps/frontend/.env.local
```

Edit `.env` and fill in secrets. Generate JWT secrets with:

```bash
make secret-gen
```

### 3 — Start infrastructure (PostgreSQL + Redis)

```bash
make docker-up
# or
docker compose up -d postgres redis
```

### 4 — Run database migrations

```bash
make db-migrate
# Generates Prisma client automatically
```

### 5 — Start development servers

```bash
make dev
# or
npm run dev
```

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:3000        |
| Backend    | http://localhost:4000        |
| Swagger    | http://localhost:4000/api/docs |
| Prisma Studio | `make db-studio`          |

---

## Common commands

| Command              | Description                              |
|----------------------|------------------------------------------|
| `make dev`           | Start all apps in watch mode             |
| `make build`         | Production build (all workspaces)        |
| `make lint`          | ESLint across all workspaces             |
| `make typecheck`     | TypeScript check across all workspaces   |
| `make test`          | Run all tests                            |
| `make docker-up`     | Start PostgreSQL + Redis                 |
| `make docker-reset`  | Wipe volumes and restart containers      |
| `make db-migrate`    | Run Prisma dev migrations                |
| `make db-generate`   | Regenerate Prisma client after schema change |
| `make db-studio`     | Open Prisma Studio                       |
| `make db-seed`       | Run database seed script                 |
| `make clean`         | Remove all build artifacts               |

---

## Running inside Docker (full stack)

```bash
docker compose up --build
```

---

## Architecture notes

### DDD module layout (backend)

Each feature domain lives in `apps/backend/src/modules/<domain>/` and follows this structure:

```
modules/auth/
├── application/
│   ├── use-cases/
│   └── dtos/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   └── repositories/        # interfaces
├── infrastructure/
│   └── repositories/        # Prisma implementations
└── auth.module.ts
```

### Locale routing (frontend)

All pages live under `src/app/[locale]/`. The Next.js middleware (next-intl) detects the locale from the URL prefix (`/en/...`, `/fa/...`) and provides RTL direction for Persian automatically.

### UUID

All database primary keys and domain entity IDs use UUID v4. Prisma uses `@default(uuid())` on every `id` field.

---

## Git conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(auth): add JWT refresh token rotation
fix(wallet): prevent double-spend on concurrent withdrawals
docs(readme): update setup instructions
```

Types: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`

---

## Sprint 0 checklist

- [x] Monorepo structure (Turborepo + npm workspaces)
- [x] Shared packages (`shared-types`, `shared-utils`)
- [x] NestJS app with Fastify, versioned API, Swagger
- [x] Prisma + PostgreSQL wired up (`PrismaService`)
- [x] Redis wired up (`RedisService`)
- [x] `GET /api/v1/health` endpoint
- [x] Next.js 14 App Router with i18n (EN + FA / LTR + RTL)
- [x] TanStack Query provider
- [x] Typed `apiClient`
- [x] Docker Compose (dev + prod)
- [x] Multi-stage Dockerfiles (backend + frontend)
- [x] Environment variable files (`.env.example`)
- [x] Husky pre-commit (lint-staged) + commit-msg (commitlint)
- [x] VS Code workspace settings + recommended extensions
- [x] Makefile with all developer shortcuts
