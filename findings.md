# Findings

## 2026-06-01 09:30 resolver upkeep pass

- Closed the highest-value open tooling gap from the tracker: stale backend auto-resolution.
- Updated checked-in `verify-integration.js` so candidate discovery now prefers isolated/current `4224` then `4222`, and tightened compatibility with `GET /api/admin/team` so stale `4216` no longer qualifies.
- Mirrored that same discovery fix in `cake-builder-prototype/src/App.jsx`, so the live prototype now prefers `4224/4222` and rejects stale session-compatible but admin-incomplete ports.
- Fresh verification evidence after the change:
  - unpinned `node verify-integration.js` auto-resolved to `http://localhost:4224` and passed fully end to end
  - `npm run build` still passed in `cake-builder-prototype`
- Current verified conclusion after the upkeep pass:
  - resolver drift to stale `4216` is fixed in the checked-in verifier and prototype discovery logic
  - root `/` discovery is still incomplete documentation and still under-reports `GET /api/meta/order-statuses`, `GET /api/admin/team`, and `POST /api/admin/disputes/:id/assign`

## 2026-06-01 08:15 cron health check

- No new backend regression showed up. The meaningful state is still resolver drift plus incomplete root discovery, not a fresh contract break.
- Fresh exact probes still split the live ports the same way:
  - `4216` is still the stale-current trap. A fresh unpinned `node verify-integration.js` run still failed immediately there at `GET /api/admin/team -> 404`.
  - `4222` and `4224` are still the healthy current targets. Fresh pinned `node verify-integration.js` runs passed fully on both ports again.
- Fresh pinned proof on both `http://localhost:4222` and `http://localhost:4224` re-verified the full current contract, including:
  - auth sessions plus revoke-other-session flow
  - owner multi-location reads with `ownerLocationCount: 3`
  - scoped queue/slot proof with `burnabyQueue: 1` and `richmondSlots: 2`
  - checkout integrity guard returning `Pickup slot belongs to a different shop`
  - guarded pickup completion ending at `pickupCompletedStatus: picked_up`
  - admin team, dispute assignment, refund, and customer-visible support flows
  - customer-visible support preview `Yes, we can hold the cake a bit longer.`
- Fresh source-vs-discovery drift is still unresolved and re-confirmed at runtime:
  - `4216`, `4222`, and `4224` root `/` discovery still report only `37` routes and still omit `GET /api/meta/order-statuses`, `GET /api/admin/team`, and `POST /api/admin/disputes/:id/assign`
  - checked-in `src/app.js` still defines all three handlers, so `/` remains incomplete documentation even on the healthy generation
- Meaningful conclusion: current backend behavior is still healthy on `4222` and `4224`; the only actionable breakage remains verifier drift toward stale `4216`, plus incomplete root discovery documentation.

## 2026-06-01 06:15 cron health check

- No new backend regression showed up. The meaningful state is still resolver drift plus incomplete root discovery, not a fresh contract break.
- Fresh exact verification still split the live ports the same way:
  - `4216` is still the stale-current trap. A fresh unpinned `node verify-integration.js` run still failed immediately there at `GET /api/admin/team -> 404`.
  - `4222` and `4224` are still the healthy current targets. Fresh pinned `node verify-integration.js` runs passed fully on both ports again.
- Fresh pinned proof on both `http://localhost:4222` and `http://localhost:4224` re-verified the full current contract, including:
  - auth sessions plus revoke-other-session flow
  - owner multi-location reads with `ownerLocationCount: 3`
  - scoped queue/slot proof with `burnabyQueue: 1` and `richmondSlots: 2`
  - checkout integrity guard returning `Pickup slot belongs to a different shop`
  - guarded pickup completion ending at `pickupCompletedStatus: picked_up`
  - admin team, dispute assignment, refund, and customer-visible support flows
  - customer-visible support preview `Yes, we can hold the cake a bit longer.`
- Fresh source-vs-discovery drift is still unresolved and now re-confirmed from both source and runtime:
  - checked-in `src/app.js` defines real handlers for `GET /api/meta/order-statuses`, `GET /api/admin/team`, and `POST /api/admin/disputes/:id/assign`
  - root `/` discovery on `4216`, `4222`, and `4224` still reports only `37` routes and still omits all three of those live endpoints
- Meaningful conclusion: current backend behavior is still healthy on `4222` and `4224`; the only actionable breakage remains verifier drift toward stale `4216`, plus incomplete root discovery documentation.

## 2026-06-01 05:15 cron health check

- No new backend regression showed up. The meaningful state is still local multi-instance drift, not a fresh source break.
- Fresh exact verification still split the live ports the same way:
  - `4216` is still the stale-current trap. It responds on isolated `data/db-4216.json`, advertises `37` root-listed routes, serves `GET /api/meta/order-statuses` with `200`, but still fails `GET /api/admin/team` with `404`.
  - `4222` is still healthy on `data/db-4222.json` and `4224` is still healthy on `data/db-4224-health.json`; both return `200` for `GET /api/admin/team` and both passed a fresh pinned full `node verify-integration.js` run end to end.
  - Older generations remain unchanged and still behind current contract: `4204` (`36` routes, `admin/team` 404), `4176` (`28` routes, `admin/team` 404, shared `data/db.json`), `4120` (`22` routes, `admin/team` 404, shared `data/db.json`), and `4020` (`10` routes, `/api/meta/order-statuses` 404).
- Fresh unpinned verification is still misleading in the same exact way. `node verify-integration.js` still failed immediately at `GET /api/admin/team -> 404`, which confirms the checked-in resolver still auto-binds to stale `4216` before checking the healthy `4222/4224` generation.
- Fresh pinned proof on both `http://localhost:4222` and `http://localhost:4224` re-verified the full current contract, including:
  - auth sessions plus revoke-other-session flow
  - owner multi-location reads with `ownerLocationCount: 3`
  - scoped queue/slot proof with `burnabyQueue: 1` and `richmondSlots: 2`
  - checkout integrity guard returning `Pickup slot belongs to a different shop`
  - guarded pickup completion ending at `pickupCompletedStatus: picked_up`
  - admin team, dispute assignment, refund, and threaded support flows
  - customer-visible support preview `Yes, we can hold the cake a bit longer.`
- Checked-in discovery drift is still unresolved in source. `src/app.js` defines real handlers for `GET /api/admin/team` (line `351`), `POST /api/admin/disputes/:id/assign` (line `361`), and `GET /api/meta/order-statuses` (line `426`), but the root `/` discovery payload still omits them and still reports only `37` routes on the healthy generation.
- Meaningful conclusion: current backend behavior is still healthy on `4222` and `4224`; the only actionable breakage remains verifier drift toward stale `4216`, plus incomplete root discovery documentation.

## 2026-06-01 04:15 cron health check

- Local multi-instance drift is still the only meaningful backend health problem.
- Fresh exact probes still show the stale-current split is real:
  - `4216` is alive on isolated `data/db-4216.json` but still fails `GET /api/admin/team` with `404`.
  - `4222` is healthy on `data/db-4222.json` and returns `200` for `GET /api/admin/team`.
  - `4224` is healthy on isolated `data/db-4224-health.json` and returns `200` for `GET /api/admin/team`.
