-- ============================================================
--  Control de clases — esquema de Supabase
--  Pegar completo en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabla única de registros
-- ------------------------------------------------------------
-- Toda la app guarda en una sola tabla, con el contenido en jsonb.
-- Motivo: la lógica de negocio vive en el cliente, la sincronización
-- es por colección, y así agregar un campo nuevo nunca obliga a migrar.

create table if not exists public.registros (
  coach_id   uuid        not null references auth.users (id) on delete cascade,
  coleccion  text        not null,
  id         text        not null,
  datos      jsonb       not null,
  alumno_id  text,
  updated_at timestamptz not null,
  synced_at  timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (coach_id, coleccion, id)
);

-- Cursor de bajada: se piden solo las filas tocadas después de la última vez.
create index if not exists registros_sync_idx
  on public.registros (coach_id, synced_at desc);

-- Búsqueda por alumno para la vista de solo lectura.
create index if not exists registros_alumno_idx
  on public.registros (coach_id, alumno_id)
  where alumno_id is not null;

-- synced_at siempre lo pone el servidor: si lo pusiera el cliente, un reloj
-- desajustado entre el teléfono y la computadora rompería el cursor de bajada.
create or replace function public.marcar_synced()
returns trigger
language plpgsql
as $$
begin
  new.synced_at := now();
  return new;
end;
$$;

drop trigger if exists registros_synced on public.registros;
create trigger registros_synced
  before insert or update on public.registros
  for each row execute function public.marcar_synced();

-- ------------------------------------------------------------
-- 2. Seguridad: cada coach solo ve lo suyo
-- ------------------------------------------------------------

alter table public.registros enable row level security;

drop policy if exists "coach lee lo suyo" on public.registros;
create policy "coach lee lo suyo" on public.registros
  for select to authenticated
  using (coach_id = auth.uid());

drop policy if exists "coach escribe lo suyo" on public.registros;
create policy "coach escribe lo suyo" on public.registros
  for insert to authenticated
  with check (coach_id = auth.uid());

drop policy if exists "coach actualiza lo suyo" on public.registros;
create policy "coach actualiza lo suyo" on public.registros
  for update to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

drop policy if exists "coach borra lo suyo" on public.registros;
create policy "coach borra lo suyo" on public.registros
  for delete to authenticated
  using (coach_id = auth.uid());

-- Nada es legible sin sesión iniciada: no hay ninguna vía pública de lectura.
revoke all on public.registros from anon;
