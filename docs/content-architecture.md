# Arquitectura de contenidos de Los Más Buscados

Los Más Buscados continúa como frontend demo con `APP_CONFIG.api.useDemoData = true`. No existe backend, persistencia, autenticación real ni CMS.

## Cinco conceptos separados

1. **Clasificación:** uno de los seis puntos de entrada generales.
2. **Categoría de navegación:** nodo jerárquico comprensible para recorrer contenido.
3. **Colección editorial:** agrupación transversal, como Poco comunes.
4. **Etiqueta:** criterio adicional para búsqueda y descubrimiento.
5. **Especie:** entidad única con su propia ficha.

La navegación pública no intenta reproducir obligatoriamente reino, filo, clase, orden, familia y género. La taxonomía científica completa podrá almacenarse posteriormente en la ficha; la navegación prioriza comprensión y orientación.

## Jerarquía ilimitada

`classifications` contiene seis raíces: mamíferos, aves, reptiles, anfibios, peces e invertebrados.

`category-data.js` almacena una lista plana de nodos:

```js
{
  id,
  slug,
  name,
  description,
  classificationId,
  parentId,
  icon,
  status
}
```

`parentId: null` identifica una categoría directamente bajo una clasificación. Un `parentId` con el ID de otro nodo crea una categoría hija. Como todos los niveles usan el mismo modelo, la profundidad no está limitada:

```text
Clasificación
  → Categoría
    → Categoría hija
      → ...
        → Futura especie
```

## URLs y breadcrumbs

Las rutas utilizan slugs estables dentro de cada nivel:

- `#/informacion/invertebrados`
- `#/informacion/invertebrados/insectos`
- `#/informacion/invertebrados/insectos/escarabajos`

El servicio resuelve cada segmento buscando un hijo cuyo `parentId` coincida con el nodo anterior. Los breadcrumbs se generan desde la cadena resuelta; no están escritos manualmente por categoría.

## Especie única y relaciones

Una futura especie se almacena una sola vez:

```text
species.classificationId → clasificación principal
species.categoryId       → categoría de navegación
species.tags             → etiquetas adicionales
species.collectionIds    → colecciones editoriales
species.projectIds       → proyectos relacionados
```

Por separado:

```text
Especie ↔ Tags
Especie ↔ Colecciones
Especie ↔ Proyectos
```

Poco comunes sigue siendo editorial y puede seleccionar organismos de cualquiera de las seis clasificaciones sin copiar sus fichas.

## Validaciones de desarrollo

`validateCategoryHierarchy()` se ejecuta al cargar el servicio demo y detiene la aplicación si detecta:

- IDs de clasificación duplicados.
- IDs de categoría duplicados.
- Slugs duplicados dentro del mismo nivel.
- `parentId` inexistentes.
- Referencias circulares.
- Categorías asociadas a clasificaciones inexistentes.
- Hijos cuya clasificación no coincide con la del padre.

## Estados actuales

- Clasificaciones: 6.
- Colecciones editoriales publicadas: 0.
- Fichas de especies: 0.
- Proyectos oficiales: 0.

Los niveles finales muestran un estado vacío intencional. No incluyen especies inventadas.

## TODO

- Revisar con especialistas los nombres de navegación antes de publicar fichas.
- Ampliar categorías únicamente cuando exista una necesidad de contenido real.
- Definir las primeras colecciones editoriales.
- Incorporar fichas con fuentes verificadas en una fase posterior.
- Diseñar contratos FastAPI más adelante.
