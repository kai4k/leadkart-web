# CRM Modules — Draft API Contracts (Leads / Orders / Inventory)

Status: **DRAFT — frontend co-design (rev 2: BRD-aligned)**
Date: 2026-05-23

This document is the frontend's draft of the API surface for the three
CRM modules. The canonical product spec is the .NET BRD at
`d:/Development/LeadKart/BRD.md` (sections 5, 6.3, 6.4, 6.5). The
canonical architecture is the Go ADRs at `d:/Development/leadkart-go/docs/adr/`.

**Rev 2 (2026-05-23 evening):** Rewrote against BRD product spec. The
v1 of this document used generic CRM/commerce shapes; that shipped on
commit d8bce2d. Frontend is being refactored to this revised contract.

## Architecture invariants (Go backend)

Per Go ADR 0003 (state-based default) + ADR 0035 (zero event sourcing
at v0.1):

- All aggregates **state-based**, no event store, no Marten projections.
- Order lifecycle is enforced as a state machine on the row; transitions
  are written to the outbox (ADR 0027) for audit and downstream consumers.
- Cancellation compensation is explicit (no Saga): an `OrderCancelled`
  event in the outbox triggers `UnreserveStock`, `CancelInvoice` (soft +
  `CreditNoteIssued`), `CancelConsignmentNote` via Watermill subscribers
  in their owning modules (ADR 0008, ADR 0041).
- All mutations return **200 + updated DTO** (ADR 0038), not 204.
- All resources **tenant-scoped** via the operator-scope cookie or JWT.
  Frontend never sends `X-Tenant-Id`; backend injects it server-side.

## Common envelopes

```yaml
ListEnvelope<T>:
  required: [items, has_more]
  properties:
    items: { type: array, items: { $ref: '#/components/schemas/<T>' } }
    has_more: { type: boolean }
    next_cursor: { type: string, nullable: true }
    total_count: { type: integer, nullable: true }

ProblemDetails: # RFC 9457
  required: [code, message]
  properties:
    code: { type: string }
    message: { type: string }
    fields:
      type: array
      items:
        properties:
          field: { type: string }
          code: { type: string }
          message: { type: string }

BulkUploadPreview:
  required: [rows, errors, total_rows]
  properties:
    total_rows: { type: integer }
    rows:
      type: array
      items: { additionalProperties: true }
    errors:
      type: array
      items:
        properties:
          row_number: { type: integer, minimum: 1 }
          field: { type: string }
          code: { type: string }
          message: { type: string }

BulkUploadResult:
  required: [inserted, updated, failed, errors]
  properties:
    inserted: { type: integer }
    updated: { type: integer }
    failed: { type: integer }
    errors: { type: array }
```

---

# Module 1 — CRM Leads (`/v1/crm/leads`)

Per BRD §6.3. Owns: tenant lead management, call logging, reminders,
assignments. **Aggregates: CrmLead, CallLog, Reminder, AssignmentHistory.**

Note on the resource path: `/v1/crm/leads` (CRM module) is distinct from
`/v1/platform/leads` (Platform module's marketplace leads — different
aggregate, different scope). The CRM lead is created from a Platform
lead purchase via the `LeadPurchased` integration event.

## CrmLeadDto

