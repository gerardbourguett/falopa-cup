# Corrección de resultados y actualización al 9 de octubre de 2026

Base: `317f3f5da0599b8783922178d16b63686474aadb`, obtenida de `origin/main`.
Trabajo local en `fix/results-cups-2026-10-09`, en una copia aislada creada
en MMLV-001; no se encontró un checkout previo en las rutas revisadas.
Este informe registra la preparación y verificación local. La subida de la rama
y apertura de un PR en borrador se autorizaron posteriormente; no se autorizó
merge ni despliegue manual.

## Torneos y reglas

Falopa Cup y Copa REDACTED son historiales independientes de título itinerante.
REDACTED conserva el identificador y ruta `copa-pablo-milad`.
Según README e historiales, Falopa transfiere por derrota del defensor;
REDACTED transfiere por victoria del defensor. Los empates retienen el título;
cuando hay definición por penales, se usa su ganador.
La CLI tenía la regla de Falopa para ambas copas: ahora consume la función pura
compartida `computeNewHolder`, con pruebas separadas de ambas reglas.
No se reescriben historiales anteriores para acomodarlos a la CLI.

Los cinco eventos auditados pertenecen a la **Conference League Sudamericana**,
que tiene modelo y puntajes propios; no se aplican las reglas itinerantes.

## Falopa Cup

- Se documentan los encuentros Audax–Colo Colo del 22 y 25 de septiembre como
  ida y vuelta de octavos de Copa Chile. El 25 estaba rotulado erróneamente como
  Liga de Primera. Marcadores y transferencia permanecen: 0-0 y Audax 0-1 Colo Colo.
- El pendiente del 29 de septiembre se cierra: Puerto Montt 0-1 Colo Colo.
  Colo Colo conserva la copa, cuyo reinado comenzó el 25 de septiembre.
- Se añade el próximo pendiente del portador: Coquimbo-Colo Colo, 11 de octubre.
- La vuelta iniciada el 6 de octubre fue suspendida al descanso con 1-0 parcial.
  Se representa como pendiente, sin goles finales ni `newHolderId`, en la fecha
  oficial de reanudación del 20 de octubre. La tarjeta muestra la suspensión y
  explica la fecha. Requiere reevaluar el defensor si otro partido transfiere
  la copa antes de la reanudación; no se anticipa un resultado.

Fuentes:

