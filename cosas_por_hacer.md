# Cosas por hacer

## Estado de la sesion

- Sesion local de referencia: `ROLLIE-2026-04-23-1009-ART`
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
  - Quedaron cambios sin commit en backend/frontend, concentrados en `Finanzas`, layout global y persistencia de sesion.
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
   - Corregir la logica final de las 4 tarjetas segun negocio:
     - `Lo que se paga`
     - `Cobrado`
     - `Por cobrar`
     - `Cobros vencidos`
   - Confirmar que cada tarjeta sume exactamente lo que debe mostrar en la lista.
   - Revisar si `Cobrado` debe tomar solo pagos del mes actual por `fecha_movimiento`, por `fecha_vencimiento` o por otro criterio.
   - Revisar si `Por cobrar` debe incluir solo cuotas futuras, pendientes sin vencer, anticipos y/o cuentas por cobrar.
   - Revisar si `Cobros vencidos` debe excluir `Cancelado` y tomar solo deuda efectiva impaga.
   - Definir tratamiento de tipos `Ingreso`, `Cuenta por cobrar`, `Honorario`, `Anticipo` y `Cuenta por pagar` dentro de cada tarjeta.
   - Rehacer la resolucion visual de la tabla principal de Finanzas partiendo de la vista `Ver todo`.
   - Eliminar el enfoque actual de multiples scrolls/alturas combinadas si sigue generando recortes.
   - Confirmar si `Ver todo` debe:
     - usar un unico scroll general del bloque de Finanzas
     - o usar una sola tabla unificada con agrupacion visual, sin cuatro tablas separadas
   - Ajustar visualmente la densidad de la tabla principal de Finanzas una vez cerrada la logica.
   - Probar que el formulario de Finanzas responda bien a cada tipo de movimiento y categoria.
   - Verificar que editar movimientos existentes no rompa la nueva clasificacion visual.
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
   - Commits pendientes de esta ronda:
     - `backend/src/modules/finance/finance.routes.js`
     - `frontend/src/app/App.jsx`
     - `frontend/src/ui/DataTable.jsx`
     - `frontend/src/ui/FormFields.jsx`
     - `frontend/src/ui/FormLayout.jsx`
     - `frontend/src/ui/TableActionsDropdown.jsx`
     - `frontend/src/modules/finance/FinanceForm.jsx`
     - `frontend/src/modules/finance/FinancePanel.jsx`
     - `frontend/src/modules/finance/FinanceTable.jsx`
     - `frontend/src/modules/finance/finance.css`
     - `frontend/src/modules/clients/ClientForm.jsx`
     - `frontend/src/modules/clients/ClientDetail.jsx`
     - `frontend/src/modules/clients/ClientTable.jsx`
     - `frontend/src/modules/clients/ClientsPanel.jsx`
     - `frontend/src/modules/cases/CaseTable.jsx`
     - `frontend/src/modules/cases/CaseDetail.jsx`
     - `frontend/src/modules/cases/CaseForm.jsx`
     - `frontend/src/modules/cases/CaseActionForm.jsx`
     - `frontend/src/modules/agenda/AgendaTable.jsx`
     - `frontend/src/modules/agenda/AgendaForm.jsx`
     - `frontend/src/modules/agenda/AgendaPanel.jsx`
     - `frontend/src/modules/attachments/AttachmentsPanel.jsx`
     - `frontend/src/modules/system/SystemPanel.jsx`
     - `frontend/src/styles/global.css`
   - Hacer commit cuando la pasada visual este aprobada.
   - Evitar commitear bases `.db`, adjuntos reales o archivos temporales.

## Nota para la proxima sesion

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

## Backup: problema actual y plan recomendado

### Problema detectado

- El backup con `fs.copyFileSync` fallo en Windows con `EPERM` al copiar la base SQLite abierta.
- Se intento usar el mecanismo `backup()` de `better-sqlite3`, pero quedo pendiente de validar con el proceso correcto.
- Ese problema quedo resuelto en esta maquina recompilando `better-sqlite3` para `Node 24`.

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

1. Backup aun desactivado.
2. No hay tests reales.
3. Hay muchos cambios sin commit.
4. En otro equipo, `better-sqlite3` debera quedar compilado para `Node 24` o el backend no iniciara.
5. Falta probar instalacion en equipo limpio.

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
