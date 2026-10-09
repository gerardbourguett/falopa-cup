# Conference: actualización de semifinalistas al 9 de octubre de 2026

Base: `origin/main` d0c43b139880840662c95d2fa0dbfc750f6e53c1, después del merge de PR 70. Rama local: `fix/conference-semifinalists-2026-10-09`. Incremento local, sin publicación autorizada.

## Excepción de selección autorizada

El usuario autorizó cargar los dos últimos oficiales anteriores al 9 de octubre para **Alianza Lima, Orense y Metropolitanos**, aunque estén antes de la ventana de cuartos. La excepción identifica seis partidos concretos y no modifica la selección de ADT, General Caballero, Bucaramanga, Universidad de Chile ni Nacional Potosí. La ventana ordinaria sigue siendo 24 de septiembre–15 de octubre, inclusive, y no se extiende esta excepción a otras fases.

Las fechas siguen siendo las reales. Cinco encuentros se reutilizan desde octavos mediante `reusedR16SourceId`, conservando fecha, URL, marcador, tarjetas, condición y rival. No se inventa un horario cuando la evidencia solo contiene fecha.

| Club | Fecha local | Resultado desde el club | TA/TR | Reutilización |
|---|---|---|---|---|
| Alianza Lima | 12 septiembre | 1–2 Universitario | 2/0 | KO-R16-pe-alianza-lima-1 |
| Alianza Lima | 18 septiembre | 2–0 ADT | 0/0 | KO-R16-pe-alianza-lima-2 |
| Orense | 14 septiembre | 1–2 Universidad Católica | 3/0 | KO-R16-ec-orense-2 |
| Orense | 21 septiembre | 1–2 Manta | 3/0 | Ninguna |
| Metropolitanos | 16 septiembre | 3–0 Caracas | 2/0 | KO-R16-ve-metropolitanos-1 |
| Metropolitanos | 20 septiembre | 3–1 Zamora | 4/0 | KO-R16-ve-metropolitanos-2 |

## Fuentes

Cada encuentro conserva sus fuentes exactas en `2026-qf-window.json`. Los IDs históricos se mantienen sin presentarlos como una nueva extracción de API Sofascore.

