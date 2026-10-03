# Proyecto-Coca-Cola

Coca-Cola Event Intelligence: app Next.js 15 + Supabase.

## Estructura

```
Proyecto-Coca-Cola/
├── frontend/   → app Next.js (app/, components/, lib/, public/, configs, package.json)
├── backend/    → supabase/ (migrations/, seed.sql, tests/, config.toml)
└── package.json → atajos para correr todo desde la raíz
```

- Las rutas `app/api` y los clientes de Supabase (`frontend/lib/supabase`) viven en
  `frontend/` porque Next.js los importa con el alias `@/*`.
- Las variables de entorno van en `frontend/.env` (o `frontend/.env.local`); Next.js
  las lee desde su propia carpeta. Usa `frontend/.env.example` como plantilla.
  Ninguna se sube a git.

## Frontend

```bash
cd frontend
npm install
npm run dev         # http://localhost:3000
npm run typecheck   # tsc --noEmit
```

O desde la raíz: `npm run dev`, `npm run build`, `npm run typecheck`.

## Backend (Supabase)

El CLI de Supabase busca la carpeta `supabase/` en el directorio actual, así que
**todos los comandos de Supabase se corren desde `backend/`**:

```bash
cd backend
supabase migration list   # estado local vs remoto
supabase db push          # aplica migraciones nuevas al remoto
supabase gen types typescript --linked > ../frontend/lib/database.types.ts
```

O desde la raíz: `npm run db:migrations`, `npm run db:push`, `npm run db:types`.

El enlace con el proyecto remoto se guarda en `backend/supabase/.temp/`
(ignorado por git). Si se pierde, vuelve a enlazar con
`cd backend && supabase link --project-ref <ref>`.

Las migraciones ya aplicadas en el remoto no se editan: los cambios de esquema
van en una migración nueva.