```yaml
LeadStageSchema: { enum: [new, contacted, interested, negotiation, converted, lost] }
LeadTemperatureSchema: { enum: [hot, warm, cold, dead] }
BusinessTypeSchema: { enum: [pcd, third_party] }
MedicineSystemSchema: { enum: [allopathic, ayurvedic] }
OrderValueBandSchema: { enum: [below_5000, upto_25000, upto_50000, above_50000] }
BuyTimelineSchema: { enum: [within_week, within_15_days, within_month] }

CrmLeadDto:
  required:
    [
      id,
      tenant_id,
      contact_name,
      mobile_number,
      address,
      business_type,
      medicine_system,
      stage,
      temperature,
      product_ranges,
      dosage_forms,
      order_value_band,
      buy_timeline,
      has_drug_licence,
      has_gst,
      gst_verified,
      has_pan,
      owner_membership_id,
      created_at,
      updated_at,
      platform_lead_id,
      purchased_at
    ]
  properties:
    id: { type: string, format: uuid }
    tenant_id: { type: string, format: uuid }
    platform_lead_id: { type: string, format: uuid }
    purchased_at: { type: string, format: date-time }

    # Contact (BRD §5 locked fields)
    contact_name: { type: string, minLength: 1, maxLength: 200 }
    mobile_number:
      type: string
      pattern: '^\+91[6-9][0-9]{9}$'
    email: { type: string, format: email, nullable: true }

    # Address (PinCode is the lock; City/District/State derived server-side)
    address:
      type: object
      required: [pin_code, city, district, state]
      properties:
        pin_code: { type: string, pattern: '^[1-9][0-9]{5}$' }
        city: { type: string }
        district: { type: string }
        state: { type: string }
        street: { type: string, maxLength: 500, nullable: true }

    # Compliance
    has_drug_licence: { type: boolean }
    has_gst: { type: boolean }
    gst_number:
      type: string
      pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z]$'
      nullable: true
    gst_verified: { type: boolean }
    has_pan: { type: boolean }
    pan_number:
      type: string
      pattern: '^[A-Z]{5}[0-9]{4}[A-Z]$'
      nullable: true

    # Profile (BRD §5 indexed)
    business_type: { $ref: '#/components/schemas/BusinessTypeSchema' }
    medicine_system: { $ref: '#/components/schemas/MedicineSystemSchema' }
    product_ranges: { type: array, items: { type: string } }
    dosage_forms: { type: array, items: { type: string } }
    order_value_band: { $ref: '#/components/schemas/OrderValueBandSchema' }
    buy_timeline: { $ref: '#/components/schemas/BuyTimelineSchema' }

    # Pipeline state (BRD §4.4)
    stage: { $ref: '#/components/schemas/LeadStageSchema' }
    temperature: { $ref: '#/components/schemas/LeadTemperatureSchema' }
    last_contacted_at: { type: string, format: date-time, nullable: true }
    next_followup_at: { type: string, format: date-time, nullable: true }

    # Assignment
    owner_membership_id: { type: string, format: uuid }

    # Free-form
    notes: { type: string, maxLength: 4000, nullable: true }

    # Audit
    created_at: { type: string, format: date-time }
    updated_at: { type: string, format: date-time }

CallLogDto:
  required: [id, lead_id, called_at, outcome, logged_by_membership_id, created_at]
  properties:
    id: { type: string, format: uuid }
    lead_id: { type: string, format: uuid }
    called_at: { type: string, format: date-time }
    outcome:
      type: string
      enum: [connected, busy, no_answer, switched_off, wrong_number, do_not_call]
    notes: { type: string, maxLength: 2000, nullable: true }
    callback_at: { type: string, format: date-time, nullable: true }
    callback_window_minutes: { type: integer, nullable: true }
    logged_by_membership_id: { type: string, format: uuid }
    created_at: { type: string, format: date-time }

ReminderDto:
  required: [id, lead_id, due_at, kind, status, owner_membership_id, created_at]
  properties:
    id: { type: string, format: uuid }
    lead_id: { type: string, format: uuid }
    owner_membership_id: { type: string, format: uuid }
    due_at: { type: string, format: date-time }
    kind:
      type: string
      enum: [callback, three_month_mature, manual]
    status: { enum: [pending, snoozed, completed, dismissed] }
    note: { type: string, maxLength: 1000, nullable: true }
    completed_at: { type: string, format: date-time, nullable: true }
    completed_by_membership_id: { type: string, format: uuid, nullable: true }
    created_at: { type: string, format: date-time }

AssignmentHistoryDto:
  required:
    [id, lead_id, from_membership_id, to_membership_id, assigned_at, assigned_by_membership_id]
  properties:
    id: { type: string, format: uuid }
    lead_id: { type: string, format: uuid }
    from_membership_id: { type: string, format: uuid, nullable: true }
    to_membership_id: { type: string, format: uuid }
    assigned_at: { type: string, format: date-time }
    assigned_by_membership_id: { type: string, format: uuid }
    reason: { type: string, maxLength: 500, nullable: true }
```

