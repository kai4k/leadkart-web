# CRM Modules — Draft API Contracts (Leads / Orders / Inventory)

Status: **DRAFT — frontend co-design**
Date: 2026-05-23

The backend has not yet implemented these endpoints. This document is the
frontend's draft of what the API surface should look like. Backend will
implement against it; if backend needs deviations, they edit this file
and we regenerate types.

Contracts follow ADR 0038 (single resource hierarchy; identity-driven
scope via `X-Tenant-Id`) and ADR 0050 (OpenAPI as code-of-record).

All list endpoints use **cursor-based pagination** (per 2026 canon —
Stripe, Linear, Shopify). Stable cursor over offset because offset breaks
under concurrent writes (Stripe API design guide).

All mutations return **200 + updated resource** (ADR 0038), not 204.

All resources are **tenant-scoped** via the operator-scope cookie /
JWT — no `tenant_id` in path, no `tenant_id` in request body.

## Common envelopes

```yaml
ListEnvelope<T>:
  type: object
  required: [items, has_more]
  properties:
    items: { type: array, items: { $ref: '#/components/schemas/<T>' } }
    has_more: { type: boolean }
    next_cursor: { type: string, nullable: true }
    total_count: { type: integer, nullable: true } # optional, expensive

BulkUploadPreview:
  type: object
  required: [rows, errors, total_rows]
  properties:
    total_rows: { type: integer }
    rows: # echo for the UI preview
      type: array
      items: { type: object, additionalProperties: true }
    errors:
      type: array
      items:
        type: object
        required: [row_number, field, code, message]
        properties:
          row_number: { type: integer, minimum: 1 }
          field: { type: string }
          code: { type: string }
          message: { type: string }

BulkUploadResult:
  type: object
  required: [inserted, updated, failed, errors]
  properties:
    inserted: { type: integer }
    updated: { type: integer } # for upsert flows
    failed: { type: integer }
    errors: # row-level commit errors
      type: array
      items: { $ref: '#/components/schemas/BulkUploadError' }
```

---

# Module 1 — Leads (`/v1/leads`)

## LeadDto

```yaml
LeadDto:
  type: object
  required: [id, tenant_id, full_name, stage, source, created_at, updated_at]
  properties:
    id: { type: string, format: uuid }
    tenant_id: { type: string, format: uuid }
    full_name: { type: string, minLength: 1, maxLength: 200 }
    company: { type: string, maxLength: 200, nullable: true }
    email: { type: string, format: email, nullable: true }
    phone: { type: string, maxLength: 32, nullable: true }
    source: # acquisition channel
      type: string
      enum: [website, referral, ads, marketplace, manual, import, other]
    stage: # pipeline stage
      type: string
      enum: [new, contacted, qualified, proposal, won, lost]
    value: # estimated deal value
      type: number
      format: float
      minimum: 0
      nullable: true
    currency: { type: string, minLength: 3, maxLength: 3, default: USD }
    owner_membership_id: { type: string, format: uuid, nullable: true }
    tags: { type: array, items: { type: string }, default: [] }
    notes: { type: string, maxLength: 4000, nullable: true }
    last_contacted_at: { type: string, format: date-time, nullable: true }
    next_followup_at: { type: string, format: date-time, nullable: true }
    created_at: { type: string, format: date-time }
    updated_at: { type: string, format: date-time }
    created_by_membership_id: { type: string, format: uuid }
```

## Endpoints

### `GET /v1/leads` — list with filters + cursor pagination

Query params:

- `cursor` (string, optional) — opaque cursor from prior response
- `limit` (integer, 1–100, default 50)
- `q` (string, optional) — fuzzy search across name/email/phone/company
- `stage` (string[], optional, repeated) — filter by stage(s)
- `source` (string[], optional, repeated)
- `owner_membership_id` (uuid, optional) — filter by owner
- `tag` (string[], optional, repeated)
- `created_from`, `created_to` (date-time, optional) — created range
- `value_min`, `value_max` (number, optional)
- `sort` (string, optional) — `created_at:desc` (default), `value:desc`, `next_followup_at:asc`

Response: `200 ListEnvelope<LeadDto>`

### `GET /v1/leads/{id}` — detail

Response: `200 LeadDto`

### `POST /v1/leads` — create

Request:

```yaml
CreateLeadRequest:
  required: [full_name, source, stage]
  # fields as LeadDto minus id/tenant_id/created_*/updated_at
```

Response: `201 LeadDto` (per ADR 0038)

### `PATCH /v1/leads/{id}` — partial update

Request: `LeadDto` fields as optional (PATCH semantics).
Response: `200 LeadDto`

### `DELETE /v1/leads/{id}` — soft-delete

