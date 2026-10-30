# Codiva.dev - seguridad de documentos

## Controles activos

- Bucket `ops-files` privado; acceso vía `/api/ops/file` (URL firmada 5 min)
- Bucket `job-application-cvs` privado; CVs de la bolsa vía `/api/ops/careers/cv` (URL firmada 5 min, solo admin)
- RLS Storage por proyecto
- SHA-256 por documento (`content_sha256`)
- Retención por proyecto (`document_retention_days`, default 365) → `retain_until` / `disposed_at`
- Bitácora de descarga (`file_access_log` + IP/UA) y `activity_log`
- Export compliance JSON por proyecto
- Escaneo antimalware opcional (ver abajo)
- Cabeceras HTTP en `next.config.ts`: CSP (`frame-ancestors 'none'`), HSTS, nosniff, Referrer-Policy, Permissions-Policy
- Rate limit de formularios públicos: memoria en local; Runtime Cache de Vercel en producción (compartido por región)
- Errores a Sentry si `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` están definidos (mismo DSN público). Sin clave, solo `console.error`

## Cron de retención

`GET /api/ops/cron/dispose-documents`  
Header: `Authorization: Bearer $CRON_SECRET`

Configura `CRON_SECRET` en el entorno. En Vercel Cron apunta a esa ruta diariamente.

También: staff → Documentos → **Ejecutar retención ahora**.

Recordatorio de cacería: `GET /api/ops/cron/hunt-nudge` cada hora (minuto 15, mismo `CRON_SECRET`). A las 48 h, si aprobaron criterio y aún no hay hallazgo del oficio, se envía un correo.

Recordatorio de CV: `GET /api/ops/cron/cv-nudge` cada hora (minuto 45, mismo `CRON_SECRET`). A las 48 h de un hallazgo del oficio, si aún no hay postulación, se envía un correo.

Recordatorio de agenda: `GET /api/ops/cron/calendar-nudge` cada 15 min (mismo `CRON_SECRET`). A las 24 h y a la 1 h de una entrevista o junta interna, se envía un correo con el `.ics`.

## Google Calendar (por staff)

Cada miembro de Ops puede ligar su cuenta en **Configuración → Google Calendar**. Ops hace push de juntas (`ops_calendar_events`) y entrevistas (`ops_job_interview_rounds`) al calendario primario del staff ligado. El `.ics` y los correos de recordatorio siguen activos.

En Google Cloud: OAuth client (Web) con redirect  
`https://ops.codiva.dev/api/ops/google-calendar/oauth/callback`  
(y el equivalente local si aplica). Scopes: `openid email profile` + `https://www.googleapis.com/auth/calendar.events`.

```env
GOOGLE_CALENDAR_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=...
# opcional; default = {NEXT_PUBLIC_OPS_URL}/api/ops/google-calendar/oauth/callback
GOOGLE_CALENDAR_REDIRECT_URI=https://ops.codiva.dev/api/ops/google-calendar/oauth/callback
```

Tokens en `ops_google_calendar_links` (RLS: solo el dueño). Mapeo de eventos en `ops_google_calendar_sync`. Sin esas env vars, la UI muestra que no está configurado y el resto de Ops sigue igual.

## Antivirus / malware (opcional)

| Opción | Costo aprox. | Notas |
|--------|----------------|-------|
| **AttachmentScanner** | ~$99/mes · 5 000 scans | Recomendado para SaaS; API simple. Env: `ATTACHMENT_SCANNER_API_KEY` |
| **VirusTotal Premium** | Quote (~$1.5k-4k+/mes; contratos anuales altos) | API pública gratis **no es uso comercial**. Env: `VIRUSTOTAL_API_KEY`; `VIRUSTOTAL_UPLOAD=true` para subir hashes desconocidos |
| **AWS GuardDuty Malware for S3** | ~$0.09/GB + ~$0.215/1k objetos (us-east-1); free tier 1 GB + 1 k/mes | Ideal si el storage pasa a S3; hoy Ops usa Supabase Storage |
| **ClamAV self-hosted** | Infra + mantenimiento | Sin fee de API; más ops |
| **MetaDefender Cloud** | Enterprise (ej. ~$55k/año en un listing AWS) | Overkill para volumen actual |

Sin clave configurada, `scan_status = skipped` y el upload se acepta (hash igual se guarda). Si el scan marca **infected**, el archivo se borra y se rechaza el upload.

Prioridad práctica Codiva: **AttachmentScanner** cuando el volumen de inbound lo justifique.

## Observabilidad

En Vercel (Production + Preview):

```env
SENTRY_DSN=https://...@....ingest.sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@....ingest.sentry.io/...
```

El DSN de Sentry es público por diseño (va al bundle). Sin esas vars el build y el runtime siguen; no se envía nada a Sentry.