## Endpoints

### List + filter

`GET /v1/crm/leads?cursor&limit&q&stage&temperature&owner_membership_id&pin_code&city&state&product_range&dosage_form&business_type&medicine_system&order_value_band&buy_timeline&has_drug_licence&has_gst&gst_verified&created_from&created_to&sort`

Returns `200 ListEnvelope<CrmLeadDto>`. Multi-value filters are repeated (`?stage=new&stage=contacted`).

**Hierarchy-scoped visibility** (BRD §6.7): callers see leads owned by themselves or any membership in their subordinate subtree. Server enforces.

### Detail

`GET /v1/crm/leads/{id}` → `200 CrmLeadDto`

### Create

Phase 1: CRM leads are created exclusively from `LeadPurchased` integration events. A `POST /v1/crm/leads/manual` may be added Phase 2 for free-form lead capture.

### Patch (partial update)

`PATCH /v1/crm/leads/{id}` → `200 CrmLeadDto`

Editable: `stage`, `temperature`, `next_followup_at`, `notes`, `email`,
`street`, compliance flags + numbers, `product_ranges`, `dosage_forms`,
`order_value_band`, `buy_timeline`.

Identity fields (`contact_name`, `mobile_number`, `pin_code`, derived
address) are immutable — captured at platform-lead verification.

### Reassignment (BRD §4.9)

`POST /v1/crm/leads/{id}/reassign`
Body: `{ to_membership_id: uuid, reason?: string }`
Returns `200 CrmLeadDto`. Appends `AssignmentHistoryDto` row.
Permission: caller's role hierarchy level ≤ Sales Manager.

### Sub-resources

`GET  /v1/crm/leads/{id}/calls` → `ListEnvelope<CallLogDto>`
`POST /v1/crm/leads/{id}/calls` → `201 CallLogDto` (creates Reminder if `callback_at` set)

`GET   /v1/crm/leads/{id}/reminders` → `ListEnvelope<ReminderDto>`
`PATCH /v1/crm/leads/reminders/{id}` (status: complete | dismiss | snooze)

`GET   /v1/crm/leads/{id}/history` → `ListEnvelope<AssignmentHistoryDto>`

### Cross-lead reminders

`GET /v1/crm/reminders?role=mine|team&status=pending|all&due_window=today|upcoming|overdue`
Dashboard widget feed (BRD §4.6). `team` requires manager hierarchy.

### Bulk

`POST /v1/crm/leads/bulk-action`
Body: `{ ids: uuid[], action: reassign|change_stage|change_temperature|add_note, ... }`
Returns `200 { affected, errors }`.

`POST /v1/crm/leads/bulk-upload/preview` (multipart `file`) → `BulkUploadPreview`
`POST /v1/crm/leads/bulk-upload/commit` (multipart `file` + `upsert_by=mobile_number|none`) → `BulkUploadResult`
(Phase 2 — v0.1 may stub with 501.)

`GET /v1/crm/leads/export` → `text/csv`

**Error codes:**
`gstin_invalid`, `pan_invalid`, `pincode_unknown`, `invalid_stage_transition`,
`reassignment_forbidden`, `mobile_number_duplicate`.

---

# Module 2 — Orders (`/v1/orders`)

Per BRD §6.4 + Go ADR 0035 (no event sourcing — state-based + outbox).

## Order lifecycle (state-based)

```
quotation_draft → quotation_revised* → quotation_approved
  → token_payment_received → confirmed
  → packed → invoice_generated → dispatched → delivered → complete
                                                     ↘ cancelled
```

Cancellation (any post-confirm state) emits `OrderCancelled` to the
outbox; downstream subscribers handle compensation:

- Inventory → `UnreserveStock`
- Orders self → `InvoiceCancelled` + `CreditNoteIssued` (if invoice existed)
- Dispatch → `CancelConsignmentNote` (if consignment existed)

## DTOs

