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

## Puntaje fantasy

- Victoria: +3
- Empate: +1
- Derrota: +0
- Bono ganar de visita: +1
- Bono ganar por 2+ goles: +1
- Penalización perder de local: -1

## Desempates

### Llaves
1. Total fantasy
2. Diferencia de gol del partido contado
3. Goles a favor
4. Condición de victoria visitante
5. Criterio administrativo

### Grupos
1. Puntos
2. Diferencia fantasy
3. Victorias
4. Diferencia de gol
5. Victorias con bono visitante
