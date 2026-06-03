# PixJob — Developer Makefile
# Usage: make <target>

.PHONY: help install dev build lint typecheck test \
        docker-up docker-down docker-logs docker-reset \
        db-migrate db-generate db-studio db-seed \
        secret-gen clean

# ─── Help ─────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  PixJob — available targets"
	@echo ""
	@echo "  Setup"
	@echo "    install        Install all workspace dependencies"
	@echo "    secret-gen     Generate secure JWT secrets"
	@echo ""
	@echo "  Development"
	@echo "    dev            Start all apps in watch mode (Turbo)"
	@echo "    build          Build all apps"
	@echo "    lint           Lint all workspaces"
	@echo "    typecheck      TypeScript check all workspaces"
	@echo "    test           Run all tests"
	@echo ""
	@echo "  Docker"
	@echo "    docker-up      Start PostgreSQL + Redis (detached)"
	@echo "    docker-down    Stop all containers"
	@echo "    docker-logs    Tail container logs"
	@echo "    docker-reset   Wipe volumes and restart"
	@echo ""
	@echo "  Database"
	@echo "    db-migrate     Run Prisma migrations (dev)"
	@echo "    db-generate    Regenerate Prisma client"
	@echo "    db-studio      Open Prisma Studio"
	@echo "    db-seed        Run database seed"
	@echo ""
	@echo "  Misc"
	@echo "    clean          Remove all build artifacts"
	@echo ""

# ─── Setup ────────────────────────────────────────────────────────────────────
install:
	npm install

secret-gen:
	@echo "JWT_ACCESS_SECRET=$$(node -e "process.stdout.write(require('crypto').randomBytes(64).toString('hex'))")"
	@echo "JWT_REFRESH_SECRET=$$(node -e "process.stdout.write(require('crypto').randomBytes(64).toString('hex'))")"

# ─── Development ──────────────────────────────────────────────────────────────
dev:
	npm run dev

build:
	npm run build

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm run test

# ─── Docker ───────────────────────────────────────────────────────────────────
docker-up:
	docker compose up -d postgres redis

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-reset:
	docker compose down -v
	docker compose up -d postgres redis

# ─── Database ─────────────────────────────────────────────────────────────────
db-migrate:
	npm run db:migrate --workspace=@pixjob/backend

db-generate:
	npm run db:generate --workspace=@pixjob/backend

db-studio:
	npm run db:studio --workspace=@pixjob/backend

db-seed:
	npm run db:seed --workspace=@pixjob/backend

# ─── Clean ────────────────────────────────────────────────────────────────────
clean:
	find . -name "dist" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
	find . -name ".next" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
	find . -name ".turbo" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
	find . -name "coverage" -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
	@echo "Clean complete."
