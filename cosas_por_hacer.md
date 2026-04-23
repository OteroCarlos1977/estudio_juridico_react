# Cosas por hacer

## Estado de la sesion

- Sesion local de referencia: `ROLLIE-2026-04-23-1009-ART`
- Fecha de cierre de esta nota: `2026-04-23 10:09:52 -03:00`
- Para continuar: indicar "continuemos desde `ROLLIE-2026-04-23-1009-ART` y leer `cosas_por_hacer.md`".
- Backend activo esperado: `http://127.0.0.1:3001`
- Frontend activo esperado: `http://127.0.0.1:5173`
- Nota critica: el backend debe ejecutarse con Node 20 porque `better-sqlite3` esta compilado para Node 20.

## Completado

1. Autenticacion y permisos:
   - Login con `admin/admin123` y `operador/operador123` probado.
   - Sistema restringido a Administrador.
   - Operador puede crear/editar, pero no borrar.
   - Backend responde 403 cuando corresponde.
   - Auditoria registra operaciones mutantes.

2. Sistema:
   - Vista enfocada en usuarios y backups.
   - Reportes quitados de Sistema.
   - Alta, edicion y baja logica de usuarios implementadas.
   - Normalizacion de usuarios: username/email en minuscula, nombres en mayuscula.
   - Backup temporalmente desactivado para no bloquear la vista.

3. Agenda:
   - Separacion conceptual entre Agenda y Tareas.
   - Agenda: actividades con dia y horario donde hay que estar presente.
   - Tarea: actividades con dia sin horario obligatorio.
   - Filtro principal `Todo / Agenda / Tareas`.
   - Se quitaron filtros visibles de Estado y Expediente; la barra de busqueda queda como filtro general.
   - Formulario simplificado.
   - Selector Cliente antes de Expediente.
   - Expediente filtrado por cliente.
   - Reporte PDF respeta el filtro visible `Todo / Agenda / Tareas`.
   - Reporte mensual se selecciona desde modal y se limpia luego de descargar.
   - PDF de Agenda con encabezado y tabla: fecha, hora, expediente y titulo.

4. Finanzas:
   - Vista separada en por cobrar, cobrado y otros estados.
   - Cuotas con plan total, cuota registrada, valor de cuota y total financiado.
   - Interes por movimiento.
   - Filtros dependientes Cliente -> Expediente.
   - Reportes dentro de Finanzas:
     - Excel editable.
     - PDF imprimible.
     - Filtro por mes, estado y pagos actuales/anteriores/futuros.

5. Adjuntos:
   - Vista y descarga de archivos.
   - PDF e imagenes se previsualizan.
   - Documentos de texto se descargan.
   - Filtros dependientes en formulario: Cliente -> Expediente -> Actuacion/Movimiento.

6. Verificaciones hechas:
   - `npm run build` del frontend correcto.
   - Sintaxis backend validada con `node --check` en rutas tocadas.
   - Endpoints probados:
     - Agenda PDF.
     - Finanzas Excel.
     - Finanzas PDF.
     - Usuarios de Sistema.
   - Filtro Agenda/Tareas validado contra datos heredados:
     - Agenda: registros con `clase_actuacion = agenda`.
     - Tareas: registros con `clase_actuacion <> agenda`, incluyendo los heredados como `vencimiento`.

## Pendientes funcionales para terminar la app

1. Pasada visual completa:
   - Dashboard.
   - Clientes.
   - Expedientes.
   - Agenda.
   - Finanzas.
   - Adjuntos.
   - Sistema.
   - Revisar desktop y mobile.
   - Confirmar que no haya botones superpuestos, textos cortados ni modales incomodos.

2. Agenda:
   - Revisar con datos reales si la separacion Agenda/Tareas alcanza o si conviene migrar datos viejos `vencimiento` a `tarea`.
   - Confirmar si las tareas cumplidas deben ocultarse por defecto o quedar visibles.
   - Confirmar si el reporte PDF debe incluir solo pendientes o todo el periodo.

3. Finanzas:
   - Revisar reportes con casos reales.
   - Verificar totales por moneda.
   - Definir si los pagos futuros deben usar `fecha_vencimiento`, `fecha_movimiento` o ambos segun el caso.
   - Revisar que Excel abra correctamente en Excel/LibreOffice.

4. Usuarios y seguridad:
   - Probar alta, edicion, baja logica y login posterior de usuarios nuevos.
   - Definir si hace falta rol `Consulta`.
   - Revisar auditoria en una tabla dedicada dentro de Sistema o dejarla solo para soporte tecnico.

5. Adjuntos:
   - Probar carga real de PDF, imagen, DOCX y ODT.
   - Probar adjuntos asociados solo a cliente, solo a expediente y a actuaciones/movimientos.
   - Revisar estructura final de carpetas de archivos.

6. Datos:
   - Separar datos demo de datos reales.
   - Preparar una base inicial limpia para instalacion.
   - Definir si se entrega con credenciales iniciales o si el instalador crea el primer administrador.

