# Data Model — Conference League Sudamericana

## 1. Objetivo

Este documento define el contrato de datos inicial para la **Conference League Sudamericana** dentro del repo `falopa-cup`.

La meta es que la implementación sea:

- aditiva
- serializable en JSON
- fácil de editar a mano
- fácil de consumir desde Astro/TypeScript
- fácil de evolucionar

Este modelo no reemplaza los JSON actuales de Falopa Cup o Copa Pablo Milad.

---

## 2. Carpeta recomendada

```text
src/content/conference-league-sudamericana/
```

Archivos sugeridos para la primera edición:

```text
src/content/conference-league-sudamericana/
├── 2026-clubs.json
├── 2026-stage.json
├── 2026-groups.json
└── 2026-knockout.json
```

---

## 3. Archivo `2026-clubs.json`

Contiene la nómina oficial de participantes, su vía de entrada y sus datos de siembra.

### Estructura propuesta

```json
{
  "year": 2026,
  "tournament": "conference-league-sudamericana",
  "clubs": [
    {
      "clubId": "independiente",
      "country": "Argentina",
      "entryType": "base",
      "entryLabel": "Cupo base",
      "conmebolRank": 3,
      "conmebolPoints": 3404.4,
      "directToMainStage": true,
      "pot": 1
    }
  ]
}
```

### Campos

- `year`: año de la edición
- `tournament`: id del torneo
- `clubs`: listado de participantes

### Campos por club

- `clubId`: debe apuntar a un club existente en `src/content/clubs/`
- `country`: país del club
- `entryType`: una de:
  - `base`
  - `libertadores-f1`
  - `libertadores-f2`
  - `sudamericana-f1`
- `entryLabel`: texto visible
- `conmebolRank`: posición en ranking CONMEBOL
- `conmebolPoints`: puntaje CONMEBOL
- `directToMainStage`: si entra directo a 32
- `pot`: bombo inicial, si aplica

---

## 4. Archivo `2026-stage.json`

Describe la fase previa y el estado general del torneo.

### Estructura propuesta

```json
{
  "year": 2026,
  "tournament": "conference-league-sudamericana",
  "format": {
    "initialClubCount": 53,
    "directToMainStage": 11,
    "preliminaryTieCount": 21,
    "mainStageClubCount": 32,
    "groupCount": 8,
    "clubsPerGroup": 4,
    "knockoutStartsAt": "round-of-16"
  },
  "windows": [
    {
      "roundId": "preliminary",
      "label": "Fase Previa",
      "windowStart": "2026-04-01",
      "windowEnd": "2026-04-14",
      "countedMatchesPerClub": 1
    }
  ],
  "preliminaryTies": [
    {
      "id": "pre-01",
      "clubA": "bahia",
      "clubB": "deportes-limache",
      "winnerClubId": null,
      "status": "pending"
    }
  ]
}
```

### Campos de `format`

- `initialClubCount`
- `directToMainStage`
- `preliminaryTieCount`
- `mainStageClubCount`
- `groupCount`
- `clubsPerGroup`
- `knockoutStartsAt`

### Campos de `windows`

Cada ventana define una ronda de evaluación real.

- `roundId`
- `label`
- `windowStart`
- `windowEnd`
- `countedMatchesPerClub`

### Campos de `preliminaryTies`

- `id`
- `clubA`
- `clubB`
- `winnerClubId`
- `status`: `pending` | `played`

---

## 5. Archivo `2026-groups.json`

Define composición de grupos, cruces ficticios y tabla.

### Estructura propuesta

```json
{
  "year": 2026,
  "tournament": "conference-league-sudamericana",
  "groups": [
    {
      "id": "A",
      "clubs": [
        "independiente",
        "melgar",
        "danubio",
        "real-tomayapo"
      ],
      "fixtures": [
        {
          "roundId": "group-matchday-1",
          "pairings": [
            { "clubA": "independiente", "clubB": "real-tomayapo" },
            { "clubA": "melgar", "clubB": "danubio" }
          ]
        }
      ],
      "table": [
        {
          "clubId": "independiente",
          "played": 0,
          "wins": 0,
          "draws": 0,
          "losses": 0,
          "points": 0,
          "fantasyFor": 0,
          "fantasyAgainst": 0,
          "fantasyDiff": 0
        }
      ]
    }
  ]
}
```

### Campos por grupo

- `id`
- `clubs`
- `fixtures`
- `table`

### Campos por fixture grupal

- `roundId`
- `pairings`

### Campos por pairing

- `clubA`
- `clubB`

### Campos por fila de tabla

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

## 6. Archivo `2026-knockout.json`

Modela la fase eliminatoria.

### Estructura propuesta

```json
{
  "year": 2026,
  "tournament": "conference-league-sudamericana",
  "rounds": [
    {
      "id": "round-of-16",
      "label": "Octavos de final",
      "ties": [
        {
          "id": "r16-01",
          "clubA": "independiente",
          "clubB": "melgar",
          "winnerClubId": null,
          "scoreA": null,
          "scoreB": null,
          "tiebreakReason": null,
          "status": "pending"
        }
      ]
    }
  ]
}
```

### Campos por ronda

- `id`
- `label`
- `ties`

### Campos por llave

- `id`
- `clubA`
- `clubB`
- `winnerClubId`
- `scoreA`
- `scoreB`
- `tiebreakReason`
- `status`

---

## 7. Fuente de partido real por ronda

Para calcular resultados, conviene tener una estructura serializable intermedia.

### Estructura sugerida

