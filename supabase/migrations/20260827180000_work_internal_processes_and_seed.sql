-- Procesos de estructura interna + AMIDA como proyecto + primeras asignaciones de Rafael.

ALTER TABLE public.work_assignments
  DROP CONSTRAINT IF EXISTS work_assignments_stream_chk;

ALTER TABLE public.work_assignments
  ADD CONSTRAINT work_assignments_stream_chk CHECK (
    stream IN ('commercial', 'delivery', 'production', 'evolution', 'people', 'internal')
  );

ALTER TABLE public.work_assignments
  DROP CONSTRAINT IF EXISTS work_assignments_process_chk;

ALTER TABLE public.work_assignments
  ADD CONSTRAINT work_assignments_process_chk CHECK (
    process_kind IN ('none', 'lead', 'project', 'quote', 'ticket', 'internal')
  );

CREATE TABLE public.work_internal_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  href text,
  sort_order int NOT NULL DEFAULT 0,
  CONSTRAINT work_internal_processes_key_chk CHECK (char_length(trim(key)) BETWEEN 1 AND 64),
  CONSTRAINT work_internal_processes_title_chk CHECK (char_length(trim(title)) BETWEEN 1 AND 120)
);

ALTER TABLE public.work_internal_processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_all_work_internal_processes ON public.work_internal_processes FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

INSERT INTO public.work_internal_processes (key, title, description, href, sort_order)
VALUES
  (
    'ops',
    'Procesos y operación',
    'Cómo opera Codiva: playbooks, tablero, handoffs y criterio de qué entra a proyecto vs. estructura interna.',
    '/asignaciones',
    10
  ),
  (
    'careers',
    'Criterio y bolsa',
    'Pruebas de criterio, oficios, revisión de intentos y el camino hasta el CV.',
    '/team',
    20
  );

INSERT INTO public.organizations (id, name, contact_email)
SELECT gen_random_uuid(), 'AMIDA', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE lower(name) = 'amida');

INSERT INTO public.projects (
  organization_id,
  name,
  slug,
  status,
  description,
  client_visible
)
SELECT
  o.id,
  'AMIDA',
  'amida',
  'delivered',
  'Sitio corporativo para firma de arquitectura e ingeniería. Galería de proyectos, servicios y contacto bilingüe.',
  false
FROM public.organizations o
WHERE lower(o.name) = 'amida'
  AND NOT EXISTS (SELECT 1 FROM public.projects WHERE slug = 'amida');

INSERT INTO public.project_staff (project_id, staff_id, role_on_project)
SELECT p.id, s.id, CASE WHEN s.role = 'dev' THEN 'dev' ELSE 'pm' END
FROM public.projects p
CROSS JOIN public.staff_profiles s
WHERE p.slug = 'amida'
  AND s.active = true
ON CONFLICT DO NOTHING;

WITH rafael AS (
  SELECT id FROM public.staff_profiles
  WHERE id = 'd836ec0c-73af-4d6e-8643-99a668601ac5'
),
jean AS (
  SELECT id FROM public.staff_profiles
  WHERE id = '91cfbf47-3da6-4dd7-b916-9b1460e5e1b7'
),
ops AS (
  SELECT id FROM public.work_internal_processes WHERE key = 'ops'
),
careers AS (
  SELECT id FROM public.work_internal_processes WHERE key = 'careers'
),
amida AS (
  SELECT id FROM public.projects WHERE slug = 'amida'
),
created AS (
  INSERT INTO public.work_assignments (
    title,
    description,
    stream,
    status,
    assignee_id,
    process_kind,
    process_id,
    created_by,
    progress_pct
  )
  SELECT * FROM (
    VALUES
      (
        'Creación de procesos Codiva'::text,
        'Definir y dejar operando los procesos internos de Codiva: qué es trabajo de proyecto, qué es estructura interna, y cómo se mueve en el tablero.'::text,
        'internal'::text,
        'backlog'::text,
        (SELECT id FROM rafael),
        'internal'::text,
        (SELECT id FROM ops),
        (SELECT id FROM jean),
        0::smallint
      ),
      (
        'Estructura y consolidación de pruebas de criterio'::text,
        'Unificar las pruebas de criterio de la bolsa (oficios, aprobación, reintento y revisión) para que el proceso de altas sea el mismo para quien aplica y quien evalúa.'::text,
        'internal'::text,
        'backlog'::text,
        (SELECT id FROM rafael),
        'internal'::text,
        (SELECT id FROM careers),
        (SELECT id FROM jean),
        0::smallint
      ),
      (
        'Consolidación de presentación - AMIDA'::text,
        'Cerrar la presentación del caso AMIDA (narrativa, piezas y versión lista para presentar) sobre el proyecto entregado.'::text,
        'commercial'::text,
        'backlog'::text,
        (SELECT id FROM rafael),
        'project'::text,
        (SELECT id FROM amida),
        (SELECT id FROM jean),
        0::smallint
      )
  ) AS v(title, description, stream, status, assignee_id, process_kind, process_id, created_by, progress_pct)
  RETURNING id, title
),
subtasks AS (
  INSERT INTO public.work_assignment_subtasks (assignment_id, title, sort_order)
  SELECT c.id, s.title, s.sort_order
  FROM created c
  JOIN (
    VALUES
      ('Creación de procesos Codiva', 'Inventario de procesos actuales (ops, entrega, bolsa, legal)', 0),
      ('Creación de procesos Codiva', 'Criterio escrito: cuándo es proyecto y cuándo es estructura interna', 1),
      ('Creación de procesos Codiva', 'Publicar el flujo en el tablero de asignaciones', 2),
      ('Estructura y consolidación de pruebas de criterio', 'Mapa de pruebas por oficio (PM, QA y crafts)', 0),
      ('Estructura y consolidación de pruebas de criterio', 'Criterio de aprobación, reintento y ventana unificados', 1),
      ('Estructura y consolidación de pruebas de criterio', 'Guía interna para quien revisa intentos en Equipo', 2),
      ('Consolidación de presentación - AMIDA', 'Guion y narrativa del caso', 0),
      ('Consolidación de presentación - AMIDA', 'Piezas (slides, demo, pruebas)', 1),
      ('Consolidación de presentación - AMIDA', 'Versión lista para presentar', 2)
  ) AS s(assignment_title, title, sort_order)
    ON s.assignment_title = c.title
  RETURNING assignment_id
)
INSERT INTO public.work_assignment_stage_events (assignment_id, from_status, to_status, source, actor_id)
SELECT c.id, NULL, 'backlog', 'create', (SELECT id FROM jean)
FROM created c;

UPDATE public.work_assignments a
SET progress_pct = 0
WHERE a.title IN (
  'Creación de procesos Codiva',
  'Estructura y consolidación de pruebas de criterio',
  'Consolidación de presentación - AMIDA'
);