```yaml
OrderStatusSchema:
  enum:
    [
      quotation_draft,
      quotation_revised,
      quotation_approved,
      token_payment_received,
      confirmed,
      packed,
      invoice_generated,
      dispatched,
      delivered,
      complete,
      cancelled
    ]

QuotationRevisionDto:
  required:
    [
      revision_number,
      items,
      subtotal,
      gst_total,
      total,
      notes,
      revised_by_membership_id,
      revised_at
    ]
  properties:
    revision_number: { type: integer, minimum: 1 }
    items: { type: array, items: { $ref: '#/components/schemas/OrderItemDto' } }
    subtotal: { type: number, format: float, minimum: 0 }
    gst_total: { type: number, format: float, minimum: 0 }
    discount_total: { type: number, format: float, minimum: 0 }
    total: { type: number, format: float, minimum: 0 }
    notes: { type: string, maxLength: 2000, nullable: true }
    revised_by_membership_id: { type: string, format: uuid }
    revised_at: { type: string, format: date-time }

OrderItemDto:
  required:
    [
      product_id,
      batch_id,
      batch_number,
      brand_name,
      quantity,
      unit_price,
      gst_percentage,
      line_total
    ]
  properties:
    product_id: { type: string, format: uuid }
    batch_id: { type: string, format: uuid } # FEFO at quotation_approved
    batch_number: { type: string }
    brand_name: { type: string }
    pack_size: { type: string }
    hsn_code: { type: string }
    quantity: { type: integer, minimum: 1 }
    unit_price: { type: number, format: float, minimum: 0 }
    discount_percentage: { type: number, minimum: 0, maximum: 100, default: 0 }
    gst_percentage: { type: number, minimum: 0 }
    line_total: { type: number, format: float, minimum: 0 }
    line_gst: { type: number, format: float, minimum: 0 }

PaymentDto:
  required: [id, order_id, amount, method, kind, received_at, received_by_membership_id]
  properties:
    id: { type: string, format: uuid }
    order_id: { type: string, format: uuid }
    kind: { enum: [token, full] }
    amount: { type: number, format: float, minimum: 0 }
    method: { enum: [cash, upi, bank_transfer, cheque, card, other] }
    reference: { type: string, maxLength: 200, nullable: true }
    received_at: { type: string, format: date-time }
    received_by_membership_id: { type: string, format: uuid }

InvoiceDto:
  required:
    [id, order_id, invoice_number, fy, generated_at, taxable_total, gst_total, grand_total, status]
  properties:
    id: { type: string, format: uuid }
    order_id: { type: string, format: uuid }
    invoice_number: { type: string } # "INV/2026-27/00047" — FY-aware
    fy: { type: string, pattern: '^[0-9]{4}-[0-9]{2}$' }
    generated_at: { type: string, format: date-time }
    taxable_total: { type: number, format: float, minimum: 0 }
    gst_total: { type: number, format: float, minimum: 0 }
    grand_total: { type: number, format: float, minimum: 0 }
    status: { enum: [active, cancelled] }
    cancelled_at: { type: string, format: date-time, nullable: true }
    cancellation_reason: { type: string, nullable: true }

CreditNoteDto:
  required: [id, order_id, invoice_id, credit_note_number, fy, issued_at, amount, reason]
  properties:
    id: { type: string, format: uuid }
    order_id: { type: string, format: uuid }
    invoice_id: { type: string, format: uuid }
    credit_note_number: { type: string }
    fy: { type: string }
    issued_at: { type: string, format: date-time }
    amount: { type: number, format: float, minimum: 0 }
    reason: { type: string, maxLength: 500 }

OrderDto:
  required:
    [
      id,
      tenant_id,
      order_number,
      status,
      customer_lead_id,
      current_items,
      current_subtotal,
      current_gst_total,
      current_total,
      currency,
      revisions,
      payments,
      created_at,
      updated_at,
      created_by_membership_id
    ]
  properties:
    id: { type: string, format: uuid }
    tenant_id: { type: string, format: uuid }
    order_number: { type: string }
    status: { $ref: '#/components/schemas/OrderStatusSchema' }
    customer_lead_id: { type: string, format: uuid }
    customer_name: { type: string } # denormalized
    customer_gst_number: { type: string, nullable: true }

    current_items: { type: array, items: { $ref: '#/components/schemas/OrderItemDto' } }
    current_subtotal: { type: number, format: float, minimum: 0 }
    current_gst_total: { type: number, format: float, minimum: 0 }
    current_discount_total: { type: number, format: float, minimum: 0 }
    current_total: { type: number, format: float, minimum: 0 }
    currency: { type: string, default: INR }

    revisions: { type: array, items: { $ref: '#/components/schemas/QuotationRevisionDto' } }
    payments: { type: array, items: { $ref: '#/components/schemas/PaymentDto' } }
    invoice_id: { type: string, format: uuid, nullable: true }
    credit_note_ids: { type: array, items: { type: string, format: uuid } }
    consignment_id: { type: string, format: uuid, nullable: true }

    quotation_approved_at: { type: string, format: date-time, nullable: true }
    confirmed_at: { type: string, format: date-time, nullable: true }
    packed_at: { type: string, format: date-time, nullable: true }
    invoice_generated_at: { type: string, format: date-time, nullable: true }
    dispatched_at: { type: string, format: date-time, nullable: true }
    delivered_at: { type: string, format: date-time, nullable: true }
    completed_at: { type: string, format: date-time, nullable: true }
    cancelled_at: { type: string, format: date-time, nullable: true }
    cancel_reason: { type: string, nullable: true }
    notes: { type: string, nullable: true }

    created_at: { type: string, format: date-time }
    updated_at: { type: string, format: date-time }
    created_by_membership_id: { type: string, format: uuid }
```

