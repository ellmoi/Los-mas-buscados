# Contacto seguro, seguimiento y resolución

## Base inspeccionada y reutilizada

La aplicación ya registra usuarios en SQLite (`users`), deriva contraseñas con scrypt y guarda sesiones con token hasheado en `sessions`; el navegador recibe una cookie HttpOnly/SameSite. Se conservan registro, login, recuperación, cuenta y permisos existentes.

Los reportes están en `cases`, con `kind` (lost/found/adoption), `state` y un JSON de datos del animal. Las fotos se guardan por separado. Perdidos/encontrados ya usaban estados open/resolved; las adopciones conservan available/paused/adopted. No se añade otro estado ni autenticación.

Ya había conversaciones por caso en `conversations`, mensajes de texto en `messages`, idempotencia, no leídos, lectura privada, cierre por participante y actualización manual. También existían moderación, cuenta y coincidencias que excluyen casos resueltos. Se amplía esa implementación.

## Recorrido

1. Abre un reporte o una posible coincidencia y pulsa **Contactar sobre este caso**.
2. Sin sesión, el enlace lleva al login existente. Cambiar a registro conserva el destino. Al autenticarte vuelves al mismo caso, incluida la referencia al reporte original.
3. Contactar abre una conversación nueva o reutiliza la existente, sin enviar un mensaje automático. Escribe y envía tu primer mensaje desde allí.
4. La conversación muestra enlaces compactos al caso y a los reportes relacionados, nombre del interlocutor, mensajes y fechas. Usa **Actualizar** para consultar respuestas.
5. El creador puede pulsar **Marcar como resuelto**, elegir un resultado y añadir una nota pública opcional. Debe confirmar con **Sí, resolver caso**; Cancelar o Escape cierran la confirmación y restauran el foco.
6. El reporte queda marcado como resuelto, permanece en el historial y deja de recomendarse como coincidencia. El propietario puede reabrirlo mediante otra confirmación.

La resolución de un reporte no resuelve automáticamente el de otra persona. Cada creador debe comprobar y actualizar su propio caso. Una coincidencia no confirma que sea el mismo animal.

## Endpoints

No se añade una familia de endpoints nueva:

| Endpoint existente | Ampliación |
|---|---|
| POST `/api/v1/cases/:id/conversations` | Acepta `{openOnly:true, relatedCaseId?:id}` para abrir/reutilizar sin enviar texto. La variante anterior con `text` y `clientId` sigue disponible. |
| GET `/api/v1/conversations` | Añade extracto de último mensaje y fecha; incluye conversaciones aún sin mensajes. Mantiene páginas de 20 y no leídos. |
| GET `/api/v1/conversations/:id` | Añade referencias compactas a los reportes, sin campos privados. Mantiene páginas de 40 mensajes. |
| POST `/api/v1/conversations/:id/messages` | Se conserva validación, idempotencia, límite de texto y autorización por participante. |
| PATCH `/api/v1/cases/:id` | Permite resultado opcional al resolver; reserva resolución/reapertura al creador. |
| GET `/api/v1/cases` | Prioriza estados activos (open/available), y después aplica el orden elegido. Devuelve `isOwner` y `canResolve` por caso. |
| GET `/api/v1/cases/:id` | Devuelve esos permisos y el resultado público de resolución, cuando existe. |

Las demás rutas de mensajes, lectura, cierre, coincidencias, edición y moderación se reutilizan. No hay WebSockets, polling ni servicios externos nuevos.

## Datos

Se crea automáticamente una sola tabla auxiliar, compatible con bases existentes:

`conversation_cases(conversation_id, case_id)`, con claves foráneas y clave primaria compuesta. Guarda referencias adicionales al caso principal. No modifica ni duplica mensajes antiguos y forma parte del respaldo SQLite.

La unicidad original de conversación por caso/visitante se conserva. Se busca primero una combinación ya vinculada de reportes y los mismos participantes, también en sentido inverso, antes de abrir otro hilo. Varios reportes relacionados pueden acumularse en el hilo existente, hasta diez referencias adicionales; no se crean conversaciones nuevas por cada candidato. Los hilos históricos independientes no se fusionan ni se eliminan.

El JSON del caso puede contener:

```json
{
  "resolution": {
    "outcome": "reunited",
    "note": "Luna volvió con su familia.",
    "resolvedAt": "fecha ISO asignada por el servidor"
  }
}
```

Resultados posibles: `reunited` (familia), `safe` (quedó seguro) y `other`. Nota opcional de hasta 300 caracteres. Una edición ordinaria conserva el resultado y la fecha; un reintento idéntico tampoco los cambia. Intentar sustituir un resultado ya guardado devuelve conflicto. Reabrir retira el resultado público vigente, conservando la publicación y las conversaciones. No se inventa una fecha de resolución para reportes históricos sin ese dato.