- Alianza: [12 de septiembre, evento 16280820](https://www.sofascore.com/football/match/alianza-lima-universitario-de-deportes/fWslW#id:16280820), [18 de septiembre, evento 16280829](https://www.sofascore.com/football/match/asociacion-deportiva-tarma-alianza-lima/lWshlJc#id:16280829) y [calendario Liga 1](https://liga1.pe/fixture-y-resultados-del-clausura-liga1-te-apuesto-2026/).
- Orense–Católica: [evento 15502691](https://www.sofascore.com/football/match/orense-sc-universidad-catolica-del-ecuador/RNisAalc#id:15502691), [Primicias](https://www.primicias.ec/deportes/ligapro/universidad-catolica/envivo-orense-resultado-ver-partido-tv-132538/).
- Manta–Orense: [FootballNation](https://footballnation.eu/match/ligapro-serie-a/2026/812232/), [Primicias](https://www.primicias.ec/deportes/ligapro/manta/envivo-orense-fecha1-hexagonal-descenso-resultado-ver-partido-tv-132845/) y [LiveSoccerTV](https://www.livesoccertv.com/match/manta-vs-orense/1oa6sw). Tres amarillas de Orense: Velasco, Achilier y Parrales. Sin ID Sofascore inventado.
- Metropolitanos–Caracas: [evento 17093892](https://www.sofascore.com/es/football/match/metropolitanos-caracasc/FzcsFZob#id:17093892), [Caracas FC](https://www.caracasfutbolclub.com/read/caracas-tropezo-ante-metropolitanos-en-el-olimpico).
- Zamora–Metropolitanos: [evento 16774716](https://www.sofascore.com/football/match/metropolitanos-zamora/MzcsFZob#id:16774716), [Liga FUTVE](https://ligafutve.org/metropolitanos-no-dudo-y-esta-a-punto-de-amarrar-la-acumulada/) y [Comunidad FUTVE](https://comunidadfutve.com/partido/zamora-fc-vs-metropolitanos-fc-cl2026/). Se excluye la roja del técnico Stifano de las sanciones de jugadores.

## Corrección proporcionada por el usuario

El usuario resolvió explícitamente las amarillas de General Caballero: «Tuvo 3 amarillas el primer partido de General Caballero (la derrota 3 a 1), en el segundo partido fue 2 amarillas». Se cargan **3 y 2**, con **0 rojas** en ambos según las fuentes anteriores. La procedencia es la corrección del usuario, no una nueva acta oficial. Estos dos partidos dejan de tener tarjetas pendientes en los datos del proyecto.

Las fuentes históricas discrepantes siguen enlazadas: [APF, 3 de Noviembre](https://www.apf.org.py/noticias/el-3-sale-victorioso-de-ka-arendy) listaba dos amarillas, mientras [Betmines](https://betmines.com/es/partidos/pronosticos-general-caballero-jlm-3-de-noviembre_19885258) informaba cuatro. [APF, Fernando de la Mora](https://www.apf.org.py/noticias/el-rojo-mallorquino-festeja-en-el-barrio-palomar) listaba una y [SportScore](https://www.sportscore.mx/football/match/club-fernando-de-la-mora-vs-general-caballero-jlm/6ypq3nhk64evmd7/) informaba dos. No se atribuyen a esas fuentes los nuevos valores fijados por el usuario.

Cálculo: derrota 1–3 = −0,75; victoria 2–0 = 3 + 1 por margen + 1 por arco invicto − 0,50 = 4,50; total **3,75**.

## Cuadro resultante

| Llave | Puntajes | Clasificado |
|---|---|---|
| QF-1 | Alianza 4,50; ADT −1,75 | Alianza Lima |
| QF-2 | Orense −1,50; General Caballero 3,75 | General Caballero |
| QF-3 | Metropolitanos 8,50; Bucaramanga 5,25 | Metropolitanos |
| QF-4 | Universidad de Chile 3,50; Nacional Potosí 13,00 | Nacional Potosí |

Cuartos: 16 partidos jugados, cuatro clasificados, estado `completed`. SF-1 recibe QF-1 y QF-2: **Alianza Lima–General Caballero**. SF-2 recibe QF-3 y QF-4: **Metropolitanos–Nacional Potosí**. Semifinales permanecen `planned`, sin resultados, fechas reales ni ganadores inventados; final sin participantes todavía.

## Límites y verificación

Los ceros disciplinarios de Potosí siguen dependiendo de fuentes secundarias, según la auditoría anterior. No se modifican los partidos de los otros cinco clubes, salvo las amarillas de Caballero solicitadas. Falopa Cup, Copa REDACTED/Pablo Milad y octavos permanecen como en main.

Se conserva el soporte de incertidumbre: `null` no confirma cero; dos partidos completos con tarjetas pendientes producen una cota superior, y un partido faltante produce un total parcial. Los escenarios disciplinarios informados se distinguen de un total completo y no constituyen límites para cualquier futura acta. Caballero ya no necesita ese tratamiento en este conjunto de datos.

La auditoría anterior en `CONFERENCE_CUARTOS_2026-10-09.md` queda como historial. Las pruebas comprueban los ocho totales, los seis encuentros autorizados, las cinco reutilizaciones, los cruces fijos y el rechazo de resultados futuros o evidencia alterada.

Verificación final del 9 de octubre:

- `tsx scripts/validate-content.ts`: integridad correcta.
- `vitest run`: 5 archivos, **165 pruebas aprobadas**.
- `astro check`: **0 errores, 0 warnings y 3 hints previos** (BaseHead y dos símbolos sin uso en Conference).
- `astro build`: **12 páginas**, correcto.
- Comprobación del HTML generado: 16 partidos jugados, ocho totales, Caballero TA 3/2 y FX −0,75/4,50; semifinales con participantes y sin puntajes. Regresión de Falopa Cup, REDACTED y octavos correcta. Comparación con main: intactos los otros cuatro clubes de cuartos, fechas/marcadores/rojas de Caballero y fases ajenas.
- `git diff --check`: correcto. El repositorio no define un script de lint separado. Se ejecutaron los binarios locales equivalentes de los gates; el wrapper de pnpm había quedado bloqueado por scripts de dependencias no aprobados, sin modificar esa configuración. No se realizó inspección de píxeles en navegador.
