# Plantilla de resultados del playoff

La plantilla [`conference-playoff-two-match-results.csv`](./conference-playoff-two-match-results.csv) es un archivo de texto compatible con Excel, LibreOffice Calc y Google Sheets. Reemplaza al archivo `.xlsx` binario para que los cambios puedan revisarse directamente en Git.

## Instrucciones

1. Complete únicamente las columnas `fecha_aaaa_mm_dd`, `competicion`, `goles_local`, `goles_visitante`, `amarillas_participante`, `rojas_participante` y `notas`.
2. La fecha debe estar dentro de la ventana válida: **jueves 20 al lunes 24 de agosto de 2026**.
3. Registre en `amarillas_participante` y `rojas_participante` solamente las tarjetas del club indicado en `club_participante`.
4. Use números enteros no negativos para goles y tarjetas.
5. No altere el orden, los clubes ni las URL de SofaScore precargadas.
