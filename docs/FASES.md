# Fases del proyecto

## Completado

- Contacto seguro, seguimiento y resolución: retorno al caso tras login, conversaciones vinculadas sin duplicación, resultado opcional con confirmación del creador e historial paginado. Suite actual: 77 pruebas aprobadas. [Alcance y límites](CONTACTO_Y_RESOLUCION.md).

- Cuentas, casos con fotos, mensajes privados, moderación, recuperación y verificación de correo.
- Revisión estática y pruebas de interacción de mensajes con dobles de DOM.
- Notificaciones internas persistentes: mensajes recibidos, adopciones y cambios de moderación, lectura individual o por lote y paginación.
- Adopciones: publicaciones con cuidados y requisitos, solicitudes privadas, bandejas paginadas, pausa, retirada, rechazo y confirmación final. 19 pruebas automatizadas pasan.

- Directorio veterinario: fichas administrables, borradores, revisión con fuente y fecha, búsqueda por ciudad o servicio, paginación y auditoría. Corrección de recuperación tras búsquedas fallidas y prueba de interacción.

- CMS editorial: artículos y proyectos, borradores, vista previa, revisión con fuente y fecha, publicación/ocultación, búsqueda, paginación, control de versiones y auditoría. 26 pruebas automatizadas aprobadas en total.

- Cola persistente de correo: alta atómica con tokens, reintentos, idempotencia, caducidad, recuperación tras reinicio y panel de estado. 31 pruebas aprobadas en total.
- Demostración local independiente: fotos y casos reutilizados, comentarios de muestra, conversaciones, solicitudes, avisos, directorio y CMS. Carga única sin sobrescribir datos normales; muestrario HTML y comandos npm.

- Comentarios públicos: lectura abierta, publicación con cuenta, edición y retirada por el autor, moderación auditada, reintentos sin duplicados, paginación y límites. Los comentarios de muestra existentes se convierten una sola vez a la tabla real. 35 pruebas aprobadas en total.

## Denuncias de comentarios completadas

Denuncias con motivo privado, una por cuenta y comentario, hasta 20 al día. Bandeja administrativa paginada con revisión, descarte y ocultación atómica auditada. Se comprueba la revisión del comentario antes de decidir.

El directorio y el CMS normales permanecen vacíos hasta disponer de contenido real revisado; únicamente el modo demo contiene ejemplos señalados. La taxonomía avanzada, relaciones entre especies/proyectos e imágenes editoriales quedan como ampliaciones del CMS.

## Pendientes independientes

- Búsqueda y coincidencias implementadas: filtros combinados, orden, normalización y hasta cinco candidatos explicados en el detalle. Suite actual: 70 pruebas aprobadas. Falta validación visual en navegador. Alcance en [Búsqueda y coincidencias](BUSQUEDA_Y_COINCIDENCIAS.md).

- Punto 1 del minijuego: recorrido automatizado completo aprobado; resta validación visual y de consola en navegador real.

- Validación visual e interacción real en escritorio y móvil: requiere navegador disponible.
- Correo externo, despliegue HTTPS y operación en producción: requieren configurar el entorno.
- Push y actualizaciones en tiempo real; los avisos internos se consultan manualmente.


## Punto 1 del minijuego — 15 de septiembre de 2026

Reutilizados el estado del barrio, diálogos, reacción y combate V2. Un canvas principal y un reloj compartidos; regreso a la posición del evento, victoria marcada sin repetición y recuperación tras derrota/reinicio. Pruebas actualizadas al flujo actual: 64 aprobadas en la suite completa. No se desarrollaron los puntos 2–5 ni se añadieron dependencias o assets. La fase termina aquí.
