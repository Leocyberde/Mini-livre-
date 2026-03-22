# Marketplace Regional

## Overview
A React + Vite frontend marketplace application with an Express.js backend. Uses TypeScript, Tailwind CSS v4, Radix UI components, and Wouter for routing.

## Architecture
- **Frontend**: React 19 + Vite 7, served from `client/` directory
- **Backend**: Express.js server in `server/index.ts` (serves static files in production)
- **Shared**: Common types/constants in `shared/`
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` plugin
- **UI Components**: Radix UI + shadcn/ui pattern (`components.json`)

## Key Files
- `vite.config.ts` - Vite config, dev server on port 5000, host 0.0.0.0, allowedHosts: true
- `client/src/App.tsx` - Main React app entry
- `client/src/main.tsx` - React root mount
- `server/index.ts` - Express server (production static file serving)
- `tsconfig.json` - TypeScript config with path aliases `@/*` -> `client/src/*`, `@shared/*` -> `shared/*`

## Context Providers (in App.tsx order)
- `ThemeProvider` → `ProductProvider` → `NotificationProvider` → `MarketplaceProvider` → `ProfileProvider` → `MotoboyProvider` → `SupportProvider`
- `NotificationProvider` must wrap `MarketplaceProvider` and `SupportProvider` so they can call `useNotification()`

## Notification System
- `client/src/contexts/NotificationContext.tsx` — manages in-app notifications for client and seller
- Bell icon in `Header.tsx` — shows for client & seller modes only, with animated red badge for unread count
- Client notifications triggered by: order status changes in `MarketplaceContext`
- Seller notifications triggered by: new orders in `MarketplaceContext`, support chat start/messages in `SupportContext`
- Client bell click → navigates to `/?tab=notificacoes` (ClientPanel handles this tab)
- Seller bell click → sets `sellerNotifRequested` in context → SellerPanel watches and switches to `notificacoes` tab
- Both panels have "Notificações" entry in their "Mais" menu with badge showing unread count
- Notifications persisted to localStorage under key `marketplace-notifications` (capped at 100)

## Dev Workflow
- `pnpm run dev` - Start Vite dev server on port 5000
- `pnpm run build` - Build frontend + backend
- `pnpm run start` - Run production server

## Deployment
- Type: Static site
- Build command: `pnpm run build`
- Public directory: `dist/public`

## Motoboy ↔ Client Chat
- `client/src/contexts/MotoboyClientChatContext.tsx` — shared chat context using localStorage as the message store (simulates real-time via 800ms polling)
- Available during motoboy phases: `entrega` and `chegada_entrega` (order status `on_the_way`)
- Disappears automatically after delivery is complete (status becomes `delivered`, order moves to history)
- **Motoboy side**: Blue person icon (UserRound) in header of `EntregaScreen` & `ChegadaEntregaScreen`, opens `MotoboyClientChatModal` — shows client name, chat history, unread dot badge
- **Client side**: "Falar com motoboy" button in `ClientOrdersPage` on order card when status is `on_the_way`, opens `ClientMotoboyChat` modal — unread count badge shown on button

## Notes
- Migrated from Manus/Replit Agent to Replit environment
- Removed Manus-specific plugins: `vite-plugin-manus-runtime`, `@builder.io/vite-plugin-jsx-loc`
- Removed Manus analytics script from `client/index.html`
- Workflow uses `pnpm run dev` to start Vite dev server on port 5000
- `leaflet` + `react-leaflet` added for OpenStreetMap map in the Motoboy panel
- Motoboy panel (`client/src/pages/MotoboyPanel.tsx`) has full-screen map with overlays, dark/light mode toggle
- Motoboy context (`client/src/contexts/MotoboyContext.tsx`) manages motoboy state
