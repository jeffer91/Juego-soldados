# RBTwar

RBTwar es un juego de estrategia en tiempo real ligero para **celulares Android**, inspirado en la conquista territorial de los RTS clásicos pero con identidad propia, robots y controles simplificados por toque.

## Diseño actual

- Mobile-first y pensado para jugarse en **horizontal**.
- El mapa ocupa prácticamente toda la pantalla; HUD y botones son compactos.
- Si el celular está en vertical, el juego pide girarlo.
- Controles táctiles: toca un pelotón azul y luego toca una base objetivo.
- Bases que producen robots automáticamente.
- Al acumularse 5 robots se forma automáticamente un pelotón.
- También se puede sacar un pelotón parcial de 1 a 4 robots tocando una base propia con unidades almacenadas.
- Los pelotones pueden fusionarse hasta un máximo de 5 robots.
- Movimiento limitado por las rutas del mapa.
- Combate automático por cercanía.
- Captura de bases tras mantener el control de la zona.
- Victoria al destruir el CORE rojo y derrota si destruyen el CORE azul.
- Monedas como recompensa y repetición de mapas por una recompensa menor.
- Estrellas calculadas contra el primer tiempo personal del jugador; el cronómetro se maneja internamente.

## Niveles funcionales

### Mapa 1 — Tres caminos

Primer mapa del desierto. La base azul puede avanzar por tres rutas diferentes, cada una pasando por una base neutral antes de converger hacia la fábrica y el CORE enemigo.

### Mapa 2 — Cruce de fábricas

Segundo mapa del desierto. Tiene más cruces, tres bases neutrales y dos fábricas enemigas, por lo que obliga a decidir qué ruta y qué base conviene conquistar primero.

Al vencer el Mapa 1 se desbloquea el Mapa 2. A partir del Mapa 3 el prototipo puede generar variaciones para mantener la progresión infinita.

## Tecnología

- HTML
- CSS mobile-first
- JavaScript
- Canvas 2D
- Sin motor gráfico externo
- Sin imágenes pesadas para mantener el juego liviano
- Progreso guardado con `localStorage`

## Probar desde Visual Studio Code

```powershell
D:
cd \RBTwar
git pull
code .
```

Después abre `index.html` con Live Server. Para evaluar correctamente tamaños y controles, usa la emulación de un celular Android en orientación horizontal o prueba directamente desde un teléfono en la misma red.

## Estructura

```text
RBTwar/
├── index.html
├── styles.css
├── src/
│   └── game.js
└── README.md
```

## Siguientes etapas

1. Balancear los dos primeros mapas en celular real.
2. Crear la pantalla para gastar monedas.
3. Añadir desbloqueo y niveles de tipos de robot.
4. Mejorar efectos visuales manteniendo el peso bajo.
5. Preparar la versión Android para Google Play.
