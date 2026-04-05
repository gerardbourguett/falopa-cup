# GDD — Conference League Sudamericana

## 1. Propósito

Este documento define el diseño del nuevo torneo **Conference League Sudamericana** para el repositorio `falopa-cup`.

La expansión debe ser **aditiva**:

- no debe romper **Falopa Cup**,
- no debe romper **Copa Pablo Milad**,
- no debe alterar temporadas históricas existentes,
- y no debe forzar una reescritura completa del motor actual.

El objetivo es darle a Codex y a cualquier colaborador un marco claro para implementar este torneo como una tercera línea de producto dentro del mismo proyecto.

---

## 2. Restricción principal del proyecto

La implementación del nuevo torneo debe respetar esta regla:

> **Agregar sin reemplazar.**

Eso significa:

- conservar `src/content/falopa-cup/` tal como está,
- conservar `src/content/copa-pablo-milad/` tal como está,
- conservar el flujo del CLI actual para ambos torneos,
- y construir la Conference League Sudamericana como una nueva capacidad del sistema.

No se debe tocar el comportamiento existente salvo que sea estrictamente necesario para abstraer algo compartido, y aun así la compatibilidad debe mantenerse.

---

## 3. Qué es la Conference League Sudamericana

La **Conference League Sudamericana** es un torneo ficticio continental basado en clubes reales y partidos reales.

A diferencia de Falopa Cup y Copa Pablo Milad, este torneo **no funciona como un holder-chain** clásico.

En lugar de eso:

- los clubes compiten en **rondas por ventanas de tiempo**,
- cada club presenta un partido oficial real jugado dentro de la ventana,
- y el sistema compara rendimientos para resolver llaves o grupos ficticios.

Es un torneo de comparación paralela, no un torneo con partidos simulados entre esos clubes.

---

## 4. Participantes de la primera edición

La primera edición conceptual considera **53 clubes**.

### 4.1. Cupos base
- 3 clubes por cada país CONMEBOL excepto Brasil y Argentina.
- 1 club de Brasil.
- 1 club de Argentina.

### 4.2. Rebotados continentales
- eliminados de Fase 1 de Libertadores,
- eliminados de Fase 2 de Libertadores,
- eliminados de Fase 1 de Sudamericana.

### 4.3. Fuente de selección
La selección base de clubes se construye usando:

- tabla anual o agregada de la temporada 2025,
- excluyendo a los ya clasificados a Libertadores y Sudamericana 2026,
- más los eliminados tempranos de las copas 2026.

---

## 5. Formato deportivo propuesto

## 5.1. Estructura general
- 53 clubes iniciales.
- Fase previa para bajar a 32.
- Fase principal con 32 equipos.
- Grupos.
- Eliminación directa.

## 5.2. Fase previa
- 11 clubes avanzan directo por mejor coeficiente CONMEBOL.
- 42 clubes juegan una fase previa.
- La fase previa se compone de 21 llaves.
- Los 21 ganadores se suman a los 11 clasificados directos.

Resultado: **32 clubes** para la fase principal.

## 5.3. Fase principal
Formato recomendado:

- 8 grupos de 4 equipos.
- 6 fechas por grupo.
- avanzan los 2 mejores de cada grupo.
- luego: octavos, cuartos, semifinal y final.

Este formato puede ajustarse en el futuro, pero el diseño inicial del sistema debe permitir:

- grupos,
- llaves,
- ventanas,
- y puntajes derivados de partidos reales.

---

## 6. Regla fundamental de simulación

El principal problema del torneo es que los clubes pertenecen a ligas con calendarios distintos.

Por eso, **no se debe usar promedio libre de todos los partidos disputados**, porque eso favorece o castiga según la cantidad de encuentros disponibles en cada país.

La regla base del torneo debe ser:

> Cada club compite con la misma cantidad de partidos contables por ronda.

### Recomendación inicial
- 1 partido oficial contable por club por ronda.
- ventana fija de 14 días.
- si el club juega más de un partido, se toma el primero de la ventana.
- si no juega en la ventana, la ronda debe definir una política explícita.

