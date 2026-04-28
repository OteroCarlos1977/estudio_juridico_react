# Cosas por hacer

## Estado actualizado para retomar durante la semana

Fecha de actualizacion: `2026-04-25`.

Durante esta ultima ronda se avanzo principalmente sobre el recorrido visual, Agenda, Dashboard, Finanzas, Backup y Tests. El documento `pendientes_manana.md` queda absorbido por este archivo y queda solo como historico. El estado real actual ya fue commiteado y pusheado a `origin/main`.

### Ultimo estado de Git

- Rama: `main`.
- Remoto: `origin/main`.
- Push realizado correctamente el `2026-04-25`.
- Ultimos commits subidos:
  - `3bd769c Improve finance workflows, backups, and tests`
  - `f0b41b1 Expand backend test coverage`
  - `9faf0ad Expand attachment and finance test coverage`
- Estado esperado al retomar: arbol limpio.

### Completado en esta ronda

1. Dashboard:
   - Las cards informativas quedaron como accesos navegables.
   - El estado de API se movio a la barra lateral inferior.
   - Se reemplazo el bloque oculto de base de datos por una vista rapida `Para hoy`.
   - Se agrego una lista simple `Por hacer` persistida en `localStorage`.

2. Agenda:
   - Los pendientes anteriores a la fecha actual pasan automaticamente a `vencida`.
   - Las tareas cumplidas no se muestran en la vista principal.
   - El reporte de Agenda excluye cumplidos y vencidos, y toma pendientes desde la fecha actual.
   - La vista tiene selector `General / Agenda / Tareas`.
   - Los vencidos se resaltan visualmente.

3. Adjuntos:
   - Se quito `Actuacion` del modal de nuevo adjunto.

4. Tablas y acciones:
   - Se extendio altura util de tablas en vistas principales.
   - Las acciones de fila quedaron visibles como botones compactos.
   - Los inputs de busqueda incorporan icono de lupa.
   - En Expedientes se reemplazo visualmente `Activo` por `Iniciado`.

5. Finanzas:
   - Se consolidaron 4 grupos visuales:
     - `Lo que se paga`
     - `Cobrado`
     - `Por cobrar`
     - `Cobros vencidos`
   - `Lo que se paga` toma egresos del mes actual.
   - `Cobrado` toma ingresos/cobros del mes actual.
   - `Por cobrar` toma deuda no vencida.
   - `Cobros vencidos` toma deuda efectiva impaga vencida; `Cancelado` no se trata como vencido.
   - Las cards filtran la lista al hacer click.
   - Se corrigio la visibilidad de tablas y scroll hasta llegar a un estado aceptado visualmente.
   - El modal de reportes apila sus campos verticalmente.
   - Los reportes de Finanzas se separaron por tipo:
     - `General`
     - `Ingresos`
     - `Pagos`
     - `Por cobrar`
     - `Planes de pago`
   - El reporte general separa tablas y muestra balance `Ingresos - Pagos`.
   - El reporte `Por cobrar` exporta dos tablas:
     - `Por cobrar`
     - `Cobros vencidos`
   - El reporte `Planes de pago` permite seguimiento de cuotas cobradas, pendientes y vencidas.
   - Se reorganizaron datos demo de planes de pago para que las cuotas sean coherentes con enero-abril 2026.
   - Se creo backup previo de la base antes de reorganizar datos demo:
     - `data/backups/pre_finanzas_planes_demo_20260425_123755.db`
   - Excel ya muestra cuotas como texto (`4/6`) sin convertirlas a fecha.
   - Validado el flujo de editar un vencido y pasarlo a `Cobrado`: entra en `Cobrado`, suma en la card, baja de `Cobros vencidos` y actualiza el saldo.
   - Se agrego una quinta card: `Saldo del mes`.
   - Las cinco cards quedaron en una misma linea usando estructura de `react-bootstrap`.
   - La vista general quedo como una sola tabla bajo el titulo `Vista General`, con columna `Vista`; ya no cambia de titulo durante el scroll.
   - La logica pura de la tabla se extrajo a `frontend/src/modules/finance/financeUtils.js`.

6. Backup:
   - Backup manual reactivado con `db.backup()` de `better-sqlite3`.
   - Integridad validada con `PRAGMA integrity_check`.
   - Descarga autenticada validada.
   - Restauracion manual documentada en `docs/restauracion_backups.md`.
   - Backup de control creado:
     - `data/backups/rollie_backup_20260425_224158.db`