Response: `200 LeadDto` (state=deleted) OR `204` for hard-delete.
Use 200 for soft-delete.

### `POST /v1/leads/bulk-action` — bulk mutation

Request:

```yaml
BulkLeadActionRequest:
  required: [ids, action]
  properties:
    ids: { type: array, items: { type: string, format: uuid }, minItems: 1, maxItems: 500 }
    action:
      type: string
      enum: [assign_owner, change_stage, add_tag, remove_tag, delete]
    # per-action params:
    owner_membership_id: { type: string, format: uuid } # for assign_owner
    stage: { type: string } # for change_stage
    tag: { type: string } # for add_tag/remove_tag
```

Response: `200 BulkActionResult { affected: integer, errors: [] }`

### `POST /v1/leads/bulk-upload/preview` — CSV/Excel dry-run

Request: `multipart/form-data` with `file` field (CSV or XLSX).
Response: `200 BulkUploadPreview`

### `POST /v1/leads/bulk-upload/commit` — commit

Request: `multipart/form-data` with `file` field + `upsert_by` (`email` | `phone` | `none`, default `none`).
Response: `200 BulkUploadResult`

### `GET /v1/leads/export` — CSV export

Query params: same filter set as list.
Response: `200 text/csv` stream.

---

# Module 2 — Orders (`/v1/orders`)

## OrderDto

```yaml
OrderItemDto:
  required: [sku, quantity, unit_price, line_total]
  properties:
    sku: { type: string }
    name: { type: string } # denormalized at order time
    quantity: { type: integer, minimum: 1 }
    unit_price: { type: number, format: float, minimum: 0 }
    line_total: { type: number, format: float, minimum: 0 }
    discount: { type: number, format: float, minimum: 0, default: 0 }
    tax_rate: { type: number, format: float, minimum: 0, default: 0 }

OrderDto:
  required:
    [
      id,
      tenant_id,
      order_number,
      status,
      customer_lead_id,
      items,
      subtotal,
      tax_total,
      total,
      currency,
      placed_at,
      created_at,
      updated_at
    ]
  properties:
    id: { type: string, format: uuid }
    tenant_id: { type: string, format: uuid }
    order_number: { type: string } # e.g. ORD-2026-00042; server-issued
    status:
      type: string
      enum: [draft, pending, confirmed, shipped, delivered, cancelled, refunded]
    customer_lead_id: { type: string, format: uuid } # FK to LeadDto
    customer_name: { type: string } # denormalized
    customer_email: { type: string, format: email, nullable: true }
    items:
      type: array
      items: { $ref: '#/components/schemas/OrderItemDto' }
      minItems: 1
    subtotal: { type: number, format: float, minimum: 0 }
    tax_total: { type: number, format: float, minimum: 0 }
    discount_total: { type: number, format: float, minimum: 0, default: 0 }
    total: { type: number, format: float, minimum: 0 }
    currency: { type: string, minLength: 3, maxLength: 3 }
    placed_at: { type: string, format: date-time }
    expected_delivery_at: { type: string, format: date-time, nullable: true }
    delivered_at: { type: string, format: date-time, nullable: true }
    cancelled_at: { type: string, format: date-time, nullable: true }
    cancel_reason: { type: string, nullable: true }
    notes: { type: string, maxLength: 4000, nullable: true }
    created_at: { type: string, format: date-time }
    updated_at: { type: string, format: date-time }
    created_by_membership_id: { type: string, format: uuid }
```

## Endpoints

### `GET /v1/orders` — list

Query params:

- `cursor`, `limit`, `q` (order number, customer name)
- `status` (string[], repeated)
- `customer_lead_id` (uuid)
- `placed_from`, `placed_to` (date-time)
- `total_min`, `total_max` (number)
- `sort` — `placed_at:desc` (default), `total:desc`, `order_number:asc`

Response: `200 ListEnvelope<OrderDto>`

### `GET /v1/orders/{id}` — detail

### `POST /v1/orders` — create

Request: `CreateOrderRequest` = OrderDto without server-issued fields.
Response: `201 OrderDto` with `order_number` issued.

### `PATCH /v1/orders/{id}` — update (only for draft/pending)

Server rejects 422 if status is shipped/delivered (those are append-only via dedicated state endpoints).

### `POST /v1/orders/{id}/confirm` → `200 OrderDto` (status → confirmed)

### `POST /v1/orders/{id}/ship` (with `tracking_number?`) → status → shipped

### `POST /v1/orders/{id}/deliver` → status → delivered

### `POST /v1/orders/{id}/cancel` (with `reason: string`) → status → cancelled

### `POST /v1/orders/{id}/refund` (with `reason: string`) → status → refunded

