-- La vacante integral usa el catálogo general, no el de QA.

UPDATE ops_job_postings
SET assessment_key = 'tester-general'
WHERE lower(trim(slug)) IN ('tester', 'tester-qa')
  AND coalesce(assessment_key, '') IN ('', 'tester-qa', 'tester');
