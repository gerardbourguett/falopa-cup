# Codex Implementation Plan — Conference League Sudamericana

## 1. Objetivo

Este documento le dice a Codex **cómo implementar** la Conference League Sudamericana dentro del repo `falopa-cup` sin romper lo existente.

Debe leerse junto con:

- `docs/CONFERENCE_LEAGUE_SUDAMERICANA_GDD.md`
- `docs/CONFERENCE_LEAGUE_SUDAMERICANA_DATA_MODEL.md`
- `docs/CONFERENCE_LEAGUE_SUDAMERICANA_2026.md`

---

## 2. Regla máxima

> Implementar el nuevo torneo de forma **100% aditiva**.

Eso implica:

- no cambiar el comportamiento de Falopa Cup
- no cambiar el comportamiento de Copa Pablo Milad
- no editar temporadas anteriores
- no forzar el nuevo torneo dentro del modelo `MatchEntry`

Si una abstracción compartida ayuda, puede crearse, pero sin romper compatibilidad.

---

## 3. Orden recomendado de trabajo

Codex debe implementar en este orden.

### Paso 1 — Inspección y contrato
Antes de escribir código, revisar:

- `README.md`
- `src/lib/tournament.ts`
- `scripts/next-match.ts`
- `src/content/clubs/`
- los documentos de `docs/` sobre Conference League Sudamericana

Objetivo de este paso:
- entender la estructura actual
- no asumir nada
- detectar ids reales de clubes ya cargados

---

### Paso 2 — Crear espacio nuevo para el torneo
Crear estructura nueva, sin mover lo existente.

Sugerencia:

```text
src/lib/tournaments/conference-league-sudamericana/
```

Y dentro, separar por responsabilidad:

```text
src/lib/tournaments/conference-league-sudamericana/
├── types.ts
├── scoring.ts
├── preliminary.ts
├── groups.ts
├── knockout.ts
├── selectors.ts
└── index.ts
```

#### Responsabilidad sugerida
- `types.ts`: interfaces y tipos del torneo
- `scoring.ts`: cálculo de puntaje fantasy por partido real
- `preliminary.ts`: resolución de fase previa
- `groups.ts`: lógica de grupos y tablas
- `knockout.ts`: lógica de llaves eliminatorias
- `selectors.ts`: funciones derivadas para UI
- `index.ts`: exportaciones públicas

No modificar `src/lib/tournament.ts` salvo que sea estrictamente necesario para extraer algo verdaderamente compartido.

---

### Paso 3 — Crear tipos TypeScript
Implementar primero los tipos definidos en `docs/CONFERENCE_LEAGUE_SUDAMERICANA_DATA_MODEL.md`.

Objetivo:
- congelar contrato
- evitar improvisación de estructuras
- usar tipos como guía para los siguientes pasos

Codex debe priorizar:

- `ConferenceClubEntry`
- `ConferenceClubsFile`
- `ConferenceStageFile`
- `ConferenceGroupsFile`
- `ConferenceKnockoutFile`
- `ConferenceRoundSourceFile`
- `ConferenceRoundScoresFile`

---

### Paso 4 — Crear contenido inicial del torneo
Crear carpeta nueva:

```text
src/content/conference-league-sudamericana/
```

Y agregar archivos base:

- `2026-clubs.json`
- `2026-stage.json`
- `2026-groups.json`
- `2026-knockout.json`

Regla importante:
- usar los ids reales existentes en `src/content/clubs/`
- si falta algún club, primero crear su archivo en `src/content/clubs/`
- no inventar ids inconsistentes

---

### Paso 5 — Implementar motor de puntaje
Crear una función pura que tome un partido real contado y devuelva puntaje fantasy.

Firma sugerida:

```ts
function scoreConferenceMatch(input: ConferenceClubSourceMatch): ConferenceFantasyScore
```

La lógica inicial debe ser:

- victoria = 3
- empate = 1
- derrota = 0
- +1 por ganar por 2 o más goles
- -1 por perder de local

Debe devolver:
- puntaje base
- bonus
- castigos
- total
- explicación textual

Esto debe quedar probado con tests.

---

### Paso 6 — Implementar resolución de fase previa
Crear función pura para resolver una llave.

Firma sugerida:

```ts
function resolvePreliminaryTie(
  tie: ConferenceTie,
  scores: ConferenceRoundScoresFile
): ConferenceTie
```

Regla:
- gana el club con mayor `total`
- si empatan, usar desempates documentados

Desempates iniciales:
1. diferencia de gol del partido contado
2. goles convertidos
3. mejor condición de visitante
4. tiebreak administrativo

Esto también debe probarse.

---

### Paso 7 — Implementar utilidades de lectura
Codex debe crear helpers para leer los JSON del torneo nuevo sin mezclar su lectura con la lógica del torneo antiguo.

