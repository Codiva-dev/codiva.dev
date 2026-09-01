-- Proceso de postulación configurable por vacante (prueba, oficio, cacería, pipeline, rol al contratar).

ALTER TABLE ops_job_postings
  ADD COLUMN IF NOT EXISTS asks_discipline boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_hunt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS careers_pipeline boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hire_ops_role text NOT NULL DEFAULT 'dev';

ALTER TABLE ops_job_postings
  DROP CONSTRAINT IF EXISTS ops_job_postings_hire_ops_role_ck;

ALTER TABLE ops_job_postings
  ADD CONSTRAINT ops_job_postings_hire_ops_role_ck
  CHECK (hire_ops_role IN ('admin', 'pm', 'dev'));

COMMENT ON COLUMN ops_job_postings.asks_discipline IS
  'Candidato elige oficio (frontend, backend, UX/UI, QA…) y hace esa prueba.';
COMMENT ON COLUMN ops_job_postings.requires_hunt IS
  'Tras aprobar la prueba, debe reportar un hallazgo antes de enviar CV.';
COMMENT ON COLUMN ops_job_postings.careers_pipeline IS
  'Visible para staff con permiso de revisar bolsa (careers_review).';
COMMENT ON COLUMN ops_job_postings.hire_ops_role IS
  'Rol de Ops al convertir la postulación en carta oferta.';

UPDATE ops_job_postings
SET
  asks_discipline = true,
  requires_hunt = true,
  careers_pipeline = true,
  hire_ops_role = 'dev'
WHERE lower(trim(slug)) IN ('tester', 'tester-qa');

UPDATE ops_job_postings
SET hire_ops_role = 'pm'
WHERE lower(trim(slug)) = 'project-manager';
