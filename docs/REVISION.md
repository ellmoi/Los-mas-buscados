# Revisión del proyecto

## Revisión general — 30 de septiembre de 2026

Revisión del estado local actual, incluidos los cambios preparados en Git. Resultado: **82 pruebas aprobadas, 0 fallidas y 0 omitidas**. El comprobador estático valida **103 módulos JavaScript, 262 referencias locales y 13 hojas CSS**. Tanto `git diff --check` como `git diff --cached --check` terminan sin errores.

La suite cubre cuentas, permisos, persistencia, búsqueda y coincidencias, contacto y resolución, adopciones, comentarios y denuncias, moderación, correo, directorio, contenido editorial, navegación, recursos HTTP, demo estática y minijuego. Los mensajes de error `test ... rollback` son fallos inyectados deliberadamente para comprobar transacciones; sus pruebas pasan.

No se detectaron fallos en las comprobaciones ejecutadas. Se revisaron también la configuración de rutas, el coordinador de navegación y la cobertura de integración existente. No fue necesario modificar código funcional.

**Límites del cierre:** la revisión automatizada queda completada; la validación visual y de interacción en escritorio/móvil sigue pendiente. Esta sesión no dispone de herramientas de navegador ni de Playwright/Puppeteer instalados en el proyecto. No se verificaron entrega externa de correo, despliegue HTTPS ni carga de producción. Los informes siguientes conservan sus resultados históricos y no representan el recuento actual.

Comandos ejecutados: `node scripts/check.mjs`, `node --test tests/*.test.mjs`, `git diff --check` y `git diff --cached --check`.

## Contacto, seguimiento y resolución — 17 de septiembre de 2026

Reutilizados autenticación, conversaciones HTTP y estados existentes. Añadidas referencias de reportes al hilo, retorno seguro tras login, apertura sin mensaje automático, confirmación del creador para resolver/reabrir, resultado público opcional, prioridad de casos activos y seguimiento paginado desde cuenta. ADMIN ajeno conserva moderación pero no puede resolver casos ni leer conversaciones de otros.

**77 pruebas aprobadas**. Comprobador estático: **100 módulos, 251 referencias locales y 13 hojas CSS**. `git diff --check` sin errores de espacios. Siete pruebas adicionales cubren flujo completo con persistencia, privacidad, duplicados en ambos sentidos, login, confirmación, errores, carga inicial única y filtros privados; las regresiones anteriores siguen pasando.

La comprobación de UI devolvió `apps: []` y `browsers: []`; siguen pendientes la inspección visual de escritorio/móvil y gestos reales. No se modificó el minijuego ni se instalaron dependencias. [Informe de cambios, endpoints, datos y limitaciones](CONTACTO_Y_RESOLUCION.md).

---

## Búsqueda y coincidencias — 17 de septiembre de 2026

Reutilizados SQLite, listado paginado, tarjetas compactas y detalle. Ampliada búsqueda normalizada y filtros combinados; añadido endpoint de coincidencias con motivos, exclusión de casos ocultos/resueltos y retorno al reporte original. Sin cambios de esquema, dependencias ni minijuego.

Resultado actual: **70 pruebas aprobadas**, incluidos seis casos de prueba nuevos con verificaciones de API, algoritmo, renderizado y controladores. Comprobador estático: **95 módulos JavaScript, 233 referencias locales y 13 hojas CSS**. `git diff --check` sin errores de espacios; avisos de conversión LF/CRLF habituales. El conjunto incluye cambios anteriores no confirmados en Git.

Pendientes: comprobación visual/gestos en navegador (ninguno conectado), miniaturas de imágenes y mediciones con grandes volúmenes. Las fechas comparadas son de publicación; la ubicación es texto, sin distancia geográfica. [Archivos, algoritmo, datos y límites de esta fase](BUSQUEDA_Y_COINCIDENCIAS.md).

---

