# Estudio Jurídico React

Aplicación full stack orientada a la gestión operativa de un estudio jurídico. El proyecto está organizado con frontend React, backend Node.js/Express y persistencia local en SQLite.

## Objetivo

Centralizar información y tareas frecuentes de un estudio jurídico: expedientes, contactos, adjuntos, reportes y administración de datos internos. El foco del proyecto es ordenar procesos reales en una interfaz web mantenible y preparada para evolución progresiva.

## Estructura

```text
backend/    API Node.js, Express y acceso a SQLite
frontend/   Aplicación React
data/       Base SQLite, adjuntos, reportes y backups locales
docs/       Documentación técnica y funcional
```

## Backend

Tecnologías principales:

- Node.js
- Express
- SQLite con `better-sqlite3`
- JWT
- bcrypt
- Helmet
- Morgan
- Multer
- Zod

Comandos:

```bash
cd backend
npm install
npm run dev
```

Variables de entorno:

```bash
cp .env.example .env
```

Valores principales:

```env
PORT=3001
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_PATH=../data/estudio_juridico_v28.db
JWT_SECRET=change_this_secret_before_real_use
```

Para producción local:

```bash
npm start
```

Pruebas:

```bash
npm test
```

## Frontend

Tecnologías principales:

- React
- Vite
- React Router DOM
- TanStack React Query
- Axios
- Bootstrap / React Bootstrap
- SweetAlert2
- Lucide React

Comandos:

```bash
cd frontend
npm install
npm run dev
```

Variables de entorno:

```bash
cp .env.example .env
```

Valor principal:

```env
VITE_API_URL=http://localhost:3001/api
```

Build:

```bash
npm run build
```

Pruebas:

```bash
npm test
```

## Requisitos

Los `package.json` actuales declaran Node.js `>=24 <25`. Si se trabaja con otra versión de Node, conviene validar compatibilidad antes de instalar dependencias nativas como `better-sqlite3`.

## Datos locales

La carpeta `data/` está pensada para archivos de trabajo local: base SQLite, adjuntos, reportes y backups. Revisar cuidadosamente qué archivos se versionan para evitar subir información sensible o datos reales de clientes.

## Seguridad pendiente

- Mantener secretos y credenciales fuera del repositorio.
- Cambiar `JWT_SECRET` antes de cualquier uso real fuera de una demo local.
- Confirmar que las contraseñas se guarden siempre con hash.
- Validar entradas con Zod en endpoints críticos.
- Revisar permisos sobre adjuntos y reportes.
- Evitar subir datos reales en `data/`.

## Próximas mejoras recomendadas

- Documentar variables de entorno en `.env.example`.
- Agregar capturas de pantalla y flujo funcional principal.
- Completar documentación de endpoints.
- Incorporar migraciones o script de inicialización de base de datos.
- Agregar instrucciones de backup/restauración.
- Publicar una demo con datos ficticios si el alcance legal/privado lo permite.