7. Tests:
   - Backend tiene runner real con `npm test`.
   - Frontend tiene runner real con `npm test`.
   - Backend cubierto actualmente:
     - Agenda
     - Adjuntos
     - Auth/permisos
     - Finanzas/reportes
     - Sistema/backups
   - Frontend cubierto actualmente:
     - utilidades de Clientes
     - utilidades puras de Finanzas
   - Validacion reciente:
     - Backend: `20/20` tests OK.
     - Frontend: `7/7` tests OK.
     - Frontend build OK.

### Verificaciones recientes

- `node --check` ejecutado sobre rutas backend tocadas.
- `npm run build` del frontend correcto.
- `npm test` backend correcto: `20` tests.
- `npm test` frontend correcto: `7` tests.
- Backend probado activo en `http://127.0.0.1:3001/api/health`.
- Reportes protegidos devuelven `401` desde consola sin sesion, comportamiento esperado.

### Valores de control actuales para Finanzas, abril 2026

- `Planes de pago`: 4 cuotas, ARS 110.000.
- `Por cobrar`: 2 movimientos no vencidos, ARS 112.500.
- `Cobros vencidos`: 10 movimientos, ARS 590.000.
- En `Cobros vencidos` hay 3 cuotas de planes por ARS 80.000.

### Proximo bloque recomendado

1. Hacer pasada manual completa en navegador sobre:
   - Dashboard
   - Clientes
   - Expedientes
   - Agenda
   - Finanzas
   - Adjuntos
   - Sistema

2. Verificar responsive/mobile:
   - tablas
   - filtros
   - modales
   - offcanvas
   - acciones de fila
   - revisar especialmente telefonos: hoy la app resulta poco funcional por tamanos, densidad y menu lateral poco visible
   - Prioridad baja por decision funcional actual: la app se usara principalmente en PC/escritorio, no como despliegue web principal ni para muchos usuarios.

3. Validar reportes desde UI logueada:
   - Agenda PDF
   - Finanzas Excel/PDF para `General`, `Ingresos`, `Pagos`, `Por cobrar`, `Planes de pago`
   - revisar apertura en Excel real y LibreOffice si se va a usar en otro equipo

4. Ampliar tests, sin volver a cambiar UI:
   - agregar casos de API con datos temporales para Clientes, Expedientes y Finanzas
   - cubrir errores esperados de validacion y permisos
   - evaluar tests frontend de componentes solo cuando haya una herramienta de render acordada

5. Preparar proxima etapa de cierre:
   - pasar visual manual completa en PC/escritorio
   - listar hallazgos por pantalla antes de tocar estilos
   - evitar cambios responsivos profundos salvo problemas graves, porque la app queda priorizada para uso en PC

# Recorrido Visual original procesado

En Dashboard, en puesto la section de la base de datos en Display: none, sería útil que las card informativas, puedan ser clickeadas y llevar a la información que resumen, es decir que por ejemplo Vencimientos que da un total de 27, me lleve a la pantalla (Quizas Agenda), de donde saca el valor que muestra. Asi con el resto.

Utilizar el espacio de la Seccion oculta para agregar información relevante, al momento no se me ocurre que podría ser. 

Que API Conectada en vez de mostrarse en la parte superior, lo haga en la barra de tareas en la parte inferior debajo de sistema, casi pegada al botom. 

En todas las tablas salvo expedientes, los botones de acciones están agrupados y tienen que ser desplegados para su funcionamiento, visualmente no queda bien. En expedientes los botones de acción están, pero deberían ser cuadrados no rectangulares, ocupan demasiado espacio. 

En agenda aplicar un formato para que los vencidos resalten (color rojo particularmente),
Las tareas cumplidas no deben mostrarse en pantalla. 
Mejorar el filtro del reporte de agenda, para que no liste ni los vencidos, ni los cumplidos, solo los elementos que según la selección del usuario, queden por hacer desde la fecha actual hasta el limite solicitado, semana, mes, etc. 

Quitar el filtro del modal de reporte, como hay espacio, colocar un botón de filtro junto al buscador.  O tal vez Botones, vista agenda, vista tareas y vista general.

