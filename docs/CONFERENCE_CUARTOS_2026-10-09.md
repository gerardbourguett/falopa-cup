# Conference League Sudamericana: cuartos al 9 de octubre de 2026

Base de trabajo: `origin/main` 836859580c926a21da6fa79e89e65dc020156dc5, posterior al merge de PR 69. Rama local: `fix/conference-quarterfinals-2026-10-09`. Este incremento solo afecta cuartos de Conference; los cambios de Falopa Cup, Copa REDACTED/Pablo Milad y octavos de PR 69 se conservan. No se publica este incremento.

## Alcance autorizado y selección

Ventana **24 de septiembre–15 de octubre inclusive**, por fecha local de la sede. El usuario amplió solo el cierre de cuartos desde el 8 al 15. Se mantienen el inicio, los primeros dos partidos oficiales de todas las competiciones y el cuadro fijo. Sin amistosos, extensión automática, ceros sintéticos ni aplicación de la excepción ADT–Cienciano de octavos.

Correcciones de selección: Cusco–Alianza pasa del 8 al 11 de octubre; ADT–Cajamarca pasa al 10 y es tercero, de modo que cuentan las dos semifinales ante Cristal; Orense–Cuenca y Metropolitanos–Rayo entran en el cierre ampliado. Los nuevos encuentros sin ID confirmado usan fuentes externas exactas sin inventar ni reutilizar IDs. Los IDs históricos conservados no se presentan como nueva consulta de API Sofascore.

## Resultados y puntos

Los marcadores se expresan desde el participante. TA/TR incluyen jugadores, no cuerpo técnico. `?` indica dato desconocido y `—` partido futuro o espacio pendiente.

| Llave | Club | Fecha local | Rival / condición | Marcador | TA | TR | FX |
|---|---|---|---|---|---|---|---|
| QF-1 | Alianza Lima | 2026-10-11 | Cusco FC / visita | — | — | — | — |
| QF-1 | Alianza Lima | Por verificar | Segundo espacio | — | — | — | — |
| QF-1 | ADT | 2026-09-27 | Sporting Cristal / local | 0–1 | 1 | 0 | -0.25 |
| QF-1 | ADT | 2026-10-01 | Sporting Cristal / visita | 0–5 | 2 | 0 | -1.5 |
| QF-2 | Orense | 2026-10-11 | Deportivo Cuenca / local | — | — | — | — |
| QF-2 | Orense | Por verificar | Segundo espacio | — | — | — | — |
| QF-2 | General Caballero JLM | 2026-09-25 | 3 de Noviembre / local | 1–3 | ? | 0 | ≤ 0 |
| QF-2 | General Caballero JLM | 2026-10-05 | Fernando de la Mora / visita | 2–0 | ? | 0 | ≤ 5 |
| QF-3 | Metropolitanos | 2026-10-10 | Deportivo Rayo Zuliano / local | — | — | — | — |
| QF-3 | Metropolitanos | Por verificar | Segundo espacio | — | — | — | — |
| QF-3 | Atlético Bucaramanga | 2026-09-25 | Once Caldas / visita | 3–1 | 5 | 0 | 2.75 |
| QF-3 | Atlético Bucaramanga | 2026-10-04 | Junior Barranquilla / local | 3–1 | 2 | 1 | 2.5 |
| QF-4 | Universidad de Chile | 2026-09-24 | Everton de Viña del Mar / visita | 1–0 | 4 | 0 | 3 |
| QF-4 | Universidad de Chile | 2026-09-27 | Everton de Viña del Mar / local | 1–1 | 2 | 0 | 0.5 |
| QF-4 | Nacional Potosí | 2026-09-25 | Always Ready / local | 9–0 | 0 | 0 | 12 |
| QF-4 | Nacional Potosí | 2026-09-30 | Real Tomayapo / visita | 1–1 | 0 | 0 | 1 |

| Llave | Puntajes | Resolución |
|---|---|---|
| QF-1 | Alianza pendiente; ADT −1.75 | Pendiente |
| QF-2 | Orense pendiente; General Caballero ≤ 5.00 | Pendiente |
| QF-3 | Metropolitanos pendiente; Bucaramanga 5.25 | Pendiente |
| QF-4 | Universidad de Chile 3.50; Nacional Potosí 13.00 | Nacional Potosí → SF-2, slot B |

