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

### AdminPanel Architecture (modular)

`client/src/pages/AdminPanel.tsx` — Orchestrator (all state/hooks/handlers here, no JSX tabs)
`client/src/pages/AdminPanel/` — Tab components (no state, only props):
  - `types.ts` — `AdminMotoboy` interface
  - `helpers.tsx` — `statusLabel`, `statusIcon`, `fmtDateTime`, `formatDate`, `getTimestampForStatus`, `getDoubleRouteLabel`, `isDoubleRoute`
  - `OverviewTab.tsx` — KPIs, dispatch queue, sales/performance charts
  - `StoresTab.tsx` — Store grid, store detail, order management, block/delete/notify dialogs
  - `ClientsTab.tsx` — Unique client list derived from orders
  - `MotoboyTab.tsx` — Motoboy list, detail view (profile/orders sub-tabs), all motoboy dialogs
  - `CategoriesTab.tsx` — Categories derived from real products
  - `ReportsTab.tsx` — Sales report table + all orders detail list
  - `SupportTab.tsx` — Active support tickets with live chat
  - `SupportHistoryTab.tsx` — Resolved tickets history

## Key Configuration

- Vite runs on port 5000 (webview); proxies `/api` and `/ws` to backend on port 3001
- Database URL comes from `DATABASE_URL` environment variable (auto-set by Replit)
- Admin user seeded automatically on first start: `leolulu842@gmail.com`
- `allowedHosts: true` in vite.config.ts to allow Replit proxy

## Scripts

- `npm run dev` — Start both backend (tsx) and frontend (vite) concurrently
- `npm run build` — Build client to `dist/public` and bundle server to `dist/index.js`
- `npm run start` — Run production build

## Deployment

- Target: VM (required for WebSocket support)
- Build: `npm run build`
- Run: `node dist/index.js`
- Production build runs `node dist/index.js` which serves both the API and the static frontend on port 3000

## Workflow

- Name: "Start application"
- Command: `npm run dev`
- Port: 5000 (webview)
