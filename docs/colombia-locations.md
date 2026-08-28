# Ubicaciones de Colombia

El catálogo local procede del servicio oficial del DANE, Marco Geoestadístico Nacional 2025, capa **Municipio**. Fue consultado el 21 de agosto de 2026 y contiene códigos DIVIPOLA, nombres y relación territorial. La aplicación no consulta el servicio durante su funcionamiento.

- `Department`: código DANE de dos caracteres.
- `Municipality`: código DIVIPOLA de cinco caracteres y `departmentId`.
- `Location`: país `CO`, departamento, municipio y descripción aproximada del lugar.
- `occurredAt`: fecha ISO del evento, hora nullable y señal de hora aproximada.
- `createdAt`: fecha de publicación, independiente del evento.

El selector carga departamentos, usa `filter()` para obtener únicamente sus municipios y limpia selecciones incompatibles. La búsqueda normaliza Unicode con `normalize("NFD")`, retira marcas diacríticas, convierte a minúsculas y compacta espacios.

Fuente: [DANE, MGN 2025 — capa Municipio](https://geoportal.dane.gov.co/mparcgis/rest/services/MGN2025/Serv_CapasMGN_2025/FeatureServer/317).

Limitación: el catálogo representa la versión MGN 2025 consultada; futuros cambios oficiales deberán regenerar el módulo y repetir sus validaciones.
