# Skill Registry

## User Skills

| Skill | Source | Trigger | Notes |
|---|---|---|---|
| branch-pr | user (`~/.config/opencode/skills`) | Crear PR, abrir PR, preparar cambios para review | Flujo de PR con issue-first enforcement |
| issue-creation | user (`~/.config/opencode/skills`) | Crear issue, reportar bug, pedir feature | Flujo de issue con issue-first enforcement |
| judgment-day | user (`~/.config/opencode/skills`) | “judgment day”, review adversarial, dual review | Doble revisión ciega con jueces paralelos |
| go-testing | user (`~/.config/opencode/skills`) | Tests en Go, Bubbletea TUI, agregar cobertura | Patrones de testing en Go |
| skill-creator | user (`~/.config/opencode/skills`) | Crear nueva skill, documentar instrucciones para agentes | Generación de skills siguiendo spec |
| find-skills | user (`~/.agents/skills`) | Buscar si existe una skill para una tarea | Descubrir e instalar skills |
| vercel-react-best-practices | user (`~/.agents/skills`) | Trabajo en React/Next.js, performance, data fetching, refactors | Buenas prácticas de Vercel para React |

## Project Conventions

### Indexed Sources
- `AGENTS.md`
- `CLAUDE.md`
- `PROTOCOL.md`
- `README.md`

### Compact Rules
- Stack principal: Astro 5 + TypeScript estricto + React 19 islands + Tailwind CSS v4.
- Arquitectura orientada a contenido: `src/content/*` y `src/content.config.ts` son la fuente de verdad para datos y esquemas.
- Lógica reutilizable y testeable en funciones puras dentro de `src/lib/*`; `src/lib/tournament.ts` es el módulo central.
- Las páginas Astro consumen colecciones con `getCollection(...)`; los componentes React se usan como islands (`client:load`, `client:visible`).
- Para agregar partidos, preferir `pnpm script:next`; el CLI imprime JSON a stdout y no escribe archivos automáticamente.
- Verificación previa a push: correr `pnpm test` y luego `pnpm check`.
- `pnpm check` puede reportar falsos positivos conocidos en `src/components/MatchCard.astro:420` y `src/components/Palmares.astro:333` (`ts(1002)`).
- Mantener cambios pequeños y focalizados; no crear archivos nuevos sin justificación clara.
- Estilo de commit documentado en `PROTOCOL.md`: `[feat]`, `[fix]`, `[design]`, `[data]`, `[docs]`, `[refactor]`.

## Detection Notes
- No se detectaron skills a nivel proyecto en `.claude/skills/`, `.agent/skills/` o `skills/`.
- Se excluyeron skills `sdd-*` del registro operativo por ser fases del workflow SDD.
