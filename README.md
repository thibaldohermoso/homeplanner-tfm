# HomePlanner

Aplicación web para la gestión compartida del hogar. Proyecto de Trabajo de Fin de Máster.

## Stack

- Next.js y TypeScript
- Supabase para Auth, PostgreSQL y Realtime
- Docker para el entorno local de Supabase
- Vercel para el despliegue web

## Desarrollo local

Instala Docker Desktop, inicia la pila local de Supabase y después ejecuta Next.js:

```powershell
pnpm supabase start
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000` y Supabase Studio en `http://127.0.0.1:54323`.

## Variables de entorno

Copia `.env.example` a `.env.local` y completa las variables locales. No publiques `.env.local` ni ninguna clave privada.

