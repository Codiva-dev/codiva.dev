-- Tester integral: una sola prueba, sin elegir oficio.

UPDATE ops_job_postings
SET asks_discipline = false
WHERE lower(trim(slug)) IN ('tester', 'tester-qa');