- Fresh unpinned verification is still misleading. `node verify-integration.js` still fails by auto-binding to stale `4216`, because the checked-in resolver still prefers `4216` and still does not include `4222` or `4224` in its candidate list.
- Fresh pinned full verification passed end to end on both `http://localhost:4222` and `http://localhost:4224`. Current verified contract still includes:
  - auth sessions and revoke-other-session flow
  - owner multi-location reads with `ownerLocationCount: 3`
  - scoped proof with `burnabyQueue: 1` and `richmondSlots: 2`
  - checkout mismatch guard with `Pickup slot belongs to a different shop`
  - guarded pickup completion ending at `pickupCompletedStatus: picked_up`
  - admin team/dispute assignment flows
  - customer support visibility, including preview `Yes, we can hold the cake a bit longer.`
- Source-vs-discovery drift is still unresolved. The root discovery payload still reports `37` routes and still omits live current endpoints including `GET /api/meta/order-statuses`, `GET /api/admin/team`, and `POST /api/admin/disputes/:id/assign`, so `/` remains incomplete documentation.
- Meaningful conclusion: the backend itself is healthy on `4222` and `4224`; the real breakage is verifier drift toward stale `4216`, plus incomplete route discovery in `src/app.js`.

## 2026-06-01 03:15 cron health check

- Local drift is still the only meaningful backend health problem. Fresh listener proof now shows at least `39` live ports in the `4000-4300` band, and the meaningful backend generations remain split across stale `4020`, intermediate `4120`, later `4176`, isolated `4204`, stale-current `4216`, and healthy-current `4222` plus isolated `4224`.
- The compatibility resolver in `verify-integration.js` is still materially stale. The checked-in candidate list still starts at `4216` and does not include `4222` or `4224`, so a fresh unpinned `node verify-integration.js` run still failed immediately at `GET /api/admin/team -> 404`.
- Fresh pinned end-to-end verification passed fully on both `http://localhost:4222` and `http://localhost:4224`, re-proving the current contract end to end: auth sessions/revoke, owner multi-location reads, scoped queue and slot visibility, checkout mismatch rejection, owner ops plus guarded pickup completion, exception/refund flows, admin team plus dispute assignment, and customer support plus self-cancel protections.
- Fresh concrete proof from the passing current-generation runs:
  - `ownerLocationCount: 3`
  - `scopedLocationProof.burnabyQueue: 1`
  - `scopedLocationProof.richmondSlots: 2`
  - `pickupCompletedStatus: picked_up`
  - `customerSupport.customerVisiblePreview: "Yes, we can hold the cake a bit longer."`
  - `mismatchedCheckoutError: "Pickup slot belongs to a different shop"`
- Exact current admin-team drift is still real by port:
  - `4216` still fails `GET /api/admin/team` with `404`
  - `4222` returns `200` on `GET /api/admin/team`
  - `4224` returns `200` on `GET /api/admin/team`
- Checked-in source-vs-discovery drift is still unresolved. Current `src/app.js` root discovery still omits real live current endpoints including `GET /api/meta/order-statuses`, `GET /api/admin/team`, and `POST /api/admin/disputes/:id/assign`, even though the healthy `4222/4224` generation serves them and the integration verifier depends on them.
- Meaningful conclusion: the backend contract itself is healthy on `4222` and `4224`, but local verification remains noisy because the default resolver still binds to stale `4216`, and the root discovery payload still under-documents the real current admin/meta surface.

## 2026-06-01 01:15 cron health check

- Local backend drift is still the main operational problem, but there is a newer healthy generation live now than the last written note captured. Fresh exact probes show at least these meaningful generations:
  - `4020` -> stale reduced contract, `10` root-listed routes, still missing `/api/meta/order-statuses`, `/api/auth/me`, `/api/auth/sessions`, `/api/owner/locations`, and `/api/admin/team`.
  - `4120` -> intermediate shared-store contract, `22` root-listed routes, has auth/meta basics, but still missing `/api/auth/sessions`, `/api/owner/locations`, and `/api/admin/team`.
  - `4176` -> later shared-store contract, `28` root-listed routes, now has `/api/owner/locations`, but still missing `/api/auth/sessions` and `/api/admin/team`.
  - `4204` -> isolated `36`-route contract with sessions and owner locations, but still missing `/api/admin/team`.
  - `4216` -> isolated `37`-route contract that still fails `GET /api/admin/team` with `404`.
  - `4222` and isolated `4224` -> current healthy generation, both with `37` root-listed routes, working `/api/auth/sessions`, `/api/owner/locations`, and working `GET /api/admin/team`.
- The compatibility picker in `verify-integration.js` is still materially stale. Its candidate order stops first on `4216`, so a fresh unpinned `node verify-integration.js` run still failed immediately at `GET /api/admin/team -> 404`, even though newer healthy targets are already live on `4222` and `4224`.
- Fresh end-to-end verification passed when pinned to `http://localhost:4222`. Verified working flows/endpoints in that run included:
  - auth login, session list, second-session creation, and revoke-other-session flow
  - `/api/meta/order-statuses`
  - owner multi-location reads plus scoped `shop-2` queue and `shop-3` pickup-slot visibility
  - customer design create/list, cross-bakery design visibility, linked checkout, and reorder
  - checkout integrity guard rejecting cross-shop slot mismatch with `400 Pickup slot belongs to a different shop`
  - owner ops update, guarded lifecycle progression, explicit pickup completion, pickup-slot patch, owner cancellation, exception flagging, and exception notes
  - admin team read, dispute assignment, thread messages, refund decision, dispute resolution
  - customer support read/write and pre-baking self-cancel with late-cancel `409` protection
- Fresh concrete proof from the passing `4222` run:
  - `ownerLocationCount: 3`
  - `scopedLocationProof.burnabyQueue: 1`
  - `scopedLocationProof.richmondSlots: 2`
  - `pickupCompletedStatus: picked_up`
  - `updatedTemplate.name: Burnaby Celebration Plus`
  - `customerSupport.customerVisiblePreview: "Yes, we can hold the cake a bit longer."`
- Source-vs-discovery drift is still real on the current source, even though runtime is healthy on `4222/4224`. The checked-in root discovery payload in `src/app.js` still advertises only `37` routes and omits live current endpoints including `GET /api/meta/order-statuses`, `GET /api/admin/team`, and `POST /api/admin/disputes/:id/assign`.
- Meaningful conclusion: the backend contract itself is healthy on `4222`/`4224`, but local verification is still noisy because the auto-resolver lands on stale `4216`, and the root discovery payload still under-documents the real current admin/meta surface.

## 2026-05-31 23:15 cron health check

- Local backend drift is still the only meaningful operational problem. Fresh listener proof again shows the backend spread across many live ports, including `4020, 4120, 4122, 4124, 4126, 4130, 4160, 4176, 4192, 4194, 4202, 4204, 4206, 4210, 4212, 4214, 4216, 4220, 4222`, so an unpinned local target is still ambiguous.
- The auto-resolve order in `verify-integration.js` is still misleading because it prefers `4216` first among compatible ports. A fresh unpinned `node verify-integration.js` run failed immediately there at `GET /api/admin/team` with `404 Cannot GET /api/admin/team`, so the default compatibility picker still lands on a stale contract.
- Fresh end-to-end verification still passes on a current-contract instance. `BASE_URL=http://localhost:4222 node verify-integration.js` passed fully again, and a fresh isolated current-source launch on `4224` with `DATA_FILE=data/db-4224-health.json` also passed the same full verification flow.
- The meaningful source-vs-doc drift is now clearer: current source really does implement `GET /api/admin/team` and `POST /api/admin/disputes/:id/assign`, and the fresh `4224` source instance served both successfully during a direct authenticated probe. But the checked-in root discovery payload in `src/app.js` still advertises only `37` routes and omits both of those admin endpoints. This is a documentation/discovery bug, not a runtime failure in the current source contract.
- Fresh concrete proof from the passing current-contract runs:
  - `ownerLocationCount: 3`
  - `pickupCompletedStatus: picked_up`
  - `finalQueueCounts.cancelled: 2`
  - `customerSupport.customerVisiblePreview: "Yes, we can hold the cake a bit longer."`
