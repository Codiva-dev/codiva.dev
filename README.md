# Codiva.dev

Sitio de Codiva, Ops interno, portal de clientes y bolsa de trabajo. Un solo repo Next.js; el host decide la superficie ([`docs/HOSTS.md`](./docs/HOSTS.md)).

```bash
npm install
npm run dev
```

Local: [http://localhost:3000](http://localhost:3000). Hosts opcionales (`ops.localhost`, `portal.localhost`, etc.) en `docs/HOSTS.md`.

## Árbol

| Ruta | Qué es |
|------|--------|
| `app/(marketing)` | Sitio público (`codiva.dev`) |
| `app/ops` | Staff, portal cliente (`/p/[slug]`), login, cotizaciones `/q` |
| `app/empleos` | Bolsa (`career.codiva.dev`) |
| `app/ticket` | Formulario de tickets |
| `lib/ops` | Dominio Ops (auth, portal, quotes, architecture, releases) |
| `lib/careers` | Bolsa, assessments, cacería |
| `components/ops` · `components/careers` | UI de esas superficies |
| `sections/` | Bloques del marketing (legado jsx) |
| `supabase/migrations` | Schema y copy de portal que ya está en producción |
| `supabase/seed.sql` | NIRC + Inquilia para local (`db reset`) |
| `public/client-packs/{slug}/` | Semilla de canvas / documentos de cliente |

## Packs de cliente

Convención (Inquilia es el modelo):

```text
public/client-packs/{slug}/
  arquitectura-portal.html      # canvas del cliente
  arquitectura-completa.html    # staff (opcional)
  …cotización, NDA, etc.        # otros artefactos, nombres propios
```

No prefixes el archivo con el slug: la carpeta ya lo nombra. El portal **no** sirve estos HTML en público (`/client-packs` se reescribe). Ops copia el pack a `deliverables.body_html` y ese HTML es lo que ve el cliente.

Seeds y migraciones deben apuntar a esas rutas. No dejes SQL one-shot en `docs/`.

## Docs

- [`docs/HOSTS.md`](./docs/HOSTS.md) - DNS, env, Auth, smoke test
- [`docs/OPS_SECURITY.md`](./docs/OPS_SECURITY.md) - storage, retención, crons
- [`docs/BRAND.md`](./docs/BRAND.md) - marca
- [`docs/RELEASES_PORTAL.md`](./docs/RELEASES_PORTAL.md) - CI → preview → promote
- [`docs/workflows/`](./docs/workflows/) - plantillas GitHub Actions para repos de cliente
