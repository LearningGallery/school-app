.PHONY: install lint test test-integration up down smoke e2e

install:
	npm ci

lint:
	npm run lint
	npm run typecheck

test:
	npm run test:unit
	python3 scripts/test_rollback_check.py

# Starts a throwaway Postgres on :55432, runs integration tests, removes it.
test-integration:
	docker compose up -d db
	DATABASE_URL=postgres://postgres:$${POSTGRES_PASSWORD:-local-dev-password}@localhost:55432/school npm run test:integration; rc=$$?; docker compose stop db; exit $$rc

up:
	@test -f .env || cp .env.example .env
	docker compose up --build -d

down:
	docker compose down -v

smoke:
	@set -a; . ./.env; set +a; SMOKE_EMAIL=$$SEED_ADMIN_EMAIL SMOKE_PASSWORD=$$SEED_ADMIN_PASSWORD tests/smoke/smoke.sh

e2e:
	@set -a; . ./.env; set +a; E2E_ADMIN_PASSWORD=$$SEED_ADMIN_PASSWORD npm run e2e -w tests