```json
{
  "roundId": "preliminary",
  "clubSources": [
    {
      "clubId": "bahia",
      "sourceCompetition": "Serie A",
      "sourceDate": "2026-04-05",
      "homeClub": "Bahia",
      "awayClub": "Vitória",
      "goalsFor": 2,
      "goalsAgainst": 0,
      "isHome": true,
      "counted": true
    }
  ]
}
```

### Campos

- `roundId`
- `clubSources`

### Campos por source

- `clubId`
- `sourceCompetition`
- `sourceDate`
- `homeClub`
- `awayClub`
- `goalsFor`
- `goalsAgainst`
- `isHome`
- `counted`

---

## 8. Resultado fantasy por ronda

El cálculo ideal debería persistirse o reconstruirse fácil.

### Estructura sugerida

```json
{
  "roundId": "preliminary",
  "scores": [
    {
      "clubId": "bahia",
      "basePoints": 3,
      "bonusPoints": 0,
      "penaltyPoints": 0,
      "total": 3,
      "explanation": [
        "Victoria = 3"
      ]
    }
  ]
}
```

### Campos

- `roundId`
- `scores`

### Campos por score

- `clubId`
- `basePoints`
- `bonusPoints`
- `penaltyPoints`
- `total`
- `explanation`

---

## 9. Reglas de puntaje iniciales

Regla sugerida para primera implementación:

- victoria = 3
- empate = 1
- derrota = 0
- +1 por ganar por 2 o más goles
- -1 por perder de local

Esto debe implementarse como lógica, no hardcodearse en los JSON.

Los JSON solo deberían almacenar:
- partido fuente
- resultado calculado
- explicación opcional

---

## 10. Tipos TypeScript sugeridos

```ts
export type ConferenceEntryType =
  | 'base'
  | 'libertadores-f1'
  | 'libertadores-f2'
  | 'sudamericana-f1';

export interface ConferenceClubEntry {
  clubId: string;
  country: string;
  entryType: ConferenceEntryType;
  entryLabel: string;
  conmebolRank: number | null;
  conmebolPoints: number | null;
  directToMainStage: boolean;
  pot: number | null;
}

export interface ConferenceClubsFile {
  year: number;
  tournament: 'conference-league-sudamericana';
  clubs: ConferenceClubEntry[];
}

export interface ConferenceWindow {
  roundId: string;
  label: string;
  windowStart: string;
  windowEnd: string;
  countedMatchesPerClub: number;
}

export interface ConferenceTie {
  id: string;
  clubA: string;
  clubB: string;
  winnerClubId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  tiebreakReason?: string | null;
  status: 'pending' | 'played';
}

export interface ConferenceStageFile {
  year: number;
  tournament: 'conference-league-sudamericana';
  format: {
    initialClubCount: number;
    directToMainStage: number;
    preliminaryTieCount: number;
    mainStageClubCount: number;
    groupCount: number;
    clubsPerGroup: number;
    knockoutStartsAt: string;
  };
  windows: ConferenceWindow[];
  preliminaryTies: Omit<ConferenceTie, 'scoreA' | 'scoreB' | 'tiebreakReason'>[];
}

export interface ConferenceGroupPairing {
  clubA: string;
  clubB: string;
}

export interface ConferenceGroupFixture {
  roundId: string;
  pairings: ConferenceGroupPairing[];
}

export interface ConferenceGroupTableRow {
  clubId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  fantasyFor: number;
  fantasyAgainst: number;
  fantasyDiff: number;
}

export interface ConferenceGroup {
  id: string;
  clubs: string[];
  fixtures: ConferenceGroupFixture[];
  table: ConferenceGroupTableRow[];
}

export interface ConferenceGroupsFile {
  year: number;
  tournament: 'conference-league-sudamericana';
  groups: ConferenceGroup[];
}

export interface ConferenceKnockoutRound {
  id: string;
  label: string;
  ties: ConferenceTie[];
}

export interface ConferenceKnockoutFile {
  year: number;
  tournament: 'conference-league-sudamericana';
  rounds: ConferenceKnockoutRound[];
}

export interface ConferenceClubSourceMatch {
  clubId: string;
  sourceCompetition: string;
  sourceDate: string;
  homeClub: string;
  awayClub: string;
  goalsFor: number;
  goalsAgainst: number;
  isHome: boolean;
  counted: boolean;
}

export interface ConferenceRoundSourceFile {
  roundId: string;
  clubSources: ConferenceClubSourceMatch[];
}

export interface ConferenceFantasyScore {
  clubId: string;
  basePoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  total: number;
  explanation: string[];
}

export interface ConferenceRoundScoresFile {
  roundId: string;
  scores: ConferenceFantasyScore[];
}
```

---

## 11. Reglas de compatibilidad con el repo actual

Este modelo debe respetar estas restricciones:

- no modificar `src/content/falopa-cup/`
- no modificar `src/content/copa-pablo-milad/`
- no asumir que `MatchEntry` sirve para este torneo
- no mezclar lógica del nuevo torneo con la UI
- no cambiar IDs de clubes existentes

---

## 12. Implementación mínima viable

La MVP del torneo debería permitir:

1. cargar participantes
2. cargar ranking/coeficiente
3. definir 21 llaves de fase previa
4. asociar 1 partido real por club en una ventana
5. calcular puntajes
6. resolver ganadores
7. poblar 32 clasificados
8. renderizar grupos o siguiente etapa

---

## 13. Decisión recomendada para Codex

Codex debería implementar primero:

- tipos
- lector de JSON
- motor de puntaje por ventana
- motor de resolución de llaves
- contenido 2026 de ejemplo
- páginas de lectura simple

Y recién después:

- grupos completos
- tablas derivadas
- CLI editorial específico