En Finanzas hay que mejorar mucho con los reportes partiendo de esta premisa al elegir todo, tanto en Excel, como en PDF, las tablas deben estar separadas y diferenciadas, mostrando subtotales, no agregar información que no aporte. 

Debe haber una tabla de Pagos, una de Ingresos y una ultima de por cobrar. Ambos documentos tendrán titulo, harán referencia al periodo y al tipo de información que representan (Reporte General para todo, Reporte de Ingresos, Reporte de Pagos, Reporte por Cobrar), podemos incluir un reporte de planes de pago.

Al final del General, debe haber una referencia al Balance, Total de Ingresos – Total de Pagos.

Quitar actuación del modal Nuevo adjunto, no es de utilidad. 

Colocar dentro de todos los inputs de búsqueda la imagen de la lupa, como placeholder, sobre el lado derecho, sin quitar el texto existente.

En Clientes, Expediente y Agenda, hay que extender la altura de la tabla queda demasiado espacio debajo.

En expediente, cambiar Activo por Iniciado.


## Estado de la sesion heredado

- Sesion local de referencia: `ROLLIE-2026-04-23-1009-ART`
- Nota: esta seccion queda como historico. Para continuar usar primero `Estado actualizado para retomar la proxima semana`.
- Fecha de cierre de esta nota: `2026-04-23 10:09:52 -03:00`
- Para continuar: indicar "continuemos desde `ROLLIE-2026-04-23-1009-ART` y leer `cosas_por_hacer.md`".
- Backend activo esperado: `http://127.0.0.1:3001`
- Frontend activo esperado: `http://127.0.0.1:5173`
- Nota critica actualizada: el proyecto quedo alineado a `Node 24` en esta maquina tras recompilar `better-sqlite3`.
- Estado adicional de esta ronda:
  - Backend levantado con `npm start`.
  - Frontend levantado con `npm run dev -- --host 127.0.0.1`.
  - `Finanzas` ya consume catalogos reales de la base (`tipos_movimiento_financiero` y `categorias_financieras`).
  - `better-sqlite3` fue recompilado correctamente para `Node 24.4.1`.
  - `backend/package.json` y `frontend/package.json` quedaron con `engines.node = >=24 <25`.
  - Historico superado: en ese momento quedaron cambios sin commit en backend/frontend; al `2026-04-25` los cambios principales ya fueron commiteados y pusheados.
  - Se introdujo un componente reutilizable `frontend/src/ui/DataTable.jsx` basado en `react-bootstrap`.
  - La migracion de tablas a `DataTable` quedo incompleta a nivel funcional: compila, pero el comportamiento de scroll/alto aun no esta resuelto del todo.

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
   - Historico superado: backup estuvo temporalmente desactivado para no bloquear la vista; al `2026-04-25` fue reactivado y validado.

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
   - Vista reorganizada para priorizar la lista.
   - Busqueda principal visible y filtros/reportes movidos a modales.
   - Tarjetas con filtro por click.
   - La UI ahora consume `tipo_movimiento` y `categoria_financiera` reales desde la base.
   - Formulario reorganizado para trabajar con tipos/categorias reales.
   - Vista separada en por cobrar, cobrado y otros estados.
   - Cuotas con plan total, cuota registrada, valor de cuota y total financiado.
   - Interes por movimiento.
   - Filtros dependientes Cliente -> Expediente.
   - Reportes dentro de Finanzas:
     - Excel editable.
     - PDF imprimible.
     - Filtro por mes, estado y tipo de reporte.
     - Reportes separados: `General`, `Ingresos`, `Pagos`, `Por cobrar`, `Planes de pago`.

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

7. Racionalizacion de estilos y componentes reutilizables:
   - Se agregaron tokens globales en `:root` dentro de `frontend/src/styles/global.css`.
   - `Finanzas` movio sus estilos especificos a `frontend/src/modules/finance/finance.css`.
   - Se consolidaron campos reutilizables en `frontend/src/ui/FormFields.jsx`:
     - `FormField`
     - `FormSelect`
     - `FormTextarea`
     - `FormCheckbox`
     - `FormError`
   - Se consolidaron wrappers reutilizables en `frontend/src/ui/FormLayout.jsx`:
     - `ModalFormHeader`
     - `FormActionBar`
   - Se uniformaron modales y formularios principales para usar header con `X` y acciones consistentes.
   - `DataTable` quedo como base reusable para tablas sobre `react-bootstrap`.

