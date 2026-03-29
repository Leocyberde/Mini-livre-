# Marketplace Regional

A full-stack regional marketplace application connecting clients, sellers (lojistas), delivery drivers (motoboys), and admins.

## Architecture

- **Frontend**: React 19 + Vite, Tailwind CSS 4, Wouter (routing), Shadcn/UI components
- **Backend**: Express + Node.js (TypeScript), JWT authentication, WebSockets for real-time GPS tracking
- **Database**: PostgreSQL (Replit built-in), managed via `pg` with raw SQL schema in `server/db.ts`
- **Real-time**: WebSocket server at `/ws/tracking` for motoboy GPS location updates

## Project Structure

```
client/          # React frontend (Vite root)
  src/
    pages/       # Role-specific pages (Home, LoginPage, SellerPanel, MotoboyPanel, AdminPanel)
    contexts/    # Auth, Marketplace, Notifications, Chat, etc.
    components/  # Shadcn UI primitives + custom components
server/          # Express backend (TypeScript)
  index.ts       # Entry point — Express + WebSocket server
  routes.ts      # All REST API routes under /api
  db.ts          # PostgreSQL schema init + queries
  auth.ts        # JWT auth middleware
shared/          # Shared types and constants (used by both client and server)
```

## Running the App

- **Dev**: `npm run dev` — starts backend (port 3001) and Vite frontend (port 5000) concurrently
- **Build**: `npm run build` — builds frontend to `dist/public` and bundles server to `dist/index.js`
- **Start (prod)**: `npm run start` — runs `dist/index.js`

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (set by Replit)
- `JWT_SECRET` — Secret for JWT signing
- `GOOGLE_MAPS_API_KEY` — For geocoding and distance matrix (optional)
- `PORT` — Server port (defaults to 3001 in dev, 3000 in prod)

## Key Details

- Vite proxies `/api` → `http://localhost:3001` and `/ws` → `ws://localhost:3001` in dev
- The backend serves the built frontend statically in production
- Schema is auto-initialized on startup via `initDb()` (CREATE TABLE IF NOT EXISTS)
- Default admin: `leolulu842@gmail.com` / `leoluh123`
- Package manager: pnpm (lockfile committed)