## Endpoints

### Discover

`GET /v1/orders?cursor&limit&q&status&customer_lead_id&placed_from&placed_to&total_min&total_max&sort`
`GET /v1/orders/{id}` → `OrderDto`
`GET /v1/orders/{id}/revisions` → `ListEnvelope<QuotationRevisionDto>`
`GET /v1/orders/{id}/payments` → `ListEnvelope<PaymentDto>`
`GET /v1/orders/{id}/invoice` → `InvoiceDto | null`
`GET /v1/orders/{id}/credit-notes` → `ListEnvelope<CreditNoteDto>`

### State-machine endpoints (one POST per transition)

| Endpoint                                     | Body                                      | Pre-state                              | New state                                                             |
| -------------------------------------------- | ----------------------------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| `POST /v1/orders`                            | `CreateQuotationRequest`                  | —                                      | `quotation_draft` (201)                                               |
| `POST /v1/orders/{id}/revise`                | `ReviseQuotationRequest`                  | `quotation_draft \| quotation_revised` | `quotation_revised`                                                   |
| `POST /v1/orders/{id}/approve-quotation`     | `{ notes?: string }`                      | `quotation_draft \| quotation_revised` | `quotation_approved`                                                  |
| `POST /v1/orders/{id}/payments` (kind=token) | `RecordPaymentRequest`                    | `quotation_approved`                   | `token_payment_received`                                              |
| `POST /v1/orders/{id}/confirm`               | `{}`                                      | `token_payment_received`               | `confirmed` (fires `OrderConfirmed` outbox → Inventory FEFO-reserves) |
| `POST /v1/orders/{id}/mark-packed`           | `{ box_count, packed_by_membership_id? }` | `confirmed`                            | `packed`                                                              |
| `POST /v1/orders/{id}/generate-invoice`      | `{}`                                      | `packed`                               | `invoice_generated`                                                   |
| `POST /v1/orders/{id}/dispatch`              | `CreateConsignmentRequest`                | `invoice_generated`                    | `dispatched`                                                          |
| `POST /v1/orders/{id}/mark-delivered`        | `{ delivered_at? }`                       | `dispatched`                           | `delivered`                                                           |
| `POST /v1/orders/{id}/payments` (kind=full)  | `RecordPaymentRequest`                    | `delivered`                            | (no transition; enables complete)                                     |
| `POST /v1/orders/{id}/complete`              | `{}`                                      | `delivered` + full payment received    | `complete`                                                            |
| `POST /v1/orders/{id}/cancel`                | `{ reason: string }`                      | any post-confirm                       | `cancelled`                                                           |

