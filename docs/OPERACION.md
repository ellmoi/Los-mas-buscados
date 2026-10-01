# Ejecución y operación de Buscados

[Volver al README](../README.md) · [Notas para desarrolladores](DESARROLLO.md)

## Inicio local

Requiere Node.js 24.19 o posterior de la rama 24. No necesita instalar paquetes.

- `npm run demo`: backend con ejemplos en `http://localhost:3001`, datos en `data/demo/`.
- `npm start`: aplicación sin cargar ejemplos en `http://localhost:3000`.
- `npm run check`: sintaxis, referencias locales y estructura CSS.
- `npm test`: suite automatizada con bases temporales.

En PowerShell usa `npm.cmd` si se bloquea `npm.ps1`. Detén el servidor con Ctrl+C. Las cookies de localhost se comparten entre puertos: usa perfiles de navegador distintos para ejecutar demo y normal simultáneamente.

## Configuración

Copia `.env.example` a `.env` sin sobrescribir una configuración existente. Inicia con `node --env-file=.env server.mjs`.

| Variable | Propósito |
|---|---|
| `PORT`, `HOST` | Puerto y dirección del servidor |
| `DATA_DIR` | Directorio de SQLite y correo local |
| `PUBLIC_URL` | Origen utilizado en enlaces de correo |
| `COOKIE_SECURE` | Activar bajo HTTPS |
| `NODE_ENV` | Entorno de desarrollo o producción |
| `MAIL_MODE` | `file` local o `resend` externo |
| `MAIL_FROM`, `RESEND_API_KEY` | Remitente y credencial privada del proveedor |

Ejecuta los comandos desde la raíz. No publiques `.env`, `data/` ni `backups/`. Producción requiere HTTPS, almacenamiento persistente y configuración de correo externo; la demo de Pages no requiere estas variables.

## Administración y correo

Registra una cuenta y ejecuta `node scripts/admin.mjs tu-correo@ejemplo.com`. Si usas `.env`, añade `--env-file=.env` después de `node`. Vuelve a iniciar sesión y abre `/admin/`. La asignación invalida las sesiones anteriores y registra la operación.

Con `MAIL_MODE=file` los mensajes se guardan localmente en la carpeta de correo del directorio de datos. Los enlaces contienen tokens sensibles. Usa el enlace del archivo para verificar correo o recuperar contraseña. No se envían correos externos. Administración permite consultar el estado de la cola; la aceptación del proveedor no garantiza entrega al destinatario.

## Respaldos

Ejecuta `node scripts/backup.mjs`, o `node --env-file=.env scripts/backup.mjs` con configuración personalizada. El respaldo incluye los datos SQLite y se valida mediante una comprobación de integridad.

Para restaurar, detén el servidor, copia el respaldo a una carpeta nueva como `buscados.sqlite`, configura `DATA_DIR` e inicia el servidor. Conserva la base anterior hasta comprobar el resultado. Los tokens, sesiones y trabajos pendientes vuelven al estado del respaldo; no ejecutes simultáneamente la base original y la restaurada.

## Alcance y diagnóstico

`GET /api/v1/health` comprueba SQLite. Si el puerto está ocupado, revisa si el servidor ya está activo. Para probar el backend utiliza Node.js, no un servidor estático como Live Server. SQLite, la cola y los límites en memoria están diseñados para una sola instancia.

Consulta [API y datos](API_Y_DATOS.md), [la guía de estudio](GUIA_DE_ESTUDIO.md) y [el informe de revisión](REVISION.md) para recorridos, permisos y limitaciones.
