# Campus Event Management API

Initial backend infrastructure for the Campus Event Management and OD Platform.

## Stack

- Node.js, Express, TypeScript
- PostgreSQL with Prisma ORM
- Redis with BullMQ

## Structure

```text
prisma/schema.prisma       Database models and relations
src/app.ts                 Express application and middleware
src/server.ts              HTTP server and graceful shutdown
src/lib/prisma.ts          Singleton Prisma client
src/lib/redis.ts           Redis connection configuration and client
src/queues/flyerQueue.ts   Flyer processing queue and worker
src/middleware/            Shared Express middleware
```

## Setup

1. Copy `.env.example` to `.env` and update the PostgreSQL and Redis values.
2. Install dependencies with `npm install`.
3. Generate Prisma Client with `npm run prisma:generate`.
4. Create the first migration with `npm run prisma:migrate -- --name init`.
5. Start development with `npm run dev`.

The health endpoint is available at `GET /health`.
