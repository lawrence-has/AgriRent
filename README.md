# 🌾 AgriRent — Agricultural Machinery Rental Management Platform

A full-stack web application for local farmers to browse and reserve agricultural equipment, and for equipment owners to manage their inventory and rental operations.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Frontend | React + Vite |
| Database | MySQL + Sequelize ORM |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Real-time | Socket.io |
| Push Notifications | Web Push API (web-push) |
| PWA | vite-plugin-pwa + Workbox |
| Styling | Tailwind CSS |
| State | Zustand + TanStack Query |

## Roles

| Role | Description |
|------|-------------|
| **Farmer** | Browses equipment, submits reservation requests, tracks rentals |
| **Owner** | Lists equipment, confirms/rejects reservations, releases/receives equipment |
| **Admin** | Platform-wide management of users, equipment, and reservations |

## Features

- 🚜 Equipment browsing with search + category filters
- 📅 Availability calendar per equipment (no double-booking)
- 📋 Reservation lifecycle: pending → confirmed → active → completed
- 📦 Transaction tracking: release and return with photo upload
- 💬 Real-time chat via Socket.io
- 🔔 Push notifications on reservation/transaction events
- 📱 PWA with offline support + Background Sync for reservations
- 🗑️ Soft delete (paranoid) on all major models

## Project Setup

### Prerequisites
- Node.js 18+
- MySQL (Laragon recommended)
- npm

### Backend

```bash
cd backend
npm install
# Create a .env file with your MySQL credentials, JWT_SECRET, and CLIENT_URL.
# Generate push keys with: npx web-push generate-vapid-keys
npm run dev
```

The server runs on **http://localhost:5000**. On first start, it creates/syncs all database tables automatically.
For an existing database, run `npm run migrate:all` from `backend` after the server has created the tables. This applies the explicit indexes and idempotency columns used by reservation and offline-chat retries.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on **http://localhost:5173**. Vite proxies API, uploads, and Socket.IO traffic to the local backend by default; set `VITE_API_URL` or `VITE_SOCKET_URL` only when connecting to a separately hosted backend.

### Offline and push requirements

- The PWA caches the app shell and selected public equipment data. Offline reservations and chat messages are stored in that browser and sync when connectivity returns; reservations remain unconfirmed until the server validates availability.
- Offline reservation requests are associated with the signed-in user and sent with idempotency keys so retries do not create duplicate reservations.
- Web Push requires HTTPS (except on `localhost`), valid VAPID keys, and notification permission/subscription on each browser/device. LAN HTTP addresses are not secure contexts and cannot receive Web Push.

## Environment Variables

### Backend `.env`

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `DB_HOST` | MySQL host (default: localhost) |
| `DB_NAME` | Database name (default: agrirent) |
| `DB_USER` | MySQL user (default: root) |
| `DB_PASSWORD` | MySQL password |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | Token expiry (default: 7d) |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key |
| `VAPID_EMAIL` | VAPID contact email |
| `CLIENT_URL` | Frontend URL for CORS |

### Frontend `.env`

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (default: proxied via Vite) |
| `VITE_SOCKET_URL` | Socket.io URL |

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/equipment` | List equipment (public) |
| POST | `/api/equipment` | Create equipment (owner) |
| GET | `/api/equipment/:id/availability` | Get booked dates |
| GET | `/api/reservations/my` | Farmer's reservations |
| POST | `/api/reservations` | Create reservation |
| PUT | `/api/reservations/:id` | Update status |
| POST | `/api/transactions` | Release equipment |
| PUT | `/api/transactions/:id` | Record return |
| GET | `/api/chat/conversations` | List conversations |
| GET | `/api/chat/:userId` | Get messages |
| POST | `/api/push/subscribe` | Subscribe to push |
| GET | `/api/dashboard/farmer-stats` | Farmer stats |
| GET | `/api/dashboard/owner-stats` | Owner stats |
| GET | `/api/dashboard/stats` | Admin stats |

## Database Schema

Tables auto-created by Sequelize sync:
- `Users` — farmers, owners, admins
- `Equipment` — machinery listings
- `Reservations` — rental requests
- `Transactions` — release/return records
- `Notifications` — in-app notifications
- `PushSubscriptions` — Web Push subscriptions
- `ChatMessages` — real-time chat history

All major tables use soft delete (`deletedAt`, paranoid mode).

## Deploy the full app on Railway

The root `Dockerfile` builds the Vite frontend and serves it from the Express service. The UI, `/api`, uploads, and Socket.IO therefore share one Railway web-service domain. MySQL runs as a separate database service in the same Railway project.

1. Push this repository to GitHub and create a Railway project from that repository. Use the repository root as the service root so Railway detects the root `Dockerfile`.
2. Add a MySQL database service to the same Railway project.
3. In the web service's Variables tab, reference the MySQL service's private variables (replace `MySQL` with the exact Railway service name): `DB_HOST=${{MySQL.MYSQLHOST}}`, `DB_PORT=${{MySQL.MYSQLPORT}}`, `DB_NAME=${{MySQL.MYSQLDATABASE}}`, `DB_USER=${{MySQL.MYSQLUSER}}`, and `DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}`. Set `JWT_SECRET` to a newly generated random secret and set `NODE_ENV=production`.
4. Generate a public domain for the web service, then set `CLIENT_URL` to that full HTTPS origin (for example, `https://your-app.up.railway.app`).
5. Attach a Railway volume to the web service at `/app/backend/uploads` so uploaded equipment, profile, and transaction images persist after redeployments.
6. Configure the web-service healthcheck path as `/api/health`, then deploy. The backend's existing startup code synchronizes the database tables.
7. To enable push notifications, also configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_EMAIL`. They can be left unset initially if push is not needed.

The frontend uses same-origin API and Socket.IO URLs by default, so production does not need `VITE_API_URL` or `VITE_SOCKET_URL`. Keep secrets in Railway variables; do not commit `.env` files. Existing local uploads and database records are not copied by the Docker build and must be migrated separately if they need to appear in production.

If the backend logs `SequelizeConnectionRefusedError`, verify that the MySQL service is running in the same Railway environment and that the backend's `DB_HOST`/`DB_PORT` reference that service's private `MYSQLHOST`/`MYSQLPORT`. The backend also accepts Railway's `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, and `MYSQLPASSWORD` variables directly, and retries temporary database startup connection refusals.