8. Bloque 2 de `react-bootstrap` avanzado:
   - `Stack` aplicado en toolbars, headers y barras de acciones principales.
   - `Badge` aplicado en estados y metadatos visibles.
   - `ButtonGroup` aplicado donde convino agrupar acciones visibles.
   - `Dropdown` reusable creado en `frontend/src/ui/TableActionsDropdown.jsx` para acciones secundarias de tablas.
   - `Offcanvas` aplicado para sacar filtros/controles del flujo principal en:
     - `Expedientes`
     - `Agenda`
   - `Row` / `Col` aplicado en paneles de detalle para mejorar lectura:
     - `ClientDetail`
     - `CaseDetail`
   - Tablas/paneles tocados en esta ronda:
     - `Clients`
     - `Cases`
     - `Agenda`
     - `Attachments`
     - `System`
     - `Finance`
     - `ClientDetail`
     - `CaseDetail`

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
   - Racionalizar la capa de estilos antes de seguir corrigiendo vistas una por una.
   - Revisar especificamente el impacto visual de los cambios del bloque 2:
     - `Dropdown` en acciones de fila
     - `Offcanvas` en `Agenda` y `Expedientes`
     - `Badge` en estados
     - `Row / Col` en paneles de detalle
   - Tomar nota de inconsistencias visuales y de interaccion antes de seguir refactorizando.

2. Agenda:
   - Revisar con datos reales si la separacion Agenda/Tareas alcanza o si conviene migrar datos viejos `vencimiento` a `tarea`.
   - Confirmar si las tareas cumplidas deben ocultarse por defecto o quedar visibles.
   - Confirmar si el reporte PDF debe incluir solo pendientes o todo el periodo.

3. Finanzas:
   - Validar manualmente desde UI que las cards, listas y reportes mantengan criterios coherentes con datos reales. Parcialmente validado con flujo `Vencido -> Cobrado`.
   - Revisar si las cuotas de planes deben seguir apareciendo tanto en `Por cobrar/Cobros vencidos` como en `Planes de pago`; recomendacion actual: si, porque son deuda exigible y el reporte de planes es seguimiento.
   - Revisar si hace falta una vista propia de `Planes de pago` dentro de la pantalla, no solo como reporte.
   - Ajustar visualmente la densidad de Finanzas si en el repaso de la semana aparece algun recorte nuevo.
   - Probar que el formulario de Finanzas responda bien a cada tipo de movimiento y categoria.
   - Verificar que editar movimientos existentes no rompa la nueva clasificacion visual.
   - Revisar reportes con casos reales y no solo con datos demo reorganizados.
   - Verificar totales por moneda.
   - Revisar que Excel abra correctamente en Excel/LibreOffice.
   - Separar definitivamente datos demo de datos reales antes de instalacion.

4. Usuarios y seguridad:
   - Probar alta, edicion, baja logica y login posterior de usuarios nuevos.
   - Definir si hace falta rol `Consulta`.
   - Revisar auditoria en una tabla dedicada dentro de Sistema o dejarla solo para soporte tecnico.

5. Adjuntos:
   - Probar carga real de PDF, imagen, DOCX y ODT.
   - Probar adjuntos asociados solo a cliente, solo a expediente y a actuaciones/movimientos.
   - Revisar estructura final de carpetas de archivos.

6. Datos:
   - Separar datos demo de datos reales. Completado con script generador.
   - Preparar una base inicial limpia para instalacion. Completado:
     - `scripts/create_clean_database.py`
     - salida local ignorada por Git: `data/estudio_juridico_clean.db`
     - documentacion: `docs/base_limpia.md`
   - Definir si se entrega con credenciales iniciales o si el instalador crea el primer administrador.
   - Decision provisoria:
     - conservar solo `admin` con rol `Administrador`
     - eliminar usuarios demo/tecnicos de la base limpia
     - mantener `admin/admin123` hasta definir si se fuerza cambio de contrasena en primer arranque

7. Tests:
   - Estado actual:
     - backend con `npm test` real y 20 tests.
     - frontend con `npm test` real y 7 tests.
   - Proximos tests recomendados:
     - backend: Clientes, Expedientes y Finanzas con base temporal.
     - backend: errores de validacion y permisos por rol sobre endpoints reales.
     - frontend: sumar tests de componentes cuando se defina herramienta de render.
     - mantener tests de helpers puros para logica de clasificacion, reportes y normalizacion.

