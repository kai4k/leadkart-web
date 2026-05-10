# leadkart-web — docs/

> **These are MIRRORS, not source of truth.** Canonical product + architecture docs live in [`d:/Development/leadkart-go/`](../../leadkart-go/) and (for product depth) [`d:/Development/LeadKart/`](../../LeadKart/) (.NET reference).
>
> This folder exists so frontend work can be done without alt-tabbing into a sibling repo every time. If a doc here diverges from the source repo, **the source wins** — re-mirror this folder when leadkart-go's docs evolve.

## What's here

| File                                                                         | Mirrored from            | Purpose                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`BRD.md`](./BRD.md)                                                         | `leadkart-go/BRD.md`     | Quick-context business spec. Points to the .NET reference for the substantive feature inventory.                                                                                                                                                        |
| [`reference/dotnet-BRD.md`](./reference/dotnet-BRD.md)                       | `LeadKart/BRD.md` (.NET) | The substantive Business Requirements Document — actor + role tables, lead model, marketplace filters, CRM stages, dispatch model. Read this when you need to know what something does.                                                                 |
| [`adr/0006-multi-tenancy-rls.md`](./adr/0006-multi-tenancy-rls.md)           | `leadkart-go/docs/adr/`  | Multi-tenant isolation via Postgres RLS + `SET LOCAL app.tenant_id`. Why every API call carries a tenant context; how Platform-tier reads bypass it.                                                                                                    |
| [`adr/0033-tenant-context-package.md`](./adr/0033-tenant-context-package.md) | `leadkart-go/docs/adr/`  | How tenant ID flows through the request — JWT claim → middleware → context → pgxpool `AfterAcquire`. Frontend equivalent: JWT decode → session principal.                                                                                               |
| [`adr/0036-permission-model.md`](./adr/0036-permission-model.md)             | `leadkart-go/docs/adr/`  | Three-layer permission model: closed-set catalog + Role aggregate + per-Membership overlay. SuperUser short-circuit + `is_platform` claim semantics. Frontend uses `principal.permissions[]` + `isPlatform` + `isSuperUser` for route/component gating. |

## Frontend-specific implications

The mirrored docs describe the SYSTEM. Below is how each maps to FE design decisions.

### Two user populations → two route hierarchies

Per [`reference/dotnet-BRD.md` §3](./reference/dotnet-BRD.md):

| Population                              | Where they live   | JWT claims                                                     | UI surfaces they get                                                                        |
| --------------------------------------- | ----------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Platform team** (LeadKart internal)   | "platform" tenant | `is_platform: true`, SuperAdmin also has `is_super_user: true` | Operator dashboard, tenant management, marketplace ops, verification queue, impersonation   |
| **Tenant users** (pharma company staff) | Their own tenant  | `is_platform: false`                                           | Tenant dashboard variants by role, CRM, orders, inventory, dispatch, tasks, tenant settings |

The frontend MUST branch on `session.principal.isPlatform` at the layout / nav / dashboard levels. The current `(app)/+layout.ts` only gates on `isAuthenticated` — extending this to surface-tier routing is the work tracked under `feat/role-aware-shell`.

### Permission catalogue is closed

Per [`adr/0036`](./adr/0036-permission-model.md): permissions are server-validated against a closed catalog (`permission.IdentityPermissions`). The JWT carries the resolved set as a multi-valued `permission` claim. Frontend reads `principal.permissions[]` and pattern-matches against catalogue strings.

**Frontend rule:** Never invent permission names. Either consume them as configuration from leadkart-go (e.g. via a `GET /api/v1/permissions` enumeration endpoint when that ships), or reference the constants documented in the ADR (`identity.tenants.update`, `identity.users.create`, …, `tenant.admin`).

### SuperUser short-circuit

Per ADR 0036: any check `hasPermission(principal, name)` MUST short-circuit to `true` when `principal.isSuperUser === true`. The backend does this in middleware; the frontend does the same in `lib/features/auth/tier.ts`.

### Tenant context flows from JWT

Per [`adr/0033`](./adr/0033-tenant-context-package.md) + [`adr/0006`](./adr/0006-multi-tenancy-rls.md): tenant ID is encoded as a custom claim on the access token. The frontend extracts it via `lib/api/jwt.ts decodeJwtPrincipal()` at login and refresh, persists it on the session principal, and uses it to construct tenant-scoped URLs (e.g. `/v1/tenants/{tenantId}/...`).

Platform-tier reads cross-tenant; tenant-tier reads are RLS-isolated server-side. The frontend never has to enforce isolation — server does.

## When to update

When a leadkart-go BRD revision lands, the `.NET BRD` is updated, or a new relevant ADR is accepted, re-mirror into this folder:

```bash
cp d:/Development/leadkart-go/BRD.md docs/BRD.md
cp d:/Development/leadkart-go/docs/adr/<filename> docs/adr/
cp d:/Development/LeadKart/BRD.md docs/reference/dotnet-BRD.md
```

Then commit with `chore(docs): re-mirror <files> from leadkart-go (HEAD <sha>)`.
