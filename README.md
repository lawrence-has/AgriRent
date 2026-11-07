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
cp .env.example .env
# Fill in your DB credentials and generate VAPID keys:
# npx web-push generate-vapid-keys
npm install
npm run dev
```

The server runs on **http://localhost:5000**. On first start, it creates/syncs all database tables automatically.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The app runs on **http://localhost:5173**.

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
