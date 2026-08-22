# Los Más Buscados

Frontend funcional de demostración para comunidad, búsqueda, cuidado, conocimiento y apoyo responsable relacionado con animales.

> Todo el contenido operativo es DEMO. Este repositorio no debe interpretarse como un servicio en producción ni como fuente de organizaciones, contactos, trámites o transacciones reales.

## Estado real

| Componente | Estado |
|---|---|
| Frontend | Funcional, datos demo |
| Backend | No conectado |
| FastAPI | Previsto para una fase posterior |
| Base de datos | No conectada |
| Autenticación y autorización reales | No |
| Pagos o datos bancarios | No |
| Apadrinamientos reales | No |
| Solicitudes de adopción reales | No |
| GitHub Pages | Compatible en principio; todavía no desplegado |

`APP_CONFIG.api.useDemoData` permanece en `true`. El selector Sin sesión / USER / ADMIN solo permite revisar visualmente las vistas; no concede seguridad.

## Contenido actual

- Catálogo local DANE MGN 2025: 33 territorios departamentales y 1.122 municipios/distritos con selección Departamento → Municipio y búsqueda sin tildes.
- Los casos separan `occurredAt` (fecha/hora del evento) de `createdAt` (publicación) y guardan un lugar aproximado.
- 6 clasificaciones y 42 categorías jerárquicas.
- 0 especies científicas, 0 colecciones editoriales y 0 proyectos oficiales.
- 1 fundación DEMO y 3 animales DEMO.
- 0 solicitudes de adopción y 0 apadrinamientos.
- Adopciones deriva sus resultados de `FoundationAnimal` y muestra solo `adoptionStatus === "available"`.
- Poco comunes es una futura colección editorial, no una séptima clasificación.
- Nuestro trabajo está separado de las publicaciones USER y permanece vacío.

## Ejecutar localmente

Desde la raíz del repositorio, ejecuta:

    py -m http.server 4173 --bind 127.0.0.1

Abre `http://127.0.0.1:4173/`. El comando fue comprobado en Windows con Python Launcher. No requiere instalar paquetes ni compilar.

## Rutas principales

| Ruta | Contenido |
|---|---|
| `#/inicio` | Portada y comunidad demo |
| `#/perdidos`, `#/encontrados` | Casos comunitarios demo |
| `#/adopciones` | Animales disponibles de fundaciones |
| `#/animales/:slug` | Perfil canónico del animal |
| `#/fundaciones`, `#/fundaciones/:slug` | Directorio y organización |
| `#/poco-comunes` | Descubrimiento editorial vacío |
| `#/informacion/...` | Clasificaciones y categorías |
| `#/nuestro-trabajo` | Proyectos oficiales, actualmente 0 |
| `#/solicitudes-adopcion`, `#/apadrinamientos` | Estados privados USER vacíos |
| `/admin/` | Panel ADMIN estrictamente visual |

La ruta antigua `#/fundaciones/animal/:slug` redirige a `#/animales/:slug`. La navegación usa hash, por lo que no requiere reescrituras del servidor en GitHub Pages.

## Entidades separadas

```text
Foundation ≠ User
Animal ≠ Species
Animal ≠ AdoptionApplication
AdoptionApplication ≠ Sponsorship
```

Las relaciones usan IDs. `AdoptionApplication` y `Sponsorship` están vacíos para no inventar actividad. Adoptar representa una evaluación futura; apadrinar no concede propiedad y esta demo no solicita tarjetas, cuentas bancarias ni dinero.

## Arquitectura

```text
index.html
├── frontend/js/app.js             Router, renderizado y eventos
├── frontend/js/config.js          Marca, datos demo y navegación
├── frontend/js/data/              Entidades y relaciones demo
├── frontend/js/services/api.js    Frontera asíncrona de lectura
├── frontend/js/components/        Tarjetas, modales y sesión visual
├── frontend/js/pages/             Renderizadores de páginas
├── frontend/css/                  Tokens, layout y módulos responsive
├── admin/                         Entrada administrativa visual
└── docs/                          Decisiones técnicas
```

## Orden recomendado para estudiar el proyecto

1. `index.html`: shell semántico y módulos de entrada.
2. `frontend/js/config.js`: identidad, modo demo y navegación declarativa.
3. `frontend/js/data/`: IDs, estados y relaciones; observa `map()`, `filter()` y `find()`.
4. `frontend/js/app.js`: rutas hash, renderizado DOM, historial y event listeners.
5. `frontend/js/services/api.js`: operaciones `async` y copias que protegen el estado fuente.
6. `frontend/js/components/`: componentes compartidos, diálogos y sesión visual.
7. `frontend/js/pages/`: transformación de datos en HTML.
8. `frontend/js/history-state.js` y `session-menu.js`: estado temporal y navegación Volver.
9. `frontend/css/tokens.css`, `styles.css` y hojas específicas: diseño y breakpoints.
10. `frontend/js/admin.js` y `docs/`: límites de ADMIN y decisiones futuras.

## Documentación

- [Navegación y autorización](docs/auth-navigation.md)
- [Arquitectura de contenido](docs/content-architecture.md)
- [Fundaciones y apadrinamiento](docs/foundations-sponsorship.md)
- [Adopciones y Fundaciones](docs/adoptions-foundations.md)
- [Ubicaciones de Colombia](docs/colombia-locations.md)

## Límites y siguiente fase

Antes de conectar FastAPI deberán definirse contratos, persistencia, autenticación, autorización, moderación, privacidad y verificación de organizaciones. Cualquier pago futuro necesitará además requisitos legales y de transparencia.

Esta revisión no realiza commit, push ni despliegue.
