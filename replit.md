# Marketplace Regional

A full-stack regional marketplace web application with multi-role support: Clients, Sellers, Motoboys (delivery drivers), and Admins.

## Architecture

- **Frontend**: React 19 + Vite + Tailwind CSS 4 + Shadcn/UI, runs on port 5000
- **Backend**: Node.js + Express, runs on port 3001 (proxied from frontend via Vite)
- **Database**: PostgreSQL (Replit built-in), accessed via `pg` pool using `DATABASE_URL`
- **Auth**: JWT-based auth via `jsonwebtoken` + `bcryptjs`; token stored in `localStorage` under key `auth-token`
- **Routing**: `wouter` for client-side routing

## Project Structure

```
client/         React frontend (entry: client/src/main.tsx)
  src/
    components/ UI components including Shadcn/UI primitives in ui/
    contexts/   React contexts (Auth, Marketplace, Notifications, etc.)
    pages/      Main views (Home, SellerPanel, MotoboyPanel, etc.)
    lib/        Utilities and shared logic
server/         Express backend
  index.ts      Server entry point
  routes.ts     All /api/* endpoints
  db.ts         PostgreSQL schema initialization and pool
  googleMaps.ts Google Maps geocoding integration
  delivery.ts   Delivery calculation logic
shared/         Code shared between client and server
attached_assets/ Static assets and documentation screenshots
```

## Running the App

- **Development**: `npm run dev` — starts backend (tsx) on port 3001 and Vite on port 5000
- **Build**: `npm run build` — Vite build + esbuild bundle for production
- **Production**: `npm run start` — runs bundled server from dist/

## Auth System

- `server/auth.ts` — `signToken()`, `requireAuth`, `requireRole()` middleware
- `/api/auth/login` and `/api/auth/register` return `{ user, token }` (JWT)
- `/api/auth/add-role` (POST, protected) returns new `{ user, token }` with updated roles
- Frontend: `client/src/lib/authFetch.ts` exposes `authFetch()` and `authApi()` — all mutating requests go through these to attach the `Authorization: Bearer <token>` header
- `AuthContext.tsx` saves the token to `localStorage['auth-token']` on login/register/add-role and clears it on logout
- All write routes (orders, cart, notifications, chat, product-qa, promotions, reviews, motoboys) are protected with `requireAuth` or `requireRole()`
- All contexts (`MarketplaceContext`, `NotificationContext`, `ProductContext`, etc.) use `authApi`/`authFetch` and handle 401 responses gracefully (fallback to empty arrays)

## Environment Variables

- `POSTGRES_URL` — PostgreSQL connection string (external DB at 201.76.43.98, set in `.replit`)
- `DATABASE_URL` — Alternative PostgreSQL connection string (Replit built-in)
- `JWT_SECRET` — Secret for signing JWT tokens (defaults to hard-coded fallback if unset)
- `GOOGLE_MAPS_API_KEY` — for geocoding (optional, delivery feature)
- `PORT` — server port (defaults to 3001 in dev, 3000 in production)

## Database

All tables are created automatically on startup via `initDb()` in `server/db.ts`. An admin user is seeded on first run:
- Email: `leolulu842@gmail.com`
- Password: `leoluh123`

## Key Features

- Multi-role authentication (client, seller, motoboy, admin)
- Product catalog with categories, stock management, and images
- Shopping cart and order flow with status history
- Delivery distance calculation and motoboy assignment
- Real-time-style chat between motoboys and clients
- Product Q&A system
- Promotions and discount engine
- Store and product reviews
- Notifications system

## Replit Migration Notes

- Packages managed via pnpm; binaries invoked with `pnpm exec` in npm scripts
- Workflow configured for webview output on port 5000
- Replit built-in PostgreSQL database provisioned and linked via DATABASE_URL
