# Razorpay payment integration: system analysis and implementation plan

## Existing architecture

- The backend is a single NestJS 11 application written in TypeScript, with feature modules under `src/modules` and shared services under `src/common`.
- Prisma 7 is the ORM and PostgreSQL is the database. Tables use snake_case mappings, UUID string identifiers, `Decimal(10,2)` monetary values, and checked-in SQL migrations under `prisma/migrations`. Deployment applies existing migrations with `prisma migrate deploy`.
- Prisma is exposed through a global `PrismaModule`/`PrismaService`; business modules inject it directly. Services own business logic and controllers expose routes.
- Authentication uses JWT (including a current user `sub`, email, and role); existing `Roles`/`RolesGuard` are available. A global Nest throttler is configured at 100 requests per minute.
- Existing roles include admin and billing user; customer accounts use the `User` model and role relation. Role checks are string based.
- Products have `basePrice`, `discountPrice`, `finalPrice`, tax percentage, and aggregate stock. Warehouse inventory tracks total, reserved, and available stock.
- Orders and order items already exist. Order records have order and payment status, payment method, totals, and shipment details. The current `OrderService.create` trusts client supplied user/order/payment statuses, item prices, discounts, tax, and quantities; it uses a fixed shipping value and does not reserve/decrement stock. Several order endpoints also lack authentication. Treating these order totals as authoritative at payment time would be unsafe.
- There is no cart module in this backend. The order creation request contains item IDs/quantities and shipment details.
- Payment enums currently contain `PENDING/PAID/FAILED/REFUNDED` and methods include legacy card/PayPal/Stripe/COD labels. COD must remain intact; a Razorpay method value needs a compatible schema change.
- Email is sent through AWS SES in `EmailService`; it currently logs send failures and does not rethrow them. There are no order/payment email templates or durable email jobs.
- Invoice PDFs are generated with PDFKit for POS billing and files use an S3-backed `StorageService`. There is no e-commerce invoice model or order invoice lifecycle.
- `ActivityLogService` records application activity. It is not a substitute for an immutable payment transition ledger.
- There is no Redis, BullMQ, queue worker, or scheduled job infrastructure in the backend or current Compose file. Adding a Redis service and worker lifecycle would be a deployment-level change. The safer incremental foundation is durable PostgreSQL webhook inbox/outbox records and retryable workers; it avoids acknowledging a webhook before persistence and does not introduce an undeployed Redis dependency.
- Global validation, exception filtering, response wrapping, Swagger, Helmet, compression, Morgan, and CORS are configured in `main.ts`. JSON body parsing is currently enabled without a raw-body option, which must be addressed for webhook HMAC validation.
- Tests use Jest and Nest testing utilities; current coverage is limited. Existing test/e2e setup expects a database. No payment tests or Razorpay dependencies exist.
- Secrets are environment driven, but some existing non-payment config has development fallbacks. Payment secrets must have no fallback and must only be used server side.

## Current order lifecycle

1. `POST /orders` creates an order and shipment from request supplied fields.
2. Order starts in caller-selected states; order items snapshot caller-supplied prices/tax/discount.
3. Customer can view their order list and cancel eligible orders. Admin-facing order update routes can directly set payment status.
4. No online payment is initiated, verified, recorded, reconciled, or tied to order status. Stock reservations and order confirmation emails are absent.

## Proposed payment lifecycle

1. Authenticated customer requests payment for an owned, eligible order.
2. Backend validates current product availability and recomputes the order total from database products and persisted shipping details; rejects discrepancies until checkout/order creation is made server-authoritative.
3. A unique internal payment reference and `CREATED` payment row are written before calling the Razorpay adapter; idempotency keys prevent repeated attempts from creating duplicate active payments.
4. Razorpay Order ID is stored, then only public checkout fields and server-calculated amount are returned.
5. Browser verification is treated as a signal only: HMAC is checked against the internally stored Razorpay Order ID, then payment details are fetched from Razorpay and amount, currency, order, and captured state are checked.
6. Verified capture updates payment, transaction, order `paymentStatus`, audit record, and outbox event in one PostgreSQL transaction. Payment status remains separate from fulfillment status.
7. Webhooks are HMAC-verified from raw request bytes, durably inserted with the provider event ID, and deduplicated. Processing can be retried from stored events and reconciled against Razorpay because delivery may be duplicated or out of order.
8. Refunds are admin-authorized, locked against concurrent over-refunds, recorded before provider submission, and finalized only from provider status. Email/invoice work is downstream and cannot undo a payment state transition.

