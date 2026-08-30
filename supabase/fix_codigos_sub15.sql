-- ============================================================================
--  CORRECCIÓ DE CODIS D'ACCÉS · Sub 15
-- ----------------------------------------------------------------------------
--  Posa els codis definitius del Sub 15, siguin quins siguin els que hi ha ara.
--  Segur i re-executable. No toca cap altra dada.
--
--  Codis finals:  Jugadors → DAMMS15   ·   Staff → STAFFS15
--  (Han de ser ÚNICS: el Cadet A és DAMM2026 / STAFF2026.)
-- ============================================================================

update equipo
   set team_code  = 'DAMMS15',
       staff_code = 'STAFFS15'
 where nombre = 'Sub 15 · CF Damm';

-- Comprovació: hauries de veure els dos equips amb codis diferents.
select nombre, team_code, staff_code, usa_puntos
from equipo
order by nombre;
