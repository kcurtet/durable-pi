# Plan de implementación: provider `zai-coding-cn` en dpi-backend

> Ejecutar con la skill `executing-plans`, tarea a tarea. Pasos con checkbox `- [ ]`.

**Objetivo:** `DPI_PROVIDER=zai-coding-cn` sirve los 4 modelos GLM del coding plan CN con el harness completo, sin tocar OpenRouter/faux.

**Aritectura:** la unión de providers vive en `config.ts` (`ProviderId`); `model-catalog.ts` pasa a ser un registro por proveedor (curados + default) con resolución pura de `ModelRef`; `store.ts` delega en ese registro en los 5 puntos que hoy queman `openrouter`. Sin cambios en sdk/tui/playground (verificado: no hay unions de provider allí).

**Stack:** TypeScript, node:test, pi-ai 1.0.3 (NO subir), express-free core (Store directo).

**Spec:** `docs/specs/001-zai-coding-cn-provider/spec.md`

## Restricciones globales

- pi-ai se queda en 1.0.3 exacto.
- OpenRouter y faux quedan byte-idénticos: la suite existente (10 tests) pasa sin editar un solo test.
- La key (`ZAI_CODING_CN_API_KEY`) solo viaja por env; prohibido en código, tests o logs.
- `model` sigue siendo obligatorio en `POST /v1/sessions` (400 si falta, como hoy).
- Sin tocar Jev/`addons.ts`/demo proactiva.

## Foco de revisión

1. Typo en `DPI_PROVIDER` arranca como openrouter en silencio → config.test (T1).
2. Id OpenRouter aceptado bajo provider zai (cross-provider) → catalog.test + store-zai.test (T2/T3).
3. Sesión persistida con provider antiguo bajo device zai pierde el clamp al default → catalog.test `resolveModelRef` (T2).
4. Guard del constructor valida curados de zai contra catálogo openrouter (o viceversa) → store-zai.test abre Store offline (T3).
5. `loadModels`/`getAvailable` con "openrouter" quemado → smoke T4 (única prueba online, manual).

### Tarea 1: Config — `ProviderId` estricto

**Ficheros:**
- Modificar: `apps/dpi-backend/src/config.ts:16` (unión), `:44` (ternario)
- Test: `apps/dpi-backend/tests/config.test.ts` (nuevo)

**Interfaces (produce):** `export type ProviderId = "openrouter" | "zai-coding-cn" | "faux";` — `BackendConfig.provider: ProviderId`.

- [ ] **Paso 1: test que falla** — `tests/config.test.ts` con `loadConfig([], env)` (env inyectado; `DPI_ENV_FILE` a ruta inexistente para no cargar archivo; `DPI_TOKEN` de 32+ chars para pasar el guard):
  - sin `DPI_PROVIDER` → `"openrouter"`
  - `"faux"` → `"faux"`; `"zai-coding-cn"` → `"zai-coding-cn"`
  - `"nope"` → lanza `/Invalid DPI_PROVIDER.*openrouter.*zai-coding-cn.*faux/`
- [ ] **Paso 2:** `cd apps/dpi-backend && npm test` → FAIL (zai no aceptado; "nope" no lanza)
- [ ] **Paso 3: implementar** — lista blanca `["openrouter", "zai-coding-cn", "faux"]`; error `Invalid DPI_PROVIDER '<v>' — expected one of: openrouter, zai-coding-cn, faux`
- [ ] **Paso 4:** `npm test` → 11 pass
- [ ] **Paso 5:** commit `feat(backend): strict DPI_PROVIDER with zai-coding-cn`

### Tarea 2: Registro por proveedor + resolución pura

**Ficheros:**
- Modificar: `apps/dpi-backend/src/model-catalog.ts`
- Test: `apps/dpi-backend/tests/catalog.test.ts` (nuevo)

**Interfaces (consume):** `ProviderId` de T1.
**Interfaces (produce):**
```ts
export type RoutedProvider = Exclude<ProviderId, "faux">; // "openrouter" | "zai-coding-cn"
export const providerCatalogs: Record<RoutedProvider, {
  models: readonly { id: string; name: string; tier: string; icon: string }[];
  defaultModelId: string;
}>;
export function isKnownModelRef(provider: RoutedProvider, ref: unknown): boolean;
export function resolveModelRef(provider: RoutedProvider, ref?: { provider: string; modelId: string }): { provider: RoutedProvider; modelId: string };
```
Contenido zai (tiers espejo de las entradas `z-ai/*` ya curadas): `glm-5.3` (A, **default**), `glm-5.3-flash` (B), `glm-5.3-highspeed` (B), `glm-4.6v` (B), icono `zai.png`. OpenRouter entry: `curatedModels` + `defaultModelId` actuales intactos.

