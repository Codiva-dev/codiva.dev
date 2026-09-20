-- The original insert only ran if slug 'codiva' was missing.
-- Existing rows still used em dashes in the host list.

UPDATE public.projects
SET description = replace(description, E' — ', ': ')
WHERE slug = 'codiva'
  AND description LIKE '%' || chr(8212) || '%';
