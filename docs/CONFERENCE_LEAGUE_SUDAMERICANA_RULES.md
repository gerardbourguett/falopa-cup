# Conference League Sudamericana — Rules (v2)

## Principios

- Implementación aditiva: no romper Falopa Cup ni Copa Pablo Milad.
- Dominio separado: no forzar `MatchEntry` holder-chain.
- Cálculo puro y determinístico por ronda.
- Documentación editorial explícita para clasificación, bombos y sorteo.

## Regla de clasificación 2026

### Directos
- **8 directos por cupo país**: uno por cada liga representada en el bloque base de la edición.
- **3 directos por coeficiente CONMEBOL** entre los clubes restantes.
- Los directos por coeficiente pueden repetir país.

### Bombos de previa
- Los **42 clubes restantes** disputan la previa.
- **Bombo 1**: mejores 21 coeficientes entre esos 42.
- **Bombo 2**: los otros 21.
- Los clubes con **SR** quedan por debajo de los que tienen coeficiente confirmado.

## Regla oficial del sorteo de previa

1. Se sortean **21 llaves** entre **Bombo 1** y **Bombo 2**.
2. El club de **Bombo 1** es cabeza de llave.
3. **No se permiten cruces del mismo país**.
4. Si una extracción genera bloqueo para completar el cuadro, se rehace automáticamente la asignación conflictiva.

## Regla por ventana

- Ventana base: 14 días.
- Selección: primer partido oficial del club en la ventana.
- Oficiales válidas: liga local, copa nacional y CONMEBOL.
- Si no hay partido en ventana base: extender +3 días.
- Si sigue sin partido: score total `0` con política `no-match`.

## Excepción de fase: cuartos de final 2026

La ventana específica de cuartos va del **24 de septiembre al 15 de octubre de 2026 inclusive**, por fecha local de la sede. El usuario autorizó ampliar únicamente el cierre original del 8 de octubre al 15; el inicio y las ventanas de las demás fases permanecen iguales. La excepción ADT–Cienciano de octavos no se traslada a cuartos.

Se cuentan los **primeros dos partidos oficiales de todas las competiciones** por club, en orden cronológico, sin amistosos. Una reprogramación puede modificar esa selección. No se sustituyen partidos ya seleccionados por otros posteriores, aunque tengan un resultado más favorable.

Un partido futuro o espacio sin programación verificada queda pendiente, sin marcador ni puntos. No se aplica automáticamente la regla general de extensión o `no-match = 0`. Las tarjetas desconocidas quedan `null`: el puntaje de un partido jugado es una cota superior hasta verificar la disciplina. El total de ronda solo es una cota superior si ambos partidos están jugados; con un partido faltante es parcial y no limita el resultado final.

Solo se confirma un ganador cuando ambos clubes completaron sus dos partidos y un total verificado supera el total rival verificado o su cota superior. Igualdad o cotas superpuestas requieren revisión de los desempates y permanecen pendientes. Las sanciones del cuerpo técnico no se incluyen en las tarjetas de jugadores.

Auditoría y fuentes: [cuartos al 9 de octubre](CONFERENCE_CUARTOS_2026-10-09.md).

El 9 de octubre el usuario autorizó una excepción adicional **solo para Alianza Lima, Orense y Metropolitanos**: usar sus dos últimos oficiales terminados antes de esa fecha. Son seis encuentros concretos del 12–21 de septiembre; cinco se reutilizan desde octavos, con identificación explícita y fechas originales. No es un cambio de selección para otros clubes o fases. General Caballero conserva sus encuentros ordinarios del 25 de septiembre y 5 de octubre; sus amarillas 3/2 proceden de una corrección explícita del usuario. [Auditoría vigente y semifinalistas](CONFERENCE_SEMIFINALES_2026-10-09.md).

El modelo conserva también una resolución por escenarios disciplinarios informados cuando ambos equipos completaron sus dos partidos y todos los escenarios sustentados dan el mismo ganador. Se identifica como `reported-discipline-scenarios`, distinta de `verified-total`; no confirma un puntaje exacto ni fija límites para una futura acta. Una cota superior por sí sola nunca autoriza clasificar a ese equipo. Ninguna llave vigente necesita este criterio después de la corrección de Caballero.

## Selección de semifinales 2026

Por autorización posterior del usuario, se toman los **dos próximos partidos oficiales de todas las competiciones desde el 9 de octubre de 2026 inclusive, sin fecha límite**. Se mantiene el cuadro fijo. Programación no es resultado: goles, tarjetas y puntos siguen pendientes. Un siguiente rival conocido sin fecha conserva `tbd`, sin fecha, hora o estadio inventados. Si una copa sin programación puede intercalarse, el segundo encuentro publicado de liga queda como selección provisional y se revisa cuando se publique el calendario completo. La excepción de reutilización de cuartos no aplica a semifinales.

## Puntaje fantasy

- Victoria: +3
- Empate: +1
- Derrota: +0
- Arco en cero (clean sheet): +1
- Margen de victoria: +1 por cada gol de diferencia a partir del segundo (2 goles: +1; 3 goles: +2; etc.)
- Derrota por tres o más goles de diferencia: -1
- Tarjeta amarilla: -0.25
- Tarjeta roja: -1

## Desempates

### Llaves
1. Total fantasy
2. Fair play (menor descuento por tarjetas: amarilla=0.25, roja=1)
3. Diferencia de gol del partido contado
4. Goles a favor
5. Criterio administrativo

### Grupos
1. Puntos
2. Diferencia fantasy
3. Victorias
4. Diferencia de gol
5. Criterio administrativo