8. Git:
   - Cambios principales de esta ronda ya commiteados y pusheados.
   - Mantener la regla:
     - no incluir `.db`, adjuntos reales, screenshots ni temporales.
     - separar commits por bloque funcional.
     - correr backend/frontend tests y build antes de pushear.
   - Evitar commitear bases `.db`, adjuntos reales o archivos temporales.

## Nota para la proxima sesion

- `pendientes_manana.md` quedo absorbido por este documento. Usar `cosas_por_hacer.md` como fuente principal de continuidad.
- El bloque 2 quedo suficientemente avanzado como para frenar aca y hacer una revision visual/manual completa.
- La proxima sesion deberia arrancar con el repaso visual del usuario y una lista concreta de hallazgos por vista.
- No conviene seguir metiendo mas cambios estructurales de UI antes de ese repaso.
- Si el repaso visual confirma que `Dropdown` u `Offcanvas` no funcionan bien en alguna vista, ajustar primero interaccion/espacio antes de seguir migrando mas componentes.

## Analisis de la iteracion actual de tablas

### Resultado real

- Se migro el proyecto desde tablas HTML crudas con `table-wrap` a un componente reutilizable `DataTable`.
- La migracion mejoro la consistencia de estilos y centralizo parte del comportamiento.
- Sin embargo, el problema principal sigue abierto:
  - en `Finanzas`, especialmente en `Ver todo`, el ultimo tramo visible de las tablas sigue recortandose o no queda claro donde vive el scroll principal
  - en vistas con mas registros, el ultimo elemento aun puede quedar fuera del area util

### Componente `DataTable`: props actuales

Archivo: `frontend/src/ui/DataTable.jsx`

- `children`
  - contenido completo de la tabla (`thead` + `tbody`)
- `className`
  - clases extra para la tabla Bootstrap
- `wrapperClassName`
  - clases extra para el contenedor externo
- `compact`
  - usa `size="sm"` en la tabla Bootstrap
- `fill`
  - hace que el shell intente ocupar el alto disponible del panel padre
- `autoHeight`
  - elimina el `max-height` del scroller y deja crecer la tabla

### CSS que hoy gobierna la tabla

Bloques principales en `frontend/src/styles/global.css`:

- `.data-table-shell`
- `.data-table-scroll`
- `.data-table-shell.fill .data-table-scroll`
- `.data-table-shell.auto-height .data-table-scroll`
- `.app-data-table`
- `.app-data-table thead th`
- `.app-data-table td.actions-cell`
- reglas particulares de Finanzas:
  - `.finance-groups`
  - `.finance-table-wrap .data-table-scroll`
  - `.finance-summary-grid`
  - `.finance-summary-card`

### Problema tecnico detectado

- Sigue habiendo demasiadas capas que compiten por el alto/scroll:
  - `workspace`
  - `module-content`
  - `panel`
  - `finance-groups`
  - `data-table-shell`
  - `data-table-scroll`
- En `Finanzas`, el modo `Ver todo` mezcla:
  - contenedor general con scroll (`finance-groups`)
  - tablas por grupo
  - `autoHeight`
  - alturas maximas especiales para Finanzas
- Esa mezcla hace dificil predecir donde debe vivir realmente el scroll.
- Conclusion de esta ronda:
  - el problema ya no parece ser de margenes finos
  - el problema es estructural: hay que decidir un solo nivel responsable del scroll

### Recomendacion concreta para retomar

Trabajar primero solo sobre `Finanzas`, vista `Ver todo`, y usarla como modelo para el resto.

Pasos recomendados:

1. Definir un solo scroll principal para `Ver todo`.
   - O scroll del contenedor general de Finanzas.
   - O scroll interno de una unica tabla.
   - No mezclar ambos.

2. Elegir uno de estos dos modelos y sostenerlo:
   - Modelo A: cuatro grupos apilados, sin scroll interno por grupo, con scroll solo en el contenedor general.
   - Modelo B: una sola tabla de movimientos con separadores visuales por grupo y un unico scroll.

3. Si se mantiene el Modelo A:
   - `DataTable` en Finanzas no deberia usar `max-height` propio.
   - `finance-groups` deberia ser el unico contenedor scrollable.
   - revisar que `panel` y `module-content` no recorten altura de mas.