7. Tests:
   - Crear tests backend para auth, permisos, agenda, finanzas, adjuntos y sistema.
   - Crear pruebas frontend minimas para render y flujos principales.
   - Agregar comando real `npm test` en backend y frontend.

8. Git:
   - Revisar cambios pendientes.
   - Hacer commit cuando la pasada visual este aprobada.
   - Evitar commitear bases `.db`, adjuntos reales o archivos temporales.

## Backup: problema actual y plan recomendado

### Problema detectado

- El backup con `fs.copyFileSync` fallo en Windows con `EPERM` al copiar la base SQLite abierta.
- Se intento usar el mecanismo `backup()` de `better-sqlite3`, pero quedo pendiente de validar con el proceso correcto.
- Tambien se detecto que Node 24 por defecto no coincide con el binario nativo actual de `better-sqlite3`; debe usarse Node 20.

### Solucion recomendada

1. Ejecutar backend siempre con Node 20.
2. Implementar backup usando `db.backup(targetPath)` de `better-sqlite3`, no `copyFileSync`.
3. Crear backups con nombre unico:
   - `rollie_backup_YYYYMMDD_HHMMSS.db`
4. Guardar en:
   - `data/backups`
5. Registrar en `historial_backups`.
6. Verificar integridad del backup inmediatamente:
   - Abrir el archivo generado con SQLite.
   - Ejecutar `PRAGMA integrity_check`.
   - Confirmar que devuelve `ok`.
7. Permitir descarga solo si el backup existe y paso la verificacion.
8. Mantener restauracion como procedimiento manual al principio:
   - Detener backend.
   - Copiar backup sobre `data/estudio_juridico_v28.db`.
   - Reiniciar backend.
9. Luego, si hace falta, crear restauracion asistida desde interfaz, pero con confirmacion fuerte y copia previa automatica.

### Alternativa si sigue fallando

- Usar el CLI de SQLite con `.backup`, empaquetando `sqlite3.exe` junto con la app.
- Ejecutar:
  - `sqlite3 data/estudio_juridico_v28.db ".backup data/backups/rollie_backup_YYYYMMDD_HHMMSS.db"`
- Esta alternativa es robusta, pero agrega una dependencia externa al empaquetado.

## Empaquetado e instalacion en otro equipo

### Decision tecnica recomendada

Empaquetar como aplicacion local de escritorio usando Electron:

- Frontend React/Vite embebido.
- Backend Express iniciado como proceso local o integrado en Electron.
- SQLite local en carpeta de datos de usuario.
- Acceso por ventana de escritorio, sin depender de navegador manual.

### Pasos propuestos

1. Normalizar runtime:
   - Fijar Node 20 para backend.
   - Asegurar que `better-sqlite3` se compile o se entregue compatible.

2. Preparar estructura de produccion:
   - `frontend/dist`
   - `backend/src`
   - `backend/node_modules` o empaquetado con dependencias.
   - `data` inicial limpia.
   - `data/adjuntos`
   - `data/backups`

3. Crear modo produccion:
   - Backend sirve API y archivos estaticos del frontend.
   - Variable `DATABASE_PATH` apuntando a carpeta de datos instalada.
   - Variable `FRONTEND_ORIGINS` ajustada o eliminada si todo corre local.

4. Definir carpeta de datos:
   - No guardar la base dentro de una carpeta de solo lectura del instalador.
   - Usar una carpeta tipo:
     - `%APPDATA%/Rollie/data`
     - o una carpeta seleccionada por el usuario.

5. Crear instalador:
   - Opcion recomendada: `electron-builder`.
   - Generar instalador Windows `.exe`.
   - Incluir icono, nombre de app y accesos directos.

6. Primer arranque:
   - Si no existe base, copiar plantilla limpia.
   - Crear carpetas `adjuntos` y `backups`.
   - Verificar permisos de escritura.
   - Mostrar error claro si la carpeta de datos no es escribible.

7. Prueba en otro equipo:
   - Instalar.
   - Iniciar app.
   - Login admin.
   - Crear cliente.
   - Crear expediente.
   - Crear agenda y tarea.
   - Crear movimiento financiero.
   - Cargar adjunto.
   - Generar reporte PDF/Excel.
   - Cerrar y abrir app.
   - Confirmar persistencia de datos.
   - Probar backup cuando este reactivado.

8. Checklist previo a instalador:
   - Eliminar datos demo o moverlos a una base demo separada.
   - Confirmar credenciales iniciales.
   - Confirmar nombre final de la aplicacion.
   - Agregar icono.
   - Agregar version inicial: `0.1.0`.

## Riesgos abiertos

1. Backup aun desactivado.
2. No hay tests reales.
3. Hay muchos cambios sin commit.
4. Node 24 por defecto puede romper backend si no se fuerza Node 20.
5. Falta probar instalacion en equipo limpio.

## Credenciales heredadas

- `admin` / `admin123`
- `operador` / `operador123`