Revisión realizada el **13 de septiembre de 2026** sobre el directorio de trabajo, incluidos los cambios locales aún no confirmados en Git. No se hizo commit ni despliegue.

## Resultado

**35 pruebas automatizadas aprobadas** en la comprobación del 14 de septiembre de 2026. El comprobador estático informó 70 módulos JavaScript, 183 referencias locales y 11 hojas CSS con balance estructural válido.

No se encontraron fallos en las comprobaciones ejecutadas después de las correcciones. Esto **no garantiza ausencia total de errores**, especialmente en interacciones de navegador, diseño responsive o carga real.

## Correcciones aplicadas

| Hallazgo | Corrección | Comprobación |
|---|---|---|
| Una URL codificada bajo frontend podía resolver a HTML de admin sin la comprobación inicial | Se autoriza también el destino de archivo resuelto | Regresión HTTP: visitante 401, USER 403 |
| Secuencias URL inválidas podían terminar en 500 | Se responde 404 al fallar la decodificación | Regresión HTTP |
| El cliente asumía que todas las respuestas eran JSON | Mensaje claro ante HTML/JSON inválido; se conserva el estado HTTP | Prueba del cliente API |
| `getPet` reconocía un 404 por el texto del error | Ahora utiliza el código HTTP | Prueba del cliente API |
| Un PATCH podía usar una versión del caso anterior a la lectura asíncrona del cuerpo | Se relee la fila antes de combinar los campos | Revisión de código y pruebas de edición existentes |
| Un fallo al refrescar mensajes después de enviar podía dejar controles bloqueados | El bloqueo distingue envío activo de cierre/moderación y se restablece en finally | Sintaxis y revisión de flujo; pendiente comprobación de interacción |
| Apertura de otro modal durante un guardado podía reemplazarlo | La apertura respeta un cierre rechazado mientras se guarda | Sintaxis y revisión de flujo; pendiente comprobación de interacción |
| Páginas heredadas mostraban controles sin una función real | Veterinarias/notificaciones muestran estados pendientes; se retiró la función de perfil demo no usada | Sintaxis e imports |
| Regla `data/` ignoraba también nuevas carpetas de código con ese nombre | `.gitignore` limita la exclusión a `/data/` y `/backups/` | Revisión de configuración |
| Una declaración CSS `content` no estaba entre comillas | Se corrigió la declaración | Revisión estática |

## Cómo repetir la comprobación

```powershell
node scripts/check.mjs
node --test tests/*.test.mjs
git diff --check
```

En Windows pueden aparecer avisos de conversión LF/CRLF de Git. No son fallos de JavaScript ni de ejecución.

## Cobertura actual

| Archivo | Qué cubre |
|---|---|
| `tests/server.test.mjs` | Registro, sesión, permisos, fotos, búsqueda y persistencia de casos |
| `tests/moderation.test.mjs` | Acceso ADMIN, denuncias, visibilidad, fotos ocultas, restauración y auditoría |
| `tests/messages.test.mjs` | Privacidad, no leídos, reintentos, cierres, paginación y reinicio |
| `tests/recovery.test.mjs` | Tokens, caducidad, solicitudes concurrentes, sesiones y restauración de respaldo |
| `tests/account.test.mjs` | Edición de cuenta, verificación aislada, límites y persistencia |
| `tests/message-interactions.test.mjs` | Listeners reales con dobles mínimos de DOM: recuperación tras fallo de red, reintentos con el mismo identificador y actualización durante envío con cierre remoto |
| `tests/render.test.mjs` | HTML de inicio/detalle, escape de texto y controles del propietario |
| `tests/audit.test.mjs` | Regresiones de rutas codificadas, archivos privados y errores del cliente |

`scripts/check.mjs` revisa módulos, imports, enlaces de entrada HTML y balance de llaves/comillas/comentarios CSS. No es un parser CSS completo ni una prueba end-to-end.

## Qué no se comprobó

