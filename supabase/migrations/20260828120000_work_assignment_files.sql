-- Adjuntos de asignaciones (imágenes y archivos).

CREATE TABLE public.work_assignment_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.work_assignments(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  content_type text NOT NULL DEFAULT 'application/octet-stream',
  byte_size int NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'file',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_assignment_files_name_chk CHECK (char_length(trim(file_name)) BETWEEN 1 AND 240),
  CONSTRAINT work_assignment_files_kind_chk CHECK (kind IN ('image', 'file')),
  CONSTRAINT work_assignment_files_size_chk CHECK (byte_size >= 0 AND byte_size <= 10485760)
);

CREATE INDEX idx_work_assignment_files_assignment
  ON public.work_assignment_files (assignment_id, created_at DESC);

ALTER TABLE public.work_assignment_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_all_work_assignment_files ON public.work_assignment_files FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());