**Tenant price-override band** (BRD §6.4 — default ±10%): server enforces during `/revise` and create. `unit_price` outside `[sale_rate × 0.9, sale_rate × 1.1]` → 422 `price_outside_band`.

### Mutations

`PATCH /v1/orders/{id}` (notes only; items via `/revise`).
`DELETE /v1/orders/{id}` (only `quotation_draft`).

### Bulk

`POST /v1/orders/bulk-action` — `cancel | delete_drafts`.
`POST /v1/orders/bulk-upload/preview` + `/commit` — Phase 2.
`GET /v1/orders/export` → CSV.

**Error codes:**
`invalid_status_transition`, `price_outside_band`, `payment_below_token_minimum`,
`stock_reservation_failed`, `invoice_already_generated`, `cancel_after_complete_forbidden`.

---

# Module 3 — Inventory (`/v1/inventory`)

Per BRD §6.5. Owns: Products, Batches, StockMovements. Computed prices
never stored (BRD §6.5).

## DTOs

```yaml
ProductCategorySchema: # therapeutic area (open list)
  type: string
ProductTypeSchema: # physical form (open list)
  type: string
DrugScheduleSchema:
  enum: [otc, schedule_h, schedule_h1, schedule_x, schedule_c, not_applicable]
StockMovementReasonSchema:
  enum:
    [
      inward,
      sale,
      sale_cancelled,
      damage,
      expired,
      transfer_in,
      transfer_out,
      correction,
      opening_balance
    ]

ProductDto:
  required:
    [
      id,
      tenant_id,
      brand_name,
      generic_name,
      manufacturer_name,
      product_category,
      product_type,
      drug_schedule,
      mrp,
      purchase_rate,
      sale_rate,
      gst_percentage,
      hsn_code,
      pack_size,
      pack_type,
      units_per_pack,
      shelf_life_months,
      is_active,
      created_at,
      updated_at
    ]
  properties:
    id: { type: string, format: uuid }
    tenant_id: { type: string, format: uuid }

    # Identity
    brand_name: { type: string, minLength: 1, maxLength: 200 }
    generic_name: { type: string, maxLength: 500 }
    composition: { type: string, maxLength: 1000, nullable: true }
    manufacturer_name: { type: string, maxLength: 200 }
    manufacturing_license_no: { type: string, maxLength: 100, nullable: true }

    # Classification
    product_category: { $ref: '#/components/schemas/ProductCategorySchema' }
    product_type: { $ref: '#/components/schemas/ProductTypeSchema' }
    drug_schedule: { $ref: '#/components/schemas/DrugScheduleSchema' }

    # Commercial
    pack_size: { type: string, maxLength: 50 }
    pack_type: { type: string, maxLength: 50 }
    units_per_pack: { type: integer, minimum: 1 }
    mrp: { type: number, format: float, minimum: 0 }
    purchase_rate: { type: number, format: float, minimum: 0 }
    sale_rate: { type: number, format: float, minimum: 0 }
    gst_percentage: { type: number, minimum: 0, maximum: 100 }
    hsn_code: { type: string, pattern: '^[0-9]{4,8}$' }

    # Regulatory
    storage_condition: { type: string, maxLength: 200, nullable: true }
    shelf_life_months: { type: integer, minimum: 1 }

    # Type-varying attributes
    attributes:
      type: object
      additionalProperties: true
      nullable: true

    # Stock aggregate (computed from batches)
    total_quantity_available: { type: integer, minimum: 0 }
    total_quantity_reserved: { type: integer, minimum: 0 }
    earliest_expiry_at: { type: string, format: date-time, nullable: true }

    is_active: { type: boolean }
    created_at: { type: string, format: date-time }
    updated_at: { type: string, format: date-time }

BatchDto:
  required:
    [
      id,
      product_id,
      batch_number,
      manufactured_at,
      expires_at,
      quantity_received,
      quantity_available,
      quantity_reserved,
      purchase_rate,
      gst_percentage,
      inward_date,
      is_quarantined,
      is_written_off
    ]
  properties:
    id: { type: string, format: uuid }
    product_id: { type: string, format: uuid }
    batch_number: { type: string, minLength: 1, maxLength: 100 }
    manufactured_at: { type: string, format: date }
    expires_at: { type: string, format: date }
    quantity_received: { type: integer, minimum: 0 }
    quantity_available: { type: integer, minimum: 0 }
    quantity_reserved: { type: integer, minimum: 0 }
    purchase_rate: { type: number, format: float, minimum: 0 }
    gst_percentage: { type: number, minimum: 0 }
    inward_date: { type: string, format: date }
    supplier_name: { type: string, maxLength: 200, nullable: true }
    supplier_invoice_no: { type: string, maxLength: 100, nullable: true }
    is_quarantined: { type: boolean }
    is_written_off: { type: boolean }
    write_off_reason: { type: string, nullable: true }

StockMovementDto:
  required:
    [id, product_id, batch_id, delta, reason, balance_after, occurred_at, recorded_by_membership_id]
  properties:
    id: { type: string, format: uuid }
    product_id: { type: string, format: uuid }
    batch_id: { type: string, format: uuid }
    delta: { type: integer }
    reason: { $ref: '#/components/schemas/StockMovementReasonSchema' }
    balance_after: { type: integer, minimum: 0 }
    reference_kind: { enum: [order, dispatch, manual, batch_inward] }
    reference_id: { type: string, format: uuid, nullable: true }
    note: { type: string, maxLength: 1000, nullable: true }
    occurred_at: { type: string, format: date-time }
    recorded_by_membership_id: { type: string, format: uuid }
```

