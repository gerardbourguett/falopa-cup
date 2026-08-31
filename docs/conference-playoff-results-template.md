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

- Atlético Nacional y O'Higgins conservan sus dos partidos ya informados.
- Se cargaron los dos partidos de ADT, Grêmio y Caracas.
- Se cargó el primer partido de Los Chankas; el segundo, ante CD Juan Pablo II el 29 de agosto, permanece como `scheduled` y sin resultado.
- Se cargaron los dos partidos de Aucas y Sporting Cristal.
- Independiente Medellín, Emelec y Racing Club tienen un resultado y un segundo partido `scheduled`.
- UCV, Deportivo Táchira, Nacional, Nacional Potosí y Lanús mantienen sus dos filas en estado `tbd`.

## Puntaje fantasy

El CSV calcula y conserva el desglose de cada resultado en `puntos_base`, `puntos_bonus`, `puntos_penalizacion` y `puntaje_fantasy`. Los totales acumulados visibles en la web son:

| Llave | Club A | FX | Club B | FX | Estado |
| --- | --- | ---: | --- | ---: | --- |
| PO-1 | Atlético Nacional | 3 | O'Higgins | -2 | Final |
| PO-2 | ADT | 3 | Grêmio | 0.75 | Final |
| PO-3 | Los Chankas | -2.5 | Caracas | 3.25 | Provisional |
| PO-4 | Aucas | 3.5 | Independiente Medellín | 0 | Provisional |
| PO-5 | Emelec | -0.5 | Sporting Cristal | 4.25 | Provisional |
| PO-6 | Racing Club | 1.5 | UCV | — | Provisional |

## Convenciones

- Las fechas usan el formato ISO `AAAA-MM-DD`.
- `goles_local` y `goles_visitante` siguen la localía indicada en cada fila.
- Las tarjetas corresponden únicamente al club indicado en `club_participante`.
- El fantasy aplica victoria `+3`, empate `+1`, arco en cero `+1`, margen progresivo, derrota por tres o más goles `-1`, amarilla `-0.25` y roja `-1`.
- `estado` puede ser `played`, `scheduled` o `tbd`.
- Las URL apuntan directamente a la pestaña de estadísticas de cada evento de SofaScore.
