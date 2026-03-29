# Phase 1 Demo Runbook

This runbook covers the current Phase 1 demo path using the API, web app, and mobile app.

## Environment

- Install dependencies with `pnpm install`
- Ensure MongoDB and Redis are available
- Configure the API from `apps/api/.env.example`
- Configure the mobile app from `apps/mobile/.env.example`

## Start the stack

1. Run `pnpm --filter sidewalk-api db:seed`
2. Run `pnpm dev:api`
3. Run `pnpm dev:web`
4. Run `pnpm dev:mobile`

## Web flow

1. Open `http://localhost:3000/diagnostics`
2. Verify the health card shows API connectivity
3. Open the OTP auth flow and sign in
4. Create a report from `/dashboard/reports/new`
5. Open the report detail page
6. If using an admin account, open the moderation queue and submit a status update

## Mobile flow

1. Launch the Expo app
2. Request and verify an OTP from the login screen
3. Submit a report from the Reports tab
4. Reopen the app to confirm the stored session restores

## Known limitations

- OTP delivery depends on the configured email transport
- The admin anchoring flow still expects the original Stellar transaction hash
- Mobile media capture and richer report history are still evolving beyond the core Phase 1 demo