### `POST /v1/orders/bulk-action` — bulk status change / cancel / delete drafts

### `POST /v1/orders/bulk-upload/preview` + `/commit` — CSV upload (flat order-line format, one row per line item)

### `GET /v1/orders/export` — CSV export with same filters

---

# Module 3 — Inventory (`/v1/inventory/items`)

## InventoryItemDto

```yaml
InventoryItemDto:
  required:
    [
      id,
      tenant_id,
      sku,
      name,
      unit_of_measure,
      unit_price,
      currency,
      current_stock,
      is_active,
      created_at,
      updated_at
    ]
  properties:
    id: { type: string, format: uuid }
    tenant_id: { type: string, format: uuid }
    sku: { type: string, minLength: 1, maxLength: 64, pattern: '^[A-Z0-9_-]+$' }
    name: { type: string, minLength: 1, maxLength: 200 }
    description: { type: string, maxLength: 4000, nullable: true }
    category: { type: string, maxLength: 100, nullable: true }
    unit_of_measure:
      { type: string, enum: [each, kg, g, lb, oz, l, ml, m, cm, ft, in, box, pack, pallet] }
    unit_price: { type: number, format: float, minimum: 0 }
    currency: { type: string, minLength: 3, maxLength: 3 }
    cost_price: { type: number, format: float, minimum: 0, nullable: true }
    current_stock: { type: integer, minimum: 0 }
    reorder_point: { type: integer, minimum: 0, default: 0 }
    reorder_quantity: { type: integer, minimum: 0, default: 0 }
    supplier_name: { type: string, maxLength: 200, nullable: true }
    barcode: { type: string, maxLength: 64, nullable: true }
    tags: { type: array, items: { type: string }, default: [] }
    is_active: { type: boolean }
    created_at: { type: string, format: date-time }
    updated_at: { type: string, format: date-time }

StockAdjustmentDto:
  required: [id, item_id, delta, reason, created_at, created_by_membership_id]
  properties:
    id: { type: string, format: uuid }
    item_id: { type: string, format: uuid }
    delta: { type: integer } # +ve = receive, -ve = consume / adjust
    reason:
      type: string
      enum: [purchase, sale, return, damage, correction, transfer, other]
    note: { type: string, maxLength: 2000, nullable: true }
    new_stock: { type: integer, minimum: 0 } # snapshot after adjustment
    created_at: { type: string, format: date-time }
    created_by_membership_id: { type: string, format: uuid }
```

## Endpoints

### `GET /v1/inventory/items` — list

Query params:

- `cursor`, `limit`, `q` (sku, name, barcode)
- `category` (string[], repeated)
- `is_active` (boolean)
- `low_stock` (boolean) — server filters `current_stock <= reorder_point`
- `sort` — `name:asc` (default), `current_stock:asc`, `unit_price:desc`

### `GET /v1/inventory/items/{id}` — detail

### `POST /v1/inventory/items` — create (SKU must be unique per tenant — 409 sku_taken)

### `PATCH /v1/inventory/items/{id}` — update

### `DELETE /v1/inventory/items/{id}` — soft-delete (deactivate)

### `POST /v1/inventory/items/{id}/adjust-stock` — record stock change

Request:

```yaml
AdjustStockRequest:
  required: [delta, reason]
  properties:
    delta: { type: integer }
    reason: { type: string, enum: [purchase, sale, return, damage, correction, transfer, other] }
    note: { type: string, maxLength: 2000 }
```

Response: `200 { item: InventoryItemDto, adjustment: StockAdjustmentDto }`

### `GET /v1/inventory/items/{id}/adjustments` — adjustment history

Cursor-paginated list of `StockAdjustmentDto`.

### `POST /v1/inventory/items/bulk-action` — bulk activate/deactivate/delete

### `POST /v1/inventory/items/bulk-upload/preview` + `/commit` — CSV upload (upsert by SKU)

### `GET /v1/inventory/items/export` — CSV export

---

# Error envelope (per RFC 9457 ProblemDetails)

All errors carry:

```yaml
ProblemDetails:
  required: [code, message]
  properties:
    code: { type: string } # canonical, machine-readable
    message: { type: string } # human, EN
    fields: # 422 only
      type: array
      items:
        type: object
        properties:
          field: { type: string }
          code: { type: string }
          message: { type: string }
```

Common codes:

- `not_found`, `unauthorized`, `forbidden`, `conflict`,
- For leads: `lead_email_taken`, `invalid_stage_transition`
- For orders: `invalid_status_transition`, `out_of_stock`, `customer_required`
- For inventory: `sku_taken`, `negative_stock_disallowed`, `low_stock_warning`
