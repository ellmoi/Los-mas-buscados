# Buscados — caso de estudio

## Descripción para tu portafolio

Buscados es una aplicación web para reportar mascotas perdidas y encontradas y facilitar el contacto entre personas. Desarrollada con JavaScript, HTML, CSS, Node.js y SQLite, permite publicar fotografías, buscar casos, consultar coincidencias explicadas y seguir conversaciones hasta resolver un reporte. Incluye adopciones, moderación y una demo pública con datos ficticios.

**Repositorio:** [ellmoi/Los-mas-buscados](https://github.com/ellmoi/Los-mas-buscados)

**Demo configurada:** [Buscados en GitHub Pages](https://ellmoi.github.io/Los-mas-buscados/). Esta revisión local no confirma el estado de la publicación remota.

## Recorrido de presentación — tres minutos

1. Abre Inicio y muestra un reporte con fotografía y su detalle.
2. Busca por especie o ciudad en Explorar y explica los filtros.
3. Abre un caso y consulta sus posibles coincidencias y los motivos mostrados.
4. Inicia sesión con una cuenta de ejemplo del aviso de demo y muestra comentarios y mensajes.
5. Abre Adopciones y termina mostrando el repositorio y sus pruebas.

Para demostrar el backend, ejecuta `npm run demo` y abre `http://localhost:3001`. Las credenciales están en el README. El servidor utiliza una base de demostración separada de los datos normales.

## Decisiones técnicas que puedes explicar

| Decisión | Motivo y alcance |
|---|---|
| JavaScript modular sin framework | Separar vistas, controladores y acceso a datos sin un proceso de compilación. |
| Node.js y SQLite | Persistencia y transacciones en una instalación de una sola instancia. |
| Autorización en el servidor | Restringir edición, moderación y acceso a conversaciones privadas. |
| Demo estática independiente | Permitir explorar el producto en GitHub Pages sin desplegar el backend. |
| Pruebas de API e interacción | Comprobar permisos, persistencia, errores y recuperación de controles. |

## Evidencia y alcance

La revisión del 30 de septiembre de 2026 obtuvo **82 pruebas aprobadas**, sin fallos ni omisiones. El comprobador estático revisó 103 módulos JavaScript, 262 referencias locales y 13 hojas CSS. Consulta [el informe de revisión](REVISION.md) para conocer las comprobaciones y sus límites.

La demo estática simula cuentas y operaciones en el navegador; los controles de seguridad reales pertenecen al backend Node.js. No se ha verificado aquí el despliegue público, la entrega externa de correo ni la presentación visual en escritorio y móvil. Tienda, donaciones y GPS son secciones pendientes; el minijuego es un prototipo.

No se presentan métricas de usuarios, impacto o rendimiento que no se hayan medido. Las fotografías son ilustrativas y sus fuentes están documentadas en [los recursos de demo](../frontend/assets/demo/README.md).

## Capturas para acompañar la ficha

Usa capturas reales de Inicio, un detalle de mascota y la búsqueda con filtros, con datos de ejemplo. Añade una vista móvil una vez comprobada en navegador. Estas capturas aún no se han generado ni verificado en esta sesión.
