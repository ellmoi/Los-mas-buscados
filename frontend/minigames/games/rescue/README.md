# Un barrio que cuida · Punto 1

Desde la raíz: npm.cmd start o node server.mjs. Abre
http://localhost:3000/#/minijuegos → Jugar → Entrar al barrio.
El enlace antiguo #/minijuegos/combat abre este mismo juego.

## Recorrido

1. Escribe el nombre del avatar (1–24 caracteres), elige su apariencia y entra. Camina hacia la derecha y luego arriba, hacia el
   marcador **1**, junto a la casa. Edificios, troncos, bancas y cercas son sólidos.
2. Al acercarte, se detiene el movimiento. Aparecen el gato y las niñas;
   avanza con los botones del diálogo (también mediante Tab y Enter).
   El primer diálogo permite seguir explorando. Los siguientes muestran la
   intervención del protagonista, la llegada de los padres y la discusión.
3. La reacción de tu avatar usa el retrato pixel-art existente. Pulsa Mantenerme
   firme; la reacción permanece brevemente y da paso al fundido.
4. Pulsa Comenzar combate. Es el combate V2 existente, en primera persona.
5. Puedes perder, reiniciar y ganar después. Reiniciar restaura energía,
   determinación, resistencia y métricas sin registrar nuevos controles.
6. Tras ganar, Continuar muestra la resolución: el padre deja de enfrentarse
   al protagonista y el gato queda fuera de peligro inmediato. Volver al barrio
   devuelve al lugar donde comenzó el evento y señala **Punto 1 completado ✓**.
7. Caminar de nuevo por el punto o pulsar Interactuar no repite un evento
   completado. Perder o retirarse no lo completa; puedes volver a intentarlo.

Los puntos 2–5 solo tienen marcadores pendientes, sin historias ni mecánicas.

## Controles

| Modo | Teclado | Botones existentes |
|---|---|---|
| Barrio | WASD / flechas | Mantener una dirección; Enter da un paso |
| Interactuar | E | Interactuar |
| Diálogo | Tab + Enter | Avanzar / respuesta indicada |
| Golpe rápido | J / X | Golpe rápido, 8 resistencia |
| Golpe fuerte | K / C | Golpe fuerte, 24 resistencia |
| Esquivar | A / ←, D / → | Seguir la flecha del aviso, 14 resistencia |
| Bloquear | Mantener Espacio | Mantener Bloquear |

Bloquear en los últimos 0,2 s permite el bloqueo perfecto existente. El golpe
fuerte deja expuesto; la resistencia vuelve al bajar el ritmo. Se conservan la
IA, sus avisos, la determinación, el HUD y las reglas V2. No hay nuevas mecánicas.

## Estado y recursos

El nombre elegido aparece en los diálogos y se conserva durante la partida.
world.js mantiene avatar, nombre, posición, posición de regreso, evento activo,
Punto 1 completado, escena y combate. Los modos principales son exploration,
dialogue, reaction, combat y result; intro, paused y los fundidos son estados
transitorios. story.js conserva los diálogos como datos. portraits.js reutiliza
la apariencia del avatar y permite un retrato específico en el futuro.

El mismo canvas principal de 384 × 288 se mueve entre barrio y combate; no se
crea una segunda superficie principal al entrar en la pelea. Se mantienen el
minimapa, el pequeño retrato y el fondo precalculado existentes. El suelo se
dibuja una vez. El arte procedural compartido no descarga imágenes ni videos.

createGameLoop en ../../index.js proporciona un único reloj de animación por
partida. El combate recibe ese mismo reloj; pausar, terminar o salir lo detiene.
El router existente desmonta la partida al navegar. Las entradas de cada modo
se restringen a su vista; reiniciar no añade listeners. No hay timers ni intervalos.

Se conservan el descarte de actores estáticos fuera de cámara y el minimapa
actualizado solo cuando cambia su información. El objetivo ya no se escribe
en el DOM cada frame. La reacción no repinta el barrio cubierto por el retrato.
Cambiar de pestaña, perder foco o abrir un modal pausa la escena/pelea; Reanudar
continúa desde el mismo punto y evita aplicar el tiempo pasado en segundo plano.

## Verificación y límites

Las pruebas de rescue-interactions recorren entrada, teclado, botones táctiles
simulados, diálogos, espera, reacción, transiciones, victoria, derrota, reinicio,
regreso, no repetición y limpieza. Las de rescue-world verifican colisiones y
accesibilidad física de los puntos. Las de combat/combat-v2 conservan cobertura
de bloqueo perfecto, esquive, resistencia, IA y finales.

Mediciones instrumentadas con DOM/Canvas/RAF simulados:

- Máximo de un frame pendiente durante todo el recorrido.
- Cero frames activos al pausar o terminar; cero listeners/CSS al desmontar.
- Reiniciar y volver no acumula listeners ni crea otro canvas principal.
- El minimapa y el objetivo no se repintan/reescriben en reposo.
- En la reacción, 20 frames producían 20 repintados del barrio: ahora cero.

Estas mediciones no son un benchmark de FPS/GPU ni una prueba visual real.
La herramienta devolvió cero navegadores conectados: quedan pendientes la
consola real, el layout y los gestos físicos en escritorio/teléfono. En móvil
los diálogos se sitúan debajo del mapa para conservar visible la escena.

Arte, avatar único, textos, puntuación y ajuste visual siguen siendo de prueba.
El progreso solo dura durante esta visita; recargar o salir lo reinicia. No se
instalaron dependencias ni se añadieron assets, persistencia o puntos nuevos.
