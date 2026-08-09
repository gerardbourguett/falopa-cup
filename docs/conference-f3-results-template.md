# Plantilla de resultados pendientes — GS-F3 2026

> Si prefieres trabajar con las tres fechas en una sola planilla, usa `conference-all-group-matches.csv`. Ese archivo contiene 64 filas por ronda y distingue datos cargados (`loaded`) de campos pendientes (`todo`). Se regenera con `python scripts/export-conference-matches.py`.

Abre `conference-f3-results-template.csv` con Excel, LibreOffice o Google Sheets y completa únicamente las columnas vacías.

## Campos por completar

- `source_date`: fecha `YYYY-MM-DD`.
- `source_competition`: nombre de la competición y fase/fecha.
- `home_club` / `away_club`: nombres tal como aparecen en la fuente.
- `home_score` / `away_score`: marcador final reglamentario.
- `club_yellow_cards`: amarillas recibidas por el club indicado en `club_name`.
- `club_red_cards`: rojas recibidas por el club indicado en `club_name`.
- `notes`: cualquier aclaración adicional.

No modifiques `order`, `round_id`, `group`, `club_id`, `counted` ni `source_url`: ya están preparados para importar los resultados en el orden correcto.

El partido Rayo Zuliano–Zamora aparece dos veces porque necesita un registro desde la perspectiva de cada club. Las tarjetas deben corresponder al club indicado en cada fila.

Para los tres clubes venezolanos, la primera fila marcada como excepción también se utilizará para cerrar el segundo partido de F2.
