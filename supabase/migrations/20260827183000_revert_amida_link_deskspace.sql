-- Revert the AMIDA project created by mistake. The assignment belongs to Deskpace, named DeskSpace.

UPDATE public.organizations
SET name = 'DeskSpace'
WHERE lower(name) = 'deskpace';

UPDATE public.projects
SET name = 'DeskSpace'
WHERE slug = 'deskpace';

UPDATE public.work_assignments
SET
  title = 'Consolidación de presentación - DeskSpace',
  description = 'Cerrar la presentación de DeskSpace (narrativa, piezas y versión lista para presentar).',
  process_kind = 'project',
  process_id = (SELECT id FROM public.projects WHERE slug = 'deskpace')
WHERE title = 'Consolidación de presentación - AMIDA';

DELETE FROM public.projects WHERE slug = 'amida';

DELETE FROM public.organizations o
WHERE lower(o.name) = 'amida'
  AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.organization_id = o.id);
