# Plataforma CF Damm

Especificació funcional del projecte. Document viu: recull tot el que hem
acordat durant la planificació i serveix de guia per a la construcció.

> **Idioma de la interfície:** castellà.
> **Estat:** ✅ implementat i **desplegat a producció** (https://plataforma-damm.vercel.app).
> Rediseño visual (dark premium) aplicat i **model operatiu centrat en el calendari**
> (veure §0). **Multi-equip** afegit (veure §0-bis).
> Veure `docs/ESTADO.md`, `docs/BASE_DE_DATOS.md` i `docs/DESPLIEGUE.md`.

---

## 0-bis. Multi-equip (afegit 08/2026 — mana sobre la resta)

La plataforma allotja **diversos equips del CF Damm** en una mateixa base de dades:

- Cada equip és una fila de `equipo` amb els seus **codis** i un flag **`usa_puntos`**.
  - **Cadet A / S16:** `usa_puntos = true` (tot el sistema de punts actiu).
  - **Sub 15:** `usa_puntos = false` → **sense** classificació, sancions, catàleg
    ni penalitzacions automàtiques. Manté wellness, RPE, assistència, lesions,
    alertes, calendari i el panell.
- **Aïllament:** `perfiles`, `eventos`, `motivos_puntos` i `reglas_alerta` porten
  `equipo_id`; les funcions i les RLS filtren pel meu equip (`my_team()`). Un
  entrenador **només veu el seu equip**.
- **Un sol web:** l'equip de l'usuari es determina al login (pel seu perfil); no cal
  un desplegament per equip. El frontend amaga la puntuació segons `usaPuntos`.
- **Alta:** els codis són **únics per equip** i identifiquen equip + rol, així que la
  llista de "Primer acceso" ja surt filtrada. Codis: Cadet A `DAMM2026`/`STAFF2026`,
  Sub 15 `DAMMS15`/`STAFFS15`.
- Tot el que descriuen els apartats següents sobre **punts/sancions** aplica només
  als equips amb `usa_puntos = true`.

---

## 0. Modelo operativo actual (lo que manda hoy)

Este apartado **actualiza** cómo funciona la app hoy; donde entre en conflicto con
apartados posteriores (que describen la planificación inicial), manda este §0.

- **El calendario es el centro.** No hay páginas sueltas de "Registrar puntos" ni
  "Asistencia": todo se gestiona **entrando en la sesión** de un día.
- **Sesión de entrenamiento:** disponibilidad (OK / lesión / no vino) + ejercicios
  que puntúan (positivos) + sanciones (del catálogo, negativos).
- **Sesión de partido:** convocatoria (convocado / no convocado) + sanciones (+ ejercicios).
- Los **puntos quedan ligados al evento** (`puntos.evento_id`).
- **Lesionados** salen **premarcados** en las sesiones (no hay que remarcarlos) y la
  **media semanal** se les aplica desde el Panel (solo cuenta puntos de ejercicios;
  las sanciones NO entran en el cálculo).
- **Panel del entrenador:** medias de Wellness/RPE del equipo (gráficas filtrables),
  buscador por valor (ej: fatiga ≥ 8 → jugadores), alertas, carga por demarcación
  (filtrable) y encuestas pendientes.
- **Jugador:** solo ve Inicio (pendientes), Ranking y Mis datos (evolución + desglose
  de sus puntos con el motivo). **Las posiciones no las ven los jugadores.**
- **Alta de jugadores:** solo por el enlace `…/?alta`; en la URL normal solo hay "Entrar".

---

## 1. Objectiu

Web d'ús intern per a l'equip **Cadet A del CF Damm** que ajuda els entrenadors
en tres tasques del dia a dia dels entrenaments:

1. **Classificació per punts** (sistema de premis i sancions).
2. **Enquestes de Wellness** (control de l'estat previ a entrenos/partits).
3. **Enquestes de RPE** (percepció d'esforç després d'entrenos/partits).

A més, dona suport a **assistència**, **lesions** i un **panell d'estat de
l'equip** per als entrenadors.

---

## 2. Stack i desplegament

- **Frontend:** aplicació web (React + Vite, en castellà), allotjada **gratis a
  GitHub Pages** amb desplegament automàtic via GitHub Actions.
- **Backend:** **Supabase (free tier)** → Autenticació + base de dades Postgres.
  Tota la lògica de dades viu aquí.
- **Gràfiques:** llibreria de charts al frontend per a les estadístiques.

### Seguretat (important)

Com que el frontend és públic, **la seguretat real la garanteixen les regles
d'accés de Supabase (Row Level Security / RLS)**, no el codi del navegador. Es
configuraran taula per taula:

- Un jugador **només** pot llegir/escriure les seves pròpies enquestes i
  estadístiques.
- La classificació de punts és **pública de lectura** per a tots els usuaris.
- Només els **entrenadors** poden crear/editar punts, esdeveniments, assistència,
  lesions, catàleg de sancions i llindars d'avís.
- Les **posicions** dels jugadors només són visibles per entrenadors.

---

## 3. Usuaris, rols i login

Dos rols: **jugador** i **entrenador (admin)**.

- **Plantilla precarregada:** els noms es carreguen prèviament; ningú es crea de
  zero. Cada nom té el seu rol assignat internament.
- **Alta:** s'entra per un link → s'introdueix un **codi** → es tria el propi nom
  de la llista → es posa **correu + contrasenya**. A partir d'aquí, login normal.
- **Dos codis diferents:**
  - **Codi d'equip** → jugadors → pantalla de jugador.
  - **Codi d'entrenador** → entrenadors → pantalla d'admin.
  - Com que el rol ja ve fixat al nom, un jugador **no** pot accedir a la pantalla
    d'admin encara que conegui el codi d'entrenador.
- **Entrenadors:** Ruben, Xavi i Àlex (surten a la llista de login, amb el codi
  d'entrenador).
- El correu queda vinculat per si en el futur es volen enviar notificacions per
  email (ara **no** s'envien; veure §7).

---

## 4. Plantilla

24 jugadors en total (inclosos 2 porters). Les **posicions** són editables i
**només visibles per entrenadors** (permeten detectar patrons, p.ex. si tota una
línia està carregada físicament).

| # | Jugador | Posició |
|---|---------|---------|
| 1 | Guty | Davanter |
| 2 | Anyhony Mosquera | Davanter |
| 3 | Luis Baena | Extrem esquerre |
| 4 | Santino | Extrem esquerre |
| 5 | Eloi Eslava | Extrem esquerre |
| 6 | Marc Marrahi | Extrem dret |
| 7 | Piero | Extrem dret |
| 8 | Roberston Allister | Interior perfil 10 |
| 9 | Jordi Sala | Interior perfil 10 |
| 10 | Nico Rovira | Interior perfil 8 |
| 11 | Nil Garcia | Interior perfil 8 |
| 12 | Tammer | Pivot |
| 13 | Kaius | Pivot |
| 14 | Gerard Cabero | Pivot |
| 15 | Alexis Martinez | Lateral esquerre |
| 16 | Gerard Milla | Lateral esquerre |
| 17 | Aitor Rodriguez | Lateral dret |
| 18 | Hugo Moreno | Lateral dret |
| 19 | Marc Boixadera | Central esquerrà |
| 20 | Solei | Central esquerrà |
| 21 | Victor Paredes | Central dretà |
| 22 | Nil Esteve | Central dretà |
| 23 | Antoni Capdevila | Porter |
| 24 | Marc Jorquera | Porter |

> Grafies a confirmar amb l'entrenador: *Anyhony* Mosquera, *Roberston Allister*,
> *Marc Marrahi*, i els noms curts/malnoms (*Santino, Piero, Tammer, Kaius, Solei*).

---

## 5. Estètica

Corporativa del **CF Damm**, a partir de l'escut:

- **Vermell Damm:** `#C8102E` (aprox., a ajustar amb codis exactes).
- **Groc / or Damm:** `#F4C300` (aprox.).
- Neutres foscos de suport.

---

## 6. Funcionalitat 1 — Classificació per punts

### 6.1 Objectiu
Rànquing **públic** de tot l'equip. Es veuen punts sumats i restats per separat.
Clicant un jugador es veu el **desglossament**: cada moviment amb **data**,
**punts (+/−)** i **motiu**.

Cada moviment desa **quin entrenador** l'ha registrat i **quan**. Tots els
moviments són **editables/eliminables** pels entrenadors (el reglament és
dinàmic i s'hi cometran errors).

### 6.2 Tres maneres d'introduir punts (còmodes per a l'entrenador)

1. **Catàleg de sancions** (precarregat i editable): botons amb els punts per
   defecte, agrupats per Entrenaments / Partits. Es poden **editar valor i nom,
   desactivar o afegir-ne de nous** (reglament dinàmic).
2. **Registre ràpid:** triar **un o diversos jugadors** → tocar la sanció →
   confirmar. Multi-selecció per aplicar la mateixa sanció a diversos alhora.
3. **Punts d'exercicis (positius):** formulari ràpid per dia d'entrenament per
   assignar els punts guanyats als exercicis que puntuen.
4. **Entrada manual** de punts personalitzats (per a excepcions).

### 6.3 Normes especials del reglament
- **Jugador lesionat:** si no ve als entrenaments, no suma res la setmana; si ve,
  suma la **mitjana** del que han sumat els altres. → Botó **"aplicar mitjana
  setmanal al lesionat"** que calcula i aplica la mitjana d'un clic (no automàtic;
  ho decideix l'entrenador).
- **"Doblar sanció"** (expulsió no esportiva): es fa amb una **entrada manual**.

#### Penalitzacions automàtiques per enquestes
Es descompten sols de la classificació, **per enquesta** (wellness i RPE per
separat, segons les finestres de §7.3 i §8.3):

| Situació | Punts | Motiu al desglossament |
|----------|------:|------------------------|
| Respondre **tard** | −1 | `Wellness/RPE respondido tarde` |
| **No respondre** (enquesta ja tancada) | −2 | `Wellness/RPE sin responder` |

- El **−1** l'aplica un *trigger* en el moment d'enviar la resposta tard.
- El **−2** l'aplica la funció `aplicar_penalizaciones()`, que revisa les enquestes
  ja tancades sense resposta. L'app la crida sola en obrir el **Panel** d'entrenador
  (i, opcionalment, es pot programar amb `pg_cron`).
- **Idempotent i autocorregible:** no es dupliquen mai; i si el jugador acaba
  responent o l'entrenador l'excusa / marca lesionat / no convocat, la penalització
  de "sin responder" es retira sola.
- Només s'apliquen a partir de la data d'inici (config. a la funció; per defecte
  **24/08/2026**). No es toca res anterior.
- No conten per a la mitjana setmanal del lesionat (com la resta de sancions).

### 6.4 Catàleg inicial de sancions (del reglament intern)

**Entrenaments**

| Motiu | Punts |
|-------|------:|
| Llegar tarde | −2 |
| Llegar +5 min tarde | −4 |
| No avisar 2h antes de faltar | −5 |
| Chutar a portería entre ejercicios | −1 |
| "Xepar" a un compañero/entrenador | −10 |
| Romper material del club de forma irresponsable | −5 |
| No traer equipación del club para entrenar | −2 |
| No recoger material (encargado) | −2 |
| Balón colado por encima de la red | −3 |
| Protestar (reiteración) | −1 |
| Protestar (3ª vez, fuera del ejercicio) | −3 |
| No traer merienda de cumpleaños | −10 |

**Partits**

| Motiu | Punts |
|-------|------:|
| Llegar tarde | −2 |
| Llegar +5 min tarde | −4 |
| No venir uniformado al partido | −2 |
| Amarilla por protestar | −3 |
| Amarilla por encararse con un rival | −5 |
| Roja por protestar / pelearse | −10 |
| No ducharse después del partido | −5 |
| Error en jugada de estrategia (posicional) | −3 |
| Lesionado/desconvocado/expulsado que no viene al partido | −5 |

> Valors per defecte; tots editables. Els punts **positius** venen dels exercicis
> que puntuen (via §6.2.3).

---

## 7. Funcionalitat 2 — Wellness

### 7.1 Preguntes (totes 0–10)
| Pregunta | 0 | 10 |
|----------|---|----|
| Calidad del sueño | poco | muy bien |
| Fatiga | muy cansado | nada cansado |
| Dolor muscular (agujetas) | dolorido | sin molestias |
| Estrés | estresado | tranquilo |
| Estado de ánimo | bajo ánimo | buen humor |
| Zona de molestias | *(text opcional)* | |
| Comentario | *(text opcional)* | |

### 7.2 Quan es respon
Al **matí, abans** dels entrenaments (dt/dc/dv) i **abans dels partits**.

### 7.3 Finestres "a temps"
- **Entrenament (dt/dc/dv):** a temps fins les **18:00** del mateix dia.
- **Partit:** a temps fins **1 h 30 min abans** de l'hora marcada al calendari.
  *(Si el partit no té hora definida, es considera a temps mentre sigui el mateix dia.)*

Passat el límit → es pot respondre igualment, però queda **"respondida tarde"**.
El marge màxim per respondre és **fins que acaba el dia** del partit/entrenament;
després l'enquesta **es tanca** i ja **no es pot respondre** (deixa de sortir com
a pendent). Data de referència: **Europe/Madrid**.

---

## 8. Funcionalitat 3 — RPE

### 8.1 Preguntes (totes 0–10)
| Pregunta | 0 | 10 |
|----------|---|----|
| RPE muscular | en reposo | muy fatigado |
| RPE respiratorio (cardio) | en reposo | muy fatigado |

### 8.2 Quan es respon
**Després** dels entrenaments (abans d'anar a dormir) i **després dels partits**.

### 8.3 Finestra "a temps"
- A temps si es respon **abans de les 23:59** del **mateix dia** (entrenament i partit).
- Passat el límit → **"respondida tarde"**, amb marge fins al **final del dia següent**
  (ex.: entrenament dimecres → fins dijous 23:59). Després l'enquesta **es tanca**
  i ja **no es pot respondre**. Data de referència: **Europe/Madrid**.

---

## 9. Calendari i esdeveniments

- **Entrenaments:** dt / dc / dv, generats automàticament.
- **Partits:** els afegeixen els entrenadors, amb **data i hora**.
- Cada esdeveniment demana **Wellness (matí)** i **RPE (després)**.

### Exclusions
- **No convocats a un partit:** no se'ls demana **ni Wellness ni RPE** d'aquell
  partit (no juguen).
- **Lesionats:** no se'ls demana **RPE**; el **Wellness es manté** (seguiment).

---

## 10. Enquestes pendents (campaneta)

- El jugador veu una **campaneta 🔔** amb el nombre d'enquestes pendents quan entra
  a la web.
- Notificacions **només dins l'app** (de moment no s'envia email; el correu queda
  desat per si s'afegeix més endavant sense refer res).

---

## 11. Assistència

Secció per als entrenadors, per esdeveniment. **3 nivells** per jugador:

1. **Tot OK** — predefinit, sempre marcat per defecte.
2. **Lesionat**.
3. **No ha vingut**.

Els entrenadors només marquen les excepcions (ràpid).

---

## 12. Lesions

- Els entrenadors marquen un jugador com a **lesionat amb una durada** (nombre de
  setmanes o fins a una data).
- Mentre dura la lesió:
  - queda **automàticament** marcat com a **lesionat** a l'assistència (no cal
    repetir-ho cada dia),
  - **no se li demana RPE**; el **Wellness es manté**,
  - enllaça amb la norma del reglament (botó "aplicar mitjana setmanal").
- En passar la data, torna **automàticament** a actiu.

---

## 13. Estadístiques del jugador (privat)

- Cada jugador veu **només** les seves estadístiques: evolució de Wellness i RPE
  (gràfiques històriques).
- Els entrenadors ho veuen de tots.

---

## 14. Panell d'entrenador

- Estat de l'equip: mitjanes de Wellness / RPE, qui té enquestes pendents.
- **Agrupació per posició** (per detectar línies senceres carregades físicament).
- **Avisos de pics:** llindars **configurables** pels entrenadors en un panell
  propi (p.ex. "avisar si RPE muscular ≥ 9" o "si sueño ≤ 2"). No van fixos.
- Gestió de: catàleg de sancions, esdeveniments/partits, assistència, lesions,
  posicions.

---

## 15. Model de dades (previst a Supabase)

| Taula | Contingut |
|-------|-----------|
| `equipo` | **Una fila per equip:** nom, codis d'accés (equip / entrenador) i **`usa_puntos`**. |
| `perfiles` | Usuaris: **`equipo_id`**, nom, rol (jugador/entrenador), posició, correo, user_id. |
| `eventos` | **`equipo_id`**, entrenos (auto dt/dc/dv) i partits (amb data/hora). |
| `convocatorias` | No convocats per partit (exclusió d'enquestes). |
| `motivos_puntos` | **`equipo_id`**, catàleg de sancions/premis, editable. |
| `puntos` | Moviments +/−: jugador, punts, motiu, data, registrat_per. |
| `wellness` | Respostes: 5 mètriques + zona + comentari, estat (a temps/tard). |
| `rpe` | Respostes: muscular + respiratori, estat (a temps/tard). |
| `asistencia` | Estat per jugador/esdeveniment (OK / lesionat / no ha vingut). |
| `lesiones` | Períodes de lesió (inici, fi/durada). |
| `reglas_alerta` | **`equipo_id`**, llindars d'avís configurables. |

> Esquema orientatiu; es concreta a la Fase 1 amb les regles RLS.
> Funcions multi-equip: `my_team()`, `same_team()`, `get_mi_equipo()` i el trigger
> `set_equipo_id()`.

---

## 16. Fases de construcció

1. ✅ **Base:** projecte + Supabase + login amb codis + càrrega de plantilla.
2. ✅ **Classificació** (catàleg de sancions).
3. ✅ **Enquestes + calendari + campaneta de pendents.**
4. ✅ **Estadístiques del jugador** (gràfiques + desglossament de punts).
5. ✅ **Panell d'entrenador** (mitjanes d'equip, cerca per valor, càrrega per
   demarcació filtrable, alertes, pendents, mitjana setmanal de lesionats).
6. ✅ **Rediseño visual** (dark premium, Archivo + Hanken, escut oficial).
7. ✅ **Refactor centrat en el calendari** (sessions; fora Puntos i Asistencia
   com a pàgines soltes) + `puntos.evento_id`.
8. ✅ **Desplegat a Vercel** i funcionant.

> Veure `docs/ESTADO.md` §2 per al model operatiu actual (aquest §0 el resumeix).

---

## 17. Pendent de l'entrenador per arrencar

1. ~~Crear el projecte a Supabase i passar URL + clau~~ → fet. Schema executat. ✅
2. ~~Noms dels 2 porters~~ → Antoni Capdevila i Marc Jorquera. ✅
3. **Activar Email + desactivar "Confirm email"** a Supabase (Authentication →
   Providers → Email). ⏳ pendent.
4. Confirmar **grafies** dubtoses dels noms (revisió).
5. Codis de color exactes del club (opcional; si no, s'ajusten a partir de l'escut).