## Autorización y privacidad

- Solo usuarios autenticados abren conversaciones o envían mensajes. El usuario no puede contactarse a sí mismo.
- Solo los dos participantes pueden leer, responder, marcar lectura o cerrar el hilo. Un ADMIN ajeno sigue sin acceso a mensajes privados.
- Los IDs se validan en servidor. Se comprueba que los reportes relacionados existan, sean visibles y tengan tipos opuestos lost/found.
- Se reutiliza un hilo con independencia del sentido desde el que se consulta una pareja de reportes. Aperturas concurrentes no duplican esa conversación.
- Solo el creador puede resolver/reabrir. ADMIN conserva consulta, edición ordinaria y moderación, pero no resuelve casos de otros usuarios.
- Un caso resuelto no recibe contactos nuevos; las conversaciones previas pueden abrirse y continuar para seguimiento. Un caso principal oculto bloquea mensajes y contactos, conservando el historial.
- Las referencias a reportes ocultos omiten nombre, foto y enlace. No se publican email, teléfono, propietario ni dirección exacta como campos de contacto en las tarjetas.
- Nombre de cuenta, mensajes, títulos, notas y resultados se escapan con el mecanismo existente antes de construir HTML; estados dinámicos usan `textContent`. Las redirecciones de login admiten únicamente rutas internas reconocidas.

El usuario aún puede escribir datos personales dentro de texto libre. Se recomienda no publicarlos y reservar detalles de verificación para la conversación. No se añade detección automática de datos personales ni verificación de identidad.

## Interfaz y recursos

**Mi cuenta** y **Mis reportes** enlazan a activos, resueltos y conversaciones. Mis reportes reutiliza el listado paginado de 24 elementos en lugar de descargar hasta 100 de una vez; limpiar filtros conserva el alcance privado. Las tarjetas resueltas muestran **✓ Caso resuelto** y el detalle mantiene el tipo original del reporte.

La conversación reutiliza la respuesta cargada al abrir la página: no hace una segunda lectura inicial idéntica. No hay llamadas API por mensaje o tarjeta de referencia; solo solicitudes normales para abrir, enviar, actualizar, paginar y marcar lectura. Las miniaturas visuales cargan las imágenes existentes de forma diferida; no se generan nuevas versiones de archivo.

Se conservan controles semánticos, labels, foco, confirmación mediante teclado, estados anunciables y CSS adaptable. No se introduce un dashboard ni un sistema de chat adicional.

## Archivos de esta fase

Nuevos: `backend/case-resolution.mjs`, `frontend/js/auth-return.js`, `frontend/js/components/case-lifecycle.js`, `tests/case-followup.test.mjs`, `tests/followup-interactions.test.mjs` y este informe.

Modificados: `server.mjs`, `backend/messages.mjs`, `backend/case-search.mjs`, `frontend/js/app.js`, `frontend/js/cases.js`, `frontend/js/case-list.js`, `frontend/js/components/ui.js`, `frontend/js/pages/auth.js`, `frontend/js/pages/detail.js`, `frontend/js/pages/messages.js`, `frontend/js/pages/account.js`, `frontend/css/messages.css`, `tests/render.test.mjs`, `tests/case-list-interactions.test.mjs`, `README.md`, `docs/FASES.md` y `docs/REVISION.md`.

## Pruebas y límites

Resultado: **77 pruebas aprobadas**, comprobador estático correcto (100 módulos, 251 referencias locales y 13 hojas CSS) y `git diff --check` sin errores de espacios. Comandos: `node --test tests/*.test.mjs`, `node scripts/check.mjs` y `git diff --check`.

Las pruebas de esta fase cubren el recorrido A/B, respuestas, reinicio y persistencia; conversaciones duplicadas/concurrentes/en sentido inverso; hilos históricos; sesiones, participantes, ADMIN, IDs, texto vacío y límites; permisos de resolución, reintentos y conflictos; resultados, historial y exclusión de coincidencias; prioridad activa; referencias ocultas; redirecciones seguras y retorno real del controlador de login; cancelación, Escape, foco y recuperación de errores; apertura sin doble envío ni doble lectura inicial; limpieza de filtros privados y XSS.

La validación de interfaz usa controladores reales con dobles de DOM y comprobaciones de HTML. La herramienta de UI devuelve navegadores y aplicaciones vacíos: siguen pendientes la inspección visual en escritorio/móvil, gestos físicos y consola de navegador. No se realizaron pruebas de carga masiva.

No hay comprobación automática de reencuentro, contratos de entrega, historial completo de transiciones, archivos en mensajes ni nuevos avisos automáticos. La arquitectura sigue siendo una instancia SQLite; los avisos internos de mensajes ya existentes se conservan. Esta fase termina aquí.
