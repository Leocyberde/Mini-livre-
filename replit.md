# Marketplace Regional

A regional marketplace platform that connects clients, sellers, and delivery drivers (motoboys) in a local area.

## Architecture

- **Frontend**: React 19 + Vite + Tailwind CSS v4 + Radix UI components
- **Backend**: Express (Node.js) + TypeScript, served on port 3001 in dev
- **Database**: PostgreSQL (Replit built-in), accessed via `pg` pool
- **WebSockets**: Real-time GPS tracking for deliveries via `/ws/tracking`
- **Auth**: JWT + bcrypt

## Project Structure

- `client/` — React frontend (Vite root)
- `server/` — Express API server + WebSocket server
- `shared/` — Constants shared between client and server
- `dist/` — Build output (server: `dist/index.js`, client: `dist/public/`)

## Key Configuration

- Vite runs on port 5000 (webview); proxies `/api` and `/ws` to backend on port 3001
- Database URL comes from `DATABASE_URL` environment variable (auto-set by Replit)
- Admin user seeded automatically on first start: `leolulu842@gmail.com`

## Scripts

- `npm run dev` — Start both backend (tsx) and frontend (vite) concurrently
- `npm run build` — Build client to `dist/public` and bundle server to `dist/index.js`
- `npm run start` — Run production build

## Deployment

Production build runs `node dist/index.js` which serves both the API and the static frontend.
