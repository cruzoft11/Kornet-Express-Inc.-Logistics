# Azure Deployment Plan

> **Status:** Validated — deployment-path plan only; no production deployment or infrastructure change has occurred

Generated: 2026-10-09

---

## 1. Project Overview

**Goal:** Prepare a reviewable, cost-conscious plan for the existing Kornet Express Logistics production app and the pending vehicle/container-link fix. Assess hosting improvements without changing production infrastructure or migrating production data.

**Path:** Modify existing Azure-hosted application

**Out of scope:** No infrastructure provisioning, App Service SKU/region change, database migration, production deployment, or financial data changes are approved by this plan.

## 2. Requirements

| Attribute | Value |
|-----------|-------|
| Classification | Production, customer-facing |
| Scale | Small, under 1,000 users |
| Budget | Cost-optimized; retain current hosting pending a reviewed business case |
| Subscription | `iSupply` (`68e1f88e-84cd-437c-8738-53152f4090ae`), confirmed by user |
| Location | `westus3`, confirmed by user; retain current production location |
| Compliance/data residency | No additional formal requirement known; retain existing residency |
| Architecture preference | Assess and recommend only; keep production unchanged |

Subscription-level Azure Policy assignments were queried; none were returned.

## 3. Components Detected

| Component | Type | Technology | Path |
|-----------|------|------------|------|
| Kornet web client | SPA | React 18, TypeScript, Vite | `kornet-system/` |
| Kornet API and static-file host | API/web server | Node.js 22, Express, Prisma | `kornet-system/server/` |
| Operations database | Relational persistence | SQLite through Prisma | `kornet-system/server/prisma/schema.prisma` |
| Financial ledger database | Relational persistence | SQLite through `node:sqlite` | `kornet-system/server/src/lib/fsLedger.ts` |

The production startup path backs up/prepares the SQLite database and runs Prisma schema synchronization before listening. The deployment bundle intentionally excludes `.db` files. The application uses `DATABASE_URL` and `ACCOUNTING_DB_PATH` to select its database paths.

Existing CI/CD is in `.github/workflows/azure-deploy.yml`. It builds the Vite client and Node backend with Node 22, packages both, and deploys via `azure/webapps-deploy@v3` using a GitHub publish-profile secret. Pushes to `main`/`master` and manual workflow dispatch trigger the workflow. No application `azure.yaml`, IaC under `infra/`, or app-owned Dockerfile was found; archived reference-project Dockerfiles are not part of this deployment.

## 4. Recipe Selection

**Selected:** Existing GitHub Actions deployment workflow; no infrastructure-as-code recipe for this code-only release.

**Rationale:** The app already runs in Azure App Service and has a working, repository-owned GitHub Actions pipeline. The requested scope adds no Azure resources. Replacing the pipeline with AZD, Bicep, or Terraform would expand scope and risk production unnecessarily.

## 5. Architecture

**Stack:** Existing Linux Azure App Service hosting a combined Vite SPA and Express API.

### Current Azure service

| Component | Azure Service | Current configuration |
|-----------|---------------|------------------------|
| Kornet web/API | Azure App Service (`Kornet-Logistics-prod`) | Linux, Free tier reported by Azure, `westus3`; currently running |
| Application data | SQLite database files | Paths supplied by app settings; production persistent-storage mapping must be verified before any future scaling or migration |

### Scope and recommendations

- **For the pending code fix:** preserve the existing App Service, GitHub workflow, database files, and region. Do not create resources or change plan capacity as part of this release.
- **Production availability:** Microsoft describes the Free plan as intended for trials, experimentation, and learning; it has no SLA and is not supported for production workloads. Treat this as a material operational risk, not an automatic authorization to spend. Compare a dedicated Basic plan for low-traffic compute with Standard or higher only if deployment slots, backups, autoscale, or other production controls are required. Retrieve a current West US 3 Linux quote before proposing any SKU change; no price estimate is approved here.
- **Database growth/reliability:** both the Prisma application store and the financial ledger use SQLite files. Before scale-out, multi-instance hosting, or sustained concurrent finance operations, design and test a managed-database migration and a backup/restore process. Do not put SQLite on shared storage or add instances without verifying locking, consistency, recovery, and connection semantics.
- **Release safety:** use a reviewed change and an explicit workflow dispatch or approved merge because pushes to `main` deploy directly. Preserve the workflow's DB-file exclusion and startup backup behavior. Replace the publish-profile deployment credential with federated GitHub-to-Azure identity in a separate, reviewed security change.
- **Observability:** verify health-check configuration, request/error telemetry, database backup success, and alerting before any availability claim. No monitoring resource is added by this plan.
- **Region:** keep `westus3`; no data-residency requirement or region migration was requested.

