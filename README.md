# ReliefOps

Emergency response and supply chain coordination dashboard built from `spec.md`. This workspace contains a React dashboard, an Express API, MongoDB models, JWT authentication, role checks, and Socket.IO events.

## What is implemented

- Responsive operations dashboard with clearly labeled preview data, emergency cards, response activity chart, map-style situation preview, request search, and request creation/review interactions.
- Express endpoints for dashboard metrics, emergencies, inventory, vehicles, requests, and integration readiness.
- MongoDB schemas with timestamps for users, emergencies, inventory, requests, vehicles, deliveries, and activity logs.
- Password hashing with bcrypt, JWT sessions, role-based request approval and dispatch guards.
- Socket.IO broadcasts for new requests, request changes, and delivery updates.
- `DEMO` data in read endpoints when MongoDB is unavailable. Vehicle positions and routes are never represented as live navigation data.

The current UI is a dashboard foundation; the full set of pages and end-to-end external service flows in the specification still need implementation. Weather, Gemini, and map keys are detected for setup status but their provider integrations are not yet wired. No real weather, road safety, or vehicle tracking data is claimed.

## Run locally

Requirements: Node.js 20+ and MongoDB (local or hosted).

1. Copy `.env.example` to `.env` and set `JWT_SECRET` to a long random value. Set `MONGODB_URI` for persistent data.
2. Install dependencies with `npm install`.
3. Start the API and Vite development server with `npm run dev`.
4. Open `http://localhost:5173`; the API runs on `http://localhost:4000`.

`npm run build` creates the frontend production bundle in `dist/`. Set `CLIENT_ORIGIN` and `PORT` for deployment. The server currently serves API routes only; deploy the built frontend through a static host or configure a reverse proxy.

## API overview

- `GET /api/health`, `GET /api/integrations/status`
- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/dashboard`, `/api/emergencies`, `/api/inventory`, `/api/vehicles`, `/api/requests`
- `POST /api/requests` (authenticated)
- `PATCH /api/requests/:id/approve` (admin or emergency manager)
- `POST /api/deliveries/:id/dispatch` (admin or emergency manager; requires approved delivery)
- `PATCH /api/deliveries/:id/status` (assigned driver or manager)

Send authenticated API requests with `Authorization: Bearer <token>`. The first registered account receives the selected allowed role, so registration should be restricted or bootstrap admin provisioning should be added before public deployment.

## Safety and data notes

AI recommendations must remain advisory and require human review. This implementation does not dispatch automatically. Do not enter operational credentials in source control; use environment variables and a secret manager. Configure provider APIs and verified road data before using the product for live response operations.
