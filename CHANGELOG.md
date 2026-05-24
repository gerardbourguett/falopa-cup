# Changelog

## 2026-05-24

### Changed
- Se eliminó la cinta visual `TITULO EN JUEGO` de las tarjetas de partido porque en Falopa Cup y Copa Pablo Milad todas las tarjetas ya representan defensas del título.
- Se actualizaron resultados, tarjetas y puntajes fantasy pendientes de `Conference League Sudamericana` para la Fecha 1 de grupos.

### Verified
- `pnpm test`

## 2026-04-01

### Added
- Design tokens base para spacing, bordes, sombras y focus states.
- Wrapper `ButtonLink` sobre Ark UI como primitive inicial para CTAs.
- CSS Modules para home, navegación, footer, Hero, ChampionCard, MatchCard y Palmares.
- Lógica `getCurrentReign()` para obtener la fecha exacta de inicio del reinado vigente.

### Changed
- Se migró la capa visual principal desde estilos inline / bloques `<style>` embebidos hacia CSS Modules.
- La home ahora muestra correctamente la fecha de inicio del reinado actual, en vez de la fecha del último partido del campeón vigente.
- `pnpm check` quedó limpio tras sacar los falsos positivos históricos de `MatchCard.astro` y `Palmares.astro`.

### Verified
- `pnpm test`
- `pnpm check`