- [ANFP: ida de octavos, 22/09](https://www.campeonatochileno.cl/match/audax-italiano-colo-colo-2026-09-22/).
- [ANFP: vuelta de octavos, 25/09](https://www.campeonatochileno.cl/match/colo-colo-audax-italiano-2026-09-25/).
- [ANFP: Puerto Montt–Colo Colo, 29/09](https://www.campeonatochileno.cl/match/deportes-puerto-montt-colo-colo-2026-09-29/).
- [ANFP: Coquimbo-Colo Colo, 11/10](https://www.campeonatochileno.cl/match/coquimbo-unido-colo-colo-2026-10-11/).
- [ANFP: vuelta reprogramada](https://www.campeonatochileno.cl/match/colo-colo-deportes-puerto-montt-2026-10-20/).
- [Cooperativa: suspensión y reanudación, 07/10](https://www.cooperativa.cl/noticias/deportes/futbol/copa-chile/colo-colo-y-puerto-montt-tienen-fecha-para-reanudar-su-partido-de-copa/2026-10-07/183216.html).

## Copa REDACTED / Pablo Milad

- Se cierra el pendiente del 30 de septiembre: Unión San Felipe 0-1 San Luis,
  fecha 25 aplazada del Ascenso.
- Se añade Unión San Felipe 0-2 Deportes Iquique del 4 de octubre, fecha 16
  aplazada. Al perder ambos encuentros, San Felipe retiene la copa.
- El inicio del reinado permanece en el 26 de septiembre.
- Se añade el próximo pendiente del portador: Rangers-San Felipe, 12 de octubre.

Fuentes:

- [ANFP: San Felipe–San Luis, 30/09](https://www.campeonatochileno.cl/match/uni%C3%B3n-san-felipe-san-luis-2026-09-30/).
- [Club Unión San Felipe: San Felipe–Iquique, 04/10](https://www.unionsanfelipe.com/sport-event/union-san-felipe-vs-iquique-2/).
- [ANFP: San Felipe–Iquique, 04/10](https://www.campeonatochileno.cl/match/uni%C3%B3n-san-felipe-deportes-iquique-2026-10-04/).
- [ANFP: Rangers-San Felipe, 12/10](https://www.campeonatochileno.cl/match/rangers-de-talca-uni%C3%B3n-san-felipe-2026-10-12/).
- [Cooperativa: fecha 16 aplazada, 04/10](https://www.cooperativa.cl/noticias/deportes/futbol/liga-de-ascenso/ascenso-deportes-iquique-tumbo-a-union-san-felipe-y-lo-mantuvo/2026-10-04/181825.html).

## Conference: cinco correcciones, sin cambiar la selección

| Evento | Fecha local | Resultado confirmado | Disciplina del participante | FX del partido |
| --- | --- | --- | --- | --- |
| 15502678 | 07/09 | Orense 4-3 Guayaquil City | 2 TA, 0 TR | 2,50 |
| 17032436 | 08/09 | General Caballero JLM 2-1 Resistencia | 2 TA, 0 TR | 2,50 |
| 16873750 | 09/09 | Racing Montevideo 2-4 Central Español | TA desconocidas, 0 TR | ≤ 0,00 |
| 16923847 | 10/09 | Astillero 0-1 Católica de Ecuador | TA desconocidas, 1 TR | ≤ 3,00 |
| 16767455 | 09/09 | Real Oruro 0-2 Nacional Potosí | 1 TA, 0 TR | 4,75 |

Se conservan las URL con ID exacto de Sofascore en las filas, para no romper
su identificación y el control de no reutilización en cuartos. Estos enlaces
se complementan con las fuentes de contraste siguientes:

- [Sofascore: Orense–Guayaquil City](https://www.sofascore.com/es/football/match/orense-sc-guayaquil-city/aCAbsAalc#id:15502678),
  [LigaTable](https://ligatable.com/es/futbol/ecuador/liga-pro/2026-09-08/orense-sc-vs-guayaquil-city-fc-1519486).
  Se conserva el 7 de septiembre local: el evento empieza el 8 a las 00:00 UTC.
- [APF, informe oficial General Caballero–Resistencia](https://www.apf.org.py/noticias/el-rojo-suma-de-a-tres):
  las dos amonestaciones del defensor son Juan Martínez y Enzo Alegre.
- [Sofascore: Racing–Central Español](https://www.sofascore.com/es/football/match/racing-de-montevideo-central-espanol/Hobskak#id:16873750),
  [365Scores](https://www.365scores.com/es/football/match/copa-uruguay-7847/central-espanol-racing-club-montevideo-7087-10193-7847),
  [Offside Scores](https://offsidescores.com/es/futbol/partido/racing-club-montevideo-central-espanol-fc-20260909/a50a115e-e6c9-4df6-9066-e3a0998e2b84/detalle).
  La auditoría previa detectó 3 frente a 2 TA. En la consulta actual Offside
  muestra 3-2 para ambos equipos, pero no se encontró acta oficial que cierre
  la discrepancia; se mantiene `null` en amarillas de Racing.
- [Ecuavisa: Astillero–Católica](https://www.ecuavisa.com/futbol-nacional/universidad-catolica-vencio-astillero-fc-avanzo-semifinales-copa-ecuador-20260910-0074.html):
  0-1 y roja directa a Luis Cangá; no informa el total de amarillas.
- [El Potosí: Real Oruro–Nacional Potosí](https://elpotosi.net/deporte/20260910_nacional-gana-y-es-el-lider-del-grupo-b.html),
  [Scores24: evento del 09/09](https://scores24.live/es/soccer/m-09-09-2026-cdt-real-oruro-nacional-potosi):
  0-2, amarillas 3-1, rojas 0-0. No se usa el partido inverso de octubre.

El cálculo conserva la fórmula: victoria +3, empate +1, margen ganador a partir
del segundo gol, arco invicto +1, derrota por ≥3 goles −1, TA −0,25 y TR −1.
Las tarjetas `null` se calculan en cero, por lo que el resultado es una **cota
superior**, visible con asterisco; sí se descuenta cualquier tarjeta confirmada.

| Llave | A | B | Clasificado conservado |
| --- | --- | --- | --- |
| R16-1 | Alianza Lima 4,50 | Atlético Nacional 4,00 | Alianza Lima |
| R16-2 | Zamora −1,50 | ADT 1,00 | ADT |
| R16-3 | Orense 1,75 | Caracas −0,50 | Orense |
| R16-4 | General Caballero 5,00 | Aucas 1,00 | General Caballero |
| R16-5 | Metropolitanos 8,50 | Sporting Cristal 5,50 | Metropolitanos |
| R16-6 | Bucaramanga 7,75 | Racing ≤2,75 | Bucaramanga |
| R16-7 | Universidad de Chile 8,75 | Nacional 1,25 | Universidad de Chile |
| R16-8 | Católica ≤6,00 | Nacional Potosí 10,50 | Nacional Potosí |

No cambian los ocho clasificados ni sus referencias en cuartos. Se actualizan
las explicaciones de R16-6 y R16-8. La ventana 28/08–20/09 y la excepción
específica ADT–Cienciano del 23/09 se conservan. Su prioridad cronológica
continúa pendiente de revisión: esta corrección no amplía reglas ni selecciona
partidos nuevos. Los otros **23 eventos distintos** (27 filas) no fueron
revalidados, y tampoco los historiales anteriores de las copas itinerantes.

## Verificación

El baseline pasó integridad y falló 1 de 147 pruebas: Bucaramanga figuraba
clasificado con 7,75 frente a 9,75 de Racing según los datos erróneos.
Las regresiones revisadas mantienen el requisito de ventaja: cada ganador
debe tener toda su disciplina conocida y superar incluso la cota de su rival.
Solo se permiten tarjetas pendientes en las dos filas expresamente auditadas.

Los comandos de pnpm están bloqueados por `ERR_PNPM_IGNORED_BUILDS`
(esbuild y sharp); se ejecutan los binarios locales instalados sin aprobar
scripts ni modificar configuración de seguridad. No existe script `lint`.
Se retiró el `pnpm-workspace.yaml` de decisiones de builds que la instalación
generó automáticamente; no se incluye configuración nueva en el cambio.

Resultados finales:

- `node_modules/.bin/tsx scripts/validate-content.ts`: integridad correcta.
- `node_modules/.bin/vitest run`: **154/154 pruebas**, 5 archivos correctos.
- `node_modules/.bin/astro check`: **0 errores, 0 warnings, 3 hints** ya presentes
  (JSON-LD de BaseHead y dos símbolos sin uso en la página Conference).
- `node_modules/.bin/astro build`: correcto, **12 páginas** estáticas.
- `git diff --check`: correcto.

La inspección del HTML generado detectó fechas mostradas un día antes por la
zona horaria del host. Se fija UTC al formatear estas fechas de calendario en
MatchCard, HolderChain, portada y las vistas Conference; no se cambian fechas
de datos ni se interpretan como horarios de partido.

Se verificaron 12 condiciones del HTML construido mediante
`../verify-rendered-results.mjs`: pendientes del 11/12/20 con `VS`, sin nuevo
campeón; texto de suspensión; próximos rivales y fechas de reinado del 25/26
en portada; Racing `2.75*` y `≤ 2.75*`; Católica `6*` y `≤ 6*`; Nacional Potosí
`10.5` y roja mostrada. La explicación antigua de máximo 7 ya no aparece.
La herramienta de navegador informa que no hay ningún navegador disponible;
por tanto **no se realizó inspección de píxeles ni de responsive layout**.