- Meaningful conclusion: the checked-in backend contract is still healthy when verified on a current instance, but local health remains noisy because `verify-integration.js` auto-selects the stale `4216` process and the root discovery response under-documents the real admin surface.

## 2026-05-31 22:15 cron health check

- Local backend drift is still the only meaningful health problem, and it remains active right now. Fresh listener proof shows 39 local ports in the `4000-4300` band, including the backend spread across `4020, 4120, 4122, 4124, 4126, 4130, 4160, 4176, 4192, 4194, 4202, 4204, 4206, 4210, 4212, 4214, 4216, 4220, 4222` plus more unrelated services, so an unpinned `localhost` target is still unsafe.
- The auto-resolve preference in `verify-integration.js` still points at `4216` first among live compatible ports, and `4216` is still stale relative to current source. Fresh `BASE_URL=http://localhost:4216 node verify-integration.js` failed immediately at `GET /api/admin/team` with `404 Cannot GET /api/admin/team`.
- Fresh end-to-end verification still passes on the current-contract generation. `BASE_URL=http://localhost:4222 node verify-integration.js` passed and re-proved the broad live contract, including:
  - auth sessions list and revoke-other-session flow
  - `GET /api/owner/locations` with 3 owner locations
  - scoped owner reads (`shop-2` queue visibility and `shop-3` slot visibility)
  - saved-design create/list plus bakery-scoped checkout and reorder
  - guarded status ladder `confirmed -> baking -> decorating -> ready -> complete-pickup`
  - owner ops update, slot patching, location template bulk apply, order cancellation, exception notes, dispute assignment, refund flow, and customer-visible support replies
- Fresh concrete proof from the passing `4222` run:
  - `ownerLocationCount: 3`
  - `pickupCompletedStatus: picked_up`
  - `finalQueueCounts.cancelled: 2`
  - `customerSupport.customerVisiblePreview: "Yes, we can hold the cake a bit longer."`
- Fresh source-vs-discovery drift also showed up: a fresh isolated launch from current source on `4224` still advertised a 37-route root list that omitted `/api/admin/team` and `/api/admin/disputes/:id/assign`, even though current source does implement those endpoints and the verified `4222` contract exercises them successfully. That means the root discovery payload is incomplete documentation and should not be treated as the source of truth for current verified endpoints.
- Meaningful conclusion: the checked-in backend contract is still healthy when verified on a current-contract instance, but `4216` remains a misleading stale target and the root discovery route list is now under-reporting real admin endpoints.

## 2026-05-31 21:15 cron health check

- Local backend drift is still the main operational risk. I verified 12 separate listeners on `4020, 4120, 4160, 4176, 4192, 4194, 4204, 4206, 4210, 4212, 4214, 4216`, so “localhost backend” is currently ambiguous unless the exact port is pinned.
- The compatibility picker in `verify-integration.js` currently resolves to `4216`, but that live instance is stale relative to the source tree and failed fresh verification immediately at `GET /api/admin/team` with `404 Cannot GET /api/admin/team`.
- Verified endpoint drift on the live `4216` instance:
  - root discovery advertises 37 routes, but omits `GET /api/admin/team` and `POST /api/admin/disputes/:id/assign`
  - direct `GET /api/admin/team` with a valid admin bearer token still returns `404`
  - this means the running contract on `4216` does not match the checked-in `src/app.js` contract or the assumptions in `verify-integration.js`
- Fresh isolated verification on `4222` against the current source and its own store (`data/db-4222.json`) passed end to end with `BASE_URL=http://localhost:4222 node verify-integration.js`.
- Current-source behavior verified on `4222` includes:
  - auth sessions and revoke flows
  - owner multi-location reads and scoped queue/slot access
  - saved-design create/list/reorder flows
  - guarded pickup progression `confirmed -> baking -> decorating -> ready -> complete-pickup`
  - owner exception flagging plus exception notes
  - admin dispute assignment, internal threading, refund action, and dispute resolution
  - customer support thread read/write and pre-baking self-cancel guardrails
- Meaningful conclusion: the source tree is healthy when launched fresh, but the locally preferred long-lived instance is not the same contract. The breakage is environment drift, not a newly broken backend implementation.

- Owner/staff escalation was still missing a cheap but important second step: once a dispute existed, the owner could flag it but not append follow-up context for admin. `POST /api/owner/orders/:id/exception-notes` closes that gap without inventing a separate support object.
- Queue exception logic was drifting between backend and frontend. Moving attention-flag generation into `enrichOrder` and `createOwnerQueueView` gives one source of truth for paused slots, passed pickup windows, open disputes, missing notes, and unassigned production work.
- Pickup-slot edits need blast-radius metadata, not just the patched slot row. Returning operator state, pause reason, and impacted live-order count makes slot pausing and capacity changes more operationally usable.

- Customer order reads should not blindly reuse internal dispute payloads. `enrichOrder(order, repositories, viewer)` now filters dispute messages for customer viewers so internal admin notes stop leaking through `/api/orders/me` while owner/admin views still receive the full thread.
- A small `POST /api/orders/:id/support-messages` path closes a high-value support gap cheaply: customers can continue an existing dispute or open one from the order card, and admin can answer with `visibility: customer` on the existing dispute thread endpoint.

- Current backend is a single Express app with direct imports from `src/data.js` and in-place mutation of arrays.
- Existing package only depends on `express` and `cors`; no test framework or database client is installed.
- The current public contract is a useful demo API surface worth preserving while internals are upgraded.
- Host environment in this session lacks `git` repo context and a working `python` alias, so verification should use Node/PowerShell directly.
- A low-friction next state is file-backed persistence in `data/db.json`, which gives restart durability without adding external dependencies.
- Role-aware middleware can be introduced without changing the frontend contract by issuing demo bearer tokens from the existing login route.
- Repository and service seams are now the right swap points for future SQLite/Postgres and stronger auth implementations.

## 2026-05-28 backend health verification

- Local port `4020` is healthy in the narrow sense: `GET /health` returned `200` with `{"ok":true,"service":"cake-platform-backend"}`.
- The process currently serving `localhost:4020` is stale relative to the checked-in source. Evidence: the running `node src/server.js` process started at `2026-05-28 10:47`, while `src/app.js` was last modified at `2026-05-28 12:31`.
- Verified route drift between source and live process:
  - Source expects `GET /api/auth/me`, `GET /api/owner/orders/summary`, `GET /api/owner/queue`, `GET /api/meta/order-statuses`, and `POST /api/dev/reset`.
  - Live process returned `404` for all of those endpoints.
- Verified auth/authorization drift:
  - Current source requires `admin` role for `GET /api/admin/shops`.
  - Live process returned `200` for `GET /api/admin/shops` even when called with an owner token, which strongly suggests the old process is missing the new role guard.
- Verified endpoints that are currently live on the running instance: `GET /`, `GET /health`, `POST /api/auth/login`, `GET /api/owner/orders`, `GET /api/admin/shops`.
- The root discovery payload from the live process advertises only the older reduced route list, confirming the server has not been restarted since the newer API surface was added.

## 2026-05-28 integration verification

