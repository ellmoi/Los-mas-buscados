# Buscados 🐾

## [Ver la demo interactiva en GitHub Pages →](https://ellmoi.github.io/Los-mas-buscados/)

**Una comunidad para ayudar a que las mascotas perdidas vuelvan a casa.**

Proyecto de portafolio para mostrar a posibles clientes y reclutadores una aplicación con diseño visual, navegación y funcionalidades que pueden probarse. Reúne reportes de animales perdidos y encontrados, búsqueda, contacto y seguimiento de casos.

Desarrollado con **HTML, CSS, JavaScript modular, Node.js y SQLite**, sin frameworks ni dependencias npm.

## Prueba la experiencia

La versión de GitHub Pages permite recorrer la interfaz con fotografías y ejemplos, iniciar sesión, consultar casos, escribir comentarios, probar conversaciones y explorar la moderación. Los cambios se guardan en el navegador; no son reportes enviados a una comunidad real.

1. Explora los reportes de Inicio y abre el detalle de una mascota.
2. Consulta sus fotografías y comentarios.
3. Usa Explorar para buscar casos.
4. Inicia sesión con una cuenta de ejemplo para probar comentarios y mensajes.
5. Recorre Adopciones, Información y cuidados, Veterinarias y el prototipo de minijuego.

| Cuenta de demostración | Correo | Contraseña |
|---|---|---|
| Equipo / administración | `demo@buscados.example` | `Demo-Buscados-2026!` |
| Visitante | `ana@buscados.example` | `Demo-Buscados-2026!` |

Estas credenciales son públicas y exclusivas de la demo. Utiliza información ficticia. La simulación es local a tu navegador: no intercambia mensajes con otros visitantes ni envía correos externos.

## Qué muestra el proyecto

| Área | Funcionalidad implementada en el proyecto |
|---|---|
| Casos | Publicación con fotos, búsqueda, filtros, coincidencias explicadas y resolución |
| Contacto | Conversaciones vinculadas a casos, historial y seguimiento |
| Comunidad | Comentarios, denuncias y moderación |
| Adopciones | Publicaciones, solicitudes privadas y confirmación del responsable |
| Contenido | Directorio veterinario y artículos administrables |
| Cuentas | Registro, sesión, edición y recuperación mediante el backend |
| Interfaz | Tarjetas de mascotas, navegación móvil y componentes compartidos |
| Calidad | Pruebas de API, permisos, persistencia y controladores |

## Dos formas de explorar Buscados

| Versión | Propósito | Datos |
|---|---|---|
| GitHub Pages | Presentación visual e interactiva sin instalar nada | Simulación en el navegador |
| Servidor Node.js | Ejecutar y revisar las funcionalidades del backend | SQLite y sesiones de servidor |

GitHub Pages no ejecuta Node.js ni utiliza la base SQLite. La demo reproduce recorridos para presentar el producto; no tiene paridad completa con la API. La seguridad, el correo y la persistencia del backend se comprueban ejecutando el servidor y sus pruebas.

**Continuidad del proyecto:** la presentación de portafolio conserva la aplicación real. Ejecuta `npm start` para trabajar con Node.js y SQLite, o `npm run demo` para probar ese backend con ejemplos separados. La segunda fase continuará sobre este mismo código mediante ramas de trabajo y pull requests; consulta el [flujo de desarrollo](docs/DESARROLLO.md#conservar-la-demo-y-continuar-la-aplicación-real).

## Ejecutar localmente

Requiere **Node.js 24.19 o posterior de la rama 24**. No necesitas `npm install`.

```sh
npm run demo
```

Abre **http://localhost:3001** para usar el backend con ejemplos y las cuentas anteriores. La demo usa `data/demo/`. Para iniciar una base sin ejemplos, ejecuta `npm start` y abre **http://localhost:3000**. En PowerShell puedes usar `npm.cmd` si se bloquea `npm.ps1`.

Consulta la [guía de ejecución y operación](docs/OPERACION.md) para configurar correo, administración, respaldos y variables de entorno.

## Para otros programadores

- [Notas de desarrollo](docs/DESARROLLO.md): dónde cambiar cada cosa y diferencias entre demo y backend.
- [Guía de estudio](docs/GUIA_DE_ESTUDIO.md): responsabilidades de los módulos y recorridos del código.
- [API y datos](docs/API_Y_DATOS.md): endpoints, modelos y permisos.
- [Caso de estudio](docs/PORTAFOLIO.md): presentación y decisiones técnicas.
- [Informe de revisión](docs/REVISION.md): comprobaciones y límites.
- [Fuentes de las fotografías](frontend/assets/demo/README.md): imágenes ilustrativas.

```text
index.html                Entrada de la web pública
frontend/js/app.js        Navegación y montaje de pantallas
frontend/js/pages/        Vistas y controladores
frontend/js/components/   Elementos compartidos de interfaz
frontend/js/services/     API HTTP y simulación para Pages
frontend/js/demo-store.js Datos y sesión de la demo estática
frontend/css/             Estilos compartidos y por sección
frontend/minigames/       Prototipo jugable
admin/                    Entrada del panel administrativo
server.mjs                Servidor HTTP y composición del backend
backend/                  Reglas de negocio y persistencia
scripts/                  Demo, comprobaciones y operación
tests/                    Pruebas automatizadas
docs/                     Documentación técnica
```

## Comprobaciones

```sh
npm run check
npm test
```

Última revisión completa: **82 pruebas aprobadas**, sin fallos ni omisiones. La comprobación estática valida sintaxis JavaScript, referencias locales y estructura CSS. Las pruebas de controladores usan dobles de DOM; no sustituyen una revisión visual en navegador.

## Pendiente para una segunda fase

Esta primera fase presenta una versión visual e interactiva para portafolio y un backend ejecutable localmente. La segunda fase queda pendiente y contempla:

- Validación visual en escritorio y móvil, accesibilidad y pruebas de interacción en navegador real.
- Despliegue del backend con HTTPS, almacenamiento persistente, correo externo y respaldos operativos.
- Mayor cobertura de los recorridos de la demo y revisión de sus diferencias respecto del backend.
- Notificaciones push y actualización de mensajes en tiempo real.
- Desarrollo de las secciones anunciadas: tienda, donaciones y localización GPS.
- Continuación del minijuego más allá del primer punto implementado.
- Pruebas de carga y evolución de la arquitectura para una operación real.

Estas ampliaciones no se presentan como funcionalidades terminadas ni como un servicio de producción ya desplegado.