### Supporting services

No new Log Analytics, Application Insights, Key Vault, or managed-identity resources are included. Their current configuration was not verified in this assessment; evaluate them before any later modernization or security-hardening project.

## 6. Provisioning Limit Checklist

No Azure resources are planned for deployment by this review plan; the change under review is application code only. Therefore no subscription quota is consumed and quota checks are not applicable.

| Resource Type | Number to Deploy | Total After Deployment | Limit/Quota | Notes |
|---------------|-----------------|------------------------|-------------|-------|
| Azure resources (all types) | 0 | Unchanged | Not applicable | No provisioning, SKU change, or region change is in scope |
| Existing `Microsoft.Web/sites` target | 0 new | Existing app retained | Not applicable | `Kornet-Logistics-prod`; code deployment is not yet approved |

**Policy constraints:** No subscription-level policy assignments were returned for the confirmed subscription.

**Status:** No capacity change planned; no quota validation required for zero new resources.

## 7. Execution Checklist

### Phase 1: Planning
- [x] Analyze workspace and current App Service
- [x] Gather project classification, scale, budget, residency, and architecture preferences
- [x] Confirm subscription and location with user
- [x] Check subscription-level Azure Policy assignments
- [x] Scan application components and existing deployment workflow
- [x] Select the existing GitHub Actions path; no new resources
- [x] User approves this plan

### Phase 2: Execution
- [x] Confirmed no infrastructure, database, or production changes are authorized by this assessment scope
- [x] Any eventual code release requires separate approval

### Phase 3: Validation
- [x] Existing GitHub Actions validation steps:
  - [x] Run the frontend type-check and production build with `npm run build` in `kornet-system/`.
  - [x] Run the backend compile with `npm run build` in `kornet-system/server/`.
  - [x] Validate the Prisma schema with a local SQLite `DATABASE_URL`.
  - [x] Review the workflow triggers, bundle database-file exclusions, and startup script; do not trigger a deployment.
  - [x] Confirm read-only production health/dashboard endpoints return HTTP 200; this does not verify the pending patch.
  - [x] Confirm no IaC or RBAC changes are planned; static role review is not applicable.
- [x] Record validation proof and confirm production remains unchanged

### Phase 4: Deployment
- [ ] Not performed

## 7. Validation Proof

The deployment-path assessment is validated. The vehicle/container-link patch has not been deployed or validated against production. The checks below validate local code and the existing deployment target only; they do not constitute a production deployment or approval to change Azure resources.

| Check | Command or procedure | Result | Timestamp |
|-------|----------------------|--------|-----------|
| Frontend type-check and production build | `npm run build` in `kornet-system/` | Passed; existing chunk-size and mixed static/dynamic import warnings | 2026-10-09 |
| Backend compile | `npm run build` in `kornet-system/server/` | Passed locally; does not verify the live deployment | 2026-10-09 |
| Prisma schema | `npx prisma validate --schema prisma/schema.prisma` with a local SQLite URL | Valid | 2026-10-09 |
| App Service metadata | Azure App Service read-only query for `Kornet-Logistics-prod` | Running, Linux, Free tier, `westus3` | 2026-10-09 |
| Production health/dashboard | Read-only `GET /api/health` and `GET /api/dashboard/summary` | Both HTTP 200 on the currently deployed code; not verification of the pending patch | 2026-10-09 |
| Subscription policy | Azure Policy assignment list for confirmed subscription | No assignments returned | 2026-10-09 |
| Infrastructure/RBAC validation | Review planned resource changes and IaC | No IaC, Azure resources, or RBAC changes are planned; not applicable | 2026-10-09 |
| Production validation of pending patch | Not run | Requires a separately approved deployment | — |

## References

- [Microsoft Learn: App Service plans](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans)
- [Microsoft Azure: App Service pricing for Linux](https://azure.microsoft.com/en-us/pricing/details/app-service/linux/)
- [GitHub Actions deployment workflow](../.github/workflows/azure-deploy.yml)