- Fresh port `4120` verification using `verify-integration.js` proved the current source path for the key flows in one run:
  - `POST /api/designs`
  - `GET /api/designs?shopId=shop-1`
  - `POST /api/designs/:id/reorder`
  - `GET /api/owner/queue`
  - `GET /api/owner/orders/:id`
  - `PATCH /api/owner/orders/:id/status`
  - `GET /api/owner/pickup-slots`
  - `PATCH /api/owner/pickup-slots/:id`
  - `GET /api/meta/order-statuses`
- The verified script output showed a created saved design, a reorder entering the owner queue, a status transition from `new` to `ready`, and a pickup-slot capacity update on `slot-2` from its original value to `8` while preserving `booked: 2`.
- Live root discovery on `4120` currently exposes the expanded route set with file persistence enabled, including `/api/auth/me`, `/api/orders/me`, `/api/owner/orders/summary`, `/api/owner/queue`, `/api/owner/templates`, `/api/owner/pickup-slots`, `/api/admin/subscriptions`, `/api/admin/disputes`, `/api/admin/analytics`, and `/api/dev/reset`.
- Meaningful local drift right now is between two running backend instances, not between source and the verified `4120` instance:
  - `4020` is still serving the older reduced contract.
  - `4120` is serving the newer expanded contract.
  - `4020` started at `2026-05-28 10:47:28` and `4120` started at `2026-05-28 12:32:34`, which explains why the default local port is behind the currently verified API surface.
- Verified auth drift remains present on `4020`: `GET /api/admin/shops` returned `200` with an owner token, while current source behavior requires admin-only access.
- Fresh integration verification on `4126` confirmed the current source still passes the priority frontend-backed flows in one run: saved design create/list, reorder, owner queue/detail/status, pickup completion, notification timeline, and pickup-slot patch.
- Practical integration lesson: route discovery payloads alone are not enough to detect backend compatibility because some running instances can omit newer route listings while still serving part of the expanded contract. Probing the actual endpoints is more reliable than trusting a root route array.
- The frontend owner flow now correctly depends on the explicit pickup-completion contract instead of treating `picked_up` as just another generic status transition. Fresh proof on isolated port `4164` still shows `POST /api/owner/orders/:id/complete-pickup` returns `picked_up`, stamps `fulfillmentSnapshot.decisionState = pickup_completed`, and emits the expected pickup-oriented notifications.

## 2026-05-28 fulfillment sweep

- The backend now has an explicit MVP fulfillment seam instead of treating generic status mutation as the whole story.
- Fresh proof on port `4122` showed the root route list now includes `POST /api/owner/orders/:id/complete-pickup`.
- A full pickup-first verification run on `4122` confirmed this exact sequence on a freshly reset store:
  - reorder created with initial status `new`
  - owner status patch moved it to `ready`
  - owner pickup-completion route moved it to `picked_up`
  - returned order detail exposed `fulfillmentSnapshot.decisionState = pickup_completed`
  - returned fulfillment snapshot also had a non-null `pickupCompletedAt`
  - notification timeline for the same order was `order_confirmation`, `pickup_reminder`, `ready_for_pickup`, `pickup_completed`
- This improves pillar 3 honesty for MVP because pickup completion is now a first-class operational flow, while delivery remains deliberately separate and unimplemented.

## 2026-05-28 16:15 cron health check

- Fresh recheck confirms both local backend ports are still live, but they are not equivalent:
  - `4020` responds with the older reduced discovery contract and no persistence path in `/health`.
  - `4120` responds with the expanded current contract and exposes the file-backed persistence path in both `/` and `/health`.
- Verified missing-on-4020 endpoints are still missing right now, not just previously observed:
  - `GET /api/auth/me` -> `404`
  - `GET /api/owner/orders/summary` -> `404`
  - `GET /api/owner/queue` -> `404`
  - `GET /api/meta/order-statuses` -> `404`
  - `POST /api/dev/reset` -> `404`
- Verified current-source behavior is healthy on `4120`:
  - `GET /api/auth/me` -> `200` with bearer token
  - `GET /api/owner/orders/summary` -> `200`
  - `GET /api/owner/queue` -> `200`
  - `GET /api/meta/order-statuses` -> `200`
  - `POST /api/dev/reset` -> `200`
  - `GET /api/admin/shops` -> `403` for owner token, `200` for admin token
- Running process timestamps still explain the drift:
  - port `4020` -> PID `15492`, started `2026-05-28 10:47:28`
  - port `4120` -> PID `19428`, started `2026-05-28 12:32:34`
- Meaningful backend health finding: the default local port `4020` is still serving stale code and stale auth rules, while `4120` matches the current checked-in API surface.

## 2026-05-28 20:15 cron health check

- Fresh endpoint proof still shows `4020` is stale and unsafe as the default local backend:
  - root discovery advertises only `10` routes with no persistence path
  - `GET /api/auth/me` -> `404`
  - `GET /api/owner/orders/summary` -> `404`
  - `GET /api/owner/queue` -> `404`
  - `GET /api/meta/order-statuses` -> `404`
  - owner token can still read `GET /api/admin/shops` with `200`, so the admin guard is missing there
- `4120` is now only partially current, not fully current:
  - root discovery shows file persistence and `22` routes
  - `GET /api/auth/me` with token -> `200`
  - `GET /api/owner/orders/summary` with token -> `200`
  - `GET /api/owner/queue` with token -> `200`
  - `GET /api/admin/shops` is correctly guarded there (`403` owner, `200` admin)
  - but root discovery does **not** include `POST /api/owner/orders/:id/complete-pickup`
  - `verify-integration.js` fails against `4120` at `POST /api/owner/orders/:id/complete-pickup` with `404`
- Verified endpoint drift across running ports:
  - `4122`, `4124`, and `4126` advertise the newer `complete-pickup` route in root discovery
  - `4124` passes the full `verify-integration.js` flow end to end
  - a fresh source instance on `4130` also passes the full flow and confirms the checked-in source still supports the current contract, including pickup completion and notifications
- New meaningful health risk surfaced during this sweep: all file-backed instances share the same `data/db.json` with plain `readFileSync`/`writeFileSync` and no locking or atomic temp-file swap.
  - Running verifications against multiple live ports in parallel caused cross-instance interference.
  - One run on `4126` failed during login with `500` and `SyntaxError: Unexpected end of JSON input` from `src/store.js`, which is direct evidence that concurrent access can observe a partially written JSON file.
  - Another concurrent run on `4122` failed with `Design not found` during reorder, consistent with one instance resetting shared state while another instance was mid-flow.
- Running processes at check time:
  - `4020` -> PID `15492`, started `2026-05-28 10:47:28`
  - `4120` -> PID `19428`, started `2026-05-28 12:32:34`
  - `4122` -> PID `14552`, started `2026-05-28 16:56:42`
  - `4124` -> PID `26596`, started `2026-05-28 17:05:01`
  - `4126` -> PID `3944`, started `2026-05-28 17:15:37`
- Current verified-good backend surface is the checked-in source itself and the live instance on `4124`; the default local port `4020` is stale, and `4120` is a partial intermediate build rather than the latest contract.

## 2026-05-28 21:15 cron health check

- Fresh recheck still shows **three distinct backend generations** live locally:
  - `4020`: stale reduced contract, `10` routes, no persistence path, still missing `/api/auth/me`, `/api/owner/orders/summary`, `/api/owner/queue`, `/api/meta/order-statuses`, and `/api/dev/reset`.
  - `4120`: intermediate contract, `22` routes, file-backed, correct admin guard, but still missing `POST /api/owner/orders/:id/complete-pickup`.
  - `4122`, `4124`, `4126`, `4130`: current contract, `23` routes, all advertise `complete-pickup` and the same file-backed persistence path.
