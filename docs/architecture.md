# Arquitectura de HomePlanner

## Objetivo

Aplicación web responsive y preparada para una futura PWA/Capacitor. La seguridad de datos reside en Supabase mediante autenticación y Row Level Security.

## Capas

1. `src/app`: rutas, layouts y páginas del App Router.
2. `src/components`: componentes de interfaz reutilizables.
3. `src/lib/services`: casos de uso y acceso a datos por módulo.
4. `src/lib/supabase`: clientes browser/server y renovación de sesión.
5. Supabase: Auth, PostgreSQL, RLS y Realtime.

## Rutas previstas

- `/login`, `/register`: acceso público.
- `/onboarding`: crear hogar o unirse mediante código.
- `/dashboard`: resumen del hogar.
- `/tasks`: tareas.
- `/shopping`: listas y artículos.
- `/expenses`: gastos y categorías.
- `/calendar`: eventos y tareas con fecha.
- `/meals`: planificación manual.

## Principios

- Mobile-first y áreas táctiles amplias.
- Los componentes no contienen consultas SQL ni reglas de negocio.
- Cada servicio recibe el `householdId` explícitamente.
- Todas las operaciones dependen de RLS; las validaciones de UX no sustituyen la seguridad de la base de datos.
- Los tipos generados de Supabase serán la fuente de verdad para el modelo TypeScript.

## Secuencia de implementación

1. Auth y sesión.
2. Hogar activo y miembros.
3. Dashboard mínimo.
4. Tareas, compras, gastos, calendario y comidas.
5. Realtime selectivo.
6. PWA, pruebas y despliegue.