- Interacciones reales, capturas y diseño en diferentes tamaños: no había navegador conectado para automatización.
- Entrega real de correo y reputación del remitente: no hay proveedor externo configurado.
- Despliegue HTTPS, proxy y almacenamiento del entorno de producción.
- Pruebas de carga, concurrencia masiva o varias instancias.
- Auditoría de seguridad exhaustiva, accesibilidad completa o validación profesional de contenido editorial.

## Recorrido manual recomendado

Completa esta lista cuando abras la aplicación en un navegador:

- [ ] Inicio, listados y detalle en escritorio y móvil, sin desbordamiento horizontal.
- [ ] Menú móvil, cierre con Escape y navegación mediante teclado.
- [ ] Registrar dos cuentas en sesiones separadas; cerrar e iniciar sesión.
- [ ] Crear caso con tres fotos; cancelar; volver a abrir y comprobar el foco.
- [ ] Editar, resolver y reabrir un caso; recargar para verificar persistencia.
- [ ] Buscar y cargar otra página de resultados.
- [ ] Abrir un contacto, responder, consultar anteriores, cerrar y reabrir el contacto.
- [ ] Desconectar la red al enviar/actualizar mensajes y recuperar los controles.
- [ ] Denunciar con una cuenta y moderar con ADMIN; comprobar el acceso a fotos ocultas.
- [ ] Editar nombre; confirmar correo; recuperar contraseña desde un enlace local.
- [ ] Compartir un caso y comprobar la alternativa cuando el navegador no permite compartir.

## Limitaciones conocidas, no funciones terminadas

- Avisos push o por correo aún pendientes.
- Mensajes se actualizan manualmente; no son un chat en tiempo real.
- Mis casos tiene un límite de 100 elementos visibles.
- La cola de correo requiere una sola instancia; la aceptación del transporte no demuestra entrega a la bandeja de entrada.
- Validación de imágenes por firma/tamaño, sin decodificación completa ni eliminación de metadatos.
- SQLite y límites en proceso están pensados para una sola instancia; no hay migraciones de esquema versionadas ni pruebas de escalabilidad.
- Hay nombres y componentes heredados. La [guía de estudio](GUIA_DE_ESTUDIO.md) los distingue del flujo activo.

## Continuación: pruebas de interacción

Se agregaron tres regresiones automatizadas de los controladores de mensajes. Las 14 pruebas y el comprobador estático pasan; git diff --check no detecta errores de espacios. Estas pruebas usan dobles mínimos de DOM y no sustituyen una prueba en navegador. Se intentó conectar un navegador para continuar el recorrido visual, pero la herramienta informó que no había ninguno disponible. La lista manual anterior permanece pendiente.

## Fase de notificaciones internas

Implementada la bandeja privada con lectura individual y por lote, cursor de 25 elementos y enlaces a conversación/caso. Los triggers SQLite crean avisos atómicos para mensajes nuevos y cambios de visibilidad; no recrean eventos anteriores. tests/notifications.test.mjs verifica privacidad incluso frente a ADMIN, ausencia de texto privado en avisos, idempotencia de eventos, paginación, lectura limitada al cursor observado, validación de entrada, persistencia tras reinicio y codificación de destinos. Resultado: 16 pruebas aprobadas. La validación visual sigue pendiente.


## Fase de adopciones

Implementados publicaciones con cuidados y requisitos, estados disponible/pausada/adoptado, bandejas privadas paginadas, retirada, rechazo y confirmación final. La confirmación actualiza el caso, cierra solicitudes restantes y crea avisos en una transacción. Se mantiene el control de fotos y visibilidad de moderación.

Pruebas en tests/adoptions.test.mjs: validación de campos, permisos de propietario/solicitante/ADMIN, aislamiento de contenido privado, reintentos, límites diarios, paginación, filtros, pausa, moderación, retirada y rechazo. Una prueba fuerza una avería de notificaciones para comprobar rollback completo; otra envía confirmaciones concurrentes y verifica un único seleccionado. Se comprueban persistencia tras reinicio y HTML de los estados públicos/privados, incluidos escapes y enlaces.