- Exact auth proof is still split exactly where expected:
  - `4020` incorrectly allows owner access to `GET /api/admin/shops` with `200`.
  - `4120+` correctly return `403` for owner token and `200` for admin token on `GET /api/admin/shops`.
- Fresh end-to-end sequential verification confirms the current source behavior is healthy on `4124` and `4130`:
  - reset -> customer login -> create design -> list design -> reorder -> mark ready -> complete pickup all succeeded
  - completed flow ends in `picked_up` on both ports
- Fresh sequential verification on `4120` confirms it is **not** the latest contract even though most owner flows work:
  - reset, login, create design, reorder, and mark-ready all succeeded
  - `POST /api/owner/orders/:id/complete-pickup` still returned `404`
- Fresh data-consistency drift on `4120`: after creating a new design, authenticated `GET /api/designs?shopId=shop-1` returned only the seed design and omitted the just-created design, even though reorder by the new design ID still succeeded. That means `4120` is not just missing one route, it is also internally inconsistent for the customer saved-design surface.
- The shared-store concurrency risk remains real, not theoretical:
  - parallel verification runs produced `500` with `SyntaxError: Unexpected end of JSON input` from `src/store.js`
  - `src/store.js` still uses direct `readFileSync` and `writeFileSync` against one shared `data/db.json` with no locking or atomic write strategy
  - as long as multiple backend instances stay up against the same file, health checks can trigger cross-instance corruption symptoms instead of clean pass/fail results

## 2026-05-28 22:15 cron health check

- The drift picture is unchanged but now freshly re-verified:
  - `4020` is still the stale default port with only `10` advertised routes, no persistence path in `/health`, and missing `/api/auth/me`, `/api/owner/orders/summary`, `/api/meta/order-statuses`, `/api/dev/reset`, and pickup completion.
  - `4120` is still an intermediate build with `22` routes, file persistence enabled, and correct admin-only protection on `/api/admin/shops`, but it still does not expose `POST /api/owner/orders/:id/complete-pickup`.
  - `4122`, `4124`, `4126`, and `4130` all expose the current `23`-route contract, including `/api/owner/orders/:id/complete-pickup`.
- Current verified-good end-to-end backend is `4130`:
  - `verify-integration.js` passed fully against `http://localhost:4130`
  - verified endpoints in that run were `/api/dev/reset`, `/api/auth/login`, `/api/meta/order-statuses`, `/api/designs`, `/api/designs?shopId=shop-1`, `/api/designs/:id/reorder`, `/api/owner/queue`, `/api/owner/orders/:id`, `/api/owner/orders/:id/status`, `/api/owner/orders/:id/complete-pickup`, `/api/notifications`, `/api/owner/pickup-slots`, and `/api/owner/pickup-slots/:id`
  - verified flow still ends in `picked_up` with `fulfillmentSnapshot.decisionState = pickup_completed`
- Auth guard drift is still meaningful on the default port only:
  - `4020` still returns `200` for owner access to `GET /api/admin/shops`
  - every newer live instance checked (`4120+`) returns `403` for owner and `200` for admin there, matching source
- No new route-level regression was found in the current-source generation during this sweep. The main operational problem remains multiple live backend generations sharing one workspace, with `4020` still the misleading default local endpoint.

## 2026-05-28 23:15 cron health check

- Fresh live route check still shows the same three backend generations active locally:
  - `4020`: stale reduced contract, `10` routes, missing `GET /api/auth/me`, `GET /api/owner/orders/summary`, and pickup completion, and still incorrectly allows owner access to `GET /api/admin/shops` with `200`.
  - `4120`: intermediate contract, `22` routes, file persistence enabled, correct admin guard, but still missing `POST /api/owner/orders/:id/complete-pickup`.
  - `4122`, `4124`, `4126`, `4130`: current contract, `23` routes, all advertise pickup completion and current auth behavior.
- Current verified-good end-to-end instance is still `4130`. A fresh sequential `verify-integration.js` run against `http://localhost:4130` passed and verified:
  - `/api/dev/reset`
  - `/api/auth/login`
  - `/api/meta/order-statuses`
  - `/api/designs`
  - `/api/designs?shopId=shop-1`
  - `/api/designs/:id/reorder`
  - `/api/owner/queue`
  - `/api/owner/orders/:id`
  - `/api/owner/orders/:id/status`
  - `/api/owner/orders/:id/complete-pickup`
  - `/api/notifications`
  - `/api/owner/pickup-slots`
  - `/api/owner/pickup-slots/:id`
- Fresh flow proof on `4130` still ends correctly in `picked_up` with `fulfillmentSnapshot.decisionState = pickup_completed`, and emits the expected notification timeline: `order_confirmation`, `pickup_reminder`, `ready_for_pickup`, `pickup_completed`.
- A new verification of the operational risk also reproduced the shared-store problem again: running checks against two live ports at the same time caused one current-source instance to return `500 SyntaxError: Unexpected end of JSON input` from `src/store.js` while reading `data/db.json`. That confirms the corruption/interference risk is active, not historical.
- `data/db.json` parsed cleanly again immediately after the failed parallel run, so the issue is not a permanently broken file, it is unsafe concurrent access by multiple backend instances sharing one JSON store.

## 2026-05-29 00:15 cron health check

- Fresh live proof shows the same three backend generations are still active locally, unchanged in the ways that matter:
  - `4020`: stale reduced contract, `10` routes, `GET /api/auth/me -> 404`, `GET /api/owner/orders/summary -> 404`, and owner can still wrongly access `GET /api/admin/shops` with `200`.
  - `4120`: intermediate contract, `22` routes, bearer auth and owner summary work, but `POST /api/owner/orders/:id/complete-pickup` is still absent and returns `404`.
  - `4122`, `4124`, `4126`, `4130`: current contract, `23` routes, all advertise pickup completion and return the current auth behavior (`403` owner, `200` admin on `/api/admin/shops`).
- Current verified-good source instance is still `4130`.
  - Fresh sequential `verify-integration.js` on `http://localhost:4130` passed end to end.
  - Verified flow still covers reset, login, status metadata, design create/list, reorder, owner queue/detail/status, pickup completion, notifications, and pickup-slot patch.
  - Verified end state is still `picked_up` with `fulfillmentSnapshot.decisionState = pickup_completed` and the expected notification timeline.
- The intermediate build on `4120` still has the saved-design inconsistency, and it is freshly reproduced, not historical:
  - `POST /api/designs` returned `201` and created `design-1780039059039-9k0ij5`.
  - Immediate authenticated `GET /api/designs?shopId=shop-1` returned only the seed design `design-1` and omitted the newly created design.
- Running process timestamps remain consistent with the drift story:
  - `4020` -> PID `15492`, started `2026-05-28 10:47:28`
  - `4120` -> PID `19428`, started `2026-05-28 12:32:34`
  - `4122` -> PID `14552`, started `2026-05-28 16:56:42`
  - `4124` -> PID `26596`, started `2026-05-28 17:05:01`
  - `4126` -> PID `3944`, started `2026-05-28 17:15:37`
  - `4130` -> PID `26112`, started `2026-05-28 20:17:42`

## 2026-05-31 08:15 cron health check

- Fresh local sweep still shows **multiple backend generations live at once**, and the default local port is still the misleading one:
  - `4020`: stale reduced contract, `GET /health -> 200` with no persistence path, `GET /api/meta/order-statuses -> 404`, `GET /api/auth/me -> 404`, `GET /api/owner/queue -> 404`, `GET /api/owner/orders/summary -> 404`.
  - `4120`, `4122`, `4124`, `4126`, `4130`: newer file-backed generations, all returning `200` on `/health` with the shared persistence path `data/db.json`, but not all on the same route generation.
