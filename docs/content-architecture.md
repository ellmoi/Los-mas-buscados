# Arquitectura de contenidos de Buscados

> Documento histórico del prototipo. Desde el 14 de septiembre de 2026, Información y cuidados y Nuestro trabajo usan el CMS persistente de Node/SQLite con revisión administrativa. Consulta [API y datos](API_Y_DATOS.md#cms-editorial) para el contrato actual. Las taxonomías y relaciones avanzadas descritas aquí siguen siendo propuestas.

> Actualización: los casos y cuentas ya usan persistencia real y `useDemoData = false`. Las fichas, taxonomías y proyectos descritos aquí conservan su alcance editorial de prototipo. Consulta `README.md` para ejecutar la aplicación.

Esta fase continúa como frontend demo y mantiene `APP_CONFIG.api.useDemoData = true`. No existe persistencia, autenticación real ni CMS.

## Fuentes de datos

- `demo-data.js`: casos, publicaciones de usuarios, veterinarias y notificaciones existentes.
- `content-data.js`: taxonomía extensible, fichas informativas, proyectos oficiales, esquemas y relaciones.

Las publicaciones de usuarios y los proyectos de **Nuestro trabajo** son entidades diferentes. Los arreglos `knowledgeEntries` y `officialProjects` permanecen vacíos hasta contar con contenido real.

## Jerarquía y modelos

La taxonomía permite `parentId` y `subcategories` para crecer desde categorías hacia subcategorías y especies. `speciesSchema` describe los campos previstos para identidad, clasificación, contexto biológico, orientación, fuentes y relaciones. `projectSchema` contempla identidad, objetivo, registros, individuos, etapas flexibles y relaciones.

Las relaciones se representan por identificadores:

`caso ↔ especie ↔ información y cuidados ↔ categoría ↔ proyecto oficial`

Esto evita copiar información científica en casos o proyectos.

## Rutas públicas nuevas

- `#/poco-comunes`
- `#/informacion`
- `#/informacion/especie/:id`
- `#/nuestro-trabajo`
- `#/nuestro-trabajo/:id`

Las rutas de detalle muestran estados vacíos cuando no existe contenido publicado. Los datos deben incorporarse con fuentes verificadas.

## Administración futura

El panel demo muestra puntos de extensión para categorías, fichas, artículos, proyectos oficiales y relaciones. No concede permisos ni implementa acciones reales. Las reglas de `auth-navigation.md` siguen vigentes sin cambios.

## TODO

- Definir categorías y subcategorías con el responsable del proyecto.
- Incorporar fichas científicas únicamente con fuentes revisadas.
- Definir el primer proyecto oficial antes de publicar contenido.
- Diseñar contratos FastAPI en una fase posterior.
- Sustituir los datos demo solo cuando exista persistencia real.
