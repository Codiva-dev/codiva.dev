-- La vacante de testers declara las dos partes de la prueba (criterio + hallazgo).

UPDATE ops_job_postings
SET
  description = $craft_desc$Sobre el rol:
En Codiva.dev el software se diseña para operar negocios reales. Buscamos testers, no perfiles de desarrollo o diseño para construir el producto: personas que validen flujos, regresiones y criterios de aceptación en el oficio que mejor dominan.

Al postular eliges tu oficio de testing. La prueba tiene dos partes: una de criterio (ocho situaciones, 15 minutos) y un hallazgo de ese oficio en el sitio público, con evidencia. Sin las dos no se habilita el CV.

Perfiles que buscamos:
- Tester frontend: UI, estados, accesibilidad, responsive y lo que el usuario ve y toca.
- Tester backend: APIs, auth, datos, permisos, contratos e integraciones.
- Tester full stack: el flujo de punta a punta, incluyendo huecos entre capas.
- Tester UX/UI: flujos, copy, usabilidad, estados vacíos/error y handoff diseño↔build.
- Tester QA: calidad transversal, regresiones, evidencia reproducible y UAT.

Responsabilidades:
- Diseñar y ejecutar pruebas en el oficio declarado, sobre productos a la medida de Codiva.dev.
- Reportar defectos con pasos, evidencia y severidad; no con opiniones sueltas.
- Distinguir un defecto de una preferencia o de un cambio de alcance.
- Verificar correcciones y una regresión corta de lo tocado.
- Acompañar UAT cuando el proyecto lo requiera.
- Otras actividades afines a testing que Codiva asigne según las necesidades del estudio y de los proyectos.$craft_desc$,
  description_en = $qa_desc_en$About the role:
At Codiva.dev, software is built to run real businesses. We hire testers - not developers or designers to build the product. We want people who validate flows, regressions, and acceptance criteria in the craft they know best.

When you apply, you pick your testing craft. The test has two parts: a judgment test (eight situations, 15 minutes) and a finding in that craft on the public site, with evidence. The CV form stays locked until both are done.

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
  updated_at = now()
WHERE lower(trim(slug)) = 'tester-qa';