4. Si se pasa al Modelo B:
   - `DataTable` se vuelve mas simple.
   - la logica de agrupacion queda en JSX, no en cuatro tablas separadas.
   - seria la opcion mas estable para recuperar espacio util.

5. Una vez que `Finanzas` quede resuelta en `Ver todo`, aplicar el mismo patron al resto de vistas.

### Decision para la proxima sesion

- No seguir ajustando `margin-bottom`, `padding-bottom` o `max-height` de forma incremental sin antes decidir donde vive el scroll.
- Usar la tabla de `Finanzas` en modo `Ver todo` como caso base.
- Si esa queda funcional, migrar el mismo criterio a `Clientes`, `Expedientes`, `Agenda`, `Adjuntos` y `Sistema`.

## Backup: estado y plan de mantenimiento

### Problema resuelto

- El backup con `fs.copyFileSync` fallo en Windows con `EPERM` al copiar la base SQLite abierta.
- Ese problema quedo resuelto usando `db.backup()` de `better-sqlite3` y manteniendo el proyecto en `Node 24`.
- La creacion, registro, archivo fisico, integridad y descarga autenticada ya fueron validados.

### Solucion recomendada

1. Mantener proyecto en `Node 24` y, si se reinstalan dependencias o se mueve de equipo, verificar/recompilar `better-sqlite3` para esa version.
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
   - Fijar Node 24 para backend/frontend.
   - Asegurar que `better-sqlite3` se compile o se entregue compatible con Node 24 en el instalador final.

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

1. En otro equipo, `better-sqlite3` debera quedar compilado para `Node 24` o el backend no iniciara.
2. Falta probar instalacion en equipo limpio.
3. Falta separar definitivamente datos demo de datos reales.
4. La responsividad en telefonos es poco funcional; prioridad baja por decision actual de uso en PC/escritorio.
5. Falta ampliar tests de endpoints reales con base temporal.

## Tarea transversal: racionalizar estilos

### Objetivo

Ordenar la capa visual para que los ajustes futuros no vuelvan a romper otras vistas y para que el codigo CSS sea mas facil de leer.

### Trabajo a hacer

1. Consolidar en `:root` los valores globales:
   - colores
   - bordes
   - radios
   - sombras
   - espaciados base
   - tipografias/tamanos recurrentes

2. Dejar en `global.css` solo estilos verdaderamente globales:
   - layout principal
   - reset/base
   - botones generales
   - formularios generales
   - tablas base reutilizables
   - tokens visuales de `:root`

3. Separar los estilos por modulo cuando mejoren la lectura del codigo:
   - `Finanzas`
   - `Agenda`
   - `Clientes`
   - `Expedientes`
   - `Adjuntos`
   - `Sistema`

4. Evitar que reglas globales demasiado amplias sigan afectando componentes puntuales:
   - `th`, `td`
   - `table`
   - `overflow`
   - `max-height`
   - `position: sticky`

5. Revisar el cruce entre Bootstrap y CSS propio:
   - decidir que resuelve Bootstrap
   - decidir que resuelve el CSS de la app
   - evitar duplicar responsabilidades en la misma tabla/componente

6. Explorar mejor `react-bootstrap` para la UI:
   - revisar que componentes ya instalados conviene usar
   - evaluar reemplazos utiles para patrones hoy resueltos a mano
   - priorizar componentes que mejoren consistencia visual y reduzcan CSS custom
   - empezar por tablas, layouts, acciones, badges/estados y navegacion auxiliar
   - revisar si conviene usar:
     - `Table`
     - `Container` / `Row` / `Col`
     - `Stack`
     - `ButtonGroup`
     - `Badge`
     - `Card`
     - `Tabs` / `Nav`
     - `Dropdown`
     - `Offcanvas` o variantes de filtros/modales

7. Mantener una regla simple para las proximas iteraciones:
   - estilos globales solo para patrones compartidos
   - estilos de vista o modulo para necesidades particulares

### Prioridad

- Alta.
- Conviene hacer esto antes de seguir refinando visualmente todas las tablas, porque hoy la mezcla de estilos globales, estilos por vista y Bootstrap vuelve fragil cualquier ajuste.

## Credenciales heredadas

- `admin` / `admin123`
- `operador` / `operador123`
