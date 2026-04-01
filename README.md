# Falopa Cup

Sitio web para el seguimiento de dos campeonatos no oficiales del fútbol chileno: la **Falopa Cup** y la **Copa Pablo Milad**. Basado en el concepto del [Campeonato Mundial No Oficial (UFWC)](https://en.wikipedia.org/wiki/Unofficial_Football_World_Championships).

## Concepto

El título no se gana en un torneo — se toma en la cancha. El poseedor lo defiende en cada partido oficial, y si lo pierde (según las reglas de cada copa), el título pasa al rival.

- **Falopa Cup**: el título cambia si el defensor pierde. Los empates no transfieren.
- **Copa Pablo Milad**: el título solo cambia si el defensor **gana**. Si pierde o empata, sigue con él (es la copa del más malo).

## Comandos

```sh
pnpm install      # Instala dependencias
pnpm dev          # Servidor local en localhost:4321
pnpm build        # Build de producción en ./dist/
pnpm preview      # Preview del build
pnpm astro check  # Verificación de tipos TypeScript
```

## Agregar un partido

En lugar de editar JSON a mano, usa el CLI interactivo:

```sh
pnpm script:next
```

El CLI te guía paso a paso:

1. Seleccioná el torneo (Falopa Cup o Copa Pablo Milad)
2. Ingresá el nombre de la competición (ej. `Liga de Primera · Fecha 12`)
3. Seleccioná el equipo rival de la lista de clubes
4. Ingresá el marcador
5. Si es empate, puedes ingresar penales

El CLI calcula automáticamente `newHolderId` según las reglas de cada torneo e imprime el JSON listo para pegar en el archivo de la temporada.

```sh
# Con flag directo (sin prompt de torneo):
pnpm script:next -- --tournament falopa-cup
pnpm script:next -- -t copa-pablo-milad
```

El JSON se imprime en **stdout** — nunca escribe archivos automáticamente.

### ¿Dónde pego el JSON?

En el archivo JSON de la temporada correspondiente:

- `src/content/falopa-cup/YYYY.json`
- `src/content/copa-pablo-milad/YYYY.json`

Cada archivo tiene un array `matches` — agrega el objeto al final.

## Estructura del proyecto

```
src/
├── components/        # Componentes Astro y React
├── content/
│   ├── clubs/         # Info de cada club (id, nombre, logo)
│   ├── falopa-cup/    # Datos por temporada (JSON)
│   └── copa-pablo-milad/
├── lib/
│   └── tournament.ts  # Lógica pura compartida (getCurrentHolder, etc.)
├── pages/             # Rutas del sitio
└── styles/
    └── global.css     # Tokens de diseño (Tailwind v4 CSS-first)
scripts/
└── next-match.ts      # CLI interactivo para ingresar partidos
```

## Agregar un club nuevo

Crea un archivo JSON en `src/content/clubs/nombre-club.json`:

```json
{
  "id": "nombre-club",
  "name": "Nombre Completo del Club",
  "shortName": "Nombre Corto",
  "stadium": "Nombre del Estadio",
  "logo": "/logos/nombre-club.svg"
}
```

Y agrega el logo SVG (o PNG) en `public/logos/`.
