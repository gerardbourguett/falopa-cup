# Protocolo de Cambios - Falopa Cup

## Flujo de Trabajo

### 1. Antes de empezar
```bash
# Asegurarse de estar en main y tener los últimos cambios
git checkout main
git pull origin main
```

### 2. Hacer cambios
- Editar archivos necesarios
- No crear archivos nuevos sin justificación
- Mantener cambios pequeños y focalizados

### 3. Verificar el build
```bash
pnpm build
```
**Siempre** debe compilar sin errores antes de commit.

### 4. Revisar cambios
```bash
# Ver qué archivos cambiaron
git status

# Ver el diff
git diff --stat
```

### 5. Commit - Reglas

**Mensaje格式:**
```
[ tipo ] Descripción corta

Descripción más detallada (opcional)

- Cambio 1
- Cambio 2
```

**Tipos:**
- `[feat]` - Nueva funcionalidad
- `[fix]` - Corrección de bug
- `[design]` - Cambios visuales/UI
- `[data]` - Actualización de datos (partidos, equipos)
- `[docs]` - Documentación
- `[refactor]` - Refactorización sin cambio funcional

**Ejemplos:**
```
[design] Actualizar paleta de colores a nueva marca

[fix] Corregir contraste de texto en header

[data] Agregar partido Colo Colo vs U. Chile 2026
```

### 6.NO hacer
- Commits enormes con muchos cambios no relacionados
- Commits con mensajes como "fix", "update", "WIP"
- Subir archivos generadores (node_modules, dist, .astro)
- Commits sin verificar `pnpm build`

### 7. Push
```bash
git push origin main
```

---

## Checklist Pre-Commit

- [ ] `pnpm build` pasa sin errores
- [ ] Los cambios son coherentes con el objetivo
- [ ] Mensaje de commit sigue el formato
- [ ] No hay archivos innecesarios (ver `git status`)

---

## Atajos útiles

```bash
# Ver estado rápido
git status -s

# Ver último commit
git log -1 --oneline

# Deshacer último commit (sin push)
git reset --soft HEAD~1
```