Sugerencia:

```text
src/lib/tournaments/conference-league-sudamericana/loaders.ts
```

Funciones sugeridas:

- `loadConferenceClubs(year)`
- `loadConferenceStage(year)`
- `loadConferenceGroups(year)`
- `loadConferenceKnockout(year)`

Si el repo ya usa una estrategia estándar de lectura de contenido, adaptarse a ella. Si no, crear una solución simple y explícita.

---

### Paso 8 — Crear selectors para UI
Codex debe crear funciones que preparen datos ya listos para renderizar.

Ejemplos:

- `getDirectQualifiedClubs()`
- `getPreliminaryClubs()`
- `getPreliminaryTies()`
- `getGroupStandings(groupId)`
- `getKnockoutBracket()`

La UI no debe recalcular reglas complejas.

---

### Paso 9 — Crear páginas de lectura simple
Primero implementar páginas informativas, no interactivas ni demasiado complejas.

Orden recomendado:

1. página índice del torneo
2. página de participantes
3. página de fase previa
4. página de grupos
5. página de fase final

Las primeras versiones pueden ser estáticas y mínimas.

La prioridad no es diseño avanzado, sino:
- que cargue
- que renderice bien
- que muestre la estructura del torneo

---

### Paso 10 — Recién después, extender CLI
No tocar `scripts/next-match.ts` al principio.

Primero estabilizar:
- tipos
- datos
- motor
- páginas

Después evaluar si conviene:

- extender `scripts/next-match.ts`, o
- crear un script aparte, por ejemplo:

```text
scripts/conference-round.ts
```

Este nuevo script podría:
- registrar fuentes reales de partidos por ventana
- calcular scores
- resolver llaves
- imprimir JSON listo para pegar

La recomendación es crear **otro script**, no mezclarlo con el flujo actual si eso complica demasiado el mantenimiento.

---

## 4. Reglas de codificación

Codex debe seguir estas reglas.

### 4.1. Mantener pureza
Toda lógica del torneo nuevo debe ser pura y testeable.

### 4.2. Evitar side effects innecesarios
No escribir archivos automáticamente salvo en scripts explícitos para eso.

### 4.3. Mantener tipado estricto
No usar `any` salvo necesidad extrema y justificada.

### 4.4. Nombres claros
Preferir nombres explícitos sobre abreviaturas.

### 4.5. No introducir dependencias nuevas sin necesidad
Primero usar lo ya presente en el repo.

---

## 5. Tests mínimos esperados

Codex debe agregar pruebas para:

### scoring
- victoria local
- victoria por 2+ goles
- empate
- derrota local

### preliminary
- gana club A por puntaje total
- gana club B por puntaje total
- empate resuelto por diferencia de gol
- empate resuelto por goles convertidos

### loaders/selectors
- lectura correcta de archivos 2026
- separación correcta entre directos y previa

No hace falta testear UI en la primera iteración si el repo aún no tiene esa infraestructura.

---

## 6. Definition of Done por etapa

### Etapa 1 completa si:
- existen tipos nuevos
- existen JSON base del torneo
- se pueden leer sin errores

### Etapa 2 completa si:
- existe motor de puntaje
- existe resolución de fase previa
- hay tests pasando

### Etapa 3 completa si:
- existe página del torneo
- se pueden ver participantes y fase previa

### Etapa 4 completa si:
- existen grupos y eliminación directa modelados
- se renderizan tablas y llaves básicas

### Etapa 5 completa si:
- hay CLI o script editorial para cargar rondas del torneo

---

## 7. Qué NO debe hacer Codex

- no refactorizar Falopa Cup “por limpieza” si no hace falta
- no refactorizar Copa Pablo Milad “por simetría” si no hace falta
- no mover archivos existentes de content
- no introducir base de datos
- no meter fetch remotos como dependencia obligatoria
- no acoplar el nuevo torneo a `MatchEntry`
- no esconder reglas en componentes visuales

---

## 8. Primer entregable ideal

Si Codex solo hiciera una primera PR, debería incluir esto:

- carpeta `src/content/conference-league-sudamericana/`
- archivos base 2026
- módulo `src/lib/tournaments/conference-league-sudamericana/`
- tipos TS
- motor de puntaje
- resolución de fase previa
- tests
- una página simple del torneo

Eso ya sería una base muy buena para seguir iterando.

---

## 9. Criterio de decisión final

Cuando Codex dude entre dos caminos, debe elegir el que mejor cumpla estas prioridades:

1. no romper lo existente
2. mantener separación de dominios
3. dejar reglas claras y puras
4. hacer el sistema fácil de extender
5. recién después optimizar ergonomía o estética
