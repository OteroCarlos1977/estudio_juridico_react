# Temporal API: parametros de adopcion

Fecha de analisis: `2026-04-28`.

## Estado actual

- Runtime local del proyecto: `Node v24.4.1`.
- `Temporal` no esta disponible por defecto:
  - `node -p "typeof Temporal"` devuelve `undefined`.
- `Temporal` si aparece al ejecutar Node con flag experimental:
  - `node --harmony-temporal -p "typeof Temporal"` devuelve `object`.
- Decision: no usar `--harmony-temporal` en produccion ni depender de `Temporal` nativo hasta que este disponible por defecto en la version de Node usada por la app.

Fuentes revisadas:

- Node.js globals: https://nodejs.org/docs/latest/api/globals.html
- TC39 Temporal: https://github.com/tc39/proposal-temporal
- MDN Temporal: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal
- MDN Temporal.PlainDate: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/PlainDate
- MDN Temporal.ZonedDateTime: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime

## Regla principal para este proyecto

Temporal se debe introducir primero como capa interna de utilidades, no directamente en rutas, componentes ni SQL.

No reemplazar masivamente `Date` en toda la app. La migracion debe ser incremental y testeada, porque el proyecto ya guarda fechas como strings `YYYY-MM-DD` y timestamps tipo `YYYY-MM-DD HH:mm:ss` en SQLite.

## Criterios de uso

1. Fechas de calendario sin hora:
   - Usar concepto equivalente a `Temporal.PlainDate`.
   - Aplica a:
     - `fecha_vencimiento`
     - `fecha_evento`
     - `fecha_movimiento`
     - `fecha_documento`
     - filtros `fecha_desde` / `fecha_hasta`
   - Persistencia: mantener string `YYYY-MM-DD` en SQLite.

2. Meses de reporte:
   - Usar concepto equivalente a `Temporal.PlainYearMonth`.
   - Aplica a:
     - reportes de Finanzas
     - reporte mensual de Agenda
     - filtros tipo `YYYY-MM`
   - Persistencia/transporte: mantener string `YYYY-MM`.

3. Timestamps tecnicos:
   - Usar concepto equivalente a `Temporal.Instant` para el instante real.
   - Aplica a:
     - `created_at`
     - `updated_at`
     - `fecha_hora` de auditoria
     - nombre de backups
   - Persistencia actual: mantener `YYYY-MM-DD HH:mm:ss` mientras no se migre la base.

4. Eventos con hora local:
   - Usar concepto equivalente a `Temporal.PlainDateTime` o `Temporal.ZonedDateTime` solo si se necesita zona horaria explicita.
   - Aplica a:
     - reuniones
     - audiencias
     - tareas con hora
   - Zona funcional de la app: `America/Argentina/Buenos_Aires`.

## Zona horaria funcional

La app se usa localmente en Argentina. Por eso, toda comparacion de "hoy", "vencido", "mes actual" y "por hacer hoy" debe usar la fecha local de negocio, no UTC.

Parametro recomendado:

```js
const BUSINESS_TIME_ZONE = "America/Argentina/Buenos_Aires";
```

Riesgo actual:

- Muchas partes usan `new Date().toISOString().slice(0, 10)`.
- Eso calcula fecha UTC, no fecha local de Argentina.
- En horarios cercanos a medianoche puede clasificar mal vencimientos, cobros del mes o tareas del dia.

## Lugares prioritarios para aplicar la capa temporal

1. Backend Agenda:
   - `currentDate()`
   - `buildAgendaReportRange()`
   - `validateDate()`
   - comparacion de vencidos
   - SQL con `date('now')`

2. Backend Finanzas:
   - `currentMonth()`
   - `isPastDate()`
   - `parseFinanceReportFilters()`
   - validacion de `fecha_movimiento` y `fecha_vencimiento`
   - actualizacion de `fecha_movimiento` al pasar de pendiente/vencido a cobrado/pagado

3. Backend Sistema:
   - `currentTimestamp()`
   - nombres de backup
   - fecha de exportaciones

4. Frontend Finanzas:
   - `groupMovements()`
   - `isPastDate()`
   - mes inicial del reporte
   - fecha inicial de nuevo movimiento

5. Frontend Agenda:
   - deteccion visual de vencidos
   - filtros por dia/semana/mes

## Parametro de implementacion recomendado

Crear una utilidad central antes de tocar modulos:

```txt
backend/src/utils/dateTime.js
frontend/src/utils/dateTime.js
```

Funciones minimas:

