# Cake Platform Backend

## Current state
This backend still preserves the demo API shape, but it has moved well beyond the original pure in-memory scaffold.

### What changed
- file-backed persistence via `data/db.json` by default, or a custom file via `DATA_FILE`
- seed bootstrap via `src/seed-data.js`
- repository layer in `src/repositories.js`
- service layer in `src/services.js`
- lightweight bearer-token auth and session handling in `src/auth.js`
- route handlers now resolve data through repositories/services instead of mutating imported arrays directly
- owner multi-location operations, dispute threading, refund handling, and customer-visible support messaging now run through the same backend contract

## Run
```bash
npm run dev
```

Server runs on `http://localhost:4020` by default, or a custom port via `PORT`.

For isolated local verification, prefer setting both:
```bash
PORT=4206 DATA_FILE=data/db-4206.json npm run dev
```
This avoids cross-instance interference from multiple servers sharing one JSON store.

## Demo auth
Use `POST /api/auth/login` with an email and optional role. The response returns a demo bearer token.

Protected routes now enforce roles:
- owner/staff/admin for `/api/owner/*`
- admin for `/api/admin/*`

Example header:
```text
Authorization: Bearer demo-...
```

## Persistence model
The app auto-creates `data/db.json` on first boot using the seed dataset. This is intentionally simple so the next swap to SQLite/Postgres can keep the repository/service seams.

## Developer utility
- `POST /api/dev/reset` resets the file store back to the seed dataset.
- `GET /api/auth/me` returns the resolved request user for a bearer token.
- `GET /api/auth/sessions` lists the current user's demo sessions.
- `POST /api/auth/sessions/:id/revoke` revokes one session or other sessions, depending on payload.

## Operational surface highlights
Beyond the original scaffold, the current local contract also includes:
- owner queue and per-order ops updates
- owner multi-location reads plus `POST /api/owner/location-bulk-apply`
- dispute escalation, thread messages, and explicit refund decisions
- admin dispute assignment and reassignment via `POST /api/admin/disputes/:id/assign`
- customer self-cancel before baking starts
- customer support read/write routes via `GET /api/orders/:id/support` and `POST /api/orders/:id/support-messages`
- checkout integrity guards that reject cross-shop saved-design or pickup-slot mismatches

## Pickup-first fulfillment boundary
MVP fulfillment is explicitly pickup-first.

What is now covered:
- orders stamp a `fulfillmentSnapshot` that marks pickup as the locked MVP path
- pickup orders queue confirmation and pickup-reminder notification events
- moving an order to `ready` queues `ready_for_pickup`
- `POST /api/owner/orders/:id/complete-pickup` is the explicit staff/owner completion step for MVP pickup handoff
- pickup completion records completion metadata and queues `pickup_completed`
- `POST /api/admin/disputes/:id/refund` turns refund review into an explicit admin action with approved/rejected decisions, amount capture, order/dispute history, and refund notifications

What is intentionally not covered yet:
- delivery routing
- courier dispatch
- address validation
- third-party delivery integrations
- proof-of-delivery flows

That later delivery work should extend the same fulfillment seam instead of changing the MVP pickup completion contract.

## Structure
- `src/seed-data.js` seed data and enum-like constants
- `src/store.js` file persistence and reset behavior
- `src/repositories.js` CRUD-ish collection access
- `src/services.js` order/design/notification workflow logic
- `src/auth.js` bearer token session lookup and route guards
- `src/helpers.js` read-model shaping helpers
- `src/app.js` route wiring
- `src/server.js` startup entrypoint

## Next production step
Replace the file store with a real database implementation behind the same repository interface, then harden auth with password/OAuth and signed tokens.

After that, add real payment-provider refund execution behind the same admin refund seam, plus delivery as a separate post-MVP fulfillment branch with its own decision states and completion workflow rather than overloading pickup completion.
