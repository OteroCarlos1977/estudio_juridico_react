# Pendientes para continuar

Estado al cierre:

- Base React + Node + SQLite funcionando.
- Dashboard conectado a datos reales.
- Clientes con alta, edición, baja lógica, búsqueda y detalle.
- Agenda/Actuaciones con CRUD completo, filtros, marcar cumplida y modales de alta/edición.
- Actuaciones conectadas con el detalle de Expediente.
- Expedientes con CRUD, detalle y alta/edición en modal.
- Finanzas con CRUD completo, filtros, totales por moneda/estado y modales de alta/edición.
- Navegación principal corregida: cada módulo renderiza solo al seleccionarlo desde el menú lateral, con Dashboard como vista inicial y hash por sección.
- Clientes usa modal para alta/edición; ya no mantiene formulario embebido en el panel principal.
- Expedientes separado en componentes propios para detalle, tabla y formularios modales.
- React Bootstrap y SweetAlert2 incorporados como base de UI/mensajería; confirmaciones de borrado migradas desde `window.confirm`.
- Agenda y Finanzas separados en componentes propios para tablas y formularios modales.
- Indicadores de carga/error consistentes agregados en Dashboard, Clientes, Expedientes, Agenda, Finanzas, Adjuntos y Sistema.
- Expedientes estabilizado con validaciones de fecha, número duplicado, estados permitidos, filtros avanzados, límite configurable y bloqueo de baja si hay actuaciones o movimientos activos.
- Adjuntos implementado con subida, guardado en `data/adjuntos`, descarga, asociaciones y baja lógica.
- Sistema implementado con login React, JWT en backend, permisos por rol, gestión básica de usuarios y auditoría automática de operaciones CRUD.
- Reportes CSV y backups manuales implementados desde backend e interfaz; restauración documentada.

## Prioridad 1: navegación y estructura de pantalla

Completada.

1. Navegación principal corregida.
2. Cada módulo se renderiza solo al convocarlo desde el menú lateral.
3. Dashboard queda como vista inicial.
4. El menú mantiene estado activo y cada sección tiene hash propio.
5. Los modales de alta/edición quedan aislados por módulo al cambiar de sección.

## Prioridad 2: normalizar modales y UI

1. Pasar Clientes a modal de alta/edición. Completado.
2. Revisar que todos los módulos de carga/modificación usen modal, no formularios embebidos. Revisado para Clientes, Expedientes, Agenda y Finanzas.
3. Separar la UI de Expedientes en componentes propios, igual que Clientes. Completado.
4. Separar formularios/tablas de Agenda y Finanzas en componentes propios. Completado.
5. Agregar indicadores de carga y error consistentes en cada panel. Completado.

## Prioridad 3: estabilizar Expedientes

1. Mejorar validaciones: fechas, número duplicado, estado permitido. Completado.
2. Agregar filtros avanzados por cliente, estado, fuero y fecha. Completado.
3. Agregar paginación o límites configurables para tablas grandes. Completado con límite configurable.
4. Revisar baja lógica de expedientes con actuaciones o movimientos asociados. Completado: la baja queda bloqueada si hay asociaciones activas.

## Prioridad 4: Adjuntos

Completada con baja lógica.

1. Implementar subida de archivos con `multer`. Completado.
2. Copiar archivos a `data/adjuntos`. Completado.
3. Crear endpoint de descarga. Completado.
4. Asociar adjuntos a cliente, expediente, actuación o movimiento. Completado.
5. Agregar eliminación lógica o física según decisión funcional. Completado con eliminación lógica.

## Prioridad 5: Sistema

Completada en versión inicial.

1. Implementar login real en React. Completado.
2. Implementar sesiones/JWT en backend. Completado.
3. Aplicar permisos por rol. Completado en backend: Administrador tiene lectura/escritura/baja/admin; Operador lectura/escritura; Consulta lectura.
4. Migrar gestión de usuarios. Completado con alta/edición, rol y contraseña opcional al editar.
5. Implementar auditoría automática en operaciones CRUD. Completado para operaciones mutantes de módulos API.

## Prioridad 6: Reportes y backups

Completada.

1. Exportar CSV desde backend. Completado.
2. Crear reportes por Clientes, Expedientes, Agenda y Finanzas. Completado.
3. Crear backup manual desde backend. Completado.
4. Descargar backup desde la interfaz. Completado.
5. Documentar restauración de backups. Completado en `docs/restauracion_backups.md`.

## Verificaciones pendientes

1. Crear tests reales para backend y frontend; hoy `npm test` solo imprime "No tests configured yet".
2. Hacer una pasada manual completa por navegador sobre Clientes, Expedientes, Agenda y Finanzas.
3. Revisar responsive/mobile de tablas, filtros y modales.
4. Revisar y commitear el bloque de cambios cuando esté validado visualmente.

## Próximo objetivo concreto

Verificaciones finales: crear tests reales para backend/frontend, hacer pasada manual completa en navegador, revisar responsive/mobile y commitear cuando este validado visualmente.
