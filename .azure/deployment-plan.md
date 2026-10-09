# Azure Deployment Plan

> **Status:** Deployed — code-only release; no infrastructure or database migration

Generated: 2026-10-09

---

## 1. Project Overview

**Goal:** Prepare a reviewable, cost-conscious plan for the existing Kornet Express Logistics production app and the pending vehicle/container-link fix. Assess hosting improvements without changing production infrastructure or migrating production data.

**Path:** Modify existing Azure-hosted application

**Out of scope:** No infrastructure provisioning, App Service SKU/region change, database migration, or financial data changes. The user separately approved the code-only production release after reviewing this plan.

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

## 6.1 Current release scope — Billing usability and AR accuracy

This code-only release contains two frontend changes:

- Selectable data-grid rows respond to row clicks as well as the checkbox; grids without selection callbacks no longer display inactive checkboxes.
- Invoice Outstanding AR and overdue KPIs include only `POSTED` and `PARTIAL` invoices, excluding drafts from receivables totals.

No API, database schema, financial transaction, infrastructure, or Azure configuration changes are included. Unrelated local worktree changes must not be included in the release commit.

## All validation checks pass

- [ ] `npm run build` in `kornet-system/` passes TypeScript and Vite production build.
- [ ] `npm run build` in `kornet-system/server/` passes.
- [ ] Validate the Prisma schema using a local SQLite `DATABASE_URL`.
- [ ] Review only the two release files and confirm no financial data or backend behavior changed.
- [ ] Confirm the deployment workflow excludes database files and uses the existing production target.
- [ ] Read-only production health and dashboard endpoints respond successfully before release.
- [ ] Do not post, pay, issue, or otherwise mutate production finance records during validation.

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
- [x] Confirmed no infrastructure, database, SKU, or region changes were made
- [x] User separately approved the code-only production release

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
- [x] GitHub Actions run `37877654783` for commit `5472fe8f9f3feb17f4164a3868a00ef1a872e663` succeeded
- [x] Azure OneDeploy completed with status `4`; production health and dashboard returned HTTP 200
- [x] QA-only invalid and valid vehicle/container transitions verified after release

## 7. Validation Proof

The deployment-path assessment and code-only release have been validated. No Azure infrastructure, region, SKU, or database migration was performed.

| Check | Command or procedure | Result | Timestamp |
|-------|----------------------|--------|-----------|
| Frontend type-check and production build | `npm run build` in `kornet-system/` | Passed; existing chunk-size and mixed static/dynamic import warnings | 2026-10-09 |
| Backend compile | `npm run build` in `kornet-system/server/` | Passed locally; does not verify the live deployment | 2026-10-09 |
| Prisma schema | `npx prisma validate --schema prisma/schema.prisma` with a local SQLite URL | Valid | 2026-10-09 |
| App Service metadata | Azure App Service read-only query for `Kornet-Logistics-prod` | Running, Linux, Free tier, `westus3` | 2026-10-09 |
| Production health/dashboard | Read-only `GET /api/health` and `GET /api/dashboard/summary` | Both HTTP 200 on the currently deployed code; not verification of the pending patch | 2026-10-09 |
| Subscription policy | Azure Policy assignment list for confirmed subscription | No assignments returned | 2026-10-09 |
| Infrastructure/RBAC validation | Review planned resource changes and IaC | No IaC, Azure resources, or RBAC changes are planned; not applicable | 2026-10-09 |
| Production vehicle/container-link workflow | `POST /api/vehicles/:id/link-to-container` followed by `GET` verification of vehicle/container | Vehicle 002 returned HTTP 409 with no mutation; vehicle 001 linked successfully and totals reconciled; duplicate link returned HTTP 409 without changing totals | 2026-10-09 |
| Production endpoint | Read-only `GET /api/health` and `GET /api/dashboard/summary` | Deployed app is running; both returned HTTP 200 at `https://kornet-logistics-prod-b6hweub8gzc9cxej.westus3-01.azurewebsites.net` | 2026-10-09 |

## References

- [Microsoft Learn: App Service plans](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans)
- [Microsoft Azure: App Service pricing for Linux](https://azure.microsoft.com/en-us/pricing/details/app-service/linux/)
- [GitHub Actions deployment workflow](../.github/workflows/azure-deploy.yml)
