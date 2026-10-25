# Ledger — plan: docs/specs/001-zai-coding-cn-provider/plan.md

Task 1: complete (commits 6584663..HEAD, tests: npm test → 13 pass, 0 fail)

Task 2: complete (commits d513cb4..HEAD, tests: npm test → 20 pass, 0 fail)

Task 3: complete (commits 25f0a92..HEAD, tests: npm test → 22 pass, 0 fail)

Fix (verificación orquestador): el test store-zai asertaba models.length===0, que depende de ZAI_CODING_CN_API_KEY ambiental (con key getAvailable lista los 4 bundled; sin key degrada a []). Verificado: env -u key → 22 pass; con key → 1 fail. Fix hermético: scrub/restore de la key dentro del test.
