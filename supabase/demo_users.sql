-- ============================================================================
--  USUARIOS DEMO (login listo) · Plataforma Cadet A · CF Damm
-- ----------------------------------------------------------------------------
--  Crea 2 accesos YA CONFIRMADOS para probar las dos vistas sin registrarte:
--
--     JUGADOR     →  correo: jugador.demo@damm.local   contraseña: DemoDamm2026
--     ENTRENADOR  →  correo: admin.demo@damm.local      contraseña: DemoDamm2026
--
--  CÓMO USARLO:
--     Supabase → SQL Editor → New query → pega esto → RUN.
--
--  REQUISITO IMPRESCINDIBLE:
--     Authentication → Sign In / Providers → Email  ACTIVADO.
--     (NO hace falta "Confirm email": estos usuarios ya vienen confirmados.)
--
--  Es repetible: si ya existían, los borra y los vuelve a crear.
-- ============================================================================

do $$
declare
  v_jug_uid    uuid := gen_random_uuid();
  v_adm_uid    uuid := gen_random_uuid();
  v_jug_perfil uuid;
  v_adm_perfil uuid;
  v_pass       text := 'DemoDamm2026';
begin
  -- ---- Limpieza de accesos demo anteriores ----
  update perfiles set user_id = null
    where email in ('jugador.demo@damm.local', 'admin.demo@damm.local');
  delete from auth.identities
    where user_id in (select id from auth.users
                      where email in ('jugador.demo@damm.local', 'admin.demo@damm.local'));
  delete from auth.users
    where email in ('jugador.demo@damm.local', 'admin.demo@damm.local');

  -- ---- Usuario JUGADOR ----
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_jug_uid, 'authenticated', 'authenticated',
    'jugador.demo@damm.local', crypt(v_pass, gen_salt('bf')), now(),
    now(), now(), '{"provider":"email","providers":["email"]}', '{}',
    '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_jug_uid, v_jug_uid::text,
    json_build_object('sub', v_jug_uid::text, 'email', 'jugador.demo@damm.local')::jsonb,
    'email', now(), now(), now()
  );

  -- ---- Usuario ENTRENADOR (admin, lo ve todo) ----
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_adm_uid, 'authenticated', 'authenticated',
    'admin.demo@damm.local', crypt(v_pass, gen_salt('bf')), now(),
    now(), now(), '{"provider":"email","providers":["email"]}', '{}',
    '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_adm_uid, v_adm_uid::text,
    json_build_object('sub', v_adm_uid::text, 'email', 'admin.demo@damm.local')::jsonb,
    'email', now(), now(), now()
  );

  -- ---- Enlazar cada acceso con un perfil de la plantilla ----
  -- Jugador: preferimos 'Guty'; si no, el primer jugador sin cuenta.
  select id into v_jug_perfil
    from perfiles
    where rol = 'jugador' and user_id is null
    order by (nombre <> 'Guty'), nombre
    limit 1;
  update perfiles set user_id = v_jug_uid, email = 'jugador.demo@damm.local'
    where id = v_jug_perfil;

  -- Entrenador: preferimos 'Entrenador Demo'; si no, el primer entrenador sin cuenta.
  select id into v_adm_perfil
    from perfiles
    where rol = 'entrenador' and user_id is null
    order by (nombre <> 'Entrenador Demo'), nombre
    limit 1;
  update perfiles set user_id = v_adm_uid, email = 'admin.demo@damm.local'
    where id = v_adm_perfil;

  raise notice 'OK · jugador->perfil %  ·  entrenador->perfil %', v_jug_perfil, v_adm_perfil;
end $$;