---

## 7. Sistema de puntaje sugerido

Para cada partido contable:

- victoria = 3 puntos
- empate = 1 punto
- derrota = 0 puntos
- +1 por ganar de visitante
- +1 por ganar por 2 o más goles
- -1 por perder de local

Este sistema debe quedar desacoplado para que pueda ajustarse sin reescribir toda la arquitectura.

---

## 8. Políticas pendientes por cerrar

El sistema debe dejar espacio para definir formalmente estas reglas:

### 8.1. Qué competiciones cuentan
Posibles fuentes válidas:
- liga local,
- copa nacional,
- competiciones CONMEBOL.

### 8.2. Qué hacer si un club no juega en la ventana
Opciones posibles:
- extender búsqueda unos días más,
- marcar partido no presentado,
- asignar 0,
- o reprogramar la resolución.

### 8.3. Desempates en una llave
Orden sugerido:
1. diferencia de gol del partido contable,
2. goles convertidos,
3. condición de visitante,
4. sorteo o criterio administrativo.

### 8.4. Desempates en grupos
Orden sugerido:
1. puntos,
2. diferencia de puntaje fantasy,
3. mayor cantidad de victorias de ronda,
4. mejor diferencia de gol acumulada en partidos contables,
5. mayor puntaje de visitante.

---

## 9. Impacto esperado en el repositorio

La expansión debería introducir nuevas piezas, no reemplazar piezas actuales.

## 9.1. Nuevo contenido
Se recomienda agregar:

```text
src/content/conference-league-sudamericana/
```

Y dentro de esa carpeta, separar por edición o temporada.

Ejemplo:

```text
src/content/conference-league-sudamericana/
├── 2026-clubs.json
├── 2026-stage.json
├── 2026-groups.json
└── 2026-knockout.json
```

La estructura exacta puede variar, pero el contenido del nuevo torneo debe vivir aparte.

## 9.2. Nueva lógica
Se recomienda crear lógica específica en módulos separados, por ejemplo:

```text
src/lib/tournaments/
├── shared/
├── falopa-cup/
├── copa-pablo-milad/
└── conference-league-sudamericana/
```

La lógica existente en `src/lib/tournament.ts` no debe romperse. Puede mantenerse tal como está mientras el nuevo torneo viva en módulos propios.

## 9.3. Nuevas páginas
Se pueden agregar rutas nuevas bajo `src/pages/` para:

- landing del torneo,
- listado de participantes,
- bombos,
- fase previa,
- grupos,
- llaves,
- tabla general o ranking interno.

---

## 10. Modelo conceptual sugerido

Este torneo necesita un modelo diferente al de `MatchEntry` clásico.

## 10.1. Entidades recomendadas

### ClubSeed
Representa a un club participante del torneo.

Campos sugeridos:
- `clubId`
- `country`
- `entryType` (`base`, `libertadores-f1`, `libertadores-f2`, `sudamericana-f1`)
- `conmebolRank`
- `directToMainStage`
- `pot`

### WindowMatchSource
Representa el partido real que un club usa en una ronda.

Campos sugeridos:
- `clubId`
- `roundId`
- `windowStart`
- `windowEnd`
- `sourceCompetition`
- `sourceDate`
- `homeClub`
- `awayClub`
- `goalsFor`
- `goalsAgainst`
- `isHome`
- `counted`

### FantasyScoreResult
Representa el puntaje calculado del club en esa ronda.

Campos sugeridos:
- `clubId`
- `roundId`
- `basePoints`
- `bonusPoints`
- `penaltyPoints`
- `total`
- `explanation`

### KnockoutTie
Representa una llave ficticia.

Campos sugeridos:
- `id`
- `round`
- `clubA`
- `clubB`
- `scoreA`
- `scoreB`
- `winnerClubId`
- `tiebreakReason`

### GroupStandingEntry
Representa una fila de tabla en fase de grupos.