- Fresh exact proof that even the newer long-lived ports are not all current:
  - `4130` still fails `PATCH /api/owner/orders/:id/ops` with `404` during `verify-integration.js`.
  - `4020` is older still and exposes only the reduced discovery surface.
- Fresh isolated source verification on a clean port `4141` with its own store file `data/db-4141.json` passed end to end and is the current verified-good contract.
  - Verified endpoints in that run: `/api/dev/reset`, `/api/auth/login`, `/api/meta/order-statuses`, `/api/designs`, `/api/designs/:id/reorder`, `/api/owner/queue`, `/api/owner/orders/:id`, `PATCH /api/owner/orders/:id/ops`, `PATCH /api/owner/orders/:id/status`, `POST /api/owner/orders/:id/complete-pickup`, `/api/notifications`, `/api/owner/pickup-slots`, `PATCH /api/owner/pickup-slots/:id`, `POST /api/owner/orders/:id/cancel`, and `PATCH /api/admin/disputes/:id`.
  - Verified flow still ends correctly in `picked_up` with `fulfillmentSnapshot.decisionState = pickup_completed`.
- Freshly verified auth behavior on the isolated current source is correct:
  - `GET /api/owner/orders/summary -> 200` with owner token, `401` without auth.
  - `GET /api/admin/shops -> 403` with owner token.
- New meaningful documentation drift found in current source discovery: the `GET /` route list on `4141` still omits live endpoints such as `/api/meta/order-statuses` and `PATCH /api/owner/orders/:id/status`. So root discovery is not a complete contract source even when the backend itself is healthy.

## 2026-05-31 09:15 cron health check

- Fresh exact sweep still shows too many live local backend generations at once, and `4020` is still the most misleading default surface:
  - `4020` -> stale reduced contract, only `10` advertised routes, `GET /api/auth/me -> 404`, `GET /api/owner/orders/summary -> 404`, `GET /api/owner/queue -> 404`, `GET /api/meta/order-statuses -> 404`, `POST /api/dev/reset -> 404`, and owner can still incorrectly reach `GET /api/admin/shops` with `200`.
  - `4120` -> intermediate `22`-route contract, still missing `PATCH /api/owner/orders/:id/ops` and `POST /api/owner/orders/:id/complete-pickup`.
  - `4122`, `4124`, `4126`, `4130`, `4140`, `4150`, `4160`, `4162`, `4164`, `4170` -> newer `23`-route generation, but still not current because `PATCH /api/owner/orders/:id/ops` returns `404` there.
  - `4141` -> newest verified local instance with `26` advertised routes and isolated persistence at `data/db-4141.json`.
- Fresh full integration proof on `4141` passed again via `node verify-integration.js` against `http://localhost:4141`.
  - Verified working endpoints in that run: `POST /api/dev/reset`, `POST /api/auth/login`, `GET /api/meta/order-statuses`, `POST /api/designs`, `GET /api/designs?shopId=shop-1`, `POST /api/designs/:id/reorder`, `GET /api/owner/queue`, `GET /api/owner/orders/:id`, `PATCH /api/owner/orders/:id/ops`, `PATCH /api/owner/orders/:id/status`, `POST /api/owner/orders/:id/complete-pickup`, `GET /api/notifications?orderId=:id`, `GET /api/owner/pickup-slots`, `PATCH /api/owner/pickup-slots/:id`, `POST /api/owner/orders/:id/cancel`, `PATCH /api/admin/disputes/:id`, `GET /api/admin/disputes`.
- Fresh proof that `4170` is no longer the best local target even though it passed earlier this morning: the same `node verify-integration.js` run against `http://localhost:4170` now fails at `PATCH /api/owner/orders/:id/ops -> 404`.
- Current contract-discovery drift is still real even on the healthy source instance:
  - `GET /` on `4141` advertises `26` routes, but it still omits live endpoints such as `GET /api/meta/order-statuses`, `PATCH /api/owner/orders/:id/status`, and `PATCH /api/owner/templates/:id`.
  - So root discovery is still useful only as a rough generation marker, not as a full verified contract list.

## 2026-05-29 01:15 cron health check

- No meaningful improvement since the prior sweep. The same drift is still live right now.
- Fresh exact route/auth proof:
  - `4020` is still the stale default port: `GET / -> 200` with only `10` advertised routes, `GET /api/auth/me -> 404`, `GET /api/meta/order-statuses -> 404`, `POST /api/dev/reset -> 404`, and owner access to `GET /api/admin/shops` still wrongly returns `200`.
  - `4120` is still the intermediate build: `GET / -> 200` with `22` routes and file persistence visible, `GET /api/meta/order-statuses -> 200`, `POST /api/dev/reset -> 200`, correct admin guard on `/api/admin/shops`, but `POST /api/owner/orders/:id/complete-pickup -> 404`.
  - `4130` is still the current verified-good instance: `GET / -> 200` with `23` routes, file persistence visible, correct admin guard, and the full sequential `verify-integration.js` run passed again.
- Fresh end-to-end proof on `4130` still verifies the current contract, including:
  - `/api/dev/reset`
  - `/api/auth/login`
  - `/api/meta/order-statuses`
  - `/api/designs`
  - `/api/designs?shopId=shop-1`
  - `/api/designs/:id/reorder`
  - `/api/owner/queue`
  - `/api/owner/orders/:id`
  - `/api/owner/orders/:id/status`
  - `/api/owner/orders/:id/complete-pickup`
  - `/api/notifications`
  - `/api/owner/pickup-slots`
  - `/api/owner/pickup-slots/:id`
- The `4120` saved-design drift is still reproducible right now:
  - `POST /api/designs -> 201` created `design-1780042642776-5jmucq`.
  - Immediate authenticated `GET /api/designs?shopId=shop-1 -> 200` still returned only `design-1`, omitting the just-created design.

## 2026-05-31 06:29 cron health check

- Fresh proof shows the same local multi-generation drift is still present, and it is still meaningful:
  - `4020` is alive but stale: `GET /health -> 200` without a persistence path, root discovery advertises only `10` routes, `GET /api/auth/me -> 404`, `GET /api/owner/orders/summary -> 404`, `GET /api/owner/queue -> 404`, `GET /api/meta/order-statuses -> 404`, and owner access to `GET /api/admin/shops` still wrongly returns `200`.
  - `4120` is alive and newer than `4020`, but still not current: root discovery advertises `22` routes, `GET /api/auth/me -> 200`, `GET /api/owner/orders/summary -> 200`, `GET /api/owner/queue -> 200`, `GET /api/meta/order-statuses -> 200`, and owner access to `GET /api/admin/shops` is correctly blocked with `403`, but `POST /api/owner/orders/:id/complete-pickup` still returns `404`.
  - `4122`, `4124`, `4126`, and `4130` all expose the current `23`-route contract and include `POST /api/owner/orders/:id/complete-pickup`.
- Fresh end-to-end verification on `4130` passed again via `verify-integration.js` and confirmed the current contract is healthy there. Verified flow covered reset, login, status metadata, design create/list, reorder, owner queue/detail/status, pickup completion, notifications, and pickup-slot patch. Verified end state still finished at `picked_up` with `fulfillmentSnapshot.decisionState = pickup_completed`.
- The `4120` saved-design inconsistency is still active, not historical:
  - `POST /api/designs -> 201` created `design-1780234345694-y83dj6`.
  - Immediate authenticated `GET /api/designs?shopId=shop-1` returned only `design-1`, omitting the just-created design.
  - Reorder by the created design ID still succeeded, so `4120` is internally inconsistent rather than simply failing outright.
