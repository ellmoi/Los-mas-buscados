# Minijuegos

**Un barrio que cuida** es un único juego: barrio top-down, Punto 1, diálogo,
reacción, combate V2 y regreso al barrio. Los puntos 2–5 siguen pendientes.

Ejecuta npm.cmd start desde la raíz y abre http://localhost:3000/#/minijuegos.
Pulsa **Jugar**. #/minijuegos/rescate y el enlace heredado #/minijuegos/combat
abren la misma entrada. Consulta [el recorrido y los controles](games/rescue/README.md).

## Organización

- index.js: catálogo, carga explícita de la entrada y createGameLoop compartido.
- games/rescue/: estado del barrio, escenas como datos, movimiento, dibujo,
  reacción y coordinación del combate existente.
- games/combat/: controlador, HUD y reglas de la pelea V2. Sus pruebas V1
  permanecen para comprobar compatibilidad interna; no hay otra tarjeta de juego.
- games/shared/pixel-art.js: arte procedural y apariencia compartidos.

frontend/js/app.js carga el juego bajo demanda y llama a su limpieza al salir.
El barrio entrega al combate su canvas principal, reloj y objeto de sesión.
No se duplican navegación, partida ni combate. El reinicio reutiliza controles;
pausar/terminar cancela la animación y salir elimina listeners, observadores y CSS.
No hay timers, dependencias, videos ni imágenes externas.

Los imports no deben montar escenas ni registrar eventos por sí solos. Conserva
selectores limitados al contenedor y utiliza el ciclo mount/limpieza del router.
No añadas variables globales ni controles con atributos reservados por la app.

## Verificación

Las pruebas existentes de combate, V2, mundo y rescate cubren el recorrido,
colisiones, entradas, resultados, pausas y liberación de recursos con dobles de
DOM/Canvas/RAF. No sustituyen la validación visual, de consola o de gestos reales;
en esta sesión no hubo un navegador conectado. La guía detalla las mediciones.

El estado y la puntuación viven en memoria. Salir o recargar reinicia la visita;
no se han creado API, tablas de juegos, rankings ni mecánicas adicionales.
