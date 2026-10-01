# Búsqueda y coincidencias de mascotas

## Inspección y reutilización

Los reportes se guardan en SQLite, en `cases`: id, propietario, tipo (`lost`, `found`, `adoption`), estado, JSON `body` y fecha `created`. Las imágenes están en `images`. El validador conserva nombre, especie, ciudad, zona, descripción, tamaño, raza, sexo y color; las adopciones añaden edad, cuidados y requisitos. `traits` aparece en una vista heredada pero no se guarda en el modelo actual, por lo que no se utiliza.

Antes de esta fase, `GET /api/v1/cases` buscaba nombre, especie, ciudad y zona mediante LIKE; permitía tipo, mis casos, límite y desplazamiento. El frontend ya tenía debounce de 250 ms, cancelación y tarjetas compactas. Se reutilizan ese endpoint, permisos, tarjetas, listado y página de detalle. No se cambia el esquema, el minijuego ni las dependencias.

## Buscar y filtrar

En Explorar, Perdidos y Encontrados se pueden combinar texto, tipo cuando corresponde, situación abierto/resuelto, especie, sexo, tamaño, color, ciudad, barrio/zona y fecha de publicación. Los filtros se despliegan mediante **Filtros**, también con teclado, y muestran cuántos están activos. **Limpiar filtros** reinicia la búsqueda y devuelve el foco al campo principal.

El texto busca nombre, especie, raza, color, ciudad, zona, descripción, sexo y tamaño. Ignora mayúsculas, acentos simples y espacios repetidos. Todos los términos deben encontrarse, aunque estén repartidos entre campos. `%` y `_` son texto literal. Los filtros de color, ciudad y zona buscan fragmentos; especie, sexo y tamaño exigen igualdad normalizada. No se inventan categorías ni datos faltantes.

Parámetros añadidos a `/api/v1/cases`: `species`, `sex`, `size`, `color`, `city`, `zone`, `state`, `period` y `sort`. Los anteriores siguen funcionando. `period=today` usa el día civil de Colombia (UTC-5); `7` y `30` son ventanas móviles de días. Se filtra por publicación, no por fecha de desaparición o hallazgo. `sort=oldest` ordena de antiguo a reciente; `sort=relevance` prioriza la presencia de términos en campos identificadores (3 por término/campo) frente a descripción, sexo y tamaño (1). Sin texto, relevancia equivale a recientes. Los empates usan fecha e id.

El listado mantiene páginas de 24 y **Ver más casos**, con total y resultados anunciables. Filtros y orden quedan en la URL para recuperar la búsqueda al volver desde el detalle. Un fallo conserva los resultados y filtros aplicados a esa página para no mezclar consultas al cargar más.

## Coincidencias

`GET /api/v1/cases/:id/matches` devuelve como máximo cinco reportes abiertos y visibles del tipo opuesto. El origen debe ser accesible; uno oculto devuelve 404 a visitantes y una lista vacía a su propietario/administración. Orígenes resueltos o de adopción no generan coincidencias. No se incluyen propietarios, motivos privados ni puntuaciones en la respuesta nueva.

`calculateMatchScore` en `backend/case-search.mjs` aplica estos pesos editables:

| Señal | Puntos |
|---|---:|
| Misma especie conocida | 20, obligatoria |
| Misma raza indicada | 15 |
| Algún término de color en común | 20 |
| Mismo sexo indicado | 5 |
| Mismo tamaño indicado | 5 |
| Misma ciudad | 10 |
| Misma zona, dentro de la misma ciudad | 10 |
| Publicaciones separadas por hasta 7 días | 10 |
| Publicaciones separadas por más de 7 y hasta 30 días | 5 |
| Dos palabras descriptivas en común, descontando términos genéricos | 5 |

Sexos conocidos incompatibles excluyen el candidato. Colores informados sin términos comunes restan 15; ciudades diferentes restan 10. Se exige un mínimo de 50 puntos y al menos una señal de raza, color o descripción. Especie, ubicación y fecha por sí solas no bastan. Vacíos y valores genéricos como “desconocido”, “sin especificar” u “otro” no suman igualdad. La puntuación ordena candidatos; no representa una probabilidad ni confirma identidad.

Cada tarjeta muestra foto o “Sin fotografía”, estado, datos principales, lugar, fecha y los motivos coincidentes. El enlace abre el detalle existente y permite **Volver al reporte original**. Hay mensajes distintos para ausencia de coincidencias y error de conexión, con acceso al listado del tipo opuesto.

## Recursos y limitaciones

- Filtros en SQL antes de paginar; no se descarga todo el catálogo al cliente. Parámetros enlazados, sin SQL aportado por el usuario.
- Debounce de 250 ms en texto; eventos delegados, cancelación y descarte de respuestas antiguas. Se evitan consultas idénticas a la lista ya cargada.
- Una consulta de coincidencias por apertura de detalle, sin fetch por tarjeta ni procesos en segundo plano. La selección recorre candidatos de la misma especie y conserva solo los cinco mejores en memoria.
- Las fotos existentes usan carga diferida y decodificación asíncrona. No hay miniaturas almacenadas: se siguen sirviendo las imágenes originales existentes. Esta fase no incorpora un procesador de imágenes.
- Las comparaciones de búsqueda y coincidencias recorren datos de SQLite y todavía no tienen índice de texto completo. Una base grande necesitará mediciones y optimización; no se hicieron pruebas de carga masiva.
- La ubicación es texto: no hay coordenadas, distancias ni equivalencias automáticas de barrios. El color y la raza son texto libre, por lo que sinónimos y variantes pueden no coincidir.
- La fecha solo indica publicación. No permite descartar que un encontrado se publique antes de un perdido ni comprobar cronologías reales del evento.
- Los campos faltantes pueden impedir una coincidencia útil. “Otro” no identifica una especie suficiente para recomendar casos.
- No hay IA, mapas, reconocimiento de fotos, servicios externos ni avisos automáticos.

## Archivos de esta fase

Modificados: `server.mjs`, `frontend/js/cases.js`, `frontend/js/services/api.js`, `frontend/js/components/ui.js`, `frontend/js/pages/core.js`, `frontend/js/pages/more.js`, `frontend/js/pages/detail.js`, `frontend/css/social.css`, `README.md`, `docs/FASES.md` y `docs/REVISION.md`.

Nuevos: `backend/case-search.mjs`, `frontend/js/case-list.js`, `frontend/js/components/case-matches.js`, `tests/case-search.test.mjs`, `tests/case-list-interactions.test.mjs` y este documento.

## Verificación

Las pruebas nuevas cubren similitud y diferencias de especie/color/zona/sexo, campos y fotos faltantes, ausencia de coincidencias, fechas, normalización, filtros combinados, paginación, orden, moderación, estados resueltos, texto escapado, apertura y retorno de coincidencias, debounce, limpieza, restauración de URL, fallos de red y respuestas obsoletas. El recorrido de interfaz utiliza dobles de DOM y renderizado HTML: no equivale a navegación visual real. Las herramientas de UI no detectan un navegador conectado; quedan pendientes inspección visual en escritorio/tablet/móvil y gestos reales.

Resultado del 17 de septiembre de 2026: **70 pruebas aprobadas**, comprobador estático correcto (95 módulos, 233 referencias, 13 hojas CSS) y `git diff --check` sin errores de espacios. Ejecutar `node scripts/check.mjs` y `node --test tests/*.test.mjs` para repetir. Esta fase no autoriza iniciar una siguiente.
