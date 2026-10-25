# Brief: implementar provider `zai-coding-cn` en dpi-backend

Eres implementer. Trabajas en un worktree aislado sobre rama propia. **No toques `main`.**

## Qué leer primero (en este orden)

1. `docs/specs/001-zai-coding-cn-provider/spec.md` — la autoridad.
2. `docs/specs/001-zai-coding-cn-provider/plan.md` — el plan que ejecutas, tarea a tarea, pasos exactos.

## Disciplina de ejecución

- TDD estricto: cada paso de test se escribe, se corre y se VE FALLAR antes de implementar; luego verde. Sin test visto fallar no hay evidencia.
- Ejecuta las tareas 1→3 en orden, sin pausar entre ellas. Commits como dice el plan (prefijo `feat(backend): ...`).
- **Ledger**: crea `docs/specs/001-zai-coding-cn-provider/progress.md` con primera línea
  `# Ledger — plan: docs/specs/001-zai-coding-cn-provider/plan.md`.
  Cierra cada tarea con `Task N: complete (commits <a>..<b>, tests: <cmd> → <resultado>)`.
- **Rulings, no bloqueos**: si algo del plan choca con la realidad, decide (la spec manda), registra `Ruling: <qué> — <por qué> — <coste si me equivoco>` en el ledger y sigue. No desviaciones en silencio.
- La **Tarea 4 (smoke con key real) NO es tuya** — la ejecuta el orquestador. Tu entregable termina en la Tarea 3.

## Restricciones duras

- `@earendil-works/pi-ai` se queda en **1.0.3** exacto. No añadas dependencias.
- OpenRouter y faux quedan **byte-idénticos**: los 10 tests existentes de `apps/dpi-backend` pasan SIN editarlos. Si un test viejo falla por tu cambio, es tu bug.
- **Ningún test ni código tuyo necesita red ni API keys**: todo offline (`getModels()` de pi-ai es empaquetado; `getAvailable` es online — no lo llames en tests).
- La key `ZAI_CODING_CN_API_KEY` no aparece en código, tests ni logs (solo docs comentadas).
- `model` sigue siendo obligatorio en `POST /v1/sessions` (no cambies esa semántica).
- Sin tocar: Jev (`addons.ts`, `jev.ts`), demo proactiva, sdk, tui, playground.
- Máquina cargada: un proceso de test a la vez, sin spawns paralelos.

## Verificación (Definition of Done)

- `cd apps/dpi-backend && npm test` → suite completa verde (10 viejos + tus nuevos: config, catalog, store-zai).
- Ledger al día con tasks complete y rulings si los hay.
- Diffs limitados a: `src/config.ts`, `src/model-catalog.ts`, `src/store.ts`, `tests/` (nuevos), `README.md` de dpi-backend, `.env.example`, `dpi-network.example.yaml`, `docs/specs/001-.../progress.md`.
- Commits atómicos por tarea como marca el plan.

## Al terminar

Escribe en el ledger `Task 3: complete` y reporta: commits, resultado del `npm test` final (número de tests), rulings tomados y cualquier minor diferido. Nada más.
