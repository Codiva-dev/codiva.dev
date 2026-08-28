-- Copy en inglés de las vacantes publicadas (tono del estudio, no calco).

UPDATE ops_job_postings
SET
  title_en = 'Project Manager',
  location_en = 'Remote · Mexico',
  description_en = $pm_desc_en$About the role:
Codiva.dev builds custom software and ships it to production. The Project Manager is the operating contact between the client, design, engineering, and leadership: they keep the pace, the priorities, and the quality of delivery.

Responsibilities:
- Coordinate progress on assigned custom software and digital product work.
- Be the operating contact between the client, design, engineering, and Codiva leadership.
- Track scope, timelines, risks, dependencies, and deliverables in Codiva.dev team tools.
- Run alignments, reviews, and demos with the client or project stakeholders.
- Keep priorities clear, flag blockers early, and propose next steps.
- Manage expectations and scope changes; escalate to leadership when they affect time or cost.
- Keep the project's operating record current (milestones, tickets, deliverables, and status).
- Join estimation, prioritization, and delivery planning when needed.
- Help improve how the studio operates (rituals, templates, handoffs).
- Other Project Manager work Codiva assigns as the studio and its projects need.$pm_desc_en$,
  requirements_en = $pm_req_en$Requirements:
- Experience coordinating software or digital product projects (studio, agency, or in-house).
- Clear Spanish, written and spoken, with clients and with the people building the product.
- Judgment to prioritize, spot risks, and write down agreements without extra process.
- Comfort with tracking tools (tickets, milestones, boards) and with remote work.
- Ability to hold the line when scope moves, and to escalate on time.

Nice to have:
- Familiarity with iterative delivery (sprints, demos, UAT).
- Experience on custom-build work, not only a single product or marketing sites.$pm_req_en$,
  updated_at = now()
WHERE lower(trim(slug)) = 'project-manager';

UPDATE ops_job_postings
SET
  title_en = 'Tester · Frontend, Backend, Full stack, UX/UI and QA',
  location_en = 'Remote · Mexico',
  description_en = $qa_desc_en$About the role:
At Codiva.dev, software is built to run real businesses. We hire testers - not developers or designers to build the product. We want people who validate flows, regressions, and acceptance criteria in the craft they know best.

When you apply, you pick your testing craft and take that craft's judgment test. The CV form stays locked until you pass.

Profiles we look for:
- Frontend tester: UI, states, accessibility, responsive layouts, and what the user sees and touches.
- Backend tester: APIs, auth, data, permissions, contracts, and integrations.
- Full-stack tester: the end-to-end path, including gaps between layers.
- UX/UI tester: flows, copy, usability, empty and error states, and the design↔build handoff.
- QA tester: cross-cutting quality, regressions, reproducible evidence, and UAT.

Responsibilities:
- Design and run tests in your declared craft, on Codiva.dev custom products.
- Report defects with steps, evidence, and severity - not opinions.
- Tell a defect apart from a preference or a scope change.
- Verify fixes and a short regression of what changed.
- Support UAT when the project needs it.
- Other testing work Codiva assigns as the studio and its projects need.$qa_desc_en$,
  requirements_en = $qa_req_en$Requirements:
- Hands-on experience testing software (web, API, or digital product) - not courses alone.
- Reproducible reports: steps, expected vs. actual, environment, and evidence.
- Judgment to prioritize what blocks a delivery.
- Clear Spanish with engineering and, when it applies, with the client in UAT.
- Comfort working remotely and across more than one product at a time.

Nice to have:
- Familiarity with Next.js, admin panels, auth, or payments, depending on the craft.
- Experience on custom software (studio, agency, or in-house).
- A working sense of staging, regressions between sprints, and the design ↔ engineering handoff.$qa_req_en$,
  updated_at = now()
WHERE lower(trim(slug)) = 'tester-qa';
