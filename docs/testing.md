# Estrategia de pruebas

HomePlanner separa las pruebas rápidas de lógica pura, las pruebas de base de
datos y una prueba E2E opcional contra el entorno local. Las pruebas unitarias
no necesitan Docker ni Supabase.

## Comandos

```powershell
pnpm test
pnpm test:watch
pnpm lint
pnpm build
pnpm supabase test db
pnpm test:e2e
```

La suite pgTAP necesita Supabase local y al menos tres usuarios creados en
`auth.users` para la prueba RLS. La prueba E2E necesita `SUPABASE_TEST_EMAIL_A`,
`SUPABASE_TEST_PASSWORD_A`, `SUPABASE_TEST_EMAIL_B` y
`SUPABASE_TEST_PASSWORD_B` en `.env.local`; ambos usuarios deben compartir un
hogar. CI ejecuta solo lint, Vitest y build; no ejecuta pgTAP ni E2E.

## Relación con la matriz de requisitos

| Requisito | Cobertura | Prueba o verificación |
|---|---|---|
| AUTH-01 | Parcial | E2E login; recuperación cubierta manualmente |
| HOME-01 | Sí | pgTAP `02_rls_and_business_rules.sql` |
| HOME-02 | Sí | pgTAP join y membresía única |
| HOME-03 | Sí | pgTAP RLS y triggers de integridad |
| TASK-01 | Sí | E2E creación; pgTAP RLS; revisión de build |
| TASK-02 | Parcial | pgTAP de triggers; edición manual |
| SHOP-01 | Sí | E2E y pgTAP RLS |
| SHOP-02 | Sí | E2E y pgTAP RLS |
| EXP-01 | Sí | pgTAP RLS; pruebas manuales de formulario |
| EXP-02 | Sí | Vitest de importes y pgTAP de referencias |
| CAL-01 | Parcial | Vitest de meses; pruebas manuales CRUD |
| CAL-02 | Parcial | Vitest de meses; pruebas manuales |
| MEAL-01 | Sí | Vitest de semanas; pgTAP RLS |
| SEC-01 | Sí | pgTAP RLS e integridad entre hogares |
| UX-01 | Pendiente manual | Revisión manual a 390, 768 y 1440 px |
| DEP-01 | Pendiente manual | Verificación del despliegue en Vercel |
| PWA-01 | Sin cobertura | Fuera del alcance actual |
| REC-01 | Sin cobertura | Fuera de P0 |
| BUD-01 | Sin cobertura | Fuera de P0 |
| SUP-01 | Sin cobertura | Fuera de P0 |

La matriz actual contiene 19 requisitos visibles; los requisitos definitivos
adicionales del SRS deberán incorporarse cuando se amplíe
`docs/requirements-matrix.md`.

## Qué no cubren estas pruebas

No se validan contra Supabase remoto, entregabilidad real de emails, permisos
de Vercel, navegadores móviles reales ni concurrencia de dos hogares en CI.
