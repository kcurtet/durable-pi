# Spec: provider `zai-coding-cn` en dpi-backend

## Contexto

durable-pi pinnea `@earendil-works/pi-ai@1.0.3`, que ya incluye `zaiCodingCnProvider()`
(`https://open.bigmodel.cn/api/coding/paas/v4`, auth por env `ZAI_CODING_CN_API_KEY`,
API OpenAI-completions, modelos glm-4.6v / glm-5.3 / glm-5.3-flash / glm-5.3-highspeed).
El backend solo admite `DPI_PROVIDER = "openrouter" | "faux"`: la unión de tipos en
`config.ts`, el ternario de parsing, la instanciación de `openrouterProvider()` en el
constructor de `Store`, y los ids de proveedor quemados en `routedModel()`,
`validateModel()` y el listado de modelos del dispositivo.

El operador tiene un GLM Coding Plan (flat, sin coste por token dentro de cuota) y no
quiere depender de OpenRouter para el trabajo real.

## Objetivo

`DPI_PROVIDER=zai-coding-cn` hace que el dispositivo sirva los 4 modelos GLM del coding
plan CN con el harness completo (sesiones, jobs, forks, estado, multicliente). OpenRouter
y faux quedan exactamente como están.

## Requisitos

- **R1 — Config**: `DPI_PROVIDER` admite `zai-coding-cn` además de `openrouter` y `faux`.
  Un valor desconocido debe **fallar el arranque con error claro** en lugar del fallback
  silencioso actual (desconocido → openrouter).
- **R2 — Provider**: con `zai-coding-cn`, `Store` instancia `zaiCodingCnProvider()` de
  pi-ai 1.0.3 (sin tocar la dependencia). El guard de constructor que valida que cada
  modelo curado existe en el catálogo del proveedor se aplica al catálogo de zai.
- **R3 — Catálogo**: con `zai-coding-cn`, el listado de modelos del dispositivo
  (`GET /v1/device`) es exactamente los 4 GLM (glm-4.6v 128k; glm-5.3 / glm-5.3-flash /
  glm-5.3-highspeed 1M), con default `glm-5.3`. La lista curada OpenRouter y su default
  (`anthropic/claude-sonnet-5.5`) no cambian.
- **R4 — Sin hardcode de openrouter**: `routedModel()`, `validateModel()` y el listado de
  modelos usan el proveedor configurado. `validateModel` rechaza referencias cruzadas de
  proveedor (p. ej. `anthropic/...` con provider zai) con el error existente que lista
  los modelos disponibles.
- **R5 — Key**: la key llega por env `ZAI_CODING_CN_API_KEY` vía el mecanismo existente
  (`env_keys` en dpi-network.yaml → `.env` → `backend.env` del dispositivo). Sin key, el
  dispositivo arranca (`/healthz` OK) y las llamadas de modelo fallan con el error de
  auth del proveedor; ningún código nuevo lee ni loguea la key.
- **R6 — Docs**: fila nueva en la tabla de env del README de dpi-backend, entrada
  comentada en `.env.example` y en `dpi-network.example.yaml` (`env_keys`).

## No-objetivos

- Jev / `jev-damage-control` / demo proactiva: fuera de alcance (necesitan key propia,
  damage-control sigue off por defecto).
- Pi-ai se queda en 1.0.3: no subir dependencia.
- Un solo proveedor por dispositivo (como está diseñado), no por sesión.
- Soporte del endpoint internacional `zai` (api.z.ai): no ahora; el parche no debe
  dificultarlo después.

## Criterios de aceptación

- **Given** `DPI_PROVIDER=zai-coding-cn` + key válida **When** `GET /v1/device`
  **Then** lista los 4 GLM con sus ventanas de contexto reales.
- **Given** idem **When** `POST /v1/sessions` con `model {provider:"zai-coding-cn",
  modelId:"glm-5.3-flash"}` **Then** 201 y sesión creada (el modelo sigue siendo obligatorio
  en el cuerpo, como hoy: omitirlo es 400 — `store.create` valida incondicionalmente).
- **Given** idem **When** `GET /v1/device` **Then** `defaultModel` es `glm-5.3`.
- **Given** idem **When** one-shot (`POST .../messages`, `waitMs`) pidiendo un `bash`
  con `glm-5.3-flash` **Then** respuesta real del modelo (smoke con key del operador).
- **Given** `DPI_PROVIDER` sin definir **When** arranque y uso **Then** comportamiento
  OpenRouter idéntico al actual (catálogo, default, validación).
- **Given** `DPI_PROVIDER=faux` **When** `npm test` del backend **Then** suite verde sin
  cambios de comportamiento.
- **Given** `DPI_PROVIDER=cualquier-cosa` **When** arranque **Then** error de config con
  el valor inválido y los válidos.
- **Given** sesión creada con modelo openrouter y dispositivo reiniciado con provider zai
  **When** se reanuda **Then** `routedModel` clampa al default del proveedor activo
  (semántica existente del clamp).
- `just check` y `npm test` del backend en verde.

## Casos límite

- Sesión persistida con `provider: "openrouter"` en su fila de catálogo mientras el
  dispositivo corre zai: el clamp de `routedModel` ya lo cubre; no migrar datos.
- `getAvailable` del proveedor zai con la key ausente o red caída: el arranque no debe
  depender de la red (como hoy con openrouter); el listado de modelos degrada sin tirar
  el servidor.

## Decisiones de implementación

- La unión de proveedor se centraliza en un tipo exportado de `config.ts`
  (`"openrouter" | "zai-coding-cn" | "faux"`) y un mapa proveedor→(factory, modelos
  curados, default) en `model-catalog.ts`; `store.ts` consume ese mapa en constructor,
  `routedModel`, `validateModel` y listado. Los ids curados de zai son los 4 del catálogo
  de pi-ai 1.0.3, con default `glm-5.3`.
- Parsing estricto de `DPI_PROVIDER` (lista blanca, error si no está en ella).
- [Decisión del builder-check] El default del proveedor NO cambia la API de creación:
  `model` sigue siendo obligatorio en `POST /v1/sessions` (hoy es 400 sin él y OpenRouter
  debe quedar idéntico). El default aplica solo a `deviceInfo.defaultModel` y al clamp
  de `routedModel` para sesiones persistidas bajo otro proveedor.

## Queda a criterio del builder

- Cómo extraer el catálogo por proveedor respetando el tipado `as const` existente.
- Si el listado de modelos cachea o no por proveedor, siempre que no haya red en el
  arranque.
