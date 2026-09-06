# Plantilla de resultados del playoff

El archivo [`conference-playoff-results-template.csv`](./conference-playoff-results-template.csv) contiene los **16 clubes de las ocho llaves del playoff**. Cada club dispone de dos filas porque la ronda fantasy se carga como una serie de **ida y vuelta**: `partido_numero` 1 y 2.

El CSV es texto compatible con Excel, LibreOffice Calc y Google Sheets. La marca UTF-8 inicial permite que Excel muestre correctamente nombres como Atlético Nacional, Grêmio, Deportivo Táchira y Nacional Potosí.

## Equipos incluidos

| Llave | Segundo de grupo | Eliminado de Sudamericana |
| --- | --- | --- |
| PO-1 | Atlético Nacional | O'Higgins |
| PO-2 | ADT | Grêmio |
| PO-3 | Los Chankas | Caracas |
| PO-4 | Aucas | Independiente Medellín |
| PO-5 | Emelec | Sporting Cristal |
| PO-6 | Racing Club | UCV |
| PO-7 | Deportivo Táchira | Nacional |
| PO-8 | Nacional Potosí | Lanús |

## Estado de carga

- Los 16 clubes tienen sus dos partidos cargados: las 32 filas del CSV están en estado `played`.
- No quedan filas en `scheduled` ni en `tbd`.
- La ronda está cerrada: `KO-PLAYOFF` figura como `completed` en `2026-knockout.json` y los ocho ganadores ya están propagados a los octavos de final (`KO-R16`), que permanece en `planned` hasta que arranque esa ronda.

## Puntaje fantasy

El CSV calcula y conserva la `diferencia_goles`, si hubo `clean_sheet` y el desglose de cada resultado en `puntos_base`, `puntos_bonus`, `puntos_penalizacion` y `puntaje_fantasy`. Los totales acumulados visibles en la web son:

Todas las llaves están cerradas, con los dos partidos de cada club disputados:

| Llave | Club A | FX | Club B | FX | Clasificado |
| --- | --- | ---: | --- | ---: | --- |
| PO-1 | Atlético Nacional | 3 | O'Higgins | -2 | Atlético Nacional |
| PO-2 | ADT | 3 | Grêmio | 0.75 | ADT |
| PO-3 | Los Chankas | -5.25 | Caracas | 3.25 | Caracas |
| PO-4 | Aucas | 3.5 | Independiente Medellín | 2 | Aucas |
| PO-5 | Emelec | 2 | Sporting Cristal | 4.25 | Sporting Cristal |
| PO-6 | Racing Club | 5 | UCV | 4 | Racing Club |
| PO-7 | Deportivo Táchira | 0 | Nacional | 5 | Nacional |
| PO-8 | Nacional Potosí | 4.25 | Lanús | -1 | Nacional Potosí |

## Convenciones

- Las fechas usan el formato ISO `AAAA-MM-DD`.
- `goles_local` y `goles_visitante` siguen la localía indicada en cada fila.
- Las tarjetas corresponden únicamente al club indicado en `club_participante`.
- El fantasy aplica victoria `+3`, empate `+1`, arco en cero `+1`, margen progresivo, derrota por tres o más goles `-1`, amarilla `-0.25` y roja `-1`.
- En caso de igualdad fantasy, la diferencia de goles, los goles a favor y el descuento disciplinario permanecen disponibles para aplicar los desempates de la llave.
- `estado` puede ser `played`, `scheduled` o `tbd`.
- Las URL apuntan directamente a la pestaña de estadísticas de cada evento de SofaScore.
- Las ocho llaves se resolvieron por puntaje fantasy tras dos partidos; no fue necesario recurrir a los desempates.
