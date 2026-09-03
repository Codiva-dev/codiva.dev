-- Codiva.dev as an internal studio project (progress, details, releases).

INSERT INTO public.organizations (name, contact_email, logo_url)
SELECT 'Codiva', 'hello@codiva.dev', '/logo.svg'
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations WHERE lower(name) IN ('codiva', 'codiva.dev')
);

INSERT INTO public.projects (
  organization_id,
  name,
  slug,
  status,
  description,
  start_date,
  site_production_url,
  client_visible,
  portal_show_quote,
  portal_show_costs
)
SELECT
  o.id,
  'Codiva.dev',
  'codiva',
  'active',
  E'Producto interno de Codiva: sitio público, Ops, portal de clientes, bolsa, tickets y entrevistas.\n\nUn solo repo Next.js; el host decide la superficie.\n• codiva.dev — marketing y cotiza\n• ops.codiva.dev — staff\n• portal.codiva.dev — clientes\n• career.codiva.dev — bolsa\n• ticket.codiva.dev — tickets\n• interviews.codiva.dev — entrevistas',
  '2025-06-19',
  'https://codiva.dev',
  false,
  false,
  false
FROM public.organizations o
WHERE lower(o.name) IN ('codiva', 'codiva.dev')
  AND NOT EXISTS (SELECT 1 FROM public.projects WHERE slug = 'codiva')
ORDER BY o.created_at
LIMIT 1;

INSERT INTO public.project_staff (project_id, staff_id, role_on_project)
SELECT p.id, s.id, CASE WHEN s.role = 'dev' THEN 'dev' ELSE 'pm' END
FROM public.projects p
CROSS JOIN public.staff_profiles s
WHERE p.slug = 'codiva'
  AND s.active = true
ON CONFLICT DO NOTHING;

INSERT INTO public.project_release_settings (
  project_id,
  enabled,
  github_owner,
  github_repo,
  promote_workflow,
  promote_ref,
  deployment_url_input,
  vercel_project_id,
  vercel_team_id,
  client_can_request,
  require_staff_approval,
  notes,
  updated_at
)
SELECT
  p.id,
  true,
  'Codiva-dev',
  'codiva.dev',
  'promote-production.yml',
  'main',
  'deployment_url',
  'prj_nB7yxqw0qUm4BjC7JqfdBr4u5Uix',
  'team_nI1wrmMTcj7XhYTUDwjy5Ak3',
  false,
  true,
  'GitHub CI → preview Vercel → QA Codiva → promote. Proyecto interno; sin portal de cliente.',
  now()
FROM public.projects p
WHERE p.slug = 'codiva'
ON CONFLICT (project_id) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  github_owner = EXCLUDED.github_owner,
  github_repo = EXCLUDED.github_repo,
  vercel_project_id = EXCLUDED.vercel_project_id,
  vercel_team_id = EXCLUDED.vercel_team_id,
  client_can_request = false,
  notes = EXCLUDED.notes,
  updated_at = now();