Resultado: 19 pruebas aprobadas. No se ha verificado esta fase en un navegador real; quedan pendientes el formulario con fotos, navegación entre bandejas, teclado y responsive. No se ha desplegado.

## Cierre de la fase de directorio veterinario — 14 de septiembre de 2026

Revisada la implementación de fichas, revisión administrativa, permisos, filtros, paginación, conflictos de versiones y persistencia. Corregido el controlador público: una búsqueda fallida conserva los filtros asociados a los resultados visibles para que Ver más no mezcle consultas. La regresión en tests/veterinary-interactions.test.mjs usa dobles de DOM y verifica recuperación de controles y continuidad de resultados.

Resultado: 22 pruebas aprobadas, comprobador estático correcto y git diff --check sin errores de espacios. La validación visual en navegador sigue pendiente. No se cargaron establecimientos reales ni se desplegó la aplicación. Próxima fase propuesta: CMS editorial.

## Fase de CMS editorial — 14 de septiembre de 2026

Implementados artículos y proyectos administrables, borradores, vista previa del contenido guardado, fuente y fecha de revisión, publicación y ocultación. Las rutas Información y cuidados y Nuestro trabajo consultan la API persistente y ofrecen búsqueda y paginación. Los cambios sin guardar bloquean la decisión de revisión; editar una publicación la devuelve a borrador. Los conflictos de revisión impiden sobreescrituras obsoletas.

Cuatro pruebas nuevas cubren permisos públicos/USER/ADMIN, fechas y campos inválidos, escape de HTML, secciones, concurrencia, paginación, búsqueda literal, reinicio, rollback ante un fallo de auditoría, recuperación de consultas y envío de formularios con controles deshabilitados. Las dos excepciones test rollback que imprime el servidor son fallos inyectados deliberadamente por una prueba que verifica la reversión completa.

Resultado: 26 pruebas aprobadas. La herramienta de navegador devolvió una lista vacía de navegadores y aplicaciones; no se verificaron capturas, responsive ni interacción real. No se añadió contenido real ni se desplegó.

Recorrido visual pendiente: crear borrador en Administración → Contenido editorial; abrir y comparar la vista previa; cambiar texto y comprobar el bloqueo de revisión; guardar, reabrir y publicar con fecha y motivo; buscar y abrir en la sección pública; ocultar y comprobar que deja de estar disponible. Repetir con proyecto, teclado y pantalla móvil.
## Cola persistente y demostración — 14 de septiembre de 2026

Implementada mail_outbox: inserción atómica con los tokens de recuperación/verificación, procesamiento en segundo plano, ocho intentos máximos, espera creciente, Retry-After, clave estable de idempotencia, invalidación por caducidad/consumo y recuperación tras reinicio. El panel administrativo consulta solo metadatos de los últimos 50 trabajos. El transporte local escribe JSON mediante archivo temporal y cambio de nombre atómico.

Cuatro pruebas de cola verifican persistencia de reintentos, exclusión de procesadores dentro de una instancia, cierre durante envío, recuperación de sending, clave estable, errores definitivos, límite de intentos, vencimiento, token consumido, privacidad del endpoint, rollback de ambas rutas de tokens y respuesta sin esperar al proveedor. Los mensajes test queue rollback son excepciones deliberadas.

Una prueba adicional comprueba que la demostración tiene cinco casos con imágenes servidas, dos conversaciones y cinco mensajes, dos entradas editoriales, tres fichas de directorio y acceso de la cuenta de muestra. Reejecutar la carga no duplica datos y una base preexistente sin marca demo se rechaza.

