# Meal Planner Monorepo

TypeScript Turborepo with:

- `apps/web`: React + React Router + React Hook Form + TanStack Query + PrimeReact + Tailwind
- `apps/api`: NestJS + Prisma + MySQL

## Quick Start

1. Install dependencies:

```bash
pnpm i
```

2. Configure backend env:

```bash
cp apps/api/.env.example apps/api/.env
```

3. Generate Prisma client and run migrations:

```bash
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate
```

4. Start both apps:

```bash
pnpm dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3000`

## Features

- Left sidebar navigation for `Meals` and `Meal Planner`
- Meal CRUD with ingredient management in modal forms
- Weekly 7-day planner using drag-and-drop meal assignment
- Tracks `lastSelectedAt` to avoid meal repetition
- Weekly shopping list generated from planned meals

## Docker (Self-Contained)

Run the full stack (`web`, `api`, `mysql`) with Docker:

```bash
docker compose up --build
```

Endpoints:

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- MySQL: `localhost:3306`

Notes:

- The API container runs `prisma db push` on startup to sync schema automatically.
- To enable AI meal suggestions, set `OPENAI_API_KEY` before running compose:

```bash
export OPENAI_API_KEY=your_key_here
docker compose up --build
```