Diez jugados, tres programados y tres espacios pendientes. La ronda está `in-progress`, con una llave resuelta. Semifinales siguen `planned`; solo se completa el slot proveniente de QF-4. Un partido pendiente no equivale a cero puntos. Un solo jugado sería un subtotal parcial, nunca una cota final.

## Evidencia por club

### Alianza Lima (QF-1)

Cusco–Alianza reprogramado al 11 de octubre. Atlético Grau (17 de octubre) queda fuera; segundo espacio pendiente de verificación.

[Calendario / selección](https://liga1.pe/fixture-y-resultados-del-clausura-liga1-te-apuesto-2026/). Total: **Pendiente**.

- **2026-10-11: Cusco FC–Alianza Lima**, Liga 1 · Clausura F11, programado. Programación oficial de Liga 1; ID histórico conservado, sin reextraer API Sofascore.
  [Fuente 1](https://liga1.pe/fixture-y-resultados-del-clausura-liga1-te-apuesto-2026/)

### ADT (QF-1)

Cajamarca fue reprogramado al 10 de octubre y pasa a ser tercero. Los primeros dos son las semifinales de Copa de la Liga del 27 de septiembre y 1 de octubre. ADT–Cienciano del 23 de septiembre permanece exclusivamente en octavos por la excepción autorizada.

[Calendario / selección](https://liga1.pe/fixture-y-resultados-del-clausura-liga1-te-apuesto-2026/). Total: **−1.75**.

- **2026-09-27: ADT–Sporting Cristal**, Copa de la Liga · Semifinal, ida, jugado. La ruta de Scores24 conserva una fecha antigua; el contenido identifica el 27 de septiembre.
  [Fuente 1](https://scores24.live/es/soccer/m-23-09-2026-sporting-cristal-ad-tarma);   [Fuente 2](https://libero.pe/futbol-peruano/sporting-cristal/2026/09/26/sporting-cristal-vs-adt-en-vivo-gratis-partido-de-copa-de-liga-caliente-via-bicolor-1258894)
- **2026-10-01: Sporting Cristal–ADT**, Copa de la Liga · Semifinal, vuelta, jugado. Narváez 18 y Rugel 36; no se reusa el ID de la ida ni se inventa uno para la vuelta.
  [Fuente 1](https://www.clubsportingcristal.pe/futbol-profesional/941-estamos-en-la-final);   [Fuente 2](https://www.zerozero.pe/en-vivo/2026-10-01-sporting-cristal-adt/12650876);   [Fuente 3](https://www.365scores.com/es/football/match/league-cup-9051/adt-tarma-sporting-cristal-8420-57393-9051)

### Orense (QF-2)

Cuenca entra por el cierre ampliado. Manta–Orense se jugó el 21 de septiembre y queda fuera por el inicio; Mushuc Runa (19 de octubre) queda fuera por el cierre. Segundo espacio pendiente. No se inventa un ID de Sofascore para el encuentro nuevo.

[Calendario / selección](https://www.ecuavisa.com/amp/futbol-nacional/orense-deportivo-cuenca-fecha-hora-ecuavisa-fecha2-hexagonal-descenso-ligapro-20261007-0094.html). Total: **Pendiente**.

- **2026-10-11: Orense–Deportivo Cuenca**, LigaPro · Hexagonal de descenso F2, programado. Fecha y horario publicados; sin resultado anticipado.
  [Fuente 1](https://www.ecuavisa.com/amp/futbol-nacional/orense-deportivo-cuenca-fecha-hora-ecuavisa-fecha2-hexagonal-descenso-ligapro-20261007-0094.html)

### General Caballero JLM (QF-2)

Dos resultados oficiales contrastados con APF. Las amarillas discrepantes impiden confirmar el total; máximo 5 puntos, no 4.25 confirmado.

[Calendario / selección](https://www.besoccer.es/equipo/partidos/general-caballero-jlm). Total: **≤ 5.00, amarillas pendientes**.

- **2026-09-25: General Caballero–3 de Noviembre**, División Intermedia F26, jugado. APF confirma 1–3 y enumera dos amarillas; fuentes secundarias discrepan con tres/cuatro. Sin acta exhaustiva, amarillas desconocidas. Cero rojas explícito en fuente secundaria.
  [Fuente 1](https://www.apf.org.py/noticias/el-3-sale-victorioso-de-ka-arendy);   [Fuente 2](https://betmines.com/es/partidos/pronosticos-general-caballero-jlm-3-de-noviembre_19885258)
- **2026-10-05: Fernando de la Mora–General Caballero**, División Intermedia F27, jugado. APF confirma 0–2 y enumera una amarilla; SportScore indica dos. Sin acta exhaustiva, amarillas desconocidas. Cero rojas explícito en fuente secundaria.
  [Fuente 1](https://www.apf.org.py/noticias/el-rojo-mallorquino-festeja-en-el-barrio-palomar);   [Fuente 2](https://www.sportscore.mx/football/match/club-fernando-de-la-mora-vs-general-caballero-jlm/6ypq3nhk64evmd7/)

### Metropolitanos (QF-3)

Rayo Zuliano se programa para el 10 de octubre a las 19:30 en Caracas. Segundo espacio pendiente. Copa Venezuela está en fase de grupos y Metropolitanos entra en octavos; no se confirmó otro partido elegible. No se inventa un ID de Sofascore.

[Calendario / selección](https://comunidadfutve.com/club/deportivo-rayo-zuliano/). Total: **Pendiente**.

- **2026-10-10: Metropolitanos–Deportivo Rayo Zuliano**, Liga FUTVE · Clausura F12, programado. Fecha y horario publicados; sin resultado anticipado.
  [Fuente 1](https://comunidadfutve.com/partido/metropolitanos-fc-vs-deportivo-rayo-zuliano-cl2026/)

### Atlético Bucaramanga (QF-3)

Primeros dos encuentros oficiales; disciplina de jugadores, sin sanciones del cuerpo técnico.

[Calendario / selección](https://es.besoccer.com/equipo/partidos/atletico-bucar). Total: **5.25**.

- **2026-09-25: Once Caldas–Atlético Bucaramanga**, Liga DIMAYOR · Finalización F12, jugado. Cinco amarillas a jugadores; se excluye la del entrenador Javier Tetes. Fecha local 25 de septiembre, 26 en UTC.
  [Fuente 1](https://www.fotmob.com/es/matches/bucaramanga-vs-once-caldas/wcxx9);   [Fuente 2](https://www.tycsports.com/colombia/futbol-de-colombia/colombia-primera-division-ii-2026-once-caldas-vs-bucaramanga-fecha-12-id762663.html);   [Fuente 3](https://betora.app/es/resultado/colombia-primera-a/once-caldas-vs-bucaramanga-2026-09-26)
- **2026-10-04: Atlético Bucaramanga–Junior Barranquilla**, Liga DIMAYOR · Finalización F13, jugado. Roja directa a José García; dos amarillas a jugadores.
  [Fuente 1](https://caracol.com.co/2026/10/04/en-vivo-bucaramanga-contra-junior-por-liga-colombiana-hoy-transmision-y-minuto-a-minuto/?omnil=mod_resul);   [Fuente 2](https://betora.app/es/resultado/colombia-primera-a/bucaramanga-vs-junior-2026-10-04);   [Fuente 3](https://dimayor.com.co/2026/10/05/atletico-bucaramanga-vs-junior-fc-2/)

### Universidad de Chile (QF-4)

Dos partidos de Copa Chile confirmados por actas. Antofagasta (7 de octubre) es posterior y no reemplaza los primeros dos.

[Calendario / selección](https://www.sofascore.com/api/v1/team/3161/events/next/0). Total: **3.50**.

- **2026-09-24: Everton de Viña del Mar–Universidad de Chile**, Copa Chile · Octavos, ida, jugado. Inicio oficial el 24 de septiembre; suspendido y completado el 27 antes de la vuelta. Se conserva la fecha de inicio, sin excepción de ventana.
  [Fuente 1](https://www.campeonatochileno.cl/match/everton-universidad-de-chile-2026-09-24/);   [Fuente 2](https://www.campeonatochileno.cl/wp-content/uploads/2026/09/Informe-Arbitro-COPA-CHILE-EVERTON-UNIVERSIDAD-DE-CHILE.pdf);   [Fuente 3](https://www.udechile.cl/noticias/copa-chile-con-un-gol-de-juan-martin-lucero-tomamos-la-ventaja-en-la-llave-ante-everton)
- **2026-09-27: Universidad de Chile–Everton de Viña del Mar**, Copa Chile · Octavos, vuelta, jugado. Acta: Hormazábal 77 y Marcelo Díaz 88. Fernando Gago 63 figura como cuerpo técnico y no cuenta. Sin rojas a jugadores.
  [Fuente 1](https://www.campeonatochileno.cl/wp-content/uploads/2026/09/Informe-Arbitro-COPA-CHILE-UNIVERSIDAD-DE-CHILE-EVERTON.pdf)

### Nacional Potosí (QF-4)

Real Potosí (22 de septiembre) queda fuera. Los partidos de copa del 3 y 8 de octubre son posteriores a los dos seleccionados.

[Calendario / selección](https://www.sofascore.com/api/v1/team/47700/events/next/0). Total: **13.00**.

- **2026-09-25: Nacional Potosí–Always Ready**, Copa Bolivia · Ronda 5, jugado. Cero amarillas y cero rojas explícitos en el registro secundario de Tribuna; no se dispone de acta FBF.
  [Fuente 1](https://brujuladigital.net/deportes/2026/09/25/always-ready-pasa-vergenza-nacional-le-aplasta-con-un-9-a-0--66893);   [Fuente 2](https://tribuna.com/es/match/102903336/)
- **2026-09-30: Real Tomayapo–Nacional Potosí**, Copa Bolivia · Ronda 6, jugado. Cero amarillas y cero rojas explícitos en registros secundarios; no se dispone de acta FBF.
  [Fuente 1](https://diez.bo/futbol/tomayapo-ganaba-a-nacional-pero-cede-un-empate-a-los-100-minutos_1790815652);   [Fuente 2](https://tribuna.com/es/match/102903346/);   [Fuente 3](https://www.sportscore.mx/football/match/nacional-potosi-vs-real-tomayapo/pxwrxlhyk4l8ryk/)

## Límites y decisiones pendientes

- Alianza, Orense y Metropolitanos: segundo espacio aún sin fecha oficial verificable dentro de la ventana. No se concluye ausencia definitiva de actividad. Sus primeros encuentros son futuros al corte del 9 de octubre.
- General Caballero: APF enumera 2 amarillas ante 3 de Noviembre y 1 ante Fernando de la Mora; secundarios ofrecen 3/4 y 2. No hay acta exhaustiva que resuelva el conflicto. Se conserva `yellowCards: null` en ambos y `redCards: 0` confirmado por registros secundarios. El máximo es 5.00; no se publica 4.25 como verificado.
- Nacional Potosí: 0 TA/0 TR explícitos en registros secundarios para ambos encuentros; no son ceros inferidos de silencio. No se consiguió acta FBF y los enlaces directos de Tribuna pueden responder 403; la disciplina depende de la evidencia secundaria consultada.
- Universidad de Chile: actas descargadas y página 2 inspeccionada visualmente. Ida: Guerrero, Ramírez, Lucero y Aránguiz; vuelta: Hormazábal y Marcelo Díaz. Gago está en la sección de cuerpo técnico y se excluye. La ida se inició el 24 y se completó el 27 antes de la vuelta; se conserva la fecha oficial de inicio.
- Bucaramanga: 5 TA ante Once Caldas, excluyendo a Javier Tetes; 2 TA y roja directa a José García ante Junior.
- No se inventa un desempate para igualdad/cotas superpuestas. Esos casos requieren revisión; el caso actual QF-4 se resuelve por total.
- No fue posible una revisión en navegador: el entorno no ofrece superficies CUA. Se verifica el HTML generado y las actas PDF visualmente.

## Verificación

- `tsx scripts/validate-content.ts`: pasó la integridad de contenido.
- `vitest run`: 160 tests pasaron en 5 archivos; cubre resultados, tarjetas desconocidas, fuentes obligatorias, rechazo de resultados futuros, ventana local hasta el 15, selección de ADT, cómputo de puntos, avance exclusivo de QF-4 y conservación de los slots de semifinales.
- `astro check`: 0 errores, 0 warnings, 3 hints preexistentes (JSON-LD de BaseHead y dos símbolos sin uso).
- `astro build`: 12 páginas generadas correctamente.
- Verificador del HTML: 10 filas jugadas, 3 futuras y 3 pendientes; futuros/pendientes sin goles, tarjetas o FX; General Caballero con `?` y cota; QF-4 avanza sola.
- `git diff --check`: pasó. No hay script lint en el repositorio.

Los wrappers de pnpm se bloquearon por scripts de dependencias sin aprobar (`ERR_PNPM_IGNORED_BUILDS`); se ejecutaron los mismos binarios locales y gates explícitos sin modificar políticas ni credenciales. Las tarjetas y fechas de otros torneos conservan la verificación de PR 69; este incremento no vuelve a auditar sus historiales completos.
