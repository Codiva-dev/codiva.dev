-- Kanban de asignaciones internas (pipeline Codiva + subtareas + dwell + menciones).

ALTER TABLE public.staff_profiles
  DROP CONSTRAINT IF EXISTS staff_profiles_capabilities_known;

ALTER TABLE public.staff_profiles
  ADD CONSTRAINT staff_profiles_capabilities_known
  CHECK (
    capabilities <@ ARRAY[
      'leads',
      'inbox',
      'quotes',
      'charges',
      'portal_users',
      'organizations',
      'workload',
      'time_entries',
      'team',
      'careers_review',
      'legal_publish',
      'projects_all',
      'projects_create',
      'milestones_write',
      'sprints_plan',
      'sprints_update_own',
      'documents',
      'deliverables',
      'site_access',
      'tickets',
      'dashboard_finance',
      'settings_profile',
      'assignments',
      'assignments_manage'
    ]::text[]
  );

UPDATE public.staff_profiles
SET capabilities = capabilities || ARRAY['assignments']
WHERE NOT ('assignments' = ANY (capabilities));

UPDATE public.staff_profiles
SET capabilities = capabilities || ARRAY['assignments_manage']
WHERE NOT ('assignments_manage' = ANY (capabilities))
  AND (
    role IN ('admin', 'pm')
    OR 'sprints_plan' = ANY (capabilities)
    OR 'workload' = ANY (capabilities)
  );

CREATE TABLE public.work_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  stream text NOT NULL DEFAULT 'delivery',
  status text NOT NULL DEFAULT 'backlog',
  assignee_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  due_at timestamptz,
  progress_pct smallint NOT NULL DEFAULT 0,
  process_kind text NOT NULL DEFAULT 'none',
  process_id uuid,
  status_entered_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_assignments_title_chk CHECK (char_length(trim(title)) BETWEEN 1 AND 240),
  CONSTRAINT work_assignments_stream_chk CHECK (
    stream IN ('commercial', 'delivery', 'production', 'evolution', 'people')
  ),
  CONSTRAINT work_assignments_status_chk CHECK (
    status IN ('backlog', 'discovery', 'build', 'review', 'blocked', 'done')
  ),
  CONSTRAINT work_assignments_progress_chk CHECK (progress_pct >= 0 AND progress_pct <= 100),
  CONSTRAINT work_assignments_process_chk CHECK (
    process_kind IN ('none', 'lead', 'project', 'quote', 'ticket')
  ),
  CONSTRAINT work_assignments_process_id_chk CHECK (
    (process_kind = 'none' AND process_id IS NULL)
    OR (process_kind <> 'none' AND process_id IS NOT NULL)
  )
);

CREATE INDEX idx_work_assignments_status ON public.work_assignments (status, status_entered_at DESC);
CREATE INDEX idx_work_assignments_assignee ON public.work_assignments (assignee_id, status);
CREATE INDEX idx_work_assignments_stream ON public.work_assignments (stream, status);
CREATE INDEX idx_work_assignments_process ON public.work_assignments (process_kind, process_id);

CREATE TABLE public.work_assignment_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.work_assignments(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  sort_order int NOT NULL DEFAULT 0,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_assignment_subtasks_title_chk CHECK (char_length(trim(title)) BETWEEN 1 AND 240),
  CONSTRAINT work_assignment_subtasks_status_chk CHECK (status IN ('open', 'done'))
);

CREATE INDEX idx_work_assignment_subtasks_assignment
  ON public.work_assignment_subtasks (assignment_id, sort_order);

CREATE TABLE public.work_assignment_stage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.work_assignments(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  entered_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  actor_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'create',
  CONSTRAINT work_assignment_stage_events_to_chk CHECK (
    to_status IN ('backlog', 'discovery', 'build', 'review', 'blocked', 'done')
  ),
  CONSTRAINT work_assignment_stage_events_from_chk CHECK (
    from_status IS NULL
    OR from_status IN ('backlog', 'discovery', 'build', 'review', 'blocked', 'done')
  ),
  CONSTRAINT work_assignment_stage_events_source_chk CHECK (
    source IN ('create', 'kanban', 'detail', 'system')
  )
);

CREATE INDEX idx_work_assignment_stage_events_assignment
  ON public.work_assignment_stage_events (assignment_id, entered_at);

CREATE UNIQUE INDEX idx_work_assignment_stage_events_open
  ON public.work_assignment_stage_events (assignment_id)
  WHERE left_at IS NULL;

CREATE TABLE public.work_assignment_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.work_assignments(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_assignment_comments_body_chk CHECK (char_length(trim(body)) BETWEEN 1 AND 8000)
);

CREATE INDEX idx_work_assignment_comments_assignment
  ON public.work_assignment_comments (assignment_id, created_at DESC);

CREATE TABLE public.work_assignment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.work_assignment_comments(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.work_assignments(id) ON DELETE CASCADE,
  mentioned_staff_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_assignment_mentions_unique UNIQUE (comment_id, mentioned_staff_id)
);

CREATE INDEX idx_work_assignment_mentions_staff
  ON public.work_assignment_mentions (mentioned_staff_id, created_at DESC);

CREATE TRIGGER work_assignments_updated_at
  BEFORE UPDATE ON public.work_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER work_assignment_subtasks_updated_at
  BEFORE UPDATE ON public.work_assignment_subtasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.work_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_assignment_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_assignment_stage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_assignment_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_assignment_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_all_work_assignments ON public.work_assignments FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY staff_all_work_assignment_subtasks ON public.work_assignment_subtasks FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY staff_all_work_assignment_stage_events ON public.work_assignment_stage_events FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY staff_all_work_assignment_comments ON public.work_assignment_comments FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY staff_all_work_assignment_mentions ON public.work_assignment_mentions FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());