## Endpoints

### Products

`GET /v1/inventory/products?cursor&limit&q&product_category&product_type&drug_schedule&is_active&low_stock&expiring_within_days&sort`
`GET /v1/inventory/products/{id}` → `ProductDto`
`POST /v1/inventory/products` → `201 ProductDto`
`PATCH /v1/inventory/products/{id}` → `200 ProductDto`
`DELETE /v1/inventory/products/{id}` → `200 ProductDto` (soft via `is_active=false`)

On create: `gst_percentage` auto-populates server-side from `ProductCategoryGstDefault` (BRD §6.5); client passes whatever the user confirmed.

### Batches

`GET /v1/inventory/products/{id}/batches?include_written_off=false` → `ListEnvelope<BatchDto>`
`POST /v1/inventory/products/{id}/batches` → `201 BatchDto` (records inward StockMovement)
`PATCH /v1/inventory/batches/{id}` → `200 BatchDto` (quarantine/write-off/supplier info)
`POST /v1/inventory/batches/{id}/write-off` → `200 BatchDto` (reason required)
`POST /v1/inventory/batches/{id}/quarantine` → `200 BatchDto`

### Stock movements

`GET /v1/inventory/products/{id}/movements?cursor&limit&from&to` → `ListEnvelope<StockMovementDto>`
`POST /v1/inventory/products/{id}/movements` (manual correction) → `201 StockMovementDto`

### Reference data

`GET /v1/inventory/categories` → list of `ProductCategory` strings the tenant uses
`GET /v1/inventory/types` → list of `ProductType` strings the tenant uses
`GET /v1/inventory/gst-defaults` → `{ category: gst_percentage }` map

### Bulk

`POST /v1/inventory/products/bulk-action` — `activate | deactivate | delete`.
`POST /v1/inventory/products/bulk-upload/preview` + `/commit` — upsert by `(brand_name, manufacturer_name, pack_size, pack_type)`.
`GET /v1/inventory/products/export` → CSV.

### Computed prices

`GET /v1/inventory/products/{id}/computed-prices` → `{ purchase_rate_with_gst, sale_rate_with_gst }`

**Error codes:**
`product_duplicate`, `batch_expiry_before_today`, `batch_manufactured_after_expiry`,
`stock_reservation_failed`, `category_unknown`.

---

# Out of scope for the frontend co-design

Owned by other modules; frontend interacts only via the events listed above:

- **Dispatch / Consignment notes** (`/v1/dispatch/...`) — order detail shows
  a placeholder card that fills in once Dispatch ships.
- **Tasks (WorkItems)** (`/v1/tasks/...`) — separate sprint.
- **Notifications dispatcher** — surfaced via existing `/notifications` API.