- [ ] **Paso 1: test que falla** — `resolveModelRef("zai-coding-cn")` sin ref → `{provider:"zai-coding-cn", modelId:"glm-5.3"}`; con `{provider:"zai-coding-cn", modelId:"glm-5.3-flash"}` → pasa tal cual; con id desconocido → default; `resolveModelRef("openrouter", {provider:"x", modelId:"anthropic/claude-sonnet-5.5"})` → `{provider:"openrouter", modelId:"anthropic/claude-sonnet-5.5"}`; `isKnownModelRef("zai-coding-cn", {provider:"openrouter", modelId:"anthropic/claude-sonnet-5.5"})` → false.
- [ ] **Paso 2:** `npm test` → FAIL
- [ ] **Paso 3: implementar** en `model-catalog.ts` (puros, sin Store)
- [ ] **Paso 4:** `npm test` → pass
- [ ] **Paso 5:** commit `feat(backend): per-provider catalog registry with pure model resolution`

### Tarea 3: Store consume el registro + docs/env

**Ficheros:**
- Modificar: `apps/dpi-backend/src/store.ts` — `:93` (unión en StoreOptions), `:180-190` (constructor), `:265` (`defaultModel`), `:270-300` (`loadModels`), `:302` (`routedModel`), `:313` (`validateModel`); import `zaiCodingCnProvider` de pi-ai
- Docs: `apps/dpi-backend/README.md` (tabla env), `.env.example`, `dpi-network.example.yaml` (`env_keys` comentado)
- Test: `apps/dpi-backend/tests/store-zai.test.ts` (nuevo)

**Interfaces (consume):** todo T2; `ProviderId` T1.

- [ ] **Paso 1: test que falla** — con `tempStore`-like options pero `provider: "zai-coding-cn"` (offline: el constructor usa `getModels()` empaquetado, sin red):
  - `Store.open` resuelve; `deviceInfo().defaultModel` === `"glm-5.3"`
  - `validateModel({provider:"zai-coding-cn", modelId:"glm-5.3-flash"})` OK
  - `validateModel({provider:"openrouter", modelId:"anthropic/claude-sonnet-5.5"})` → lanza `/Unknown model/` (bajo device zai)
  - `validateModel({provider:"zai-coding-cn", modelId:"glm-4.5"})` → lanza `/Unknown model/`
  - `create({name, cwd, model:{provider:"zai-coding-cn", modelId:"glm-5.3"}})` → sesión creada
  - contraste openrouter: `Store.open` con `provider:"openrouter"` (offline OK) valida `anthropic/claude-sonnet-5.5` y default invariante
  - NO llamar a la ruta de modelos (getAvailable es online)
- [ ] **Paso 2:** `npm test` → FAIL
- [ ] **Paso 3: implementar** — mapa provider→factory `{openrouter: openrouterProvider, "zai-coding-cn": zaiCodingCnProvider}`; guard del constructor itera `providerCatalogs[options.provider].models`; `defaultModel`/`routedModel`/`validateModel`/`loadModels` delegan en T2 y usan `options.provider` en `getAvailable` y en el campo `provider` del listado
- [ ] **Paso 4:** `npm test` → 12+ pass, suite vieja intacta
- [ ] **Paso 5:** docs/env (README fila `DPI_PROVIDER` + `ZAI_CODING_CN_API_KEY`; `.env.example` entrada comentada; yaml `env_keys: [OPENROUTER_API_KEY, ZAI_CODING_CN_API_KEY]` comentado)
- [ ] **Paso 6:** commit `feat(backend): zai-coding-cn provider wired through Store + docs`

### Tarea 4: Smoke real con key (aceptación)

**Ficheros:** ninguno del repo (verificación; la ejecuta el orquestador).

- [ ] **Paso 1:** env throwaway (`/tmp/zai-smoke.env`): `DPI_TOKEN` aleatorio 43 chars, `DPI_PROVIDER=zai-coding-cn`, `ZAI_CODING_CN_API_KEY=$ZAI_CODING_CN_API_KEY`, `DPI_PORT=4782`, `DPI_HOME=/tmp/zai-smoke-home`, `DPI_START_DIRS=/tmp`
- [ ] **Paso 2:** arrancar backend, `GET /v1/device` → 4 modelos con ctx 128000/1000000, `defaultModel:"glm-5.3"`, provider `"zai-coding-cn"` en el listado
- [ ] **Paso 3:** `POST /v1/sessions` `{name:"smoke", cwd:"/tmp", model:{provider:"zai-coding-cn", modelId:"glm-5.3-flash"}}` → 201; oneshot `POST .../agents/main/messages` "How many files are in this directory? Use bash." `waitMs:120000` → `status:"done"` con respuesta real
- [ ] **Paso 4:** matar backend, borrar `/tmp/zai-smoke*`; key jamás impresa
