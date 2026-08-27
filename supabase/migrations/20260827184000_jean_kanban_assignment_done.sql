-- Asignación de Jean: el Kanban ya está en producción.

WITH jean AS (
  SELECT id FROM public.staff_profiles
  WHERE id = '91cfbf47-3da6-4dd7-b916-9b1460e5e1b7'
),
ops AS (
  SELECT id FROM public.work_internal_processes WHERE key = 'ops'
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
    progress_pct,
    status_entered_at
  )
  SELECT
    'Creación de KanBan',
    'Tablero de asignaciones en Ops: pipeline Codiva, procesos de proyecto y de estructura interna, subtareas, @menciones y tiempos entre columnas.',
    'internal',
    'done',
    jean.id,
    'internal',
    ops.id,
    jean.id,
    100,
    now()
  FROM jean
  CROSS JOIN ops
  RETURNING id
)
INSERT INTO public.work_assignment_subtasks (assignment_id, title, status, sort_order)
SELECT c.id, s.title, 'done', s.sort_order
FROM created c
CROSS JOIN (
  VALUES
    ('Modelo de procesos: proyecto vs. estructura interna', 0),
    ('Tablero, columnas y medición de tiempo', 1),
    ('Subtareas, @menciones y primeras asignaciones', 2)
) AS s(title, sort_order);

INSERT INTO public.work_assignment_stage_events (
  assignment_id, from_status, to_status, entered_at, left_at, actor_id, source
)
SELECT
  a.id,
  v.from_status,
  v.to_status,
  v.entered_at,
  v.left_at,
  a.created_by,
  v.source
FROM public.work_assignments a
CROSS JOIN (
  VALUES
    (NULL::text, 'backlog'::text, now() - interval '4 hours', now() - interval '3 hours', 'create'::text),
    ('backlog'::text, 'build'::text, now() - interval '3 hours', now() - interval '5 minutes', 'kanban'::text),
    ('build'::text, 'done'::text, now() - interval '5 minutes', NULL::timestamptz, 'kanban'::text)
) AS v(from_status, to_status, entered_at, left_at, source)
WHERE a.title = 'Creación de KanBan';
