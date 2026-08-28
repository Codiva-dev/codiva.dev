# Releases: GitHub CI → preview Vercel → QA Codiva → producción

## Flujo

1. Código llega a **`main`** (o vive en `preview/*` / PR). No promover deploys dirty ni de `main` directo.
2. GitHub Actions: lint/typecheck/test. En `main` verde, CI adelanta `preview/ops-release` y dispara el mismo workflow ahí (`GITHUB_TOKEN` no dispara CI al mover la ref). En esa rama (y otras ≠ `main`) el job `preview` publica Vercel + alias `*-git-*`.
3. Codiva Ops → Proyecto → **Releases** lista previews READY (sin dirty, un ítem por SHA, sin ya promovidos).
4. Ops prueba la URL (bypass de protección si aplica).
5. Admin/PM: **Aceptar y mandar a producción** (rebuild con env Production). El preview de origen se borra de Vercel/Incoming.
6. El cliente en Portal → Tu sitio solo ve historial.

### Atajos en Ops

| Acción | Qué hace |
|--------|----------|
| **Preparar release** | Apunta `preview/ops-release` al tip de `main` → CI genera preview limpio |
| **Limpiar basura** | Borra dirty (`cursor-cli` / `gitDirty`) y previews >7 días |
| **Descartar** | Borra un preview concreto en Vercel |

## Convención de ramas

- `main` - integración; CI **no** publica Incoming. Si el job está verde, adelanta `preview/ops-release` y hace `workflow_dispatch` (el push con `GITHUB_TOKEN` no crea un run).
- `preview/ops-release` - staging de QA (auto desde `main`, o **Preparar release** en Ops).
- Otras `preview/*` o PRs - trabajo en curso.

No desplegar working trees sucios a Vercel (deploys con `gitDirty` / actor `cursor-cli` se ocultan y se pueden limpiar).

## Lo que Codiva ya hace

- Panel Ops (admin/PM) + historial de solo lectura en el portal.
- Lista previews READY desde Vercel (filtros dirty/dedupe/promovidos) o GitHub.
- Promote por API de Vercel (borra el preview de origen) o workflow GitHub de respaldo.
- Tablas `project_release_settings` / `project_release_requests`.
- Plantillas: `docs/workflows/preview.yml` y `docs/workflows/promote-production.yml`.

## Setup

### 1. SQL en Supabase (editor)

1. `supabase/migrations/20260818230000_project_release_pipeline.sql`
2. `supabase/migrations/20260819093000_release_vercel_previews.sql`
3. `supabase/migrations/20260819101500_nirc_enable_releases.sql` (activa NIRC)

### 2. Secretos en Vercel del proyecto **Codiva**

`GITHUB_RELEASES_TOKEN` (Production + Preview): **Actions Write**, **Deployments Read**, **Contents Read/Write** (para Preparar release), **Checks Read**, **Pull requests Read/Write**.

**`VERCEL_RELEASES_TOKEN`:** [https://vercel.com/account/tokens](https://vercel.com/account/tokens) → Create → scope team **Codiva** → `vercel env add VERCEL_RELEASES_TOKEN production preview development` en **codiva-dev** → redeploy.

### 3. Repo del cliente (ej. NIRC)

- `.github/workflows/ci.yml` - CI; preview si ≠ `main`; en `main` verde sincroniza `preview/ops-release`
- `.github/workflows/promote-production.yml` - respaldo promote
- Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

### 4. Vercel del sitio cliente

Sin auto-deploy a **Production** en `main`. Producción solo desde Codiva.

NIRC: `prj_GGlesi8OSxDAxabWGHH53coejcRC` · team `codiva-dev` · root `apps/web`.

**Protection Bypass for Automation** en el proyecto cliente → Codiva arma el enlace con `?x-vercel-protection-bypass=…` en Ops.

### 5. Probar

1. En Ops: **Preparar release** (o push a `preview/*`).
2. CI verde → preview con alias git.
3. Abrir, QA, **A producción**.
4. Incoming ya no muestra ese preview.
