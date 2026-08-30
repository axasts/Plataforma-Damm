-- ============================================================================
--  SEED · Equip SUB 15  ·  Plataforma CF Damm
-- ----------------------------------------------------------------------------
--  Crea l'equip Sub 15 (SENSE sistema de punts) amb els seus entrenadors,
--  jugadors, codis d'accés i regles d'alerta.
--
--  Requisit: haver executat abans `migracion_multiequipo.sql`.
--
--  COM OMPLIR-HO (edita només les 3 zones marcades amb 👉):
--    1. CODIS d'accés del Sub 15 (han de ser DIFERENTS dels del Cadet A,
--       que són DAMM2026 / STAFF2026).
--    2. ENTRENADORS: un nom per línia.
--    3. JUGADORS: nom i posició (la posició només la veuen els entrenadors;
--       si no la saps, deixa-la buida amb '').
--
--  Després, al SQL Editor de Supabase, enganxa'l i prem RUN.
--  És segur re-executar? NO: crearia l'equip dos cops. Executa'l un sol cop.
-- ============================================================================

with nuevo as (
  -- 👉 1) EQUIP + CODIS D'ACCÉS DEL SUB 15  (usa_puntos = false → sense punts)
  insert into equipo (nombre, team_code, staff_code, usa_puntos)
  values ('Sub 15 · CF Damm', 'DAMMS15', 'STAFFS15', false)
  returning id
),

ins_entrenadores as (
  -- 👉 2) ENTRENADORS DEL SUB 15
  insert into perfiles (nombre, rol, equipo_id)
  select x.nombre, 'entrenador', nuevo.id
  from nuevo, (values
    ('Xavi'),
    ('Marc')
  ) as x(nombre)
  returning 1
),

ins_jugadores as (
  -- 👉 3) JUGADORS DEL SUB 15  (posició buida; s'afegeix després des de Plantilla)
  insert into perfiles (nombre, rol, posicion, equipo_id)
  select x.nombre, 'jugador', nullif(x.posicion, ''), nuevo.id
  from nuevo, (values
    ('Bryan',              ''),
    ('Yerai Gutierrez',    ''),
    ('Álvaro Quiros',      ''),
    ('Nico Moreno',        ''),
    ('Brytan Oriol Ramos', ''),
    ('Lucas Esquivel',     ''),
    ('Pol Azañón',         ''),
    ('Álex Álvarez',       ''),
    ('Arnau Figueres',     ''),
    ('Iván Jiménez',       ''),
    ('Eric Marín',         ''),
    ('Lolo',               ''),
    ('Pol Lansach',        ''),
    ('Hoo',                ''),
    ('Kevin Obeng',        ''),
    ('William Portillo',   ''),
    ('Pol Girbau',         ''),
    ('Luca Cabrera',       ''),
    ('Artur Esmorris',     '')
  ) as x(nombre, posicion)
  returning 1
),

ins_reglas as (
  -- Regles d'alerta per defecte (wellness/RPE). Això NO és puntuació; són avisos.
  insert into reglas_alerta (metrica, operador, valor, equipo_id)
  select r.metrica, r.operador, r.valor, nuevo.id
  from nuevo, (values
    ('rpe_muscular',     '>=', 9),
    ('rpe_respiratorio', '>=', 9),
    ('sueno',            '<=', 2),
    ('animo',            '<=', 2)
  ) as r(metrica, operador, valor)
  returning 1
)

select 'Sub 15 creado' as resultado;

-- ============================================================================
--  NOTA: el Sub 15 NO té catàleg de sancions (motivos_puntos) perquè no usa
--  punts. Si algun dia vols activar-li els punts, canvia usa_puntos a true:
--    update equipo set usa_puntos = true where nombre = 'Sub 15 · CF Damm';
-- ============================================================================
