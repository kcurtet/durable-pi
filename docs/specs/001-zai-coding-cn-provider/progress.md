# Ledger — plan: docs/specs/001-zai-coding-cn-provider/plan.md

Task 1: complete (commits 6584663..HEAD, tests: npm test → 13 pass, 0 fail)

Task 2: complete (commits d513cb4..HEAD, tests: npm test → 20 pass, 0 fail)

Task 3: complete (commits 25f0a92..HEAD, tests: npm test → 22 pass, 0 fail)

Fix (verificación orquestador): el test store-zai asertaba models.length===0, que depende de ZAI_CODING_CN_API_KEY ambiental (con key getAvailable lista los 4 bundled; sin key degrada a []). Verificado: env -u key → 22 pass; con key → 1 fail. Fix hermético: scrub/restore de la key dentro del test.

Task 4: complete (orquestador; smoke real: GET /v1/device → 4 GLM provider zai-coding-cn ctx 1M/128k, default glm-5.3; POST /v1/sessions glm-5.3-flash → 201; one-shot con bash → done con respuesta real; dataDir confinado a /tmp; key nunca impresa; limpiado todo incl. ~/.dpi de probes)

Review (2 revisores frescos, ejes Estándares/Spec): SIN criticals ni importants. Spec: R1-R6 verificados, cumple. Minors diferidos:
- (dup) ProviderId y PROVIDERS sincronizados a mano → derivar tipo del array
- (dup) predicado de membresía duplicado → extract hasModel(provider, id)
- (clump) {provider, modelId} inline → tipo ModelRef compartido en model-catalog
- (calidad) cast as ProviderId ruido; ROUTED_PROVIDERS tipa zai con ReturnType de openrouter → Provider de pi-ai
- (estilo) import al final de model-catalog.ts; homedir sin usar en store-zai.test.ts
- (dirección) Repeated Switches provider==='faux' en 5 métodos → catálogo que incluya faux
Ruling: comentario cosmético en catch preexistente se mantiene (desbloqueó el edit del agente, inofensivo)
Descubierto (upstream, no nuestro): DPI_HOME dentro de backend.env NO aplica — config.ts calcula home ANTES de loadEnvFile; solo vale como variable de proceso o flag. Anotado para issue upstream.
