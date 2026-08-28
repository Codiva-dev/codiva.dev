-- NIRC: backfill Jean hours for completed Track A (architecture week 13-17 ago 2026).
-- Reconstruction from closed A0-A-III work; one entry per day linked to the sprint capstone.

INSERT INTO public.time_entries (
  id, project_id, sprint_item_id, staff_id, hours, worked_on, notes
)
VALUES
  (
    'f2000001-0001-4000-8000-000000000001',
    'b0000001-0001-4000-8000-00000000000b',
    'a5b59584-ae7a-4090-a3c2-213be1394ee1',
    '91cfbf47-3da6-4dd7-b916-9b1460e5e1b7',
    8.00,
    '2026-08-13',
    'Track A kickoff: acta, CL-001 (baja en check-out), CL-008 (INE documental / IDV off), sandboxes Cincel+Stripe.'
  ),
  (
    'f2000001-0001-4000-8000-000000000002',
    'b0000001-0001-4000-8000-00000000000b',
    'c3ba1fec-f909-4c7f-a89a-9341e0bfe133',
    '91cfbf47-3da6-4dd7-b916-9b1460e5e1b7',
    8.00,
    '2026-08-14',
    'Bloque I: ADRs stack/deploy/colas, IDSE canal único, Cincel v3, inventarios cumplimiento/pool, FCFS, trazabilidad.'
  ),
  (
    'f2000001-0001-4000-8000-000000000003',
    'b0000001-0001-4000-8000-00000000000b',
    '74573a22-e183-4fb6-97c9-47c1ec98166e',
    '91cfbf47-3da6-4dd7-b916-9b1460e5e1b7',
    8.00,
    '2026-08-15',
    'Bloque II: specs CRM/RP, expediente IDSE-ready, pool/scoring, QR/kiosk, adapters IDSE/Stripe, contabilidad, LFPDPPP.'
  ),
  (
    'f2000001-0001-4000-8000-000000000004',
    'b0000001-0001-4000-8000-00000000000b',
    'e749065d-20ba-4ecc-a296-fe8f4f68cc42',
    '91cfbf47-3da6-4dd7-b916-9b1460e5e1b7',
    8.00,
    '2026-08-16',
    'Integración A↔B: mapa BFF/eventos, handoffs entrada/salida, RBAC, peak pack, blueprint monorepo, backlog build.'
  ),
  (
    'f2000001-0001-4000-8000-000000000005',
    'b0000001-0001-4000-8000-00000000000b',
    'ca99ae2e-30e6-43e2-949f-8e6563bfb11e',
    '91cfbf47-3da6-4dd7-b916-9b1460e5e1b7',
    8.00,
    '2026-08-17',
    'Architecture freeze: pack portal (kiosk + check-out paralelo), acta, handoff a implementación 18 semanas.'
  )
ON CONFLICT (id) DO UPDATE SET
  sprint_item_id = EXCLUDED.sprint_item_id,
  staff_id = EXCLUDED.staff_id,
  hours = EXCLUDED.hours,
  worked_on = EXCLUDED.worked_on,
  notes = EXCLUDED.notes;