## Data changes

Add payment, payment transaction, webhook inbox, refund, outbox, and payment audit tables. Store money as fixed precision decimals, provider IDs with unique indexes where present, and gateway snapshots with sensitive card/authentication fields explicitly excluded. Relate payment rows to existing orders/users. Do not extend the POS `BillingInvoice` table for online order invoices because it has a different lifecycle and ownership model. Keep order payment enums backwards-compatible while adding Razorpay method and richer payment-specific states.

## API changes

- Customer routes: initiate payment for an order, verify checkout callback, fetch an owned payment, and list owned payment history.
- Public webhook route: `/webhooks/razorpay` with raw-body verification and durable inbox persistence.
- Admin routes: payment/refund inspection, refund initiation, and reconciliation results, protected by JWT and admin role.
- Keep existing `/orders` routes compatible where possible, but prevent customer input from directly setting paid status or arbitrary financial amounts as part of checkout hardening.

## Background work and notifications

There is no existing queue to reuse. Start with PostgreSQL transactional outbox and webhook inbox tables plus a bounded, retryable worker/poller. This provides durable processing without silently requiring Redis in existing deployments. Jobs should be idempotent and use exponential retry metadata. Email uses SES; PDFs use the existing PDFKit/S3 services. Email/invoice failures remain retryable and must not roll back verified payment. If throughput later requires BullMQ, the outbox remains the durable source for enqueueing.

## Security and correctness

- No frontend amount is trusted; checkout prices/tax/discount/stock are computed or validated from database state.
- Razorpay API key, API secret, and webhook secret are distinct server-only settings with startup validation when online payments are enabled; there are no fallback credentials.
- Webhook HMAC uses the exact raw request bytes, constant-time comparison, unique event IDs, and rejects before persistence when invalid.
- Checkout HMAC verification uses the database-stored Razorpay order ID; the gateway payment is fetched and must match amount/currency and captured status.
- Database transactions and unique constraints protect confirmation, duplicate events, payment IDs, refunds, and outbox creation. Audit history is append-only by application convention.
- Admin-only refund and reporting APIs use existing JWT/RBAC patterns; payment reads enforce ownership. Rate limiting remains enabled, with tighter payment-route limits where supported.
- Do not store PAN, CVV, or authentication secrets; sanitize gateway responses before persistence and logging. Production requires HTTPS and secret-manager supplied values.
- Existing free-form order update endpoints can set payment status. That conflicts with the invariant that only verified captured payments mark an order paid and must be closed to customer/direct status writes.

## Implementation plan

1. Add this analysis and architecture record; preserve existing order/POS behavior while identifying insecure checkout paths.
2. Add payment enums/models and an additive Prisma migration for payment ledger, webhook inbox, refunds, outbox, and audit data.
3. Add a gateway interface and Razorpay adapter using the official server SDK, strict config, integer minor-unit conversions, and signature utilities.
4. Add authenticated customer initiation/verification/history APIs; harden order creation and order update authorization so client financial fields cannot mark paid or set trusted prices.
5. Add raw-body webhook endpoint, verified durable event persistence, idempotent processor, and payment/order transactions.
6. Add admin refund APIs with authorization and serialized refundable-balance checks; add reconciliation reads and a retryable reconciliation worker.
7. Connect outbox workers to SES and existing PDFKit/S3 where order invoice prerequisites are supported; avoid duplicate emails/invoices.
8. Add focused unit and integration tests with mocked Razorpay responses; update `.env.example`, deployment notes, API and operational documentation.
9. Run Prisma generation, migration validation, build, lint, and relevant tests; report any requirements that need external production setup (Razorpay credentials/webhook registration, SES, S3, worker process).

## Scope and deployment notes

No Razorpay credentials are present in the example configuration, no payment queue is deployed, and no production webhook URL is known. Code can be implemented in testable form with mocked gateway calls, but live payments require merchant test/live credentials, dashboard webhook registration, and a deployed worker. Existing order rows do not preserve a trusted checkout breakdown beyond their item snapshots; any attempt to retroactively pay them must validate catalog prices and inventory before creating a provider order.
