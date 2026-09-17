-- Archive completed assignments without a visible Kanban column.

ALTER TABLE public.work_assignments
  DROP CONSTRAINT IF EXISTS work_assignments_status_chk;

ALTER TABLE public.work_assignments
  ADD CONSTRAINT work_assignments_status_chk CHECK (
    status IN ('backlog', 'discovery', 'build', 'review', 'blocked', 'done', 'archived')
  );

ALTER TABLE public.work_assignment_stage_events
  DROP CONSTRAINT IF EXISTS work_assignment_stage_events_to_chk;

ALTER TABLE public.work_assignment_stage_events
  ADD CONSTRAINT work_assignment_stage_events_to_chk CHECK (
    to_status IN ('backlog', 'discovery', 'build', 'review', 'blocked', 'done', 'archived')
  );

ALTER TABLE public.work_assignment_stage_events
  DROP CONSTRAINT IF EXISTS work_assignment_stage_events_from_chk;

ALTER TABLE public.work_assignment_stage_events
  ADD CONSTRAINT work_assignment_stage_events_from_chk CHECK (
    from_status IS NULL
    OR from_status IN ('backlog', 'discovery', 'build', 'review', 'blocked', 'done', 'archived')
  );