```js
const BUSINESS_TIME_ZONE = "America/Argentina/Buenos_Aires";

function todayISO() {}
function currentMonthISO() {}
function currentTimestampSQL() {}
function isValidISODate(value) {}
function isPastISODate(value) {}
function lastDayOfMonthISO(yearMonth) {}
function addDaysISO(date, days) {}
function formatDisplayDate(value) {}
```

Mientras `Temporal` no este disponible por defecto, estas funciones pueden usar `Intl.DateTimeFormat` y `Date` internamente. Si mas adelante se instala un polyfill o Node lo soporta nativamente, se cambia solo la utilidad, no toda la app.

## Regla para validacion de fechas

No usar solo `Date.parse()` para validar fechas.

Motivo:

- JavaScript puede normalizar fechas inexistentes.
- Ejemplo conceptual: una fecha como `2026-02-31` puede terminar siendo interpretada como una fecha de marzo.

Validacion requerida:

1. Verificar formato exacto `YYYY-MM-DD`.
2. Construir la fecha.
3. Confirmar que el resultado serializado coincide con el input original.

Esta regla ya se corrigio en Adjuntos y debe replicarse en Agenda, Expedientes y Finanzas.

## Estrategia de adopcion

### Fase 1: sin dependencia nueva

- Crear utilidades centralizadas.
- Reemplazar funciones duplicadas:
  - `currentDate`
  - `currentTimestamp`
  - `currentMonth`
  - `isPastDate`
  - `isIsoDate`
- Agregar tests unitarios de fechas:
  - hoy local
  - ultimo dia de mes
  - febrero bisiesto/no bisiesto
  - fechas invalidas
  - comparacion de vencidos

### Fase 2: polyfill opcional

Solo si hace falta precision mayor o si la app empieza a depender fuerte de reglas de zona horaria:

```bash
npm install @js-temporal/polyfill
```

Condiciones:

- Instalarlo tanto donde corresponda en backend/frontend o encapsularlo en utilidades.
- No importar `Temporal` directo desde componentes.
- No mezclar `Date` y `Temporal` en una misma funcion de dominio.
- Medir impacto en bundle del frontend antes de usarlo del lado cliente.

### Fase 3: Temporal nativo

Cuando la version de Node usada por la app tenga `Temporal` disponible por defecto:

- quitar polyfill si existiera
- mantener las mismas utilidades
- verificar tests de fechas antes de release

## Decision actual

No migrar aun a `Temporal` directo.

Primero corresponde crear la capa `dateTime` y cubrirla con tests. Despues se puede reemplazar gradualmente el uso de `new Date()` en Agenda, Finanzas y Sistema.

## Avance implementado

Estado al `2026-04-28`:

- Creada utilidad backend:
  - `backend/src/utils/dateTime.js`
- Creada utilidad frontend:
  - `frontend/src/utils/dateTime.js`
- Tests agregados:
  - `backend/tests/dateTime.test.js`
  - `frontend/tests/dateTime.test.mjs`
- Runners actualizados:
  - `backend/tests/run-tests.js`
  - `frontend/tests/run-tests.mjs`

Cobertura actual de esta capa:

- fecha local de Argentina frente a UTC
- mes actual segun zona de negocio
- timestamp SQL local
- validacion estricta de `YYYY-MM-DD`
- validacion de `YYYY-MM`
- comparacion de vencidos
- ultimo dia de mes, incluyendo bisiestos
- suma/resta de dias sobre fechas ISO
- formateo visible `dd/mm/aaaa` sin corrimiento horario

Verificacion:

- Backend: `npm test` correcto, `29/29` tests.
- Frontend: `npm test` correcto, `11/11` tests.
- Frontend: `npm run build` correcto.

Siguiente paso recomendado:

- Migrar primero `Agenda` backend a `dateTime.js`, porque ahi conviven reportes, vencimientos automaticos y SQL con `date('now')`.
- Luego migrar `Finanzas`, especialmente `currentMonth()`, `isPastDate()` y fecha de cobro al pasar de pendiente/vencido a cobrado/pagado.

Avance posterior:

- `Agenda` backend ya usa `dateTime.js` para fecha actual, timestamp, validacion estricta, reportes y vencidos.
- `Finanzas` backend/frontend ya usa `dateTime.js` para mes actual, vencidos, fecha inicial, fin de mes y fecha local al liquidar.
- `Dashboard` backend ya usa fecha local de negocio en lugar de `date('now')` para vencimientos y tabla `Para hoy`.
