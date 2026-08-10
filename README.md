# RBTwar

RBTwar es un juego de estrategia en tiempo real ligero, pensado primero para navegador y después para Android. Está inspirado en la idea de conquista territorial de los RTS clásicos, pero con identidad propia, robots y controles simplificados para celular.

## Concepto definido

- Juego infinito por niveles; cada mapa es limitado.
- Mundos por ambientes: desierto, bosque, nieve, ciudad y futuras variaciones.
- Bases que producen robots automáticamente.
- Cada base produce un tipo de robot determinado.
- Pelotones de 1 a 5 robots; al acumularse, se agrupan hasta un máximo de 5.
- El jugador selecciona un pelotón y toca una base/objetivo.
- Las rutas están limitadas por caminos entre bases; la distancia importa estratégicamente.
- Para capturar una base hay que llegar, eliminar la resistencia y mantener el control de la zona unos segundos.
- Se gana destruyendo el núcleo/base principal enemiga.
- Las victorias entregan monedas.
- Las monedas servirán para mejorar tipos de robot y desbloquear otros nuevos.
- Se pueden repetir mapas anteriores; las repeticiones dan menos monedas.
- Las estrellas dependen del tiempo personal del jugador, medido internamente:
  - Primera victoria: 1 estrella y se guarda el tiempo de referencia.
  - 2 estrellas: al menos 10% más rápido que el primer tiempo.
  - 3 estrellas: al menos 20% más rápido que el primer tiempo.
- El cronómetro no se muestra durante la batalla.
- Sin sangre ni violencia gráfica; los combatientes son robots.
- Gráficos generados por Canvas 2D para mantener el juego muy liviano.

## Prototipo actual

La primera versión jugable ya incluye:

- mapa generado de forma determinista por número de nivel;
- caminos y obstáculos;
- bases neutrales, aliadas y enemigas;
- producción automática de robots;
- pelotones de hasta 5;
- selección táctil/clic;
- rutas automáticas entre bases;
- combate automático;
- captura de bases;
- IA enemiga básica;
- núcleo enemigo destruible;
- progresión de mapas;
- monedas, estrellas y tiempos guardados con `localStorage`;
- biomas que cambian cada 10 niveles.

## Probar en Visual Studio Code

No necesita instalar librerías ni un motor externo.

1. Clona o descarga este repositorio.
2. Abre la carpeta en Visual Studio Code.
3. Abre `index.html` con Live Server, o simplemente abre `index.html` en el navegador.
4. Juega con mouse o pantalla táctil.

## Controles

- Toca/clic en un pelotón azul para seleccionarlo.
- Toca/clic en una base para ordenar el desplazamiento.
- Si una base aliada tiene robots almacenados, tócala para formar un pelotón parcial de 1 a 5.
- `Esc` cancela selección o pausa.

## Estructura

```text
RBTwar/
├── index.html
├── styles.css
├── src/
│   └── game.js
└── README.md
```

## Próximos pasos

1. Balancear velocidad, daño, producción y dificultad.
2. Añadir pantalla de mejoras y desbloqueos con monedas.
3. Incorporar Robot Rápido y Robot Pesado.
4. Mejorar la IA y los diseños procedurales de mapas.
5. Añadir efectos de sonido ligeros.
6. Empaquetar para Android y generar el `.aab` para Google Play.

---

**Nombre del juego:** RBTwar  
**Objetivo técnico:** mantener una base de código pequeña, rápida y fácil de probar antes de empaquetarla para Android.
