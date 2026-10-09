-- ============================================================================
--  MIGRACIÓN · un mismo usuario (correo) en varios equipos
-- ----------------------------------------------------------------------------
--  Antes: un login = un perfil (perfiles.user_id era único). Así, alguien que
--  está en el Cadet A y en el Sub 15 (p. ej. un entrenador de los dos) no podía
--  usar el mismo correo en ambos.
--
--  Ahora:
--    · Un login puede tener UN perfil por equipo (único por user_id + equipo).
--    · El usuario elige con qué equipo entra; la elección se guarda en
--      `equipo_activo` y todas las funciones (my_team, is_coach,
--      my_profile_id) trabajan con el perfil de ese equipo.
--    · En el alta ("Primer acceso") con un correo que ya tiene cuenta, se
--      reclama el nuevo perfil con la misma contraseña.
--
--  No borra datos. Ejecutar UNA vez en Supabase → SQL Editor → RUN.
--  Es re-ejecutable.
-- ============================================================================

begin;

-- 1) user_id deja de ser único: pasa a ser único por equipo. --------------------
do $$
declare r record;
begin
  -- Quita cualquier UNIQUE que sea solo sobre perfiles(user_id).
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.perfiles'::regclass
      and c.contype = 'u'
      and c.conkey = array[(select attnum from pg_attribute
                             where attrelid = 'public.perfiles'::regclass and attname = 'user_id')]::smallint[]
  loop
    execute format('alter table perfiles drop constraint %I', r.conname);
  end loop;
end $$;

create unique index if not exists uq_perfiles_user_equipo
  on perfiles(user_id, equipo_id) where user_id is not null;
create index if not exists idx_perfiles_user on perfiles(user_id);

-- 2) Equipo elegido por cada usuario. -----------------------------------------
create table if not exists equipo_activo (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  equipo_id  uuid not null references equipo(id) on delete cascade,
  updated_at timestamptz not null default now()
);
alter table equipo_activo enable row level security;
drop policy if exists equipo_activo_own on equipo_activo;
create policy equipo_activo_own on equipo_activo for select
  using (user_id = auth.uid());

-- 3) Funciones base, ahora según el equipo activo. -----------------------------

-- Equipo actual: el elegido (si sigue teniendo perfil en él) o el primero.
create or replace function my_team() returns uuid
language sql security definer set search_path = public stable as $$
  select coalesce(
    (select a.equipo_id
       from equipo_activo a
       join perfiles p on p.user_id = a.user_id and p.equipo_id = a.equipo_id
      where a.user_id = auth.uid()
      limit 1),
    (select p.equipo_id from perfiles p
      where p.user_id = auth.uid()
      order by p.created_at, p.id
      limit 1)
  );
$$;

-- Perfil del usuario en el equipo actual.
create or replace function my_profile_id() returns uuid
language sql security definer set search_path = public stable as $$
  select id from perfiles
   where user_id = auth.uid() and equipo_id = my_team()
   limit 1;
$$;

-- ¿Es entrenador en el equipo actual?
create or replace function is_coach() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from perfiles
     where user_id = auth.uid() and equipo_id = my_team() and rol = 'entrenador'
  );
$$;

-- 4) Equipos del usuario (para la pantalla "¿con qué equipo entras?"). ---------
create or replace function get_mis_equipos()
returns table (id uuid, nombre text, usa_puntos boolean, rol text, perfil_id uuid)
language sql security definer set search_path = public stable as $$
  select e.id, e.nombre, e.usa_puntos, p.rol, p.id
  from perfiles p
  join equipo e on e.id = p.equipo_id
  where p.user_id = auth.uid()
  order by e.nombre;
$$;

-- Cambiar de equipo (solo a uno donde el usuario tenga perfil).
create or replace function set_equipo_activo(p_equipo uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if not exists (select 1 from perfiles where user_id = auth.uid() and equipo_id = p_equipo) then
    raise exception 'No tienes perfil en ese equipo';
  end if;
  insert into equipo_activo (user_id, equipo_id) values (auth.uid(), p_equipo)
  on conflict (user_id) do update set equipo_id = excluded.equipo_id, updated_at = now();
end;
$$;

-- 5) Alta: permite reclamar un perfil de OTRO equipo con la misma cuenta. -------
create or replace function claim_profile(p_profile_id uuid, p_code text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_rol text; v_user uuid; v_equipo uuid; v_team text; v_staff text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión antes de reclamar un perfil';
  end if;
  select rol, user_id, equipo_id into v_rol, v_user, v_equipo
    from perfiles where id = p_profile_id;
  if v_rol is null then raise exception 'Perfil no encontrado'; end if;
  if v_user = auth.uid() then return; end if;  -- ya era suyo
  if v_user is not null then raise exception 'Ese jugador ya ha sido reclamado'; end if;
  if exists (select 1 from perfiles where user_id = auth.uid() and equipo_id = v_equipo) then
    raise exception 'Ya tienes un perfil en este equipo';
  end if;

  select team_code, staff_code into v_team, v_staff from equipo where id = v_equipo;
  if v_rol = 'entrenador' and p_code <> v_staff then
    raise exception 'Código de entrenador incorrecto';
  elsif v_rol = 'jugador' and p_code <> v_team then
    raise exception 'Código de equipo incorrecto';
  end if;

  update perfiles
     set user_id = auth.uid(),
         email   = (select email from auth.users where id = auth.uid())
   where id = p_profile_id;

  -- Entra directamente al equipo que acaba de reclamar.
  insert into equipo_activo (user_id, equipo_id) values (auth.uid(), v_equipo)
  on conflict (user_id) do update set equipo_id = excluded.equipo_id, updated_at = now();
end;
$$;

grant execute on function get_mis_equipos()        to authenticated;
grant execute on function set_equipo_activo(uuid)  to authenticated;

commit;

notify pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
--  (OPCIONAL) Vincular a mano un perfil a una cuenta que ya existe, sin pasar
--  por el alta. Cambia el correo y el nombre del perfil y ejecuta:
--
--    update perfiles p
--       set user_id = u.id, email = u.email
--      from auth.users u, equipo e
--     where u.email = 'correo@ejemplo.com'
--       and p.nombre = 'Xavi'
--       and e.id = p.equipo_id and e.nombre = 'Sub 15'
--       and p.user_id is null;
-- ----------------------------------------------------------------------------
