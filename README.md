# HomePlanner

Aplicación web para la gestión compartida del hogar. Proyecto de Trabajo de Fin de Máster.

## Requisitos

- Node.js 20 o superior.
- pnpm habilitado con Corepack.
- Docker Desktop iniciado con el motor Linux activo.
- Supabase CLI instalada como dependencia del proyecto.

## Stack

- Next.js 15, React 19 y TypeScript.
- Supabase para autenticación, PostgreSQL, RLS y Realtime.
- Docker para el entorno local de Supabase.
- Vercel para el despliegue web.

## Desarrollo local

Instala las dependencias, inicia Supabase y levanta Next.js:

```powershell
pnpm install
pnpm supabase start
pnpm supabase db reset
pnpm dev
```

En Windows PowerShell, si la política bloquea los scripts `.ps1`, usa los ejecutables `.cmd` equivalentes:

```powershell
pnpm.cmd supabase start
pnpm.cmd supabase db reset
pnpm.cmd dev
```

La aplicación estará disponible en `http://localhost:3000`, Supabase Studio en `http://127.0.0.1:54323` y Mailpit en `http://127.0.0.1:54324`.

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores de tu proyecto. No publiques `.env.local`, tokens ni claves privadas.

Variables públicas necesarias:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Las variables `SUPABASE_TEST_EMAIL_A`, `SUPABASE_TEST_PASSWORD_A`, `SUPABASE_TEST_EMAIL_B` y `SUPABASE_TEST_PASSWORD_B` son opcionales y solo sirven como referencia para pruebas locales; no crean usuarios automáticamente.

## Módulos implementados

- Autenticación y navegación protegida.
- Hogar compartido, miembros e invitación.
- Tareas con estados, prioridades, fechas y asignación.
- Listas de compras con artículos, cantidades y precios estimados.
- Gastos con resumen mensual, categorías, miembros pagadores y enlace a compras.
- Calendario mensual de eventos y tareas fechadas.
- Planificador semanal de comidas con copia de semana anterior.

## Comprobaciones

```powershell
pnpm lint
pnpm build
```

