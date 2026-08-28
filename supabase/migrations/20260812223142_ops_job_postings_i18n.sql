-- Copy en inglés de vacantes públicas. Si está vacío, /empleos cae al español.

ALTER TABLE ops_job_postings
  ADD COLUMN IF NOT EXISTS title_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS requirements_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS location_en text NOT NULL DEFAULT '';

COMMENT ON COLUMN ops_job_postings.title_en IS 'Título público en inglés; vacío = usar title.';
COMMENT ON COLUMN ops_job_postings.description_en IS 'Descripción pública en inglés; vacío = usar description.';
COMMENT ON COLUMN ops_job_postings.requirements_en IS 'Requisitos públicos en inglés; vacío = usar requirements.';
COMMENT ON COLUMN ops_job_postings.location_en IS 'Ubicación pública en inglés; vacío = usar location.';

UPDATE ops_job_postings
SET
  title_en = 'Project Manager',
  location_en = 'Remote · Mexico',
  description_en = $pm_desc_en$About the role:
At Codiva.dev we build custom software and take it to production. The Project Manager is the operating contact between client, design, engineering, and leadership: they keep the pace, the priority clarity, and the quality of delivery.

Responsibilities:
- Coordinate progress on assigned custom software and digital product projects.
- Be the operating contact between the client, design, engineering, and Codiva leadership.
- Track scope, timelines, risks, dependencies, and deliverables in Codiva.dev team tools.
- Facilitate alignments, reviews, and demos with the client or project stakeholders.
- Keep priorities clear, surface blockers on time, and propose next steps.
- Manage expectations and scope changes, escalating to leadership when they affect time or cost.
- Support project operating docs (milestones, tickets, deliverables, and status).
- Join estimation, prioritization, and delivery planning when needed.
- Help improve studio operating processes (rituals, templates, handoffs).
- Other Project Manager work Codiva assigns based on studio and project needs.$pm_desc_en$,
  requirements_en = $pm_req_en$Requirements:
- Experience coordinating software or digital product projects (studio, agency, or in-house).
- Clear communication in Spanish, written and spoken, with clients and with the people building the product.
- Judgment to prioritize, spot risks, and document agreements without unnecessary bureaucracy.
- Comfort with tracking tools (tickets, milestones, boards) and with remote work.
- Ability to hold expectations when scope moves, and to escalate on time.

Nice to have:
- Familiarity with iterative delivery (sprints, demos, UAT).
- Experience on custom-build projects, not only a single product or marketing sites.$pm_req_en$,
  updated_at = now()
WHERE lower(trim(slug)) = 'project-manager';

UPDATE ops_job_postings
SET
  title_en = 'Tester · Frontend, Backend, Full stack, UX/UI and QA',
  location_en = 'Remote · Mexico',
  description_en = $qa_desc_en$About the role:
At Codiva.dev, software is designed to run real businesses. We look for testers - not development or design profiles to build the product: people who validate flows, regressions, and acceptance criteria in the craft they know best.

When you apply you choose your testing craft and take that craft’s judgment test. Without that test, the CV form stays locked.

Profiles we look for:
- Frontend tester: UI, states, accessibility, responsive, and what the user sees and touches.
- Backend tester: APIs, auth, data, permissions, contracts, and integrations.
- Full-stack tester: the end-to-end flow, including gaps between layers.
- UX/UI tester: flows, copy, usability, empty/error states, and design↔build handoff.
- QA tester: cross-cutting quality, regressions, reproducible evidence, and UAT.

Responsibilities:
- Design and run tests in the declared craft, on Codiva.dev custom products.
- Report defects with steps, evidence, and severity - not loose opinions.
- Tell a defect apart from a preference or a scope change.
- Verify fixes and a short regression of what was touched.
- Support UAT when the project needs it.
- Other testing work Codiva assigns based on studio and project needs.$qa_desc_en$,
  requirements_en = $qa_req_en$Requirements:
- Hands-on experience testing software (web, API, or digital product), not courses only.
- Ability to write reproducible reports: steps, expected vs. actual, environment, and evidence.
- Judgment to prioritize what blocks a delivery.
- Clear communication in Spanish with engineering and, when it applies, with the client in UAT.
- Comfort working remotely and across more than one product at a time.

Nice to have:
- Familiarity with Next.js, admin panels, auth, or payments, depending on the craft.
- Experience on custom software (studio, agency, or in-house).
- A sense of staging, regressions between sprints, and design ↔ engineering handoff.$qa_req_en$,
  updated_at = now()
WHERE lower(trim(slug)) = 'tester-qa';
