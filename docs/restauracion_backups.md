# Restauracion de backups

1. Detener el backend si esta ejecutandose.
2. Copiar el archivo `.db` descargado desde Sistema > Backups.
3. Reemplazar `data/estudio_juridico_v28.db` por ese archivo, conservando una copia del archivo actual.
4. Iniciar nuevamente el backend.
5. Verificar `/api/health` y revisar Dashboard, Clientes y Expedientes.

Los backups generados desde la interfaz se guardan tambien en `data/backups`.
