# Notas para desarrolladores

[Presentación y demo](../README.md) · [Guía del código](GUIA_DE_ESTUDIO.md) · [Operación local](OPERACION.md)

## Identifica el entorno

`frontend/js/services/api.js` es la frontera de datos. `request()` utiliza la simulación cuando el dominio termina en `.github.io` o el protocolo es `file:`. En otros entornos solicita `/api/v1` mediante HTTP. Un error del servidor no activa la demo automáticamente.

La condición `file:` no garantiza que los módulos carguen al abrir un HTML directamente: utiliza GitHub Pages o el servidor Node.js. Un servidor estático en localhost tampoco activa la simulación. Un dominio personalizado para Pages requeriría adaptar esta detección.

`demo-store.js` guarda ejemplos en la clave `buscados-demo-store-v1` de `localStorage`; la sesión usa `buscados-demo-session-v1` de `sessionStorage`. Las contraseñas de esta simulación son datos públicos. No reutilices este mecanismo como autenticación de producción. Para reiniciar la demo estática, elimina esas dos claves desde las herramientas del navegador y recarga; perderás los cambios de esa demo.

El backend usa SQLite y sus propias sesiones. `npm run demo` lo inicia con ejemplos en `data/demo/`; no es el mismo mecanismo que GitHub Pages. `npm start` usa los datos normales. No publiques `data/`, `backups/` ni `.env`.

## Dónde cambiar cada cosa

| Necesidad | Punto de entrada | Qué revisar también |
|---|---|---|
| Añadir una pantalla | `frontend/js/pages/` y `app.js` | Navegación en `config.js`, sesión y limpieza de eventos |
| Cambiar colores o espaciado | `frontend/css/tokens.css` | Estilos de sección y tamaños móviles |
| Cambiar tarjetas o avisos | `frontend/js/components/` | Escape de texto y accesibilidad |
| Modificar la demo de Pages | `services/api.js` y `demo-store.js` | `tests/static-demo.test.mjs` y datos guardados |
| Cambiar reglas del backend | Módulo de `backend/` correspondiente | Ruta en `server.mjs`, permisos y transacciones |
| Editar ejemplos del backend | `scripts/demo.mjs` | Carga única y conservación de datos existentes |
| Cambiar administración | `frontend/js/admin*.js` y `admin/index.html` | Autorización ADMIN en el servidor |
| Trabajar en el minijuego | `frontend/minigames/` | Sus README, reloj, listeners y pruebas |

## Cómo viaja una acción

1. `index.html` carga `frontend/js/app.js`.
2. El hash, por ejemplo `#/perdidos`, selecciona una vista.
3. Las vistas generan HTML y las funciones `bind...` conectan eventos.
4. `services/api.js` resuelve la petición mediante simulación o HTTP.
5. En el backend, `server.mjs` deriva operaciones a sus módulos y SQLite conserva los cambios.

La visibilidad de un botón no constituye autorización. Los permisos reales se validan en el backend; la simulación tiene reglas simplificadas para presentar el flujo.

## Convenciones que conviene conservar

- Escapa contenido de usuarios con los ayudantes de interfaz o utiliza `textContent`. Evita interpolarlo directamente en `innerHTML`.
- Conserva los atributos `data-*` usados por los controladores al cambiar HTML.
- Elimina listeners, temporizadores y animaciones al abandonar una vista. `app.js` utiliza funciones de limpieza y `renderVersion` para evitar respuestas obsoletas.
- Conserva los identificadores de reintento al repetir un envío fallido para evitar duplicados.
- Respeta revisión/versionado y transacciones donde se utilizan.
- Si cambias un contrato de API, revisa sus consumidores y el simulador de Pages. Documenta las diferencias restantes.
- Algunos nombres, como `getDemoRole()` o `__nexoNavigationCount`, son heredados. Comprueba sus consumidores antes de renombrarlos.

## Antes de entregar un cambio

Ejecuta `npm run check` y las pruebas relevantes; para modificaciones transversales usa `npm test`. Las pruebas usan bases temporales. Los errores `test ... rollback` se inyectan para comprobar reversión de transacciones.

Para cambios visuales, recorre la pantalla en navegador, escritorio y móvil. Una prueba con dobles de DOM no acredita el resultado visual. Registra limitaciones en `docs/REVISION.md` y conserva los pendientes de segunda fase al final del README.

Las instrucciones técnicas extensas se conservan en `OPERACION.md`; el README principal está orientado a quien evalúa el portafolio.
