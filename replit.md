# Marketplace Regional

A full-stack regional marketplace and delivery application built with TypeScript.

## Architecture

- **Frontend**: React 19 + Vite (port 5000 in dev)
- **Backend**: Express + Node.js (port 3001 in dev)
- **Database**: PostgreSQL (Replit built-in)
- **Real-time**: WebSockets (`/ws/tracking`) for live delivery tracking
- **Package manager**: pnpm

## Structure

```
client/          # React frontend (Vite)
  src/
    components/  # UI components (Radix UI primitives)
    pages/       # Views by role: Admin, Client, Motoboy, Seller
    contexts/    # Auth, Marketplace, Notifications, Tracking
server/          # Express backend
  index.ts       # Entry point, HTTP + WebSocket server
  db.ts          # PostgreSQL schema + connection
  routes.ts      # Modular API routes
shared/          # Shared types/constants
```

## Scripts

- `pnpm run dev` — starts backend (port 3001) + Vite dev server (port 5000)
- `pnpm run build` — builds frontend to `dist/public` and bundles backend to `dist/index.js`
- `pnpm run start` — runs production build

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (Replit managed)
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — DB credentials (Replit managed)
- `JWT_SECRET` — secret for JWT token signing
- `GOOGLE_MAPS_API_KEY` — Google Maps API key for geocoding/distance

## Key Features

- Multi-role auth: Admin, Seller, Client, Motoboy (delivery courier)
- Product catalog and orders
- Real-time GPS delivery tracking via WebSocket
- Google Maps geocoding with caching
- Rate limiting on auth, geocoding, and general API endpoints