Campos sugeridos:
- `group`
- `clubId`
- `played`
- `wins`
- `draws`
- `losses`
- `points`
- `fantasyFor`
- `fantasyAgainst`
- `fantasyDiff`

---

## 11. Principios técnicos para implementarlo

### 11.1. No forzar el nuevo torneo dentro del modelo antiguo
La Conference League Sudamericana no debe ser modelada a la fuerza como si fuera Falopa Cup.

### 11.2. Reutilizar solo lo que de verdad sea compartido
Sí conviene reutilizar utilidades generales:

- tipos de clubes,
- helpers de fechas,
- funciones de ordenamiento,
- validaciones comunes,
- componentes genéricos de UI.

Pero no conviene fingir que el motor actual sirve tal cual para resolver grupos por ventanas.

### 11.3. Mantener pureza en la lógica
Toda lógica de cálculo de puntaje, desempates, resolución de grupos y llaves debe vivir en funciones puras.

### 11.4. Mantener la data serializable
Toda estructura nueva debe poder guardarse y leerse fácilmente desde JSON.

---

## 12. Estrategia de implementación recomendada

### Fase 1 — Documentación y contrato
- agregar este GDD,
- documentar participantes,
- documentar formato,
- documentar reglas de puntaje.

### Fase 2 — Capa de dominio nueva
- crear módulo del nuevo torneo,
- definir tipos propios,
- implementar cálculo de puntaje por ventana,
- implementar resolución de llaves.

### Fase 3 — Datos de la edición 2026
- cargar nómina de 53 clubes,
- definir coeficientes y sembrados,
- crear las 21 llaves de previa,
- producir los 32 clasificados.

### Fase 4 — Visualización
- página de participantes,
- página de fase previa,
- página de grupos,
- página de fase final.

### Fase 5 — Herramienta editorial
- extender el CLI o crear un CLI nuevo solo para este torneo,
- nunca rompiendo el flujo actual de `script:next`.

---

## 13. Instrucciones operativas para Codex

### 13.1. Qué sí debe hacer
- tratar el nuevo torneo como una expansión aditiva,
- crear módulos y archivos nuevos antes que modificar los existentes,
- respetar el contenido histórico actual,
- separar lógica del nuevo torneo en su propio espacio,
- priorizar funciones puras y tipos explícitos,
- dejar el sistema preparado para futuros torneos similares.

### 13.2. Qué no debe hacer
- no cambiar el comportamiento actual de Falopa Cup,
- no cambiar el comportamiento actual de Copa Pablo Milad,
- no reutilizar `MatchEntry` si eso obliga a deformar el diseño,
- no meter reglas de la Conference dentro de componentes UI,
- no introducir base de datos ni servicios externos sin necesidad,
- no editar temporadas existentes para acomodar el nuevo torneo.

### 13.3. Prioridad arquitectónica
Ante una duda de implementación, la prioridad es:

1. no romper lo existente,
2. mantener separación de dominios,
3. conservar claridad del modelo,
4. permitir evolución futura,
5. recién después optimizar ergonomía.

---

## 14. Entregables siguientes recomendados

Después de este GDD, los siguientes archivos serían útiles:

- `docs/CONFERENCE_LEAGUE_SUDAMERICANA_RULES.md`
- `docs/CONFERENCE_LEAGUE_SUDAMERICANA_DATA_MODEL.md`
- `docs/CONFERENCE_LEAGUE_SUDAMERICANA_2026.md`

El primero formaliza reglas.
El segundo congela el contrato JSON.
El tercero deja registrada la edición 2026 con clubes, bombos y cruces.

---

## 15. Definición de éxito

La expansión será exitosa si logra estas tres condiciones al mismo tiempo:

- el proyecto sigue funcionando igual para Falopa Cup y Copa Pablo Milad,
- la Conference League Sudamericana puede crecer sin hacks raros,
- y Codex puede implementar nuevas piezas sabiendo exactamente qué tocar y qué no tocar.