- Operational drift remains risky because five file-backed instances (`4120` through `4130`) all advertise the same shared persistence file path: `C:\Users\gtm80\.openclaw\workspace\cake-platform-backend\data\db.json`. Even without reproducing corruption in this sweep, the environment is still set up for cross-instance interference.
- Operational risk remains unchanged: multiple live backend instances are still sharing one `data/db.json`, so even when route checks pass, the workspace still has a cross-instance interference hazard until old ports are retired.

## 2026-05-29 03:15 cron health check

- Fresh exact recheck confirms the same three live backend generations are still present, so the local default backend is still misleading:
  - `4020`: stale reduced contract, `10` advertised routes, `GET /api/auth/me -> 404`, `GET /api/meta/order-statuses -> 404`, `POST /api/dev/reset -> 404`, `POST /api/owner/orders/:id/complete-pickup -> 404`, and owner access to `GET /api/admin/shops` still incorrectly returns `200`.
  - `4120`: intermediate contract, `22` advertised routes, file persistence visible, correct admin-only guard on `GET /api/admin/shops`, and `POST /api/dev/reset -> 200`, but `POST /api/owner/orders/:id/complete-pickup -> 404` is still missing.
  - `4130`: current contract, `23` advertised routes, file persistence visible, correct admin guard, and current-source integration still passes end to end.
- Fresh verified-good instance remains `4130`. A new `verify-integration.js` run against `http://localhost:4130` passed and re-verified:
  - `/api/dev/reset`
  - `/api/auth/login`
  - `/api/meta/order-statuses`
  - `/api/designs`
  - `/api/designs?shopId=shop-1`
  - `/api/designs/:id/reorder`
  - `/api/owner/queue`
  - `/api/owner/orders/:id`
  - `/api/owner/orders/:id/status`
  - `/api/owner/orders/:id/complete-pickup`
  - `/api/notifications`
  - `/api/owner/pickup-slots`
  - `/api/owner/pickup-slots/:id`
- Fresh flow proof on `4130` still ends correctly in `picked_up` with `fulfillmentSnapshot.decisionState = pickup_completed`, and still emits `order_confirmation`, `pickup_reminder`, `ready_for_pickup`, `pickup_completed`.
- The `4120` saved-design inconsistency is still live and freshly reproduced:
  - `POST /api/designs -> 201` created `design-1780049822880-8zr03t`.
  - Immediate `GET /api/designs?shopId=shop-1 -> 200` still returned only `design-1`, omitting the just-created design.
- Live listening ports remain split across six processes (`4020`, `4120`, `4122`, `4124`, `4126`, `4130`), which keeps the previously confirmed shared-`data/db.json` interference risk active until older instances are retired.
- A practical containment path now exists even before port cleanup: `src/store.js` supports `DATA_FILE`, so separate backend instances can run against isolated JSON stores instead of contending on one shared `data/db.json`.
- Fresh proof on `4160` and `4162` showed that isolated-store instances can handle parallel authenticated design writes cleanly, while still passing the full integration contract on `4160`.

## 2026-05-29 23:19 cron health check

- Local backend drift is still real, and there are now **eight** live ports across four effective states:
  - `4020`: stale default port, `10` advertised routes, no persistence path in `/` or `/health`, `GET /api/auth/me -> 404`, `GET /api/meta/order-statuses -> 404`, and owner access to `GET /api/admin/shops` still incorrectly returns `200`.
  - `4120`: intermediate shared-store build, `22` advertised routes, correct admin-only guard on `/api/admin/shops`, but still missing `POST /api/owner/orders/:id/complete-pickup` from discovery.
  - `4122`, `4124`, `4126`, `4130`: current shared-store generation, each with `23` advertised routes including pickup completion and correct admin-only protection.
  - `4160`, `4162`: current isolated-store generation, same `23`-route contract but using `data/db-4160.json` and `data/db-4162.json` instead of the shared `data/db.json`.
- Fresh verified-good instance is now `4160`, not just historically `4130`:
  - `verify-integration.js` passed end to end against `http://localhost:4160`.
  - Verified flow still covers `/api/dev/reset`, `/api/auth/login`, `/api/meta/order-statuses`, design create/list, reorder, owner queue/detail/status, pickup completion, notifications, and pickup-slot patch.
  - Verified end state is still `picked_up` with `fulfillmentSnapshot.decisionState = pickup_completed`, and notification order remains `order_confirmation`, `pickup_reminder`, `ready_for_pickup`, `pickup_completed`.
- The `4120` saved-design drift is still live right now, not resolved:
  - `POST /api/designs -> 201` created `design-1780122118080-4l8tb7`.
  - Immediate authenticated `GET /api/designs?shopId=shop-1 -> 200` still returned only the seed design `design-1`, omitting the new design entirely.
- Meaningful operational risk remains: six live ports (`4120`, `4122`, `4124`, `4126`, `4130`, plus the stale `4020`) still leave multiple backend generations running in parallel, and four of the current/intermediate ones are still contending on the shared `data/db.json`. The isolated `4160`/`4162` pair proves the safer path is available, but it has not replaced the misleading default/shared instances yet.

## 2026-05-31 10:15 cron health check

- Fresh live sweep shows **four distinct local backend generations** now:
  - `4020` -> stale reduced contract, `10` advertised routes, still missing `/api/meta/order-statuses`, `/api/auth/me`, `/api/owner/orders/summary`, `/api/owner/queue`, `/api/owner/locations`, `/api/owner/orders/:id/ops`, `/api/owner/orders/:id/complete-pickup`, and `/api/dev/reset`.
  - `4120` -> intermediate `22`-route contract, with persistence and reset support, but still missing `/api/owner/locations`, `/api/owner/location-bulk-apply`, `/api/owner/orders/:id/ops`, and pickup completion.
  - `4141` -> later `26`-route contract with isolated persistence at `data/db-4141.json`, including ops/cancel/dispute update and pickup completion, but still missing the new owner multi-location routes.
  - `4174` and `4176` -> current `28`-route contract with `/api/owner/locations` and `/api/owner/location-bulk-apply` added on top of the `4141` surface.
- Fresh auth proof is still meaningfully split by generation:
  - `4020` still returns `200` for owner access to `GET /api/admin/shops`, which is wrong.
  - `4120` returns `401` for owner access there and `200` for admin, so it is less broken than `4020` but still not current.
  - `4141`, `4174`, and `4176` correctly return `403` for owner and `200` for admin on `GET /api/admin/shops`.
- Fresh full integration proof now resolves to `http://localhost:4176` and passed end to end there. Verified current endpoints/flows include `/api/dev/reset`, `/api/auth/login`, `/api/meta/order-statuses`, `/api/designs`, `/api/designs/:id/reorder`, `/api/owner/queue`, `/api/owner/orders/:id`, `PATCH /api/owner/orders/:id/ops`, `PATCH /api/owner/orders/:id/status`, `POST /api/owner/orders/:id/complete-pickup`, `/api/notifications`, `/api/owner/pickup-slots`, `PATCH /api/owner/pickup-slots/:id`, `/api/owner/locations`, `POST /api/owner/location-bulk-apply`, `POST /api/owner/orders/:id/cancel`, and `PATCH /api/admin/disputes/:id`.
- Fresh behavioral proof on `4176` shows the current multi-location backend is actually working, not just advertising routes:
  - owner location count -> `3`
  - scoped Burnaby queue -> `1` order visible under `shop-2`
  - scoped Richmond pickup slots -> `2` visible under `shop-3`
  - ops update reassigned the order to `slot-3` and `staff-1` with `decisionState = pickup_reassigned`
  - pickup completion ended in `picked_up` with `decisionState = pickup_completed`
  - bulk apply updated `shop-2` and `shop-3` with `template = holiday-menu`
