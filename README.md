# Inspectly

Home inspection report software for US market. Built for solo inspectors who want better reports, smarter AI.

## Stack

**Client** — Angular + Tailwind CSS
**Server** — NestJS + TypeORM + PostgreSQL
**AI** — Claude Haiku (Anthropic)
**Storage** — Cloudflare R2
**Payments** — Stripe
**Email** — Resend

## Project Structure
inspectly/
client/   → Angular PWA
server/   → NestJS API

## Getting Started

### Server
```bash
cd server
npm install
cp .env.example .env   # fill in your values
npm run start:dev
```

### Client
```bash
cd client
npm install
ng serve
```

## Environment Variables

See `server/.env.example` for required variables.

## Status

Under active development. Not production ready.