Resultado: 31 pruebas aprobadas mediante npm.cmd test, comprobador estático correcto y git diff --check sin errores. Se arrancó el servidor demo y se generó frontend/muestrario.html a partir de sus datos y de los componentes actuales. Las fotografías ya existían como referencias y se descargaron al proyecto. La herramienta de navegador volvió a informar que no había navegadores; el muestrario no es una captura de navegador y no sustituye la revisión responsive. No se enviaron correos externos ni se desplegó.
## Comentarios públicos — 14 de septiembre de 2026

Añadidos publicación, lectura, edición, retirada, contador público y panel de moderación con auditoría. Los tres textos de muestra existentes se trasladan una sola vez a comments al iniciar la demo; las imágenes y el muestrario anterior no se recrean.

Cuatro pruebas nuevas cubren permisos de visitante/autor/propietario/ADMIN, texto escapado, reintentos idénticos y conflictos, retirada irreversible del texto, edición de ocultos, bloqueo por caso oculto, rollback de auditoría, límites por minuto/día, cursores sin repetición, persistencia tras reinicio y recuperación de controles tras fallos de red. Se amplió la prueba de demo para comprobar la migración sin duplicados y la conservación de ediciones.

Resultado: 35 pruebas aprobadas. El error test comment rollback de la salida es un fallo de auditoría provocado deliberadamente. Falta comprobar la interacción y el diseño en un navegador real. No se enviaron mensajes ni se desplegó la aplicación.

Recorrido manual: inicia sesión; abre una mascota; publica un comentario; actualiza; edítalo; ocúltalo con ADMIN; comprueba que otro visitante no lo ve y que editarlo no lo restaura; restaura con ADMIN; retira con el autor y comprueba que no puede recuperarse. Comprueba también teclado y móvil.

## Denuncias de comentarios — 15 de septiembre de 2026

Completados formulario público y bandeja administrativa sobre el servidor de denuncias existente. Incluye motivos privados, duplicados, límites diarios, paginación, resolución con revisión del comentario y transacción auditada. Tres pruebas nuevas aprobadas: permisos, privacidad, reintentos concurrentes, rollback forzado, retirada del autor, casos ocultos, decisiones concurrentes, paginación, persistencia, escape y recuperación de controles administrativos.

Suite completa: 60 pruebas, 58 aprobadas y 2 fallidas en tests/rescue-interactions.test.mjs. Los dobles de DOM del minijuego no incluyen los elementos que busca su flujo actual; el fallo ocurre en sync al acceder a textContent. No se modificó el minijuego en esta fase. Comprobador estático: 90 módulos, 217 referencias locales y 13 hojas CSS. git diff --check sin errores de espacios. La excepción test report rollback se inyecta deliberadamente para comprobar la reversión completa. Pendiente verificación visual y de interacción en navegador.


## Punto 1 completo y recursos — 15 de septiembre de 2026

Corregidas las dos pruebas obsoletas de rescate y ampliado el recorrido de integración con los controladores reales: diálogos, reacción, espera, pausa, transición, victoria, derrota, reinicio, victoria posterior, retirada y regreso sin repetir un punto completado. Se conservan las pruebas de colisión y combate V2. Suite completa: 64 pruebas aprobadas; comprobador estático: 90 módulos, 220 referencias y 13 hojas CSS.

El barrio y el combate comparten canvas principal y createGameLoop. El estado registra la posición de entrada del evento y distingue el resultado del combate. No se escriben objetivo/etiquetas sin cambios. En la reacción, la medición con dobles pasó de 20 repintados del mapa en 20 frames a cero. Máximo de un frame pendiente; pausas, reinicios y salida sin acumulación de listeners. No se modificaron reglas V2 ni se instalaron dependencias o assets.

La conexión de UI devolvió listas vacías de navegadores y aplicaciones. No se verificaron consola real, FPS/GPU ni layout/gestos físicos. Las pruebas de Canvas/DOM no sustituyen esas comprobaciones. El arte, la puntuación y el progreso en memoria siguen siendo provisionales. No se inició otra fase.
