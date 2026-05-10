# LeadKart — Business Requirements Document

**Version:** 3.0  
**Status:** Living Document  
**Last Updated:** April 2026  
**Product:** LeadKart — PCD Pharma SaaS Platform

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Model](#2-business-model)
3. [Actors and Roles](#3-actors-and-roles)
4. [Core Domain Decisions](#4-core-domain-decisions)
5. [Lead Form — Locked Fields](#5-lead-form--locked-fields)
6. [Module Breakdown](#6-module-breakdown)
7. [Cross-Cutting Concerns](#7-cross-cutting-concerns)
8. [Technical Architecture](#8-technical-architecture)
9. [Coding Standards](#9-coding-standards)
10. [Frontend](#10-frontend)
11. [Open Items](#11-open-items)
12. [Appendix A — Architecture Decisions](#appendix-a--architecture-decisions)
13. [Appendix B — Location, GST and PAN Intelligence](#appendix-b--location-gst-and-pan-intelligence)
14. [Appendix C — Pharma Product Data](#appendix-c--pharma-product-data)

---

## 1. Executive Summary

LeadKart is a multi-tenant SaaS platform for the Indian PCD (Propaganda Cum Distribution) pharma market.

**For LeadKart (the platform):** A structured marketplace to source, verify, and sell qualified pharma leads to PCD companies.

**For pharma companies (tenants):** A single platform to manage leads, CRM, quotations, orders, inventory, and dispatch.

A **lead** is a potential buyer — a medical store owner, chemist, or distributor — who may purchase medicines from the tenant's PCD company. Leads are NOT franchise partners.

---

## 2. Business Model

```
LeadKart Platform Team
├── Sources potential buyer contacts (Unverified Contacts)
├── Lead Agents call and verify them
├── Verified contacts become PlatformLeads in the marketplace
└── Tenants purchase leads using Lead Credits

Tenant (PCD Pharma Company)
├── Subscribes to LeadKart
├── Purchases lead credits
├── Browses and purchases verified leads from marketplace
├── Manages purchased leads through the CRM
├── Raises quotations, confirms orders
├── Manages inventory and dispatches via consignment notes
└── Tracks payments and overdue balances
```

---

## 3. Actors and Roles

### 3.1 Platform Team (LeadKart Internal)

| Role            | Responsibilities                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| SuperAdmin      | Full system access. Manages tenants, platform users, system configuration. Creates users for any tenant. |
| PlatformManager | Lead sourcing operations, tenant onboarding                                                              |
| LeadAgent       | Calls unverified contacts, verifies and qualifies for marketplace                                        |

### 3.2 Tenant Users

| Role                | Primary Responsibilities                                    |
| ------------------- | ----------------------------------------------------------- |
| CompanyOwner        | Full tenant access. Manages users, settings, billing        |
| OfficeAdministrator | User management, settings, reports                          |
| OfficeExecutive     | General operations support                                  |
| SalesManager        | Manages sales team, approves quotations, views all CRM data |
| SalesExecutive      | Manages assigned leads, creates quotations, logs calls      |
| PurchaseManager     | Procurement, approves purchase orders                       |
| PurchaseExecutive   | Raises purchase orders, manages product catalogue           |
| DispatchManager     | Dispatch queue, assigns dispatch executives                 |
| DispatchExecutive   | Creates consignment notes, updates delivery status          |
| HrManager           | Users and org structure                                     |
| HrExecutive         | HR operations support                                       |

### 3.3 Authorization Model

- **Permissions-first** — code never checks role names directly
- Roles are named collections of default permissions stored in the database
- Users can have individual permission grants and revocations on top of their role
- Effective permissions = Role.DefaultPermissions + User.GrantedPermissions - User.RevokedPermissions
- Permissions embedded in JWT as individual claims at login
- Permission cache in Redis — invalidated on role or permission change

---

## 4. Core Domain Decisions

> All decisions in this section are locked.

### 4.1 Lead Definition

A lead is a **potential buyer** — medical store, chemist, or distributor — who could purchase medicines from the tenant's PCD company. Leads are sourced and verified by the LeadKart platform team, then sold to tenants as purchase credits.

### 4.2 Lead Purchase

- PlatformLeads are **permanent purchases** — no refunds, no time expiry
- Lead credits purchased upfront by tenants
- One lead credit = one lead purchase
- Lead is immediately available in tenant CRM after purchase

### 4.3 Marketplace Filters

Tenants filter PlatformLeads by:

```
Location:      State, City, District, PinCode
Products:      ProductRanges[]     multi-select (text[] GIN index)
               DosageForms[]       multi-select (text[] GIN index)
Business:      BusinessType        PCD | ThirdParty
               MedicineSystem      Allopathic | Ayurvedic
               OrderValue          Below5000 | Upto25000 | Upto50000 | Above50000
               BuyTimeline         WithinWeek | Within15Days | WithinMonth
Compliance:    HasDrugLicence      bool
               HasGst              bool
               GstVerified         bool
Pricing:       PriceRange          lead price band
```

### 4.4 Lead Stages (CRM)

```
New → Contacted → Interested → Negotiation → Converted → Lost
```

Independent temperature axis:

```
Hot | Warm | Cold | Dead
```

### 4.5 Callback Window

When a contact/lead is busy, the caller logs Callback Date + Window Start/End Time; system auto-creates a Reminder. Applies to Platform (Lead Agent) and CRM (Sales Executive).

### 4.6 Reminders

Notification surface in LeadKart: auto-created from callback windows and the 3-month mature-lead rule; shown on dashboard as Today / Upcoming / Overdue; visible to managers for their team.

### 4.7 Three-Month Mature Lead Rule

Daily job flags converted leads with no reorder in 3 months → Reminder to Sales Executive. Threshold fixed at 3 months (Phase 1; configurable in Phase 2).

### 4.8 Document Terminology

| Informal Term | Correct Term         | Description                                          |
| ------------- | -------------------- | ---------------------------------------------------- |
| Kacha Bill    | **Quotation**        | Draft pricing document, multiple revisions preserved |
| Final Bill    | **Invoice**          | Generated after packing, final tax document          |
| Builty        | **Consignment Note** | Transport document handed to carrier                 |

### 4.9 Lead Reassignment

Sales Manager or above can reassign. Full assignment history preserved (who, when, by whom). New executive sees complete lead history.

### 4.10 Subscription Gating

All tenants get full access in Phase 1. Infrastructure designed, not enforced.

---

## 5. Lead Form — Locked Fields

Captured when a Lead Agent adds an unverified contact or a lead profile is created.

```
Name                  Full name of contact person
MobileNumber          Indian mobile number (+91XXXXXXXXXX)
Email                 Email address

Address
├── PinCode           6-digit Indian PIN code; auto-fills City/District/State
├── City              auto-populated from pincode, read-only
├── District          auto-populated from pincode, read-only
├── State             auto-populated from pincode, read-only
└── Street            optional free text

HasDrugLicence        boolean (type and number — Phase 2)
HasGst                boolean
GstNumber             required when HasGst = true; validated: format, checksum, state code cross-check
HasPan                boolean
PanNumber             required when HasPan = true; validated: format, taxpayer type extracted

BusinessType          PCD | ThirdParty
MedicineSystem        Allopathic | Ayurvedic
ProductRanges[]       multi-select, open extensible list (Appendix C.3)
DosageForms[]         multi-select, open extensible list (Appendix C.4)
OrderValue            Below5000 | Upto25000 | Upto50000 | Above50000
BuyTimeline           WithinWeek | Within15Days | WithinMonth
```

**Indexed** (marketplace filters): City, State, District, PinCode, BusinessType, MedicineSystem, OrderValue, BuyTimeline, HasDrugLicence, HasGst, GstVerified. `ProductRanges[]` and `DosageForms[]` use `text[]` with GIN index.

**Not indexed:** Email. **Drug licence type/number:** Phase 2; Phase 1 captures boolean only.

---

## 6. Module Breakdown

Eight modules: Identity, Platform, CRM, Orders, Inventory, Dispatch, Tasks, Notifications. Generic Subdomain reference data (pincodes, GST defaults) lives in `BuildingBlocks/Infrastructure/ReferenceData/` per Path 2 collapse — see CLAUDE.md doctrine hierarchy.

### 6.1 Identity Module

**Owns:** Authentication, authorisation, person identity, tenant membership, tenant lifecycle

**Aggregates** — Person + TenantMembership split per FAANG canon (Auth0 Organizations, Microsoft Entra ID, Slack, Stripe, GitHub, Linear, Notion, Atlassian, AWS IAM Identity Center — 8/8 convergent). Full rationale in `.claude/rules/multi-tenancy.md` "Identity model — Person + TenantMembership."

| Aggregate          | Responsibility                                                                                                                                                                                                                                     | Tenant-scoped             | Interfaces                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------- |
| `Tenant`           | Organisation lifecycle, TenantSettings, PasswordPolicy                                                                                                                                                                                             | NO (each row IS a tenant) | IAuditable, ISoftDeletable                |
| `Person`           | Global identity. Email (globally unique), Profile (FirstName, LastName, ProfilePictureUrl, Bio), Credential (PasswordHash, SecurityStamp, lockout, password-reset, login audit), IsActive (rare global suspension), IsDeleted (DPDP anonymisation) | NO                        | IAuditable, ISoftDeletable                |
| `TenantMembership` | Per-tenant context for a Person. Status (Pending/Active/Inactive), JoinedAt, LeftAt, RoleAssignments, Permission overrides, Designation, Department, ReportsTo (per-tenant manager — MembershipId), StatusMessage                                  | YES                       | ITenantScoped, IAuditable, ISoftDeletable |
| `Role`             | Tenant-scoped permission groupings, seeded from DefaultRoleCatalog. SuperAdmin role is special (drives `is_super_user` JWT claim).                                                                                                                 | YES                       | ITenantScoped, ISoftDeletable             |

**Single-Active-Membership invariant** (database-enforced via partial unique index): a Person has AT MOST one Active Membership at any time. Job changes are sequential (Inactive old → Active new), never concurrent.

**Login flow consequence:** No tenant-picker. `(email, password)` only. Server finds Person by email globally, finds the unique Active Membership, scopes JWT to that Membership's Tenant. Per `security.md` "Login flow."

**Same email across tenants over time:** One Person row, multiple Membership rows (one Active at a time). Personal email reuse is supported. Job change preserves Person identity.

**SuperUser god-mode:** A Person with an active Membership in the Platform tenant whose Role assignments include `SuperAdmin`. JWT carries `is_super_user: true` → `ICurrentUser.HasPermission` returns true unconditionally → can do anything in any tenant. Audit log is the only constraint. Cross-tenant mutations require `X-SuperUser-Reason` header (or impersonation session reason). Per `multi-tenancy.md` "SuperUser god-mode." Platform Manager / Lead Agent are platform users WITHOUT `is_super_user`: they READ across tenants (RLS bypass) but cannot mutate tenant data (lack tenant-tier permissions).

**Key Decisions:**

- `sub` JWT claim = PersonId (global identity, NEVER changes during session — forensic anchor per RFC 8693 §4.1).
- `tenant_id` claim = current Membership's TenantId.
- `is_super_user` claim = true when Membership has SuperAdmin role.
- Platform users (`SuperAdmin`, `PlatformManager`, `LeadAgent`) hold their Membership in the Platform tenant.
- Roles are string constants via `SystemRoles.*` — never enums. SuperAdmin role flagged via `Role.IsSuperAdmin`.
- JWT blacklist (Redis) + per-Membership SecurityStamp revalidated on every authenticated request via cache facade (`ISecurityStampCache`).
- `TenantRegistered` domain event handler creates Person + Admin TenantMembership atomically (Admin's `Membership.RoleAssignments` = `[CompanyOwner]`, `MustChangePassword = true` on Person.Credential).
- Refresh tokens: per (PersonId, TenantId) family, single-use with rotation, reuse detection revokes the family + raises SIEM event — full model in `.claude/rules/security.md`.
- Password reset tokens: cryptographically random, single-use, 1-hour expiry, hashed; SecurityStamp on the active Membership rotates on successful reset.
- `CreateUserCommand` is **find-or-create-by-email**: server looks up Person by email globally, attaches new Membership if Person exists, creates Person + Membership atomically if not.

**Commands (functional groups):**

```
Tenant:      RegisterTenant, SuspendTenant, ReactivateTenant, DeleteTenant, UpdateTenantSettings
Person:      AnonymisePerson (DPDP), GloballySuspendPerson, ReactivatePerson, ChangePersonProfile
Membership:  CreateUser (find-or-create Person + create Membership), DeactivateUser (mark Membership Inactive),
             ReactivateUser (Membership Inactive → Active), AssignRole, RevokeRole,
             UpdateUserPermissions, UpdateUserProfile, AssignManager, RemoveManager,
             RequestEmailChange (Person-level), ConfirmEmailChange, UnlockUser, BulkCreateUsers
Auth:        Login (email+password — no tenantSlug), RefreshToken, Logout,
             LogoutAllSessions, ChangePassword, RequestPasswordReset, ResetPassword,
             RevokeSession
SuperUser:   CreateSuperAdmin (gated by existing SuperAdmin), RemoveSuperAdmin
```

**Integration Events** (full vocabulary in `.claude/rules/messaging.md` "Identity event vocabulary — Person + Membership"):

```
Person (PlatformEvent):    PersonCreated, PersonAnonymised, PersonGloballySuspended,
                           PersonProfileUpdated
Tenant (PlatformEvent):    TenantRegistered, TenantProfileUpdated, TenantStatutoryUpdated,
                           TenantContactUpdated, TenantDisplayPreferencesUpdated,
                           TenantSettingsUpdated, TenantSuspended, TenantActivated,
                           TenantDeleted
Membership (TenantScoped): MembershipCreated, MembershipDeactivated, MembershipReactivated,
                           MembershipRoleAssigned, MembershipRoleRevoked,
                           MembershipPermissionsUpdated, MembershipProfileUpdated,
                           MembershipManagerAssigned, MembershipManagerRemoved,
                           MembershipHierarchyCascaded, MembershipUnlocked
Auth (TenantScoped):       RefreshTokenReuseDetected (SIEM), PasswordResetRequested (delivery),
                           EmailChangeRequested (delivery), EmailChanged, PasswordChanged
```

---

### 6.2 Platform Module

**Owns:** Lead sourcing, verification, marketplace, lead credits

**Aggregates:**

| Aggregate           | Responsibility                                                                        |
| ------------------- | ------------------------------------------------------------------------------------- |
| `UnverifiedContact` | Raw contact before verification — Lead Agent's work queue                             |
| `VerificationCall`  | Call log with callback window support                                                 |
| `PlatformLead`      | Verified lead in marketplace, all lead form fields, ProductRanges[], indexed location |
| `LeadCredit`        | Tenant credit balance                                                                 |

**Key Flows:**

1. Lead Agent calls contact → logs outcome
2. If Busy → callback window → Reminder auto-created
3. Verified → PlatformLead created with all lead form fields
4. Tenant browses with filters → purchases with credits
5. `LeadPurchasedIntegrationEvent` → CRM creates CrmLead

**Integration Events:**

```
Consumed:  TenantRegistered → initialise lead credits
Published: LeadPurchased
```

---

### 6.3 CRM Module

**Owns:** Tenant lead management, call logging, reminders, assignments

**Aggregates:**

| Aggregate           | Responsibility                     |
| ------------------- | ---------------------------------- |
| `CrmLead`           | Purchased lead in tenant CRM       |
| `CallLog`           | Every interaction                  |
| `Reminder`          | Scheduled callbacks and follow-ups |
| `AssignmentHistory` | Full audit of lead assignments     |

**CrmLead Indexed Columns (filterable, queryable):**

```
Stage, Temperature, ContactName, Phone
City, District, State, PinCode
ProductRanges[]  (text[] GIN index)
DosageForms[]    (text[] GIN index)
BusinessType, MedicineSystem, OrderValue, BuyTimeline
HasDrugLicence, HasGst, GstVerified
```

**CrmLead JSONB (non-filterable supplementary data):**

```
extra_profile: { street, gst_number, pan_number, email, notes }
```

**Integration Events:**

```
Consumed:  TenantSuspended, UserDeactivated, LeadPurchased
Published: LeadConverted { LeadId, ContactName, Phone, City, State, District,
           PinCode, BusinessType, MedicineSystem, GstNumber }
```

---

### 6.4 Orders Module

**Owns:** Quotations, orders, invoices, credit notes, payments. **Event sourced via Marten.**

**Order Lifecycle (happy path):**

```
Quotation Draft → Revisions → Approved → Token Payment → Order Confirmed
→ Packed → Invoice Generated → Dispatched → Delivered → Complete
```

**Order Cancellation (at any point after confirmation):**

```
OrderCancelled
├── If stock reserved    → UnreserveStock (Inventory, saga compensation)
├── If invoice generated → Cancel Invoice (soft-delete) + Issue CreditNote
└── If consignment created → Cancel ConsignmentNote (Dispatch, saga compensation)
```

**Order Event Stream (Marten):**

```
Stream: Order-{orderId}
  1. QuotationCreated        { items, customerLeadId, createdBy }
  2. QuotationRevised        { items, notes, revisedBy }
  3. QuotationApproved       { approvedBy }
  4. TokenPaymentReceived    { amount, method, reference }
  5. OrderConfirmed          { confirmedBy }              → triggers saga
  6. ItemsPacked             { packedBy, boxCount }
  7. InvoiceGenerated        { invoiceNumber, taxDetails }
  8. ConsignmentLinked       { consignmentId }
  9. DeliveryConfirmed       { deliveredAt }
  10. FullPaymentReceived    { amount, method, reference }
  11. OrderCompleted         { completedAt }
  --- or cancellation ---
  6. OrderCancelled          { cancelledBy, reason }      → triggers saga compensation
  7. CreditNoteIssued        { creditNoteNumber, amount }
  8. InvoiceCancelled        { cancellationReason }
```

**OrderFulfillmentSaga (Wolverine `Saga<T>`):**

```
OrderFulfillmentSaga : Saga<OrderFulfillmentState>
├── Handle(OrderConfirmed)           → state: StockPending
├── Handle(StockReadyForDispatch)    → state: ReadyForDispatch
├── Handle(StockReservationFailed)   → state: StockFailed, notify user
├── Handle(ConsignmentCreated)       → state: InTransit
├── Handle(ConsignmentDelivered)     → state: Complete
├── Handle(OrderCancelled)           → fire compensating events based on current state
```

**Saga Timeouts (designed, not enforced in Phase 1):**

- StockPending > 24 hours → alert operations
- InTransit > 14 days → mark `DeliveryOverdue`, alert
- Implemented via Wolverine `ScheduleTimeout` when operational alerting is in place

**Marten:** inline projections for `OrderSummary` (strong consistency), async projections for reporting, snapshots every 20 events, event upcasting for schema evolution.

**Key Decisions:**

- Multiple quotation revisions preserved with notes (immutable events)
- Price override band per tenant (default ±10%)
- Overdue payment threshold per tenant (default 30 days)
- Invoice is internal record — MARG integration is Phase 2
- CreditNote on cancellation references original invoice event
- Cancellation compensation handled by OrderFulfillmentSaga

**Integration Events:**

```
Published: OrderConfirmed, OrderCancelled, OrderDelivered
Consumed:  LeadConverted → context for first order
           ConsignmentDelivered → mark order delivered (via saga)
```

---

### 6.5 Inventory Module

**Owns:** Product catalogue, stock, batch tracking

**Key Decisions:**

- FEFO (First Expired First Out) for dispatch
- `ProductCategory` and `ProductType` are separate fields — both stored, both indexed
- `ProductCategory` drives the default GST percentage
- Product attributes in JSONB (varies by ProductType/DosageForm)
- `DrugSchedule`: OTC | ScheduleH | ScheduleH1 | ScheduleX | ScheduleC | NotApplicable
- Expiry alerts per tenant (default 90 days)
- Reorder level alerts per tenant
- Computed prices never stored — calculated on demand

**ProductCategory vs ProductType:**

- `ProductCategory` — therapeutic area (General, Ortho, Gynaecology, Diabetic, Cardiac, Nephrology, …). Drives default GST. Matches lead `ProductRanges` for catalogue browsing. Open extensible list (string constant).
- `ProductType` — physical form (Tablet, Capsule, Syrup, Ointment, Dry Syrup, Protein Powder, …). Open extensible list (string constant).

**GST on Products:**

A `ProductCategoryGstDefault` table stores the default GST % per category. Seeded at migration, editable by SuperAdmin. Owned by `BuildingBlocks/Infrastructure/ReferenceData/`; admin write access via a dedicated endpoint on the API host.

UX on product entry:

1. User selects ProductCategory (e.g. "Ortho")
2. GstPercentage auto-populates with category default
3. User can override
4. Final value saved explicitly on the Product record — not derived at runtime

Computed prices (never stored — calculated in application layer):

```
PurchaseRateWithGst = PurchaseRate + (PurchaseRate × GstPercentage / 100)
SaleRateWithGst     = SaleRate + (SaleRate × GstPercentage / 100)
```

**Product Master Fields:**

```
Identity:        BrandName, GenericName, Composition, ManufacturerName, ManufacturingLicenseNo
Classification:  ProductCategory (indexed), ProductType (indexed), DrugSchedule
Commercial:      PackSize, PackType, UnitsPerPack, MRP, PurchaseRate, SaleRate,
                 GstPercentage, HsnCode
Regulatory:      StorageCondition, ShelfLifeMonths
Attributes:      JSONB — varies by ProductType (strength, volume, coating etc)
```

**Batch Fields:**

```
BatchNumber, ManufacturedAt, ExpiresAt
QuantityReceived, QuantityAvailable
PurchaseRate          actual rate paid for this batch
GstPercentage         copied from product at inward time (historical accuracy)
InwardDate, SupplierName, SupplierInvoiceNo
IsQuarantined, IsWrittenOff
```

**Integration Events:**

```
Consumed:  OrderConfirmed  → reserve stock
           OrderCancelled  → unreserve stock (saga compensation)
Published: StockReadyForDispatch, StockReservationFailed
```

---

### 6.6 Dispatch Module

**Owns:** Dispatch queue, consignment notes, delivery tracking

**Consignment Note fields:**

```
OrderId, CarrierName, DocketNumber, BoxCount, Weight
DispatchDate, ExpectedDeliveryDate, Status
```

**Status:** Pending → Dispatched → InTransit → Delivered / Failed

---

### 6.7 Identity Hierarchy (Organizational Structure)

Two mechanisms combine per tenant:

**Role hierarchy** — `Role.HierarchyLevel` (int 0–99). Lower = higher rank. Seeded levels (gaps of 10 allow custom roles to slot in):

| Role                                 | Level |
| ------------------------------------ | ----- |
| Company Owner                        | 0     |
| Administrator / Office Administrator | 10    |
| Senior Manager                       | 20    |
| Sales/Purchase/Dispatch/HR Manager   | 30    |
| Sales/Purchase/Dispatch/HR Executive | 40    |
| Office Executive                     | 50    |

**Reporting chain** — `User.ReportsTo` (nullable `UserId` FK, self-referential). Single manager per user (no matrix reporting Phase 1). `IUserHierarchyQueries` returns subordinate IDs, direct reports, management chain via recursive CTE.

**Visibility rule** (application-layer, NOT RLS):

- Users see tasks/leads assigned to themselves + their subordinate subtree
- Task assignment requires `assignerLevel < assigneeLevel`
- Manager query filters: `.Where(x => visibleUserIds.Contains(x.AssignedToUserId))` where `visibleUserIds = subordinates ∪ {currentUser}`

**Orphan handling on deactivation:**

- Default: block deactivation if user has active subordinates → `Result.Failure(UserErrors.HasSubordinates)`
- Force flag: cascade subordinates to user's manager (grandparent); if none, set `ReportsTo = null`; raise `UserHierarchyCascadedDomainEvent`

### 6.8 Tasks Module (Work Items)

`WorkItem` is the single aggregate — manual or auto-created task assigned to a user.

- **Types:** Manual, CallbackReminder, ReorderReminder, FollowUp, Custom
- **Priorities:** Low, Medium, High, Urgent
- **State machine:** Pending → InProgress → Completed | Overdue | Cancelled

**Key features:**

- Auto-creation from CRM/Orders integration events (callback windows, mature-lead reorder reminders)
- Auto-completion via source-entity tracking (e.g. `CallLogCreatedIntegrationEvent` auto-completes the matching CallbackReminder)
- Bulk assignment via `BatchId` — manager creates N tasks at once, one per assignee
- Hierarchy-gated assignment per §6.7 visibility rule
- Overdue detection every 15 minutes; publishes integration event for notification
- Dashboard: Today / Upcoming / Overdue / CompletedToday / TotalPending per user or team

**Purge:** Completed + Cancelled delete after 3 months (daily 03:00 UTC).

### 6.9 Notifications Module

Separate bounded context, Marten document store. Notifications are cross-module alerts — persistent, real-time pushable, user-scoped.

**Subscriber-decides pattern** (Udi Dahan): the Notifications module subscribes directly to other modules' integration events and decides the notification content + recipient. Publishers don't know about notifications.

**Event subscriptions:**

| Source event                                       | Recipient                             | Content                                      |
| -------------------------------------------------- | ------------------------------------- | -------------------------------------------- |
| `LeadAssignedIntegrationEvent` (CRM)               | Assigned user                         | "Lead {Contact} ({City}) assigned to you"    |
| `OrderConfirmedIntegrationEvent` (Orders)          | Order creator                         | "Order {InvoiceNumber} confirmed"            |
| `WorkItemAssignedIntegrationEvent` (Tasks)         | Assigned user                         | "Task '{Title}' assigned, due {Date}"        |
| `WorkItemOverdueIntegrationEvent` (Tasks)          | Assigned user + management chain      | "Task overdue" / "Subordinate task overdue"  |
| `UserHierarchyCascadedIntegrationEvent` (Identity) | Tenant group (push-only, admin alert) | "{N} team members reassigned to new manager" |
| `UserDeactivatedIntegrationEvent` (Identity)       | Tenant group (push-only)              | "A user has been deactivated"                |

**Deduplication:** 5-minute window on `(RecipientUserId, SourceEntityType, SourceEntityId, Category)` prevents duplicates from at-least-once delivery.

**Storage:** Marten document store, `notifications.*` schema, conjoined tenancy via Wolverine.Marten's `OutboxedSessionFactory` reading `MessageContext.TenantId` (per `multi-tenancy.md` "Marten session tenancy" Path C).

**Purge:** read after 7 days, unread after 30 days (daily 02:00 UTC).

**Endpoints:**

- `GET /api/v1/notifications` — paginated list (newest first)
- `GET /api/v1/notifications/unread-count` — badge count
- `PUT /api/v1/notifications/{id}/read` — mark one
- `PUT /api/v1/notifications/read-all` — mark all
- `DELETE /api/v1/notifications/{id}` — delete one

### 6.10 Real-Time Push (SignalR)

`IRealTimePusher` (`BuildingBlocks.Application.Contracts`) — modules push without knowing about SignalR:

```csharp
Task PushToUserAsync(Guid userId, string eventName, object payload, CancellationToken ct);
Task PushToTenantAsync(Guid tenantId, string eventName, object payload, CancellationToken ct);
```

`SignalRPusher` + `LeadKartHub` (`[Authorize]`, joins `user-{id}` + `tenant-{id}` groups on connect) in API host.

**Events:** notification received, notification count updated, marketplace lead added, task assigned. Blazor subscribes on connect; backend fires pushes after domain state changes.

**Backpressure:** `SendAsync` is fire-and-forget. Disconnected = lost — acceptable because state is persisted before push (client fetches on reconnect/page load), with unread-count polling as fallback.

---

## 7. Cross-Cutting Concerns

### 7.1 Integration Events Flow

The full publisher/consumer map is owned by `CLAUDE.md` (Integration Event Map) — see also each module's §6 listing. Modules reference only the publisher's `IntegrationEvents` project (compile-time contracts); never Domain, Application, or Infrastructure.

### 7.2 Messaging Reliability

- **Outbox:** Integration events persisted in Wolverine outbox in the same transaction as business data. Delivered asynchronously. Survives crashes.
- **Inbox:** Wolverine inbox deduplicates incoming messages.
- **At-least-once delivery:** All integration event handlers MUST be idempotent.
- **Error policy:** narrow-catch retries with cooldown → dead letter queue → Serilog alert. Full rules: `.claude/rules/messaging.md`.
- **Saga:** `OrderFulfillmentSaga` (Wolverine `Saga<T>`) coordinates multi-module flows with compensating actions on cancellation.

### 7.3 Security

- JWT blacklist in Redis — checked on every authenticated request
- SecurityStamp rotates on: password change, role change, permission grant/revoke, email change, logout-all
- Account lockout after N failed attempts (per PasswordPolicy on TenantSettings)
- Password policy per tenant
- PostgreSQL RLS as second enforcement layer
- Tenant filter **fails closed** — unresolved tenant = exception, never bypass
- Redis commands pipelined into single round trip per request (blacklist + permissions + tenant cache)
- MFA / step-up: deferred until product is live with 100s of paying clients (no scaffolding pre-launch). See `.claude/rules/security.md`.

**RLS bypass for non-request contexts:**

- EF Core migrations: owner connection (RLS bypassed)
- Data seeding: owner connection
- Background jobs: explicit tenant context per iteration
- Integration event handlers: `TenantContextMiddleware` reads `ITenantScopedMessage` and sets via `ITenantSetter`

### 7.4 Data Storage Strategy Per Module

Single PostgreSQL database. Each module uses the storage mode that fits its data.

| Module                             | Store                 | JSONB                                         | Reasoning                                        |
| ---------------------------------- | --------------------- | --------------------------------------------- | ------------------------------------------------ |
| Identity                           | EF Core               | Permissions[], PasswordHistory, LoginHistory  | Relational, security-critical                    |
| Platform                           | EF Core               | Call outcome details, supplementary lead data | Marketplace filtering needs indexed columns      |
| CRM                                | EF Core               | Lead `extra_profile`                          | Heavy filtering, dashboard aggregations          |
| Orders                             | Marten event store    | —                                             | State machine, revision history, financial audit |
| Inventory                          | EF Core               | Product `attributes` (vary by DosageForm)     | Stock consistency, FEFO, batch tracking          |
| Dispatch                           | EF Core               | —                                             | Simple CRUD                                      |
| Tasks                              | EF Core               | —                                             | Simple state machine, filter-heavy               |
| Notifications                      | Marten document store | —                                             | Read-mostly, no transitions worth replaying      |
| Audit Log                          | Marten document store | —                                             | Variable payload, append-only (BuildingBlocks)   |
| Cache + JWT blacklist + rate limit | Redis                 | —                                             | Per-request                                      |
| PDFs / Excel exports               | Azure Blob Storage    | —                                             | Binary, never queried                            |

**JSONB rule:** never in WHERE clauses. Filter columns become indexed SQL columns. `ProductRanges[]` is `text[]` with GIN — not JSONB.

---

## 8. Technical Architecture

### 8.1 Pattern

**Modular Monolith + Clean Architecture + CQRS + Event-Driven**

Reference: kgrzybek/modular-monolith-with-ddd (13.5k stars, canonical .NET DDD reference)

**Three unbreakable rules:**

1. Modules NEVER reference each other's internals — only IntegrationEvents projects
2. Each module owns its own DbContext and PostgreSQL schema — no cross-schema EF Core joins
3. API project is a thin host — zero business logic

### 8.2 Module Structure (5 projects per module)

```
src/Modules/{Name}/
├── LeadKart.Modules.{Name}.Domain\
├── LeadKart.Modules.{Name}.Application\
├── LeadKart.Modules.{Name}.Infrastructure\
├── LeadKart.Modules.{Name}.IntegrationEvents\
└── LeadKart.Modules.{Name}.Endpoints\
```

### 8.3 Solution Structure

```
D:\Development\LeadKart\
├── LeadKart.slnx
├── BRD.md
├── CLAUDE.md
├── Directory.Build.props
├── Directory.Packages.props
├── .claude\rules\
│
├── src\
│   ├── BuildingBlocks\
│   │   ├── LeadKart.BuildingBlocks.Domain\
│   │   ├── LeadKart.BuildingBlocks.Application\
│   │   └── LeadKart.BuildingBlocks.Infrastructure\        (incl. ReferenceData/)
│   ├── Modules\
│   │   ├── Identity\        (5 projects)
│   │   ├── Platform\        (5 projects)
│   │   ├── Crm\             (5 projects)
│   │   ├── Orders\          (5 projects)
│   │   ├── Inventory\       (5 projects)
│   │   ├── Dispatch\        (5 projects)
│   │   ├── Tasks\           (5 projects)
│   │   └── Notifications\   (5 projects)
│   ├── LeadKart.Api\
│   ├── LeadKart.AppHost\
│   ├── LeadKart.MigrationRunner\
│   ├── LeadKart.Web\
│   └── LeadKart.Web.Client\
│
└── tests\
    └── Modules\               (Domain.Tests, Application.Tests, Infrastructure.Tests per module)
```

### 8.4 Tech Stack

**Backend**

| Package                         | Purpose                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| .NET 10                         | Runtime                                                                                                |
| WolverineFx                     | CQRS + messaging + outbox                                                                              |
| Wolverine.Postgresql            | PostgreSQL transport + outbox                                                                          |
| EF Core + Npgsql provider       | ORM                                                                                                    |
| Marten + Wolverine.Marten       | Event sourcing (Orders), audit log, saga persistence                                                   |
| FluentValidation                | Command validation                                                                                     |
| Riok.Mapperly                   | DTO mapping (source generator, AOT-safe)                                                               |
| Carter                          | Minimal API modules                                                                                    |
| Scalar.AspNetCore               | API documentation                                                                                      |
| Serilog.AspNetCore              | Structured logging                                                                                     |
| OpenTelemetry                   | Distributed tracing                                                                                    |
| Isopoh.Cryptography.Argon2      | Argon2id password hashing. BCrypt only for legacy verify-and-rehash-on-login — never new BCrypt hashes |
| System.IdentityModel.Tokens.Jwt | JWT                                                                                                    |
| StackExchange.Redis             | Cache + blacklist                                                                                      |

> Versions live in `Directory.Packages.props` — the single source of truth.

**Frontend**

| Package                | Purpose                          |
| ---------------------- | -------------------------------- |
| Blazor Web App .NET 10 | UI framework                     |
| MudBlazor              | Component library (only library) |
| Blazor-ApexCharts      | Charts                           |
| Blazicons.Lucide       | Icons                            |
| Blazored.LocalStorage  | Client storage                   |

**Infrastructure**

| Service                             | Purpose                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------ |
| Azure Container Apps, Central India | API + Web hosting                                                        |
| Azure Database for PostgreSQL 16    | Primary database                                                         |
| Wolverine + PostgreSQL outbox       | Cross-module events. Kafka pinned as future broker swap; not used today. |
| Upstash Redis, Mumbai               | Cache, blacklist, rate limiting                                          |
| Azure Blob Storage                  | PDFs, Excel, images                                                      |

**Testing**

| Package                   | Purpose                      |
| ------------------------- | ---------------------------- |
| xUnit + Shouldly          | Test framework + assertions  |
| NSubstitute               | Mocking                      |
| Bogus                     | Test data generation         |
| Testcontainers.PostgreSql | Integration test database    |
| Respawn                   | Database reset between tests |
| NetArchTest.Rules         | Architecture enforcement     |

### 8.5 Database Schemas

```
identity.*       Tenants, Persons, PersonCredentials, TenantMemberships, Roles, RoleAssignments,
                 RefreshTokenFamilies, RefreshTokens, AuthRouting, AuthRoutingMembership
tasks.*          WorkItems
notifications.*  Notification documents (Marten)
platform.*       UnverifiedContacts, VerificationCalls, PlatformLeads, LeadCredits   (planned)
crm.*            CrmLeads, CallLogs, Reminders, AssignmentHistory                    (planned)
orders.*         Marten event streams + projections                                   (planned)
inventory.*      Products, ProductBatches, StockMovements                             (planned)
dispatch.*       DispatchRecords, ConsignmentNotes                                    (planned)
shared.*         Pincodes (read-only, owned by BuildingBlocks/Infrastructure/ReferenceData)
buildingblocks.* AuditLog (Marten document, cross-cutting)
app.*            current_tenant() / is_platform() LEAKPROOF GUC wrappers + command_idempotency
wolverine.*      Outbox / Inbox / saga storage — Wolverine-managed, never touch
```

---

## 9. Coding Standards

> Full doctrine: `.claude/rules/coding-standards.md` (SOLID, Object Calisthenics as kata, Result pattern, banned constructs). This section captures only the BRD-level commitments.

- **SOLID** — Domain and Application have zero infrastructure dependencies. `ICurrentTenant` (read) and `ITenantSetter` (write) are separate interfaces.
- **Object Calisthenics** — applied as kata, not gospel. See `.claude/rules/coding-standards.md` for thresholds and carve-outs.
- **Result pattern** — Application command/query handlers return `Result<T>` (or `UnitResult<Error>`) for expected business failures. Infrastructure failures throw. Programming errors guard via `ArgumentNullException.ThrowIfNull`.
- **No magic strings** — all constants in typed static classes (production AND tests).
- **Permissions-first** — `HasPermission("crm.leads.reassign")` never `role == "SalesManager"`.
- **Fail closed** — security defaults deny, never allow.
- **TDD** — RED first, always (`.claude/rules/tdd.md`).
- **No raw `Guid`/`string`/`decimal` in domain** — strongly-typed IDs and VOs throughout.

---

## 10. Frontend

- **Render mode:** InteractiveAuto — SSR on first load, progressive enhancement to WASM.
- **Theme:** Domiex design language via MudBlazor components. Primary colour per tenant from `TenantBranding.PrimaryColour` (hex). Dark/Light mode toggle.

> Status: Design pending — needs dedicated session before implementation.

---

## 11. Open Items

| Item                                                                    | Status                                  | Priority |
| ----------------------------------------------------------------------- | --------------------------------------- | -------- |
| ProductRanges — more entries                                            | Pending from business                   | High     |
| DosageForms — more entries                                              | Pending from business                   | High     |
| Domiex Blazor theme design                                              | Not started — needs dedicated session   | High     |
| Email notifications (welcome, password reset)                           | Phase 1                                 | High     |
| Drug licence type and number on lead                                    | Phase 2                                 | Low      |
| MARG integration                                                        | Phase 2                                 | Low      |
| Gmail/OAuth login                                                       | Architecture ready, Phase 2             | Low      |
| Subscription tiers                                                      | Phase 2                                 | Low      |
| Custom tenant roles                                                     | Phase 2                                 | Low      |
| Bulk user import                                                        | Architecture ready, Phase 1             | Medium   |
| Bulk lead upload (Platform CSV/Excel with validation + error reporting) | Phase 1                                 | High     |
| Bulk product/batch upload (Inventory CSV/Excel)                         | Phase 1                                 | Medium   |
| Audit log viewer UI                                                     | Phase 1                                 | Medium   |
| Per-tenant invoice number sequences                                     | Phase 2 (Phase 1 uses global sequences) | Low      |
| MFA / step-up auth                                                      | Post-launch (100s of clients trigger)   | Low      |

---

## Appendix A — Architecture Decisions

### ADR-001: Modular Monolith over Microservices

Solo dev, Phase 1. Module boundaries clean enough for later extraction. Wolverine carries the messaging infrastructure needed for eventual split.

### ADR-002: Separate Projects per Module Layer

Compile-time enforcement of dependency direction. Domain cannot import EF Core. Application cannot import Argon2. The compiler prevents violations before tests run.

### ADR-003: WolverineFx over MediatR

Wolverine handles in-process CQRS, outbox, broker transports (Kafka/RabbitMQ when needed), and PostgreSQL persistence in one library. MediatR requires separate libraries for each concern; archived by author 2024.

### ADR-004: Custom JWT over Microsoft Identity

Microsoft Identity forces table structures incompatible with the multi-tenant schema-per-module design. Custom JWT gives full control over claims and permission embedding.

### ADR-005: Permissions-First Authorization

Role/permission changes are data changes, not code changes. Phase 2 custom roles require zero code modification.

### ADR-006: Result Pattern for Application Layer

Expected business failures aren't exceptional. Result makes failure paths explicit in signatures, eliminating control flow via exceptions.

### ADR-007: Pincode Data — Seed PostgreSQL

India Post pincode data seeded to `shared.pincodes`. Local lookups, no external API — zero cost, zero latency, works offline. StateCode stored for GST cross-validation.

### ADR-008: GST/PAN Cross-Validation Local

PAN embedded in GSTIN positions 3–12 — same-entity check is local. External GSTIN API (knowyourgst.com) only for Active/Cancelled status on Lead Agent verification.

### ADR-009: HTTP Everywhere (No gRPC in Phase 1)

External endpoints HTTP/REST via Carter. Inter-module is in-process via Wolverine. gRPC adds zero value in a modular monolith with a Blazor frontend; auth is HTTP-native. gRPC only relevant on microservice extraction (Phase 3+).

### ADR-010: Order Fulfillment Saga for Cancellation

Order cancellation requires compensating actions across modules (unreserve stock, cancel invoice, issue credit note, cancel consignment). Wolverine `Saga<T>` tracks fulfillment state and fires the correct compensating events. Outbox+inbox alone handle reliable delivery, not coordination. Saga state persisted in Marten alongside event streams in the `orders` schema.

### ADR-011: Data Storage Strategy — EF Core Default, Marten for Orders + Audit + Notifications

EF Core is the default. Marten event sourcing for Orders (state machine, revision history, financial audit). Marten document store for Audit Log and Notifications (variable payload / read-mostly). JSONB columns for variable-shape non-queryable data inside EF Core entities.

### ADR-012: IntegrationEvents as Compile-Time Contracts

Consuming modules reference the publisher's IntegrationEvents project directly. Compile-time safety — event shape changes surface as build errors. Projects contain only data records, no framework dependencies (`IntegrationEventsHygieneTests` enforces). On microservice extraction, swap ProjectReference for PackageReference with zero code changes.

### ADR-013: Marten Native Multi-Tenancy (Not RLS)

EF Core modules use `RowLevelSecurityConnectionInterceptor` + RLS policies. Marten manages its own connections — RLS never fires. Tenancy resolution is owned by Wolverine.Marten's `OutboxedSessionFactory` (registered by `IntegrateWithWolverine()`) which reads `MessageContext.TenantId` and opens `store.LightweightSession(tenantId)` natively — Marten conjoined tenancy then appends `WHERE tenant_id = '...'` per query. Hangfire jobs / non-Wolverine paths use explicit `store.LightweightSession(tenantId)`. Stream ID format: `Order-{orderId}` — no tenant prefix needed. Per `multi-tenancy.md` "Marten session tenancy" Path C.

### ADR-014: Invoice Numbering via PostgreSQL Sequences — Never Delete, Never Reuse

Under GST (GSTR-1) invoice numbers must be sequential and gapless within a financial year. Three immutable series:

- `INV/YYYY-YY/{seq}` — Invoice. Never cancelled or reused.
- `CN/YYYY-YY/{seq}` — Cancellation Note (invoice cancelled before delivery).
- `CDN/YYYY-YY/{seq}` — Credit Note (invoice reversed after delivery).
  Numbers generated by PostgreSQL sequences (`nextval`), not application code — gapless under concurrency. Cancelled invoices soft-deleted with `InvoiceCancelled` event on the stream. Phase 1 uses global sequences; Phase 2 per-tenant sequences.

### ADR-015: Optimistic Concurrency — Retry on Conflict

Aggregates use PostgreSQL `xmin` via EF Core. On `DbUpdateConcurrencyException`, Wolverine retries the handler pipeline once. Persistent failures return `Result.Failure(ConcurrencyErrors.Conflict)` → HTTP 409. Applies to: `LeadCredit`, `ProductBatch`, `User`.

---

## Appendix B — Location, GST and PAN Intelligence

### B.1 Pincode Data

Source: India Post directory (data.gov.in). Seeded to `shared.pincodes`, queried locally — no external API. On pincode entry, auto-populate City, District, State, StateCode (2-digit GST state code).

`Address` VO: `PinCode, City, District, State, StateCode, Street (optional)`.

### B.2 GSTIN Structure and Validation

```
Format: {StateCode:2}{PAN:10}{EntityNo:1}{Z:1}{CheckDigit:1}
Example: 27AABCU9603R1ZV   (27 = Maharashtra, AABCU9603R = embedded PAN)
```

Local: regex + checksum. External API only for Active/Cancelled status on Lead Agent verification.

### B.3 PAN Structure

```
Format: {Alpha:3}{TaxpayerType:1}{NameChar:1}{Numeric:4}{CheckChar:1}
TaxpayerType: P=Individual, C=Company, H=HUF, F=Firm, T=Trust
```

### B.4 GST–PAN Cross-Validation

PAN embedded in GSTIN positions 3–12 — same-entity check is local, no API. StateCode from GSTIN cross-checks against pincode-derived state.

---

## Appendix C — Pharma Product Data

### C.1 Dosage Forms

```
Tablets, Capsules, Soft Gel Capsules, Syrups, Dry Syrups, Suspensions,
Drops, Ointments, Creams, Gels, Lotions, Injections, IV Fluids,
Eye Drops, Nasal Sprays, Inhalers, Powders, Sachets, Patches, Suppositories
```

### C.2 Drug Schedules (for Product Master — Inventory Module)

| Schedule      | Meaning                                                                         | Phase 1 Impact     |
| ------------- | ------------------------------------------------------------------------------- | ------------------ |
| OTC           | No prescription needed                                                          | No restriction     |
| Schedule H    | Prescription required (antibiotics, antihypertensives, antidiabetics, steroids) | Informational flag |
| Schedule H1   | High-risk subset (specific antibiotics, anti-TB)                                | Informational flag |
| Schedule X    | Narcotics/psychotropics — Form 20F/20G licence                                  | Dispatch warning   |
| Schedule C/C1 | Biologicals (insulin, vaccines, cold chain)                                     | Dispatch warning   |
| NotApplicable | Nutraceuticals, Ayurvedic, cosmetics                                            | No restriction     |

Phase 1: informational only. Phase 2: hard enforcement.

### C.3 Product Ranges / Therapeutic Ranges

`ProductRanges` (leads) and `ProductCategory` (inventory products) draw from the same open extensible list — string constants, not enums. Confirmed: General, Gynaecology, Paediatrics, Diabetic, Cardiac, Ortho, Nephrology. More to be added as received from business.

### C.4 Product Types / Dosage Forms

`DosageForms` (leads) and `ProductType` (inventory) are open extensible lists. Confirmed: Tablet, Capsule, Syrup, Ointment, Dry Syrup, Protein Powder. More to be added as received from business.

### C.5 ProductCategoryGstDefault Table

Stored in `shared.*` schema, owned by `BuildingBlocks/Infrastructure/ReferenceData/`. Seeded at migration. Editable by SuperAdmin.

| Category       | Default GST % |
| -------------- | ------------- |
| General        | 12%           |
| Gynaecology    | 12%           |
| Paediatrics    | 12%           |
| Diabetic       | 12%           |
| Cardiac        | 12%           |
| Ortho          | 12%           |
| Nephrology     | 12%           |
| Ayurvedic      | 12%           |
| Nutraceuticals | 18%           |

These are defaults only. Every product stores its own explicit `GstPercentage` which can differ from the category default.

---

_End of Document — Version 3.0_
