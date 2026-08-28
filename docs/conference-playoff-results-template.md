# Plantilla de resultados del playoff

El archivo [`conference-playoff-results-template.csv`](./conference-playoff-results-template.csv) contiene los **16 clubes de las ocho llaves del playoff**. Es un CSV de texto compatible con Excel, LibreOffice Calc y Google Sheets. La marca UTF-8 inicial permite que Excel muestre correctamente nombres como Atlético Nacional, Grêmio, Deportivo Táchira y Nacional Potosí.

## Equipos incluidos

Cada llave aparece en dos filas: el segundo de grupo y el club eliminado de la Copa Sudamericana al que enfrenta.

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

## Cómo completar la plantilla

- Use una fila por club para registrar su partido oficial de la ventana.
- Complete `local`, `visitante`, `fecha_aaaa_mm_dd`, `competicion`, marcador, tarjetas y `url_fuente`.
- La fecha debe seguir el formato ISO `AAAA-MM-DD`.
- Las tarjetas corresponden únicamente al club indicado en `club_participante`.
- Atlético Nacional y O'Higgins ya conservan los partidos válidos proporcionados para el 23 de agosto.
- No cargue como válidos los partidos del 26 de agosto: quedan fuera de la ventana del jueves 20 al lunes 24 de agosto de 2026.
