# Base limpia para instalacion

Fecha de preparacion: `2026-04-28`.

## Objetivo

Separar los datos demo de la estructura necesaria para instalar la app en un equipo real.

La base actual de trabajo se mantiene intacta:

- `data/estudio_juridico_v28.db`

La base limpia se genera aparte:

- `data/estudio_juridico_clean.db`

Ese archivo esta ignorado por Git por la regla `data/*.db`.

## Auditoria de la base actual

Conteos detectados antes de limpiar:

- `clientes`: 28
- `expedientes`: 24
- `expediente_partes`: 22
- `actuaciones`: 48
- `movimientos_financieros`: 157
- `adjuntos`: 3
- `auditoria`: 80
- `historial_backups`: 3
- `usuarios`: 3
- `usuario_roles`: 3

Catalogos/estructura funcional a conservar:

- `roles`: 4
- `tipos_actuacion`: 8
- `tipos_documento`: 4
- `tipos_movimiento_financiero`: 6
- `categorias_financieras`: 15
- `conceptos_liquidacion`: 6
- `configuracion_sistema`: 7

## Decision de limpieza

Se eliminan de la base limpia:

- clientes demo
- expedientes demo
- partes de expedientes demo
- agenda/tareas demo
- movimientos financieros demo
- adjuntos registrados
- auditoria de pruebas
- historial de backups
- datos de empleados/liquidaciones/facturacion si existieran

Se conserva:

- estructura completa de tablas
- catalogos funcionales
- configuracion de sistema
- roles
- usuario `admin` activo con rol `Administrador`

Se eliminan de la base limpia:

- usuario `operador`
- usuario tecnico `__rollie_root__`

Motivo: para una instalacion inicial conviene partir con un unico administrador conocido y crear usuarios reales desde Sistema.

## Script generado

Archivo:

- `scripts/create_clean_database.py`

Uso recomendado:

```powershell
python scripts/create_clean_database.py --force
```

Uso con rutas explicitas:

```powershell
python scripts/create_clean_database.py --source data/estudio_juridico_v28.db --output data/estudio_juridico_clean.db --force
```

El script:

- copia la base origen
- limpia solo la copia
- conserva catalogos y admin
- reinicia secuencias de tablas limpias
- ejecuta `PRAGMA integrity_check`
- hace `VACUUM`
- imprime conteos de control

## Verificacion esperada

Despues de ejecutar el script:

- `PRAGMA integrity_check`: `ok`
- `usuarios`: 1
- `usuario_roles`: 1
- `clientes`: 0
- `expedientes`: 0
- `actuaciones`: 0
- `movimientos_financieros`: 0
- `adjuntos`: 0
- `auditoria`: 0
- `historial_backups`: 0

Catalogos conservados:

- `roles`: 4
- `tipos_actuacion`: 8
- `tipos_documento`: 4
- `tipos_movimiento_financiero`: 6
- `categorias_financieras`: 15
- `conceptos_liquidacion`: 6
- `configuracion_sistema`: 7

Verificacion realizada:

```powershell
python scripts/create_clean_database.py --force
```

Resultado:

- `PRAGMA integrity_check`: `ok`
- `usuarios`: 1
- `usuario_roles`: 1
- `admin`: rol `Administrador`
- tablas demo/transaccionales: 0 registros
- catalogos: conservados

## Login inicial

El usuario inicial conservado es:

- `admin`
- rol: `Administrador`

La contrasena se conserva desde la base actual. En esta etapa sigue siendo la credencial ya usada durante desarrollo:

- `admin123`

Verificacion realizada contra `data/estudio_juridico_clean.db`:

- `admin/admin123`: OK
- permisos resultantes:
  - `admin`
  - `delete`
  - `read`
  - `write`

Pendiente antes de instalacion real:

- decidir si se mantiene `admin/admin123` solo para primer arranque
- o si se fuerza cambio de contrasena en la primera ejecucion

## Riesgo detectado y normalizado

Durante esta preparacion, `better-sqlite3` fallo al cargarse desde este shell porque el binario local quedo compilado para otra version de Node:

- binario compilado para `NODE_MODULE_VERSION 115`
- Node actual requiere `NODE_MODULE_VERSION 137`

Ademas, `npm rebuild better-sqlite3` fallo porque el archivo nativo estaba bloqueado por procesos activos y `node-gyp` tomo un Node 20 alternativo.

Estado observado:

- `node -v`: `v24.4.1`
- `npm exec -- node -v`: `v20.19.4`
- `npm test` backend funciona actualmente porque corre con el entorno que resuelve `npm`.
- El login contra la base limpia fue verificado con `npm exec -- node`.

Normalizacion aplicada:

- Se elimino la dependencia local `node@20.19.4` de `C:\Users\otero\package.json`.
- `C:\Users\otero\package.json` quedo sin dependencias.
- Se recompilo `better-sqlite3` en `backend`:

```powershell
npm rebuild better-sqlite3
```

Verificacion posterior:

- `node -v`: `v24.4.1`
- `better-sqlite3` carga correctamente con `node` directo.
- `PRAGMA integrity_check` sobre `data/estudio_juridico_clean.db`: `ok`
- Backend: `npm test` correcto, `34/34`.
- Frontend: `npm test` correcto, `11/11`.
- Frontend: `npm run build` correcto.

Accion recomendada antes de empaquetar en otro equipo:

1. Cerrar backend/frontend.
2. Verificar `where node`.
3. Asegurar que `npm` use Node 24.
4. Ejecutar en `backend`:

```powershell
npm rebuild better-sqlite3
```

5. Validar:

```powershell
npm test
```
