# Pendientes para continuar mañana

Estado al cierre:

- Base React + Node + SQLite funcionando.
- Dashboard conectado a datos reales.
- Clientes con alta, edición, baja lógica, búsqueda y detalle.
- Expedientes con API CRUD y frontend operativo inicial.
- Agenda, Finanzas, Adjuntos, Usuarios, Auditoría, Reportes y Backups con endpoints/paneles de lectura iniciales.

## Prioridad 1: estabilizar módulos migrados

1. Separar la UI de Expedientes en componentes propios, igual que Clientes.
2. Mejorar validaciones de Expedientes: fechas, número duplicado, estado permitido.
3. Agregar filtros avanzados en Expedientes por cliente, estado, fuero y fecha.
4. Agregar indicadores de carga y error en cada panel.
5. Agregar paginación o límites configurables para tablas grandes.

## Prioridad 2: Agenda y actuaciones

1. Crear formulario de actuación.
2. Implementar alta, edición y baja lógica de actuaciones.
3. Agregar filtro por vencidos, próximos, cumplidos y expediente.
4. Agregar acción para marcar actuación como cumplida.
5. Conectar actuaciones con detalle de expediente.

## Prioridad 3: Finanzas

1. Crear formulario de movimiento financiero.
2. Implementar alta, edición y baja lógica de movimientos.
3. Agregar filtros por estado de pago, cliente, expediente y rango de fechas.
4. Agregar totales por moneda/estado.
5. Validar montos y fechas.

## Prioridad 4: Adjuntos

1. Implementar subida de archivos con `multer`.
2. Copiar archivos a `data/adjuntos`.
3. Crear endpoint de descarga.
4. Asociar adjuntos a cliente, expediente, actuación o movimiento.
5. Agregar eliminación lógica o física según decisión funcional.

## Prioridad 5: Sistema

1. Implementar login real en React.
2. Implementar sesiones/JWT en backend.
3. Aplicar permisos por rol.
4. Migrar gestión de usuarios.
5. Implementar auditoría automática en operaciones CRUD.

## Prioridad 6: Reportes y backups

1. Exportar CSV desde backend.
2. Crear reportes por Clientes, Expedientes, Agenda y Finanzas.
3. Crear backup manual desde backend.
4. Descargar backup desde la interfaz.
5. Documentar restauración de backups.

## Criterio de avance

El próximo objetivo concreto debería ser cerrar Agenda/Actuaciones con CRUD completo, porque depende de Expedientes y habilita el control de vencimientos, que es una función central del estudio.
