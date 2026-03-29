# Marketplace Regional

A full-stack regional marketplace web application with integrated delivery tracking.

## Architecture

- **Frontend**: React 19 + Vite on port 5000, using Tailwind CSS 4, Wouter (routing), Radix UI, Lucide React
- **Backend**: Express.js (Node.js) on port 3001 using `tsx` (TypeScript execution)
- **Database**: PostgreSQL via Replit's built-in database (`pg` driver, `DATABASE_URL` env var)
- **Real-time**: WebSocket server (`ws`) at `/ws/tracking` for live delivery location tracking
- **Auth**: JWT + bcryptjs for authentication
- **Maps**: Google Maps Services JS for geocoding and distance matrix

## Project Structure

```
client/          React frontend
  src/
    components/  UI components (Radix UI primitives in ui/)
    contexts/    Global state (Auth, Marketplace, Notifications, etc.)
    pages/       Route views (Admin, Seller, Client, Motoboy panels)
    hooks/       Custom React hooks
    lib/         Utilities
server/          Express backend
  index.ts       Entry point (Express + WebSocket server)
  routes.ts      API endpoints
  db.ts          Database schema init + PostgreSQL connection pool
  auth.ts        JWT authentication logic
shared/          Code shared between client and server
```

## Running the App

```bash
npm run dev       # Starts backend (port 3001) + Vite frontend (port 5000)
npm run build     # Builds frontend to dist/public, bundles backend to dist/
npm run start     # Runs the production build
```

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (set by Replit automatically)
- `JWT_SECRET` — Secret for signing JWT tokens
- `GOOGLE_MAPS_API_KEY` — For geocoding and distance matrix API calls
- `PORT` — Server port (defaults to 3001 in dev, 3000 in production)

## Key Notes

- The Vite dev server (port 5000) proxies `/api` and `/ws` requests to the backend (port 3001)
- In production, the Express server serves the built frontend static files from `dist/public`
- The database schema is automatically initialized on startup via `initDb()` in `server/db.ts`
- An admin user (`leolulu842@gmail.com`) is seeded on first startup if it doesn't exist
- Scripts use `node_modules/.bin/` directly to work correctly in the Replit environment