- Meaningful operational drift remains: `4176` is current but still points at the shared `data/db.json`, while `4174` is the same current contract on isolated `data/db-4174.json`. If multiple local instances stay live, `4174` is the safer verification target because it avoids the long-standing shared-store interference risk.

## 2026-05-31 14:15 cron health check

- Fresh exact port sweep shows the local backend has drifted again beyond the last verified target, and there are now at least **five meaningful live generations**:
  - `4020` -> stale reduced contract, still missing `/api/meta/order-statuses`, `/api/auth/me`, `/api/auth/sessions`, `/api/owner/locations`, and the newer owner/admin/support endpoints.
  - `4120` through `4194` -> mixed intermediate generations; many answer `/health` and `/api/meta/order-statuses`, but most still return `404` for `GET /api/auth/sessions`.
  - `4176` -> previous "current" generation with `28` advertised routes and shared `data/db.json`, but still no `/api/auth/sessions`, no customer support routes, and no admin dispute thread write route.
  - `4202` -> newer isolated generation with `34` advertised routes and `data/db-4202.json`, now including `/api/auth/sessions` and `POST /api/admin/disputes/:id/messages`, but still not yet advertising customer support read/write routes.
  - `4204` -> newest verified generation with `36` advertised routes and isolated `data/db-4204.json`, adding both `GET /api/orders/:id/support` and `POST /api/orders/:id/support-messages` on top of the `4202` surface.
- At that point the compatibility resolver inside `verify-integration.js` was meaningfully stale relative to the real contract. It only proved `/api/meta/order-statuses`, `/api/auth/me`, `/api/owner/queue`, and `/api/owner/locations`, so a port like `4176` still looked compatible even though the script later required `GET /api/auth/sessions` and failed there with `404`.
- Fresh proof of that earlier verifier drift: an unpinned `node verify-integration.js` run failed immediately at `/api/auth/sessions -> 404`, while the exact same script passed fully when pinned to `BASE_URL=http://localhost:4204`.
- Fresh full integration proof on `4204` passed end to end, verifying the newest checked-in contract including:
  - session listing and revoke flow via `GET /api/auth/sessions` and `POST /api/auth/sessions/:id/revoke`
  - owner multi-location reads and bulk apply
  - owner ops update, guarded pickup completion, cancellation, dispute refund, admin dispute thread messages
  - customer support read/write flow via `GET /api/orders/:id/support` and `POST /api/orders/:id/support-messages`
- `4204` became the best local full-flow verification target at that stage, because it was both the newest verified contract and an isolated-store instance, avoiding the long-standing shared `data/db.json` contention risk while matching the newest backend features.

## 2026-05-31 14:20 consumer checkout integrity sweep

- A real pillar-1 integrity gap existed between saved designs, pickup selection, and checkout: the prototype could still carry a saved design from one bakery into a checkout flow that defaulted to `shop-1`, and backend `createOrder` did not previously reject a pickup slot from another shop.
- The frontend now carries `shopId` through cart creation for both fresh builds and saved-design add-to-cart, shows the selected bakery explicitly in checkout, and filters pickup windows to that bakery instead of showing a cross-shop list.
- Backend `createOrder` now validates all three of these together before persisting an order:
  - `shopId` must exist
  - `savedDesignId`, when present, must belong to the same customer and same shop
  - `pickupSlotId` must belong to the same shop as the order
- Fresh isolated verification on `http://localhost:4206` proved the new guard for the exact bad path: `POST /api/orders` with `shopId: shop-1` and `pickupSlotId: slot-4` now fails with `400` and `"Pickup slot belongs to a different shop"`.
- The compatibility resolver in both the prototype and `verify-integration.js` now also requires `GET /api/auth/sessions`, so consumer session surfaces no longer silently bind to older backend generations that are missing the session contract.
- Latest resume point: use an isolated `DATA_FILE`-backed instance, preferably the newest `4206` checkout-integrity shape when available, and fall back to `4204` for the last fully proven session/support/refund end-to-end flow.

## 2026-05-31 15:17 cron health check

- Fresh exact sweep confirms local health is still split across many live generations, but the meaningful current target is now `4216`, not the long-lived lower ports.
- `4216` is healthy and fully verified on isolated persistence `data/db-4216.json`. A pinned `node verify-integration.js` run passed there and proved the current broad contract end to end, including:
  - `POST /api/dev/reset`
  - `POST /api/auth/login`
  - `GET /api/meta/order-statuses`
  - `GET /api/auth/sessions`
  - `POST /api/auth/sessions/:id/revoke`
  - `POST /api/designs`, `GET /api/designs`, `POST /api/designs/:id/reorder`
  - `GET /api/owner/queue`, `GET /api/owner/orders/:id`, `PATCH /api/owner/orders/:id/ops`, `PATCH /api/owner/orders/:id/status`, `POST /api/owner/orders/:id/complete-pickup`
  - `GET /api/owner/locations`, `POST /api/owner/location-bulk-apply`, `PATCH /api/owner/templates/:id`
  - `GET /api/owner/pickup-slots`, `PATCH /api/owner/pickup-slots/:id`
  - `POST /api/owner/orders/:id/flag-exception`, `POST /api/owner/orders/:id/exception-notes`
  - `POST /api/admin/disputes/:id/refund`, `POST /api/admin/disputes/:id/messages`, `PATCH /api/admin/disputes/:id`, `GET /api/admin/disputes`
  - `GET /api/orders/:id/support`, `POST /api/orders/:id/support-messages`, `POST /api/orders/:id/cancel`
- Fresh behavioral proof on `4216` still includes the current integrity-sensitive cases:
  - mismatched checkout is correctly rejected with `400` and `Pickup slot belongs to a different shop`
  - Burnaby reorder stays attached to `shop-2` and `slot-5`
  - owner session revoke works (`2 -> 1` active owner sessions)
  - pickup completion still ends in `picked_up` with `fulfillmentSnapshot.decisionState = pickup_completed`
- Meaningful verifier drift is still present locally:
  - unpinned `node verify-integration.js` does **not** resolve to `4216`, because its hard-coded candidate list stops at `4204`
  - the first compatible candidate is therefore `4204`, which is healthy for older session/support flows but behind the current checkout-integrity shape
  - fresh proof: the unpinned run failed on the mismatched-checkout assertion because that older target still accepted `shop-1` plus `slot-4` and returned `201` instead of the current `400`
- Route-generation markers are now:
  - `4020` -> stale `10`-route reduced contract, still missing `/api/meta/order-statuses`, `/api/auth/me`, `/api/auth/sessions`, and `/api/owner/locations`
  - `4120` -> intermediate `22`-route contract, still missing `/api/auth/sessions` and `/api/owner/locations`
  - `4176` -> later shared-store `28`-route contract with owner locations, but still missing `/api/auth/sessions`
  - `4204` -> isolated `36`-route contract with sessions/support, but behind the newest checkout/template continuity work
  - `4216` -> isolated `37`-route current verified contract
- Operational drift remains: there are still many long-lived local ports alive at once, and the default port `4020` is still the most misleading surface if someone uses `localhost:4020` as the backend by habit.